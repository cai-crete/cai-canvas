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

      setCanvasItems: (items) => set((state) => ({ 
        canvasItems: typeof items === 'function' ? items(state.canvasItems) : items 
      })),

      addCanvasItem: async (item) => {
        // Save base64 to DB immediately
        await saveImageToDB(item.id, item.src);
        
        const { canvasItems, saveHistoryState } = get();
        saveHistoryState();
        set({ canvasItems: [...canvasItems, item] });
      },

      updateCanvasItem: async (id, updates) => {
        // If updating src, update DB
        if (updates.src) {
           await saveImageToDB(id, updates.src);
        }
        
        const { canvasItems, saveHistoryState } = get();
        // state saved unless just modifying purely visual temp stuff, but keeping it simple
        saveHistoryState();
        set({
          canvasItems: canvasItems.map((item) =>
            item.id === id ? { ...item, ...updates } : item
          ),
        });
      },

      removeCanvasItem: async (id) => {
        await deleteImageFromDB(id);
        
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
             if (!item.src) {
                const storedSrc = await loadImageFromDB(item.id);
                if (storedSrc) {
                   return { ...item, src: storedSrc };
                }
             }
             return item;
           })
         );
         set({ canvasItems: restoredItems });
      }
    }),
    {
      name: 'canvas-storage',
      partialize: (state) => ({
        // Exclude src from localStorage to avoid performance overhead and QuotaExceededError
        canvasItems: state.canvasItems.map((item) => ({ ...item, src: '' })),
        selectedItemId: state.selectedItemId,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Re-load actual raw base64 data from IndexedDB
          setTimeout(() => state.loadImagesFromDB(), 0);
        }
      }
    }
  )
);
