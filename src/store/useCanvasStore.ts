// [V172 PHASE 2 - UNLINKED] Zustand store for canvas state
// [V172 PHASE 2 - UNLINKED] React Flow Canvas Component
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CanvasItem } from '../types/canvas';
import { saveImageToDB, loadImageFromDB, deleteImageFromDB } from '../lib/imageDB';

interface CanvasState {
  canvasItems: CanvasItem[];
  selectedItemId: string | null;
  historyStates: CanvasItem[][];
  redoStates: CanvasItem[][];
  
  // Actions
  setCanvasItems: (items: CanvasItem[] | ((prev: CanvasItem[]) => CanvasItem[])) => void;
  addCanvasItem: (item: CanvasItem) => Promise<void>;
  updateCanvasItem: (id: string, updates: Partial<CanvasItem>) => Promise<void>;
  removeCanvasItem: (id: string) => Promise<void>;
  setSelectedItemId: (id: string | null) => void;
  undo: () => void;
  redo: () => void;
  saveHistoryState: () => void;
  loadImagesFromDB: () => Promise<void>;
}

export const useCanvasStore = create<CanvasState>()(
  persist(
    (set, get) => ({
      canvasItems: [],
      selectedItemId: null,
      historyStates: [],
      redoStates: [],

      setCanvasItems: (items) => set((state) => {
        const nextItems = typeof items === 'function' ? items(state.canvasItems) : items;
        
        // Deep IDB Sync: 모든 Base64 데이터를 미리 IndexedDB로 비동기 백업
        nextItems.forEach((item) => {
          if (item.src && item.src.startsWith('data:image')) {
            saveImageToDB(item.id, item.src).catch(console.error);
          }
          if (item.editVersions) {
            item.editVersions.forEach((v, idx) => {
              if (v.src && v.src.startsWith('data:image')) {
                saveImageToDB(`${item.id}_ev_${idx}`, v.src).catch(console.error);
              }
            });
          }
          if (item.parameters) {
            if (item.parameters.sitePlanImage && item.parameters.sitePlanImage.startsWith('data:image')) {
              saveImageToDB(`${item.id}_site`, item.parameters.sitePlanImage).catch(console.error);
            }
            if (item.parameters.architecturalSheetImage && item.parameters.architecturalSheetImage.startsWith('data:image')) {
              saveImageToDB(`${item.id}_arch`, item.parameters.architecturalSheetImage).catch(console.error);
            }
            if (item.parameters.elevationImages) {
              const elev = item.parameters.elevationImages;
              if (elev.front && elev.front.startsWith('data:image')) saveImageToDB(`${item.id}_elev_front`, elev.front).catch(console.error);
              if (elev.right && elev.right.startsWith('data:image')) saveImageToDB(`${item.id}_elev_right`, elev.right).catch(console.error);
              if (elev.rear && elev.rear.startsWith('data:image')) saveImageToDB(`${item.id}_elev_rear`, elev.rear).catch(console.error);
              if (elev.left && elev.left.startsWith('data:image')) saveImageToDB(`${item.id}_elev_left`, elev.left).catch(console.error);
              if (elev.top && elev.top.startsWith('data:image')) saveImageToDB(`${item.id}_elev_top`, elev.top).catch(console.error);
            }
          }
        });

        return { canvasItems: nextItems };
      }),

      addCanvasItem: async (item) => {
        // DB 백업은 이제 setCanvasItems 내부 인터셉터가 모두 처리하지만 명시적으로 호출 유지
        if (item.src && item.src.startsWith('data:')) {
          await saveImageToDB(item.id, item.src);
        }
        
        const { canvasItems, saveHistoryState } = get();
        saveHistoryState();
        set({ canvasItems: [...canvasItems, item] });
      },

      updateCanvasItem: async (id, updates) => {
        if (updates.src && updates.src.startsWith('data:')) {
           await saveImageToDB(id, updates.src);
        }
        
        const { canvasItems, saveHistoryState } = get();
        saveHistoryState();
        set({
          canvasItems: canvasItems.map((item) =>
            item.id === id ? { ...item, ...updates } : item
          ),
        });
      },

      removeCanvasItem: async (id) => {
        await deleteImageFromDB(id);
        // Note: 관련된 서브 키(_ev_, _site 등)는 IndexedDB 자동 정리가 어려울 수 있으나
        // 로컬스토리지 폭파는 막았으므로 IndexedDB 고아 데이터는 용량이 상대적으로 넉넉해 감내 가능
        
        const { canvasItems, saveHistoryState } = get();
        saveHistoryState();
        set({
           canvasItems: canvasItems.filter(item => item.id !== id && item.motherId !== id),
           selectedItemId: get().selectedItemId === id ? null : get().selectedItemId
        });
      },

      setSelectedItemId: (id) => set({ selectedItemId: id }),

      saveHistoryState: () => {
        const { canvasItems, historyStates } = get();
        const newHistory = [...historyStates, canvasItems].slice(-20); // keep up to 20 states
        set({ historyStates: newHistory, redoStates: [] });
      },

      undo: () => {
         const { historyStates, canvasItems, redoStates } = get();
         if (historyStates.length === 0) return;
         const previousState = historyStates[historyStates.length - 1];
         const newHistory = historyStates.slice(0, -1);
         set({
            canvasItems: previousState,
            historyStates: newHistory,
            redoStates: [canvasItems, ...redoStates]
         });
      },

      redo: () => {
         const { redoStates, historyStates, canvasItems } = get();
         if (redoStates.length === 0) return;
         const nextState = redoStates[0];
         const newRedo = redoStates.slice(1);
         set({
            canvasItems: nextState,
            historyStates: [...historyStates, canvasItems],
            redoStates: newRedo
         });
      },
      
      loadImagesFromDB: async () => {
         const { canvasItems } = get();
         const restoredItems = await Promise.all(
           canvasItems.map(async (item) => {
             const restored = { ...item };
             
             if (!restored.src) {
                const storedSrc = await loadImageFromDB(restored.id);
                if (storedSrc) restored.src = storedSrc;
             }
             
             if (restored.editVersions) {
                restored.editVersions = await Promise.all(restored.editVersions.map(async (v, idx) => {
                   if (!v.src) {
                      const storedSrc = await loadImageFromDB(`${restored.id}_ev_${idx}`);
                      if (storedSrc) return { ...v, src: storedSrc };
                   }
                   return v;
                }));
             }
             
             if (restored.parameters) {
                restored.parameters = { ...restored.parameters };
                if (restored.parameters.sitePlanImage === '') { // 값이 null/undefined가 아니라 명시적으로 비워진('') 경우만 복구
                   const storedSite = await loadImageFromDB(`${restored.id}_site`);
                   if (storedSite) restored.parameters.sitePlanImage = storedSite;
                }
                if (restored.parameters.architecturalSheetImage === '') {
                   const storedArch = await loadImageFromDB(`${restored.id}_arch`);
                   if (storedArch) restored.parameters.architecturalSheetImage = storedArch;
                }
                if (restored.parameters.elevationImages) {
                   restored.parameters.elevationImages = { ...restored.parameters.elevationImages };
                   const elev = restored.parameters.elevationImages;
                   if (elev.front === '') elev.front = await loadImageFromDB(`${restored.id}_elev_front`);
                   if (elev.right === '') elev.right = await loadImageFromDB(`${restored.id}_elev_right`);
                   if (elev.rear === '') elev.rear = await loadImageFromDB(`${restored.id}_elev_rear`);
                   if (elev.left === '') elev.left = await loadImageFromDB(`${restored.id}_elev_left`);
                   if (elev.top === '') elev.top = await loadImageFromDB(`${restored.id}_elev_top`);
                }
             }

             return restored;
           })
         );
         set({ canvasItems: restoredItems });
      }
    }),
    {
      name: 'canvas-storage',
      partialize: (state) => ({
        // Deep Partialize: 모든 중량의 Base64 데이터를 제외하여 QuotaExceededError 원천 차단
        canvasItems: state.canvasItems.map((item) => {
          const stripped = { ...item, src: item.src?.startsWith('data:') ? '' : item.src };
          
          if (stripped.editVersions) {
            stripped.editVersions = stripped.editVersions.map(v => ({ ...v, src: v.src?.startsWith('data:') ? '' : v.src }));
          }
          
          if (stripped.parameters) {
            stripped.parameters = { ...stripped.parameters };
            if (stripped.parameters.sitePlanImage?.startsWith('data:')) stripped.parameters.sitePlanImage = '';
            if (stripped.parameters.architecturalSheetImage?.startsWith('data:')) stripped.parameters.architecturalSheetImage = '';
            if (stripped.parameters.elevationImages) {
               stripped.parameters.elevationImages = {
                 front: stripped.parameters.elevationImages.front?.startsWith('data:') ? '' : stripped.parameters.elevationImages.front,
                 right: stripped.parameters.elevationImages.right?.startsWith('data:') ? '' : stripped.parameters.elevationImages.right,
                 rear: stripped.parameters.elevationImages.rear?.startsWith('data:') ? '' : stripped.parameters.elevationImages.rear,
                 left: stripped.parameters.elevationImages.left?.startsWith('data:') ? '' : stripped.parameters.elevationImages.left,
                 top: stripped.parameters.elevationImages.top?.startsWith('data:') ? '' : stripped.parameters.elevationImages.top,
               };
            }
          }
          return stripped;
        }),
        selectedItemId: state.selectedItemId,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          if (state.canvasItems.length === 0) {
            try {
              const legacy = localStorage.getItem('crete_canvasItems');
              if (legacy) {
                const parsed = JSON.parse(legacy);
                state.setCanvasItems(parsed);
                localStorage.removeItem('crete_canvasItems');
              }
            } catch {}
          }
          // Re-load actual raw base64 data from IndexedDB
          setTimeout(() => state.loadImagesFromDB(), 0);
        }
      }
    }
  )
);
