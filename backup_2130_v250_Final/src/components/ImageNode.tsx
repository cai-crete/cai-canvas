import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Download, Book, Trash2, Loader2 } from 'lucide-react';
import { useCanvasStore } from '../store/useCanvasStore';

export default function ImageNode({ data, selected, id }: any) {
  const { item, zoomLevel, isGenerating, openLibraryItemId, setOpenLibraryItemId, artboardPage, setArtboardPage, removeCanvasItem, setSelectedItemId, saveHistoryState } = data;
  
  const s = 1 / Math.max(0.1, zoomLevel); // 줌 보정 배율 (극단적 스케일 방어용 min 0.1)

  const handleOpenLibrary = (e: React.MouseEvent) => {
    e.stopPropagation();
    const isOpening = openLibraryItemId !== item.id;
    setOpenLibraryItemId(isOpening ? item.id : null);
    if (isOpening) setArtboardPage(1);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    saveHistoryState();
    removeCanvasItem(item.id);
  };

  const siblings = useCanvasStore((state) => 
    state.canvasItems.filter(i => i.type === 'generated' && (i.motherId === item.motherId || i.motherId === item.id))
  );

  const labelText = item.type === 'upload'
    ? 'ORIGINAL'
    : (() => {
        const viewIdx = siblings.findIndex(s => s.id === item.id);
        return `VIEWPOINT ${String(viewIdx + 1).padStart(2, '0')}`;
      })();

  return (
    <div 
      className="relative pointer-events-auto shadow-xl"
      style={{
        width: item.width,
        height: item.height,
        outline: selected ? `${1.6 * s}px solid #1d4ed8` : 'none',
      }}
    >
      {/* 
        We don't use React Flow typical dot handles because we only want visual boundaries, 
        but we can keep them hidden or render our custom handles over them. 
      */}
      <img
        src={item.src}
        alt={item.id}
        className="w-full h-full object-contain pointer-events-none bg-black/5 dark:bg-white/5"
        draggable={false}
      />

      {/* 라벨링 */}
      {zoomLevel > 0.2 && (
        <div
          className="absolute bottom-0 left-1/2 pointer-events-none z-[25] origin-top text-center"
          style={{ 
            transform: `translateX(-50%) translateY(100%) scale(${s})`,
            paddingTop: '12px',
            lineHeight: 1
          }}
        >
          <span className="font-mono text-[15px] tracking-widest uppercase opacity-40 whitespace-nowrap">
            {labelText}
          </span>
        </div>
      )}

      {/* 선택되었을 때만 나타나는 Floating UI (상단 컨트롤 + 4모서리 핸들) */}
      {selected && (
        <>
          {/* 플로팅 툴바 */}
          <div 
            className="absolute flex items-center bg-white/70 dark:bg-black/70 backdrop-blur-md z-[40] px-1.5 rounded-full pointer-events-auto transition-all"
            style={{
              top: `-${56 * s}px`,
              right: 0,
              height: `${44 * s}px`,
              boxShadow: '0 4px 16px rgba(0,0,0,0.08)'
            }}
          >
            {item.type === 'generated' && (
              <>
                <a 
                  href={item.src}
                  download="simulation.png"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors rounded-full"
                  style={{ width: `${36 * s}px`, height: `${36 * s}px` }}
                >
                  <Download size={14 * s} />
                </a>
                <div className="w-[1px] bg-black/10 dark:bg-white/10 mx-0.5" style={{ height: `${28 * s}px` }} />
              </>
            )}
            <button 
              onClick={handleOpenLibrary}
              className={`flex items-center justify-center transition-colors rounded-full ${openLibraryItemId === item.id ? 'bg-black/10 dark:bg-white/10' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
              style={{ width: `${36 * s}px`, height: `${36 * s}px` }}
            >
              <Book size={12 * s} />
            </button>
            <div className="w-[1px] bg-black/10 dark:bg-white/10 mx-0.5" style={{ height: `${28 * s}px` }} />
            <button 
              onClick={handleDelete}
              className="flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-red-500 rounded-full"
              style={{ width: `${36 * s}px`, height: `${36 * s}px` }}
            >
              <Trash2 size={12 * s} />
            </button>
          </div>

          {/* 4모서리 커스텀 핸들 (리사이즈 기능은 React Flow <NodeResizer>로 추후 마이그레이션 가능, 현재는 디자인만 유지) */}
          {[
            { top: true,    left: true },
            { top: true,    right: true },
            { bottom: true, left: true },
            { bottom: true, right: true },
          ].map((pos, idx) => {
            const size = 12 * s;
            return (
              <div 
                key={idx} 
                style={{
                  width: size, height: size, borderWidth: 1.6 * s,
                  position: 'absolute', zIndex: 60,
                  backgroundColor: 'white', borderColor: '#808080',
                  borderRadius: '999px', pointerEvents: 'none',
                  top: pos.top ? -size / 2 : 'auto',
                  bottom: pos.bottom ? -size / 2 : 'auto',
                  left: pos.left ? -size / 2 : 'auto',
                  right: pos.right ? -size / 2 : 'auto',
                }}
              />
            );
          })}
        </>
      )}

      {/* 로딩 애니메이션 */}
      {isGenerating && selected && (
        <div className="absolute inset-0 z-[50] flex items-center justify-center bg-white/50 backdrop-blur-md pointer-events-auto">
          <Loader2 size={42} className="animate-spin text-white" />
        </div>
      )}
      
      {/* 
        React Flow 노드는 본래 Handle 컴포넌트 필수적일 때 쓰지만
        우리 앱은 엣지(Edge) 연결이 없는 무한 캔버스이므로 숨김 
      */}
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
    </div>
  );
}
