import React, { useState, useRef, useEffect } from 'react';
import { Upload, Moon, Sun, Loader2, Search, Hand, MousePointer2, Compass, Book, Wand2, Sparkles, Trash2, Undo, Redo, Download, ChevronLeft, ChevronRight, Footprints, Plus, PanelLeft } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { ANALYSIS, IMAGE_GEN, ANALYSIS_FALLBACK, IMAGE_GEN_FALLBACK } from './constants';

// --- Constants for Discrete Parameters ---
const ANGLES = ['12:00', '1:30', '3:00', '04:30', '06:00', '07:30', '09:00', '10:30'];

const ALTITUDES = [
  { label: "-2.0m (Worm's Eye View)", value: -2.0 },
  { label: "0m (Low Angle View)", value: 0 },
  { label: "1.6m (Eye Level View)", value: 1.6 },
  { label: "10m (Low Aerial View)", value: 10 },
  { label: "50m (Mid Aerial View)", value: 50 },
  { label: "150m (Bird's Eye View)", value: 150 },
  { label: "200m (High Angle Orbit)", value: 200 },
  { label: "300m (Top-Down Aerial View)", value: 300 }
];

const LENSES = [
  { label: "23mm (Tilt-Shift Lens)", value: 23 },
  { label: "24mm (Wide Lens)", value: 24 },
  { label: "32mm (Aerial Lens)", value: 32 },
  { label: "35mm (Wide Standard Lens)", value: 35 },
  { label: "45mm (Standard Lens)", value: 45 },
  { label: "50mm (Normal Lens)", value: 50 },
  { label: "85mm (Short Telephoto Lens)", value: 85 },
  { label: "110mm (Macro Lens)", value: 110 }
];

const TIMES = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'];

// --- 5-IVSP Protocol Helper ---
// --- 5-IVSP Protocol Helper ---
const determineScenario = (angleStr: string, altitude: number, lens: number) => {
  if (altitude > 150) return '[Scenario B] Aerial View (High Altitude): Phase One + 32mm';
  if (lens > 85) return '[Scenario C] Detail View (Macro): 110mm Macro';
  if (angleStr === '04:30' || angleStr === '07:30') return '[Scenario D] General View (Quarter): 45mm Standard';
  return '[Scenario A] Street View: Fujifilm GFX 100S + 23mm Tilt-Shift';
};

// V70/V71: Map 5-IVSP Angle to 3x3 Cross Layout Slots
// Cross Layout: Row0=[_,TOP,_], Row1=[LEFT,FRONT,RIGHT], Row2=[_,REAR,_]
// Corner angles → composite: two adjacent faces injected together
const getElevationSlot = (angle: string): { row: number; col: number; label: string }[] => {
  if (angle === '06:00') return [{ row: 1, col: 1, label: 'FRONT' }];
  if (angle === '12:00') return [{ row: 2, col: 1, label: 'REAR' }];
  if (angle === '3:00')  return [{ row: 1, col: 2, label: 'RIGHT' }];
  if (angle === '09:00') return [{ row: 1, col: 0, label: 'LEFT' }];
  // Corner angles → composite (both adjacent faces)
  if (angle === '1:30')  return [{ row: 2, col: 1, label: 'REAR' },  { row: 1, col: 2, label: 'RIGHT' }];
  if (angle === '04:30') return [{ row: 1, col: 2, label: 'RIGHT' }, { row: 1, col: 1, label: 'FRONT' }];
  if (angle === '07:30') return [{ row: 1, col: 1, label: 'FRONT' }, { row: 1, col: 0, label: 'LEFT' }];
  if (angle === '10:30') return [{ row: 1, col: 0, label: 'LEFT' },  { row: 2, col: 1, label: 'REAR' }];
  return [{ row: 1, col: 1, label: 'FRONT' }];
};

// V70: Crop a single elevation cell from the 3x3 Cross Layout sheet
const cropElevationFromSheet = (sheetDataUrl: string, slot: { row: number; col: number; label: string }): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const cellW = Math.floor(img.width / 3);
      const cellH = Math.floor(img.height / 3);
      const canvas = document.createElement('canvas');
      canvas.width = cellW;
      canvas.height = cellH;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas context unavailable')); return; }
      ctx.drawImage(img, slot.col * cellW, slot.row * cellH, cellW, cellH, 0, 0, cellW, cellH);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = sheetDataUrl;
  });
};


// --- Site Plan Diagram Component ---
const SitePlanDiagram = ({ angle, isAnalyzing, analysisStep }: { angle: string, lens: number, sitePlanImage: string | null, isAnalyzing: boolean, analysisStep: string }) => {
  // Map angle string to degrees (06:00 = 180deg, 12:00 = 0deg, etc.)
  const angleMap: Record<string, number> = {
    '12:00': 0, '1:30': 45, '3:00': 90, '04:30': 135,
    '06:00': 180, '07:30': 225, '09:00': 270, '10:30': 315
  };
  
  const rotation = angleMap[angle] !== undefined ? angleMap[angle] : 180;
  const radius = 90; // SVG radius
  const cx = 100;
  const cy = 100;
  
  // Calculate camera position
  const rad = (rotation - 90) * (Math.PI / 180);
  const cameraX = cx + radius * Math.cos(rad);
  const cameraY = cy + radius * Math.sin(rad);

  return (
    <div className="w-full aspect-square relative flex items-center justify-center overflow-hidden transition-colors duration-300">
      
      {/* 80% Center Canvas */}
      <div className="absolute w-[80%] h-[80%] flex items-center justify-center z-0">
        <div className="relative w-full h-full flex items-center justify-center">
             
           {/* Center Rectangle (Black fill, white 0.5 stroke, diagonal pattern) */}
           <div 
             className="relative w-[60%] h-[40%] bg-black dark:bg-white flex items-center justify-center z-0 overflow-hidden"
             style={{
               border: '1px solid rgba(255,255,255,0.5)',
             }}
           >
             {/* Diagonal pattern */}
             <div className="absolute inset-0 opacity-50 bg-[repeating-linear-gradient(45deg,transparent,transparent_2px,white_2px,white_4px)] dark:bg-[repeating-linear-gradient(45deg,transparent,transparent_2px,black_2px,black_4px)]" />
           </div>
        </div>
      </div>

      {/* SVG Diagram Layer */}
      <svg viewBox="0 0 200 200" className="absolute inset-0 w-full h-full z-10 pointer-events-none">
        {/* Dashed Circle (Ratio 2(line):1(gap)) */}
        <circle 
          cx={cx} cy={cy} r={radius} 
          fill="none" stroke="currentColor" strokeWidth="1" 
          strokeDasharray="8 4"
          className="text-black/30 dark:text-white/30"
        />
        
        {/* Camera Pictogram / Dot */}
        <g transform={`translate(${cameraX}, ${cameraY}) rotate(${rotation})`}>
          <circle cx="0" cy="0" r="4.0" fill="currentColor" className="text-black dark:text-white" />
        </g>
      </svg>

      {/* V156: Black spinner + Blinking step messages */}
      {isAnalyzing && (
        <div className="absolute inset-0 bg-white/80 dark:bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-30 transition-colors duration-300 rounded-full overflow-hidden">
          <style>{`
            @keyframes blink-text {
              0%, 100% { opacity: 1; }
              50% { opacity: 0; }
            }
            .step-msg-sm {
              animation: blink-text 1.5s ease-in-out infinite;
              font-family: 'Inter', sans-serif;
              font-size: 11px;
              letter-spacing: 0.08em;
              color: #000;
              text-align: center;
              padding: 0 8px;
              margin-top: 8px;
            }
            .dark .step-msg-sm { color: #fff; }
          `}</style>
          <Loader2 size={32} className="animate-spin text-black dark:text-white" />
          <span className="step-msg-sm">{analysisStep || '분석 중...'}</span>
        </div>
      )}
    </div>
  );
};

interface CanvasItem {
  id: string;
  type: 'upload' | 'generated';
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  // V74: Metadata linking
  motherId: string | null;
  parameters: {
    angleIndex: number;
    altitudeIndex: number;
    lensIndex: number;
    timeIndex: number;
    analyzedOpticalParams?: any | null;
    elevationParams?: any | null;
    sitePlanImage?: string | null;
    elevationImages?: {
      front: string | null;
      right: string | null;
      rear: string | null;
      left: string | null;
      top: string | null;
    } | null;
  } | null;
}

export default function App() {
  // --- State ---
  const [canvasItems, setCanvasItems] = useState<CanvasItem[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const selectedItemIdsRef = useRef<string[]>([]);
  const [isLassoing, setIsLassoing] = useState(false);
  const isLassoingRef = useRef(false);
  const [lassoPath, setLassoPath] = useState<{x: number, y: number}[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Drag & Resize Refs (Ref 기반 — stale closure 방지)
  const isDraggingItemRef = useRef(false);
  const isResizingItemRef = useRef(false);
  const isDraggingPanRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const dragStartRef = useRef({ x: 0, y: 0 });
  const resizeStartRef = useRef({ x: 0, y: 0, width: 0, height: 0, itemX: 0, itemY: 0 });
  const resizeCornerRef = useRef({ dx: 1, dy: 1 });
  // V189: Store multiple starting positions for drag
  const clickedItemStartPositionsRef = useRef<Record<string, { x: number, y: number }>>({});
  const pendingToggleItemIdRef = useRef<string | null>(null);
  // V157: AbortController for canceling generation
  const abortControllerRef = useRef<AbortController | null>(null);
  // Keep State for render (cursor CSS)
  const [isDraggingItem, setIsDraggingItem] = useState(false);
  const [isResizingItem, setIsResizingItem] = useState(false);
  const [isDraggingPan, setIsDraggingPan] = useState(false);
  

  // PRD Parameters
  const [prompt, setPrompt] = useState('');
  const [angleIndex, setAngleIndex] = useState<number>(4); // 06:00
  const [altitudeIndex, setAltitudeIndex] = useState<number>(2); // 1.6m
  const [lensIndex, setLensIndex] = useState<number>(0); // 23mm
  const [timeIndex, setTimeIndex] = useState<number>(2); // 12:00
  const [elevationParams, setElevationParams] = useState<any>(null);
  
  // Analyzed (Read-only) Parameters for UI Display
  const [analyzedOpticalParams, setAnalyzedOpticalParams] = useState<{
    angle: string;
    altitude: string;
    lens: string;
    time: string;
  } | null>(null);
  
  // UI State
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false); // V173
  const [activeTab, setActiveTab] = useState<'control'|'result'>('control');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<string>(''); // V155: 단계 메시지
  const [sitePlanImage, setSitePlanImage] = useState<string | null>(null);
  const [elevationImages, setElevationImages] = useState<{
    front: string | null;
    right: string | null;
    rear: string | null;
    left: string | null;
    top: string | null;
  } | null>(null);



  // Zoom & Pan State
  const [canvasZoom, setCanvasZoom] = useState(100);
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const [focusMode, setFocusMode] = useState<'all' | 'target'>('all');
  const [canvasMode, setCanvasMode] = useState<'select' | 'pan'>('select');

  // V75: Item-bound Library State
  const [openLibraryItemId, setOpenLibraryItemId] = useState<string | null>(null);
  const [artboardPage, setArtboardPage] = useState<number>(1); // V180: Artboard pagination 1-5

  // V75: History State for Undo
  const [historyStates, setHistoryStates] = useState<CanvasItem[][]>([]);
  // V113: Redo State
  const [redoStates, setRedoStates] = useState<CanvasItem[][]>([]);

  const handleUndo = () => {
    if (historyStates.length > 0) {
      const currentState = [...canvasItems];
      const previousState = historyStates[historyStates.length - 1];
      
      setRedoStates(prev => [...prev, currentState]);
      setCanvasItems(previousState);
      setHistoryStates(prev => prev.slice(0, -1));
      setSelectedItemIds([]);
      selectedItemIdsRef.current = [];
    }
  };

  const handleRedo = () => {
    if (redoStates.length > 0) {
      const currentState = [...canvasItems];
      const nextState = redoStates[redoStates.length - 1];

      setHistoryStates(prev => [...prev, currentState]);
      setCanvasItems(nextState);
      setRedoStates(prev => prev.slice(0, -1));
      setSelectedItemIds([]);
      selectedItemIdsRef.current = [];
    }
  };

  // Touch State Refs
  const lastTouchDist = useRef<number | null>(null);
  const lastTouchCenter = useRef<{ x: number, y: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLElement>(null); // V54: Absolute ref for canvas section

  // V74: Responsive Scale State
  const [appScale, setAppScale] = useState(1);

  // --- Effects ---
  // V74: Synchronize selected item's parameters to UI panels, and reset on deselect
  // V108: Hybrid Sync - Sliders (Independent) / Analysis Data (Shared from Mother)
  useEffect(() => {
    if (selectedItemIds.length === 0) {
      // Background click -> Reset to default empty state
      setAngleIndex(4);
      setAltitudeIndex(2);
      setLensIndex(0);
      setTimeIndex(2);
      setAnalyzedOpticalParams(null);
      setElevationParams(null);
      setSitePlanImage(null);
      setElevationImages(null);
      return;
    }

    const item = canvasItems.find(i => i.id === selectedItemIds[0]);
    if (item && item.parameters) {
      // 1. Viewpoint Sliders (Independent) -> Always from current item snapshot
      setAngleIndex(item.parameters.angleIndex);
      setAltitudeIndex(item.parameters.altitudeIndex);
      setLensIndex(item.parameters.lensIndex);
      setTimeIndex(item.parameters.timeIndex);

      // V145: Independent Yet Identical Data Ownership
      const analysisSource = item.parameters;
      
      setAnalyzedOpticalParams(analysisSource.analyzedOpticalParams || null);
      setElevationParams(analysisSource.elevationParams || null);
      setSitePlanImage(analysisSource.sitePlanImage || null);
      setElevationImages(analysisSource.elevationImages || null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedItemIds]); // only trigger on selection change

  useEffect(() => {
    // Determine the scale based on a reference resolution (e.g., 1440x900 or 1920x1080)
    const updateScale = () => {
      const baseWidth = 1440;
      const baseHeight = 900;
      const widthRatio = window.innerWidth / baseWidth;
      const heightRatio = window.innerHeight / baseHeight;
      // Scale to fit within the viewport (maintains aspect ratio, leaves letterboxing if window is not 16:10)
      const scale = Math.min(widthRatio, heightRatio);
      setAppScale(scale);
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // --- Handlers ---
  const ZOOM_STEPS_BUTTON = [10, 25, 50, 75, 100, 125, 150, 175, 200];

  const zoomStep = (dir: 1 | -1) => {
    setCanvasZoom(prev => {
      if (dir === 1) {
        const next = ZOOM_STEPS_BUTTON.find(v => v > prev);
        return next !== undefined ? next : 200;
      } else {
        const next = [...ZOOM_STEPS_BUTTON].reverse().find(v => v < prev);
        return next !== undefined ? next : 10;
      }
    });
  };



  const handleFocus = () => {
    if (canvasItems.length === 0) {
      setCanvasZoom(100);
      setCanvasOffset({ x: 0, y: 0 });
      return;
    }

    if (focusMode === 'all') {
      // Fit All
      const minX = Math.min(...canvasItems.map(i => i.x));
      const minY = Math.min(...canvasItems.map(i => i.y));
      const maxX = Math.max(...canvasItems.map(i => i.x + i.width));
      const maxY = Math.max(...canvasItems.map(i => i.y + i.height));
      
      const width = maxX - minX;
      const height = maxY - minY;
      const cx = minX + width / 2;
      const cy = minY + height / 2;
      
      const padding = 100;
      // V54: Panel is overlay so viewport = full window width
      const sectionW = window.innerWidth;
      const sectionH = window.innerHeight;
      
      const scaleX = (sectionW - padding) / width;
      const scaleY = (sectionH - padding) / height;
      const scale = Math.min(scaleX, scaleY, 1) * 100; // max zoom 100%
      
      setCanvasZoom(Math.max(scale, 10)); // min zoom 10
      setCanvasOffset({ 
        x: -cx * (scale / 100), 
        y: -cy * (scale / 100) 
      });
      setFocusMode('target');
    } else {
      // Focus Target (selected or last)
      const targetItem = selectedItemIds[0] 
        ? canvasItems.find(i => i.id === selectedItemIds[0]) 
        : canvasItems[canvasItems.length - 1];
        
      if (targetItem) {
        const cx = targetItem.x + targetItem.width / 2;
        const cy = targetItem.y + targetItem.height / 2;
        
        setCanvasZoom(100);
        setCanvasOffset({ 
          x: -cx, 
          y: -cy 
        });
      }
      setFocusMode('all');
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    // Web Zoom (No Ctrl needed as per user request for Miro-style)
    e.preventDefault();
    const zoomFactor = -e.deltaY * 0.1;
    setCanvasZoom(prev => Math.min(Math.max(prev + zoomFactor, 10), 200));
  };

  const getCanvasCoords = (clientX: number, clientY: number) => {
    const scale = canvasZoom / 100;
    
    // V55: Use ABSOLUTE screen center as the fixed origin.
    // This is the most robust way to ensure selection calibration 
    // matches the visual center of the fullscreen canvas.
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    
    return {
      x: (clientX - cx - canvasOffset.x) / scale,
      y: (clientY - cy - canvasOffset.y) / scale
    };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    const isUIInteraction = target.closest('.pointer-events-auto');
    // V187: Allow resize handles to bypass UI block
    const isResizeHandle = target.classList.contains('resize-handle') || target.style.cursor?.endsWith('-resize');
    if (isUIInteraction && !isResizeHandle) return;

    // V184: Auto-collapse expanded search ONLY when NOT clicking UI elements (Canvas or Item clicks)
    if (isSearchExpanded) setIsSearchExpanded(false);

    const coords = getCanvasCoords(e.clientX, e.clientY);

    if (canvasMode === 'pan') {
      // In Pan mode, clicking ANYTHING (including images) leads to Panning.
      isDraggingPanRef.current = true;
      setIsDraggingPan(true);
      dragStartRef.current = { x: e.clientX - canvasOffset.x, y: e.clientY - canvasOffset.y };
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }

    // --- Select Mode ---

    // 1. Check Resize Handles first (if exactly one item is selected)
    // Direct hit via data-dx/dy or distance
    const resizeCorner = (target.closest('.resize-handle') as HTMLElement)?.dataset;
    if (resizeCorner && selectedItemIds.length === 1) {
      const selectedId = selectedItemIds[0];
      const item = canvasItems.find(i => i.id === selectedId);
      if (item) {
        setHistoryStates(prev => [...prev, canvasItems]);
        setRedoStates([]);

        isResizingItemRef.current = true;
        setIsResizingItem(true);
        resizeCornerRef.current = { dx: parseInt(resizeCorner.dx!), dy: parseInt(resizeCorner.dy!) };
        resizeStartRef.current = { x: coords.x, y: coords.y, width: item.width, height: item.height, itemX: item.x, itemY: item.y };
        e.currentTarget.setPointerCapture(e.pointerId);
        return;
      }
    }

    // 2. Check Image Click for Selection/Drag
    const clickedItem = [...canvasItems].reverse().find(item => 
      coords.x >= item.x && coords.x <= item.x + item.width &&
      coords.y >= item.y && coords.y <= item.y + item.height
    );

    if (clickedItem) {
      setHistoryStates(prev => [...prev, canvasItems]);
      setRedoStates([]);

      let currentSelection = selectedItemIds;
      if (!selectedItemIds.includes(clickedItem.id)) {
        const newSelection = [...selectedItemIds, clickedItem.id];
        setSelectedItemIds(newSelection);
        selectedItemIdsRef.current = newSelection;
        currentSelection = newSelection;
        pendingToggleItemIdRef.current = null;
      } else {
        pendingToggleItemIdRef.current = clickedItem.id;
      }
      
      // V141: Transition library if open
      if (openLibraryItemId && !currentSelection.includes(clickedItem.id)) {
        setOpenLibraryItemId(clickedItem.id);
      }

      isDraggingItemRef.current = true;
      setIsDraggingItem(true);
      dragStartRef.current = { x: coords.x, y: coords.y };
      
      // V193: Deselect Toggle Logic Init
      if (selectedItemIds.includes(clickedItem.id)) {
        pendingToggleItemIdRef.current = clickedItem.id;
      }

      clickedItemStartPositionsRef.current = currentSelection.reduce((acc, id) => {
        const itm = canvasItems.find(i => i.id === id);
        if (itm) acc[id] = { x: itm.x, y: itm.y };
        return acc;
      }, {} as Record<string, { x: number, y: number }>);
      
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }

    // 3. Background click -> Lasso
    // 3. No Item Clicked -> Start Lasso + Close Artboard
    setSelectedItemIds([]);
    selectedItemIdsRef.current = [];
    setOpenLibraryItemId(null);
    
    setIsLassoing(true);
    isLassoingRef.current = true;
    setLassoPath([{ x: coords.x, y: coords.y }]);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const coords = getCanvasCoords(e.clientX, e.clientY);

    if (isLassoingRef.current) {
      setLassoPath(prev => [...prev, coords]);
    } else if (isDraggingPanRef.current) {
      setCanvasOffset({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y
      });
    } else if (isDraggingItemRef.current && selectedItemIdsRef.current.length > 0) {
      if (pendingToggleItemIdRef.current) {
        pendingToggleItemIdRef.current = null;
      }
      const currentIds = selectedItemIdsRef.current;
      const dx = coords.x - dragStartRef.current.x;
      const dy = coords.y - dragStartRef.current.y;

      setCanvasItems(prev => prev.map(item => {
        if (!currentIds.includes(item.id)) return item;
        const startPos = clickedItemStartPositionsRef.current[item.id];
        return startPos ? { ...item, x: startPos.x + dx, y: startPos.y + dy } : item;
      }));
    } else if (isResizingItemRef.current && selectedItemIdsRef.current.length === 1) {
      const selectedId = selectedItemIdsRef.current[0];
      const dx = coords.x - resizeStartRef.current.x;
      const dy = coords.y - resizeStartRef.current.y;
      const aspect = resizeStartRef.current.width / resizeStartRef.current.height;

      setCanvasItems(prev => prev.map(item => {
        if (item.id !== selectedId) return item; 

        const rawDeltaW = dx * resizeCornerRef.current.dx;
        const newWidth = Math.max(resizeStartRef.current.width + rawDeltaW, 50);
        const newHeight = newWidth / aspect;

        const newX = resizeCornerRef.current.dx === -1
          ? resizeStartRef.current.itemX + (resizeStartRef.current.width - newWidth)
          : resizeStartRef.current.itemX;
        const newY = resizeCornerRef.current.dy === -1
          ? resizeStartRef.current.itemY + (resizeStartRef.current.height - newHeight)
          : resizeStartRef.current.itemY;

        return { ...item, x: newX, y: newY, width: newWidth, height: newHeight };
      }));
    }
  };

  const isPointInPolygon = (point: {x: number, y: number}, polygon: {x: number, y: number}[]) => {
    let isInside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x, yi = polygon[i].y;
      const xj = polygon[j].x, yj = polygon[j].y;
      const intersect = ((yi > point.y) !== (yj > point.y)) &&
                        (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
      if (intersect) isInside = !isInside;
    }
    return isInside;
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isLassoingRef.current) {
      if (lassoPath.length > 3) {
        const poly = lassoPath;
        const newlySelected = canvasItems.filter(item => {
          const corners = [
            { x: item.x, y: item.y },
            { x: item.x + item.width, y: item.y },
            { x: item.x + item.width, y: item.y + item.height },
            { x: item.x, y: item.y + item.height }
          ];
          return corners.some(c => isPointInPolygon(c, poly)) || 
                 poly.some(p => p.x >= item.x && p.x <= item.x + item.width && p.y >= item.y && p.y <= item.y + item.height);
        }).map(item => item.id);
        
        setSelectedItemIds(newlySelected);
        selectedItemIdsRef.current = newlySelected;
      }
      setIsLassoing(false);
      isLassoingRef.current = false;
      setLassoPath([]);
    }

    if (pendingToggleItemIdRef.current) {
      const tid = pendingToggleItemIdRef.current;
      setSelectedItemIds(prev => prev.includes(tid) ? prev.filter(id => id !== tid) : [...prev, tid]);
      pendingToggleItemIdRef.current = null;
    }

    isDraggingPanRef.current = false;
    isDraggingItemRef.current = false;
    isResizingItemRef.current = false;
    setIsDraggingPan(false);
    setIsDraggingItem(false);
    setIsResizingItem(false);
    pendingToggleItemIdRef.current = null;

    if ((e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    }
  };

  // --- Tablet Touch Handlers ---
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const dist = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
      const center = {
        x: (touch1.clientX + touch2.clientX) / 2,
        y: (touch1.clientY + touch2.clientY) / 2
      };
      lastTouchDist.current = dist;
      lastTouchCenter.current = { x: center.x - canvasOffset.x, y: center.y - canvasOffset.y };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      
      // 1. Pinch Zoom
      const dist = (Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY) - (lastTouchDist.current || 0)) * 0.5;
      setCanvasZoom(prev => Math.min(Math.max(prev + dist, 10), 150));
      lastTouchDist.current = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);

      // 2. Two-Finger Pan (Absolute screen coordinates for smoothness)
      const center = {
        x: (touch1.clientX + touch2.clientX) / 2,
        y: (touch1.clientY + touch2.clientY) / 2
      };
      if (lastTouchCenter.current !== null) {
        setCanvasOffset({
          x: center.x - lastTouchCenter.current.x,
          y: center.y - lastTouchCenter.current.y
        });
      }
    }
  };

  const handleTouchEnd = () => {
    lastTouchDist.current = null;
    lastTouchCenter.current = null;
  };

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Image = reader.result as string;



        // V128: Step 1 — Load original image to get dimensions, then show it immediately on canvas
        const img = new Image();
        img.onload = async () => {
          const newItemId = `item-${Date.now()}`;
          // V139: Mother image scales to 50%
          const scaledWidth = img.width * 0.5;
          const scaledHeight = img.height * 0.5;
          
          let newY = -scaledHeight / 2;
          let newX = -scaledWidth / 2;
          
          if (canvasItems.length > 0) {
            const leftMostItem = canvasItems.reduce((prev, current) => 
              (prev.x < current.x) ? prev : current
            );
            const bottomMostItem = canvasItems.reduce((prev, current) => 
              (prev.y + prev.height > current.y + current.height) ? prev : current
            );
            newX = leftMostItem.x;
            newY = bottomMostItem.y + bottomMostItem.height + 40;
          }

          const newItem: CanvasItem = {
            id: newItemId,
            type: 'upload',
            src: base64Image, // Show original immediately
            x: newX,
            y: newY,
            width: scaledWidth,
            height: scaledHeight,
            motherId: newItemId,
            parameters: null
          };

          setHistoryStates(prevH => [...prevH, canvasItems]);
          setCanvasItems(prev => [...prev, newItem]);
          setSelectedItemIds([newItemId]);
          setSitePlanImage(null);
          setActiveTab('create');
          setIsAnalyzing(true);
          setAnalysisStep('배경 이미지 최적화 중...'); // V155: Step — Background Regen

          // V128: Step 2 — Background regeneration, then replace src of existing item
          let finalBase64 = base64Image;
          try {
            const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
            const response = await ai.models.generateContent({
              model: IMAGE_GEN,
              contents: {
                parts: [
                  { inlineData: { data: base64Image.split(',')[1], mimeType: base64Image.split(';')[0].split(':')[1] } },
                  { text: "Recreate and enhance this architectural image exactly as it is without altering its geometry or perspective." }
                ]
              }
            });

            if (response.candidates && response.candidates[0]?.content?.parts) {
              for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                  finalBase64 = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                  console.log("[V128] Image regenerated. Replacing canvas item src:", newItemId);
                  // V128: Step 3 — Replace original with regenerated image in-place
                  setCanvasItems(prev => prev.map(item =>
                    item.id === newItemId ? { ...item, src: finalBase64 } : item
                  ));
                  break;
                }
              }
            }
          } catch (error) {
            console.error("[V128] Regeneration failed, keeping original:", error);
          }

          // V124/V128: Auto-trigger Phase 2 Analysis after regeneration
          analyzeViewpoint(finalBase64, newItemId);
        };
        img.src = base64Image;
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeViewpoint = async (base64Image: string, itemId?: string) => {
    setIsAnalyzing(true);
    setAnalysisStep('이미지 분석 중...'); // V155: Step — Analysis
    try {
      // Phase 1 & 2: Structural & Viewpoint Analysis using gemini-3.1-pro-preview
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const analysisPrompt = `
        Analyze this architectural image.
        [CRITICAL PRINCIPLE - CLOCK-FACE COORDINATE SYSTEM]
        1. Identify the architectural Main Facade first.
        2. Imagine looking down at a clock face drawn on the ground, with the building at the center. 
        3. Define the virtual camera's coordinates based on this strictly mapped clock-face:
           - 06:00 = Camera looking STRAIGHT AT the Main Facade (Primary_Facade).
           - 03:00 = Camera looking at the Right Side (Right_Facade).
           - 09:00 = Camera looking at the Left Side (Left_Facade).
           - 12:00 = Camera looking at the Rear/Back (Rear_Facade).
        4. Output the estimated angle (Where the camera is currently standing taking this photo) from the discrete options: 12:00, 1:30, 3:00, 04:30, 06:00, 07:30, 09:00, 10:30.
        
        Return estimated parameters in JSON format:
        {
          "angle": "One of: 12:00, 1:30, 3:00, 04:30, 06:00 (Straight Front), 07:30, 09:00, 10:30",
          "altitude_index": "0 to 7 (index of ALTITUDES constant)",
          "lens_index": "0 to 7 (index of LENSES constant)",
          "time_index": "0 to 7 (index of TIMES constant)",
          "site_plan_hint": "Description of building footprint",
          "elevation_parameters": {
            "1_macro_geometry": {
              "mass_typology": "Enum: Single_Block / L_Shape / U_Shape / Stepped / Cantilevered",
              "proportion_ratio": "String X:Y:Z",
              "floor_count": "Integer",
              "roof_form": "Enum: Flat / Pitched / Gable / Hip",
              "core_typology": "Enum: Center_Core / Side_Core / Rear_Core / Split_Core",
              "base_type": "Enum: Solid_Plinth / Piloti / Sunken"
            },
            "2_site_constraints": {
              "context_type": "Enum: Type_A_Urban_Dense / Type_B_Open_Detached",
              "blind_wall": "Boolean for Left/Right/Rear"
            },
            "3_material": {
              "base_material_type": "Enum: Exposed_Concrete / Brick_Masonry / Metal_Panel / Glass_CurtainWall / etc",
              "base_color_hex": "String hex code"
            },
            "4_fenestration": {
              "fenestration_type": "Enum: Punched_Window / Ribbon_Window / Curtain_Wall / Storefront",
              "window_to_wall_ratio": "Float 0.0~1.0"
            },
            "5_articulation": {
              "has_balcony": true/false,
              "has_vertical_fins": true/false
            },
            "6_mep_assets": {
              "spawn_hvac_unit": true/false
            }
          }
          }
        }
      `;

      const base64Data = base64Image.split(',')[1];
      const mimeType = base64Image.split(';')[0].split(':')[1];

      const runAnalysis = async (modelName: string) => {
        const result = await ai.models.generateContent({
          model: modelName,
          contents: {
            parts: [
              { inlineData: { data: base64Data, mimeType: mimeType } },
              { text: analysisPrompt },
            ],
          },
        });

        const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text || "";
        const jsonStr = responseText.match(/\{[\s\S]*\}/)?.[0];
        if (!jsonStr) throw new Error("No JSON returned from model");

        const data = JSON.parse(jsonStr);
        const aIdx = ANGLES.indexOf(data.angle);
        if (aIdx !== -1) setAngleIndex(aIdx);
        if (data.altitude_index !== undefined) setAltitudeIndex(Number(data.altitude_index));
        if (data.lens_index !== undefined) setLensIndex(Number(data.lens_index));
        if (data.time_index !== undefined) setTimeIndex(Number(data.time_index));
        
        // --- V152: PROTOCOL FAIL VERIFICATION (루프 브레이커) ---
        // 단방향 추론 (One-Way Inference) 원칙: 추출 정보가 불완전하면 즉결 처분(FAIL)하고 중단함 (좀비 객체 방지).
        const hasElevParams = data.elevation_parameters &&
                              data.elevation_parameters['1_macro_geometry'] &&
                              data.elevation_parameters['2_site_constraints'] &&
                              data.elevation_parameters['3_material'] &&
                              data.elevation_parameters['4_fenestration'] &&
                              data.elevation_parameters['5_articulation'];

        if (!hasElevParams) {
          console.error('[PROTOCOL-FAIL] Phase 2 검증 실패: 필수 건축 파라미터(AEPL) 스키마가 누락되었거나 환각 텍스트가 반환되었습니다.');
          setCanvasItems(prev => prev.filter(item => item.id !== itemId));
          setIsAnalyzing(false);
          setIsGenerating(false);
          return false;
        }
        console.log('[PROTOCOL-PASS] Phase 2 검증 통과: 파라미터 완전성 확인');
        // --------------------------------------------------------

        const analyzedOpt = {
          angle: data.angle,
          altitude: ALTITUDES[Number(data.altitude_index) || 0]?.label || 'N/A',
          lens: LENSES[Number(data.lens_index) || 0]?.label || 'N/A',
          time: TIMES[Number(data.time_index) || 0] || 'N/A'
        };
        setAnalyzedOpticalParams(analyzedOpt);
        setElevationParams(data.elevation_parameters || null);
        
        // Update the newly uploaded Mother item with the analyzed data
        const newParams = {
          angleIndex: aIdx !== -1 ? aIdx : 4,
          altitudeIndex: Number(data.altitude_index) || 2,
          lensIndex: Number(data.lens_index) || 0,
          timeIndex: Number(data.time_index) || 2,
          analyzedOpticalParams: analyzedOpt,
          elevationParams: data.elevation_parameters || null,
          sitePlanImage: null,
          architecturalSheetImage: null
        };

        setCanvasItems(prev => prev.map(item => 
          item.id === itemId ? { ...item, parameters: newParams } : item
        ));
        
        // After parameter analysis, trigger individual elevation generation with extracted params
        await generateElevations(base64Image, data.elevation_parameters, itemId);
        return true;
      };

      try {
        await runAnalysis(ANALYSIS);
      } catch (primaryError) {
        console.warn(`Primary model (${ANALYSIS}) failed, retrying with fallback...`, primaryError);
        const success = await runAnalysis(ANALYSIS_FALLBACK);
        if (!success) throw new Error("Fallback failed");
      }

    } catch (err) {
      console.warn("Analysis failed completely, using defaults", err);
      alert("분석 API 호출이 실패하거나 할당량(Quota)을 초과했습니다. 기본값으로 세팅됩니다.");
    } finally {
      setIsAnalyzing(false);
      setAnalysisStep(''); // V155: 메시지 초기화
    }
  };


  const generateElevations = async (base64Image: string, extractedParams?: any, itemId?: string) => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const contextualParamsStr = extractedParams ? JSON.stringify(extractedParams) : "Utilize implicit building context";

      setAnalysisStep('입면 데이터 생성 중...');

      const base64Data = base64Image.split(',')[1];
      const mimeType = base64Image.split(';')[0].split(':')[1];

      const viewConfigs = [
        { key: 'front', label: 'FRONT', angle: '06:00' },
        { key: 'right', label: 'RIGHT', angle: '03:00' },
        { key: 'rear',  label: 'REAR',  angle: '12:00' },
        { key: 'left',  label: 'LEFT',  angle: '09:00' },
        { key: 'top',   label: 'TOP',   angle: 'TOP_VIEW' } 
      ];

      const generateOne = async (config: typeof viewConfigs[0]) => {
        const prompt = `
          [Architectural Elevation Generation Protocol - System Protocol V180]
          TASK: Generate a single ${config.label} orthographic view of the building.
          
          [CONTEXT]
          - Source Image: Use the uploaded photo for material/texture truth.
          - Architectural Parameters: ${contextualParamsStr}
          
          [SPECIFICATION]
          - View: ${config.label === 'TOP' ? 'Top-down Roof Plan' : `Elevation from ${config.angle} (o'clock)`}
          - Projection: True Orthographic (FOV=0), zero perspective.
          - Style: Realistic architectural rendering, matching the source texture.
          - Background: Pure Transparent Background (Optical Null Space).
          - Orientation: ${config.label === 'TOP' ? 'Align Front (06:00) to Bottom of frame' : 'Straight on elevation'}
          
          CONSTRAINTS: NO text, NO labels, No perspective distortion.
        `.trim();

        const result = await ai.models.generateContent({
          model: IMAGE_GEN,
          contents: {
            parts: [
              { inlineData: { data: base64Data, mimeType: mimeType } },
              { text: prompt },
            ],
          },
        });

        if (result.candidates?.[0]?.content?.parts) {
          for (const part of result.candidates[0].content.parts) {
            if (part.inlineData) {
              return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
          }
        }
        return null;
      };

      // Generate all 4 views in parallel
      const results = await Promise.all(viewConfigs.map(config => generateOne(config)));
      
      const newImages = {
        front: results[0],
        right: results[1],
        rear:  results[2],
        left:  results[3],
        top:   results[4]
      } as const;

      setElevationImages(newImages);
      // V180: Use TOP VIEW for sitePlanImage compat
      if (newImages.top) setSitePlanImage(newImages.top);

      if (itemId) {
        setCanvasItems(prev => prev.map(item => {
          if (item.id === itemId && item.parameters) {
            return {
              ...item,
              parameters: {
                ...item.parameters,
                elevationImages: newImages,
                sitePlanImage: newImages.top
              }
            };
          }
          return item;
        }));
      }

    } catch (err) {
      console.warn("Elevation generation failed", err);
    } finally {
      setAnalysisStep('');
    }
  };

  // ---
  // PHASE 4: SYNTHESIS & GENERATION
  // Layer A (Geometry) + Layer B (5-IVSP Viewpoint) + Layer C (Property Slave)
  // ---
  const handleGenerate = async () => {
    const sourceItem = selectedItemIds[0] 
      ? canvasItems.find(item => item.id === selectedItemIds[0]) 
      : (canvasItems.length > 0 ? canvasItems[0] : null);

    if (!sourceItem) {
      alert("Please upload at least one image first.");
      return;
    }

    // --- V153: PHASE 3 검증 (Viewpoint Configuration Validation) ---
    const isValidPhase3 = ANGLES[angleIndex] && ALTITUDES[altitudeIndex] && LENSES[lensIndex] && TIMES[timeIndex];
    if (!isValidPhase3) {
      console.error('[PROTOCOL-FAIL] Phase 3 검증 실패: 유효하지 않은 5-IVSP 시점 파라미터가 감지되어 재추론을 시도합니다.');
      return; // 국지적 중단 (UI 상태를 끄지는 않고 함수만 빠져나와 사용자가 다시 시도하도록 유도)
    }
    console.log('[PROTOCOL-PASS] Phase 3 검증 통과: 5-IVSP 파라미터 셋업 유효함');

    // --- V153: PHASE 4 Pre-flight 검증 (Integration Validation) ---
    // 양손역부족 확인: 원본 데이터(Geometry)와 분석된 파라미터(Property)가 모두 존재하는지 확인
    const hasEnsemblePair = sourceItem.src && elevationParams && Object.keys(elevationParams).length > 0;
    if (!hasEnsemblePair) {
      console.error('[PROTOCOL-FAIL] Phase 4 (Pre-flight) 검증 실패: ensemble_pair 불일치. 재질/속성 파라미터가 누락되었습니다. 과거 정보를 역추적하지 않고 이 시점(Phase 4 시작점)에서 재가동 가능성을 타진합니다.');
      alert('건축 파라미터 속성이 누락되어 렌더링을 차단합니다. 다시 생성 버튼을 눌러주세요.');
      return; // 중단 (단방향 룰에 따라 돌아가지 않음)
    }
    console.log('[PROTOCOL-PASS] Phase 4 (Pre-flight) 검증 통과: 양손역부족 통과, ensemble_pair 무결성 확인');

    // V102: Check if this is the first generation for this mother image
    const hasInitialViews = canvasItems.some(i => i.type === 'generated' && (i.motherId === sourceItem.id || (i.motherId === undefined && i.id === sourceItem.id)));
    const isFirstTime = sourceItem.type === 'upload' && !hasInitialViews;

    setIsGenerating(true);
    // V157: Initialize AbortController
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const v0_angle    = analyzedOpticalParams?.angle    || 'Unknown';
      const v0_altitude = analyzedOpticalParams?.altitude || 'Unknown';
      const v0_lens     = analyzedOpticalParams?.lens     || 'Unknown';
      const v0_time     = analyzedOpticalParams?.time     || 'Unknown';

      const getAngle = (base: string) => {
        if (['07:30', '09:00', '10:30'].includes(base)) return '07:30';
        return '04:30';
      };

      const getSemanticAngle = (base: string) => {
        switch (base) {
          case '06:00': return '06:00 (Direct Front / Primary Facade View)';
          case '04:30': return '04:30 (Front-Right Corner View / 2-Point Perspective)';
          case '03:00': return '03:00 (Direct Right Side / Profile View)';
          case '01:30': return '01:30 (Rear-Right Corner View / 2-Point Perspective)';
          case '12:00': return '12:00 (Direct Rear / Complete Back View)';
          case '10:30': return '10:30 (Rear-Left Corner View / 2-Point Perspective)';
          case '09:00': return '09:00 (Direct Left Side / Profile View)';
          case '07:30': return '07:30 (Front-Left Corner View / 2-Point Perspective)';
          default: return base;
        }
      };
      const viewsToGenerate = [{
        name: "Custom View",
        angle: ANGLES[angleIndex],
        altitude: ALTITUDES[altitudeIndex].label,
        lens: LENSES[lensIndex].label,
        distance: "Standard",
        scenario: determineScenario(ANGLES[angleIndex], ALTITUDES[altitudeIndex].value, LENSES[lensIndex].value),
      }];

      let actualImageSrc = sourceItem.src;
      // V82: If generating from a generated image, we MUST use the mother image's src for the AI!
      if (sourceItem.type === 'generated' && sourceItem.motherId) {
        const motherItem = canvasItems.find(i => i.id === sourceItem.motherId);
        if (motherItem) {
          actualImageSrc = motherItem.src;
        }
      }

      const base64Data = actualImageSrc.split(',')[1];
      const mimeType = actualImageSrc.split(';')[0].split(':')[1];

      const generatePromises = viewsToGenerate.map(async (viewConfig) => {
        const currentTime = TIMES[timeIndex];

        const layerB_viewpoint = `
# ACTION PROTOCOL (MANDATORY EXECUTION WORKFLOW)
## Pre-Step: Reality Anchoring & Camera Delta Calculation
- V₀ (Current Camera Position):
    Angle: ${v0_angle} o'clock | Altitude: ${v0_altitude} | Lens: ${v0_lens} | Time: ${v0_time}
    This is the exact camera position of IMAGE 1 (Source of Truth).
- V₁ (Target Camera Position):
    Angle: ${getSemanticAngle(viewConfig.angle)} | Altitude: ${viewConfig.altitude} | Lens: ${viewConfig.lens} | Time: ${currentTime}
- Δ Movement Vector: Orbit from ${v0_angle} → ${viewConfig.angle}
    CRITICAL CONSTRAINT: You MUST execute this precise Physical Camera Orbit. DO NOT simply output the V₀ view again.

## Step 1: Coordinate Anchoring & Vector Calculation
- Clock-face Protocol: 06:00 = Front, 03:00 = Right, 09:00 = Left, 12:00 = Rear.
- Target Vector: ${getSemanticAngle(viewConfig.angle)}
- Constraint: The output image MUST clearly display the ${getSemanticAngle(viewConfig.angle)} view, utilizing IMAGE 2 as the geometric blueprint for that side.

## Step 2: Scenario Mapping & Optical Engineering
- Scenario: ${viewConfig.scenario}
- Lens: ${viewConfig.lens}
- Time of Day: ${currentTime}`;

        const layerC_property = elevationParams 
          ? `
## Step 5: Structural & Material Parameters (PHASE 2 AEPL Data — Immutable)
- Mass Typology: ${elevationParams['1_macro_geometry']?.mass_typology || 'N/A'}
- Roof Form: ${elevationParams['1_macro_geometry']?.roof_form || 'N/A'}
- Core Typology: ${elevationParams['1_macro_geometry']?.core_typology || 'N/A'}
- Standard Context: ${elevationParams['2_site_constraints']?.context_type || 'N/A'}
- Base Material: ${elevationParams['3_material']?.base_material_type || 'N/A'}
- Fenestration: ${elevationParams['4_fenestration']?.fenestration_type || 'N/A'}
- Balcony/Projection: ${elevationParams['5_articulation']?.has_balcony || 'False'}`
          : '';

        const layerC_blindspot = `
## Step 3: Layering & Blind Spot Inference (Void Mitigation)
- Context Void Mitigation: If orbiting to Rear (12:00) or Side, synchronize Foreground/Background. Spawn the adjacent building's mass scale and skyline contour as background context to prevent a white spatial void.
- Geometry/Texture Void Mitigation: Adhere strictly to the "ensemble_pair" rule. DO NOT hallucinate arbitrary forms. Focus 100% of pixel generation on "Surface Texture" and "Dynamic AO (Ambient Occlusion)" for depth. Extract Design DNA from Front to logically place Service Doors/MEP details on blind spots.
- Material Injection: Lock original textures. Apply Relighting only for new solar angle (${currentTime}).`;

        let activeElevationSlots = getElevationSlot(viewConfig.angle);
        if (activeElevationSlots.length === 0) activeElevationSlots = getElevationSlot("06:00");
        const elevationLabel = activeElevationSlots.map(s => s.label).join('+');

        const finalPrompt = `
# SYSTEM: 5-Point Integrated Viewpoint Simulation Architect (5-IVSP)

# GOAL
Change the angle of view of the provided architectural image to a specific new perspective without altering the building's original geometry, materials, or style. Execute a "Physical Movement Command" within a completed 3D reality — precise Coordinate-Based Virtual Photography.

# INPUT IMAGES
- IMAGE 1 (Primary): The original uploaded architectural photo. Source of Truth for materials and visible geometry.
${activeElevationSlots.length === 1
  ? `- IMAGE 2 (Geometric Reference): The pre-computed ${elevationLabel} elevation orthographic drawing, generated by PHASE 2 architectural inference. Use this as the STRICT geometric blueprint for the target viewpoint. The architectural form, proportions, and element placement MUST be reflected in the output.`
  : `- IMAGE 2 (Geometric Reference A): The pre-computed ${activeElevationSlots[0].label} elevation — first adjacent face for this corner viewpoint.
- IMAGE 3 (Geometric Reference B): The pre-computed ${activeElevationSlots[1]?.label || activeElevationSlots[0].label} elevation — second adjacent face for this corner viewpoint.
  Both elevations are pre-computed by PHASE 2. Use them as the STRICT geometric blueprint. The 2-Point Perspective output MUST integrate both faces correctly.`
}

# CONTEXT
- Ontological Status: The input image is a "Completed Architectural Reality." Fixed physical object, not a sketch.
- Geometric Sanctuary: The building's proportions, structure, and ALL details are Immutable Constants. Only the observer (Brown Point) moves.
- Operational Logic: Intuition-to-Coordinate Translation applied.

# ROLE
Coordinate Controller & Virtual Architectural Photographer.
${layerB_viewpoint}
${layerC_blindspot}
${layerC_property}

## Step 4: Final Execution & Compliance Check
- Command: Orbit the Brown Point to the target coordinate and capture the Completed Reality using the optical setup from Step 2.
- Compliance:
  [ ] Original geometry preserved 100%? (No Hallucination)
  [ ] Perspective mathematically correct? (No Distortion)
  [ ] Blind spot logically inferred? (No Blank Spaces)
  [ ] IMAGE 2 elevation geometry reflected in output? (No Deviation)

[GENERATE IMAGE NOW]
        `.trim();

        const runGen = async (modelName: string) => {
          const parts: any[] = [
            { inlineData: { data: base64Data, mimeType: mimeType } },
          ];

          if (elevationImages) {
            for (const slot of activeElevationSlots) {
              const viewKey = slot.label.toLowerCase() as keyof typeof elevationImages;
              const imgData = (elevationImages as any)[viewKey];
              if (imgData) {
                const imgBase64 = imgData.split(',')[1];
                parts.push({ inlineData: { data: imgBase64, mimeType: 'image/png' } });
                console.log(`[V180] Injecting direct elevation: ${slot.label}`);
              }
            }
          }

          parts.push({ text: finalPrompt });

          const response = await ai.models.generateContent({
            model: modelName,
            contents: { parts },
          });

          // [V162] CANCEL 예외 처리: API 응답을 받았으나 이미 취소 상태인 경우 버림
          if (!abortControllerRef.current || abortControllerRef.current.signal.aborted) {
            console.log("[V162] Generation aborted by user, discarding API result.");
            return false;
          }

          let validImageGenerated = false;

          if (response.candidates && response.candidates[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
              if (part.inlineData) {
                validImageGenerated = true;
                const generatedSrc = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                
                await new Promise<void>((resolve) => {
                  const img = new Image();
                  img.onload = () => {
                    // V109: Reverse-lookup exact indices from viewConfig to snapshot each image's true params
                    let snapAngleIndex = Math.max(0, ANGLES.findIndex(a => viewConfig.angle.startsWith(a)));
                    if (viewConfig.name === "Street View") {
                      // V111: Explicit index matching for Street View since prompt is "AI Choice..."
                      const baseAngle = v0_angle === 'Unknown' ? '06:00' : v0_angle;
                      const cornerAngle = getAngle(baseAngle);
                      snapAngleIndex = Math.max(0, ANGLES.findIndex(a => a === cornerAngle));
                    }

                    const snapLensIndex  = Math.max(0, LENSES.findIndex(l => viewConfig.lens.includes(String(l.value))));
                    
                    // V111: Robust parsing for altitude using regex to avoid partial matches (e.g. 150m matching 0m)
                    const altMatch = viewConfig.altitude.match(/^(-?\d+(\.\d+)?)m/);
                    const altValue = altMatch ? parseFloat(altMatch[1]) : 1.6;
                    const snapAltIndex = Math.max(0, ALTITUDES.findIndex(a => a.value === altValue));

                    // V139: Generated image scales to 30%
                    const generatedScaledWidth = img.width * 0.3;
                    const generatedScaledHeight = img.height * 0.3;

                    // V161: 생성 이미지 전용 Optical Parameter 재구성 (새로운 시점 갱신)
                    const updatedOpticalParams = {
                      angle: ANGLES[snapAngleIndex],
                      altitude: ALTITUDES[snapAltIndex].label,
                      lens: LENSES[snapLensIndex].label,
                      time: TIMES[timeIndex]
                    };

                    const newGenItem: CanvasItem = {
                      id: `gen-${Date.now()}-${Math.floor(Math.random()*1000)}`,
                      type: 'generated',
                      src: generatedSrc,
                      x: 0,
                      y: sourceItem.y,
                      width: generatedScaledWidth,
                      height: generatedScaledHeight,
                      motherId: sourceItem.motherId || sourceItem.id,
                      parameters: {
                        angleIndex:    snapAngleIndex,
                        altitudeIndex: snapAltIndex,
                        lensIndex:     snapLensIndex,
                        timeIndex,
                        analyzedOpticalParams: updatedOpticalParams, // V161 Update
                        elevationParams,
                        sitePlanImage,
                        elevationImages
                      }
                    };
                    
                    setCanvasItems(prev => {
                      setHistoryStates(prevH => [...prevH, prev]);

                      // V139: Determine placement
                      const motherItem = sourceItem;
                      const siblingsInPrev = prev.filter(i => i.type === 'generated' && (i.motherId === motherItem.id || i.motherId === motherItem.motherId));
                      const isFirstGenerated = siblingsInPrev.length === 0;

                      let currentX: number;
                      let currentY: number;

                      if (isFirstGenerated) {
                        // V143: First generated image: right of mother, bottom aligned to 25% down the mother's height
                        currentX = motherItem.x + motherItem.width + 120;
                        currentY = (motherItem.y + motherItem.height * 0.25) - generatedScaledHeight;
                      } else {
                        // V146: Subsequent images: vertical stack below the bottom-most sibling
                        const bottomMostSibling = siblingsInPrev.reduce((prevBot, curr) => 
                          (curr.y + curr.height > prevBot.y + prevBot.height) ? curr : prevBot,
                          siblingsInPrev[0]
                        );
                        currentX = bottomMostSibling.x;
                        currentY = bottomMostSibling.y + bottomMostSibling.height + 96;
                      }

                      newGenItem.x = currentX;
                      newGenItem.y = currentY;

                      return [...prev, newGenItem];
                    });
                    setSelectedItemIds([newGenItem.id]);
                    // Single view manually triggered changes instantly
                    // Batch view shouldn't swap tab wildly, but result is fine
                    if (!isFirstTime) setActiveTab('result');
                    resolve();
                  };
                  img.src = generatedSrc;
                });
                return true;
              }
            }
          }
          
          // --- V153: PHASE 4 Post-flight 검증 ---
          if (!validImageGenerated) {
             console.error('[PROTOCOL-FAIL] Phase 4 (Post-flight) 검증 실패: 유효한 렌더링 이미지가 반환되지 않았습니다. API 재호출(Phase 4 재추론)을 시도합니다.');
          } else {
             console.log('[PROTOCOL-PASS] Phase 4 (Post-flight) 검증 통과: 유효한 통합 이미지 렌더링 성공');
          }
          return validImageGenerated;
        };

        try {
          const success = await runGen(IMAGE_GEN);
          if (!success) throw new Error("Fallback needed");
        } catch (e) {
          const successFallback = await runGen(IMAGE_GEN_FALLBACK);
          if (!successFallback) {
             console.error("Failed to generate view with fallback");
          }
        }
      }); // End of viewsToGenerate map

      await Promise.all(generatePromises);

    } catch (error) {
      console.error("Generation Error:", error);
      alert("An error occurred during generation.");
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  // V157: Cancel handler
  const handleCancelGenerate = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsGenerating(false);
      console.log("[V157] Generation canceled by user.");
    }
  };

  const currentSourceItem = selectedItemIds[0] ? canvasItems.find(item => item.id === selectedItemIds[0]) : (canvasItems.length > 0 ? canvasItems[0] : null);
  const isSelectedItemUpload = currentSourceItem?.type === 'upload';
  const hasInitialViews = canvasItems.some(i => i.type === 'generated' && (i.motherId === currentSourceItem?.id || (i.motherId === undefined && i.id === currentSourceItem?.id)));
  
  // V162: 파생 이미지(Generated Item) 슬라이더 조작 비활성화 롤백
  const isGeneratedItemSelected = currentSourceItem?.type === 'generated';
  const areSlidersLocked = isAnalyzing || isGenerating || isGeneratedItemSelected;

  return (
    <div className={`
      h-[100dvh] w-full flex flex-col overflow-hidden select-none touch-none
      bg-[#fcfcfc] dark:bg-[#050505] text-black dark:text-white
      ${isLassoing ? 'cursor-crosshair' : ''}
    `}>
      {/* HEADER */}
      <header className="h-[54px] shrink-0 flex justify-between items-center px-4 border-b border-black/10 dark:border-white/10 bg-white/90 dark:bg-black/90 backdrop-blur-sm transition-colors duration-300">
        <div className="flex items-center gap-3">
          <span className="text-[1.575rem] font-display font-bold tracking-[0.0125em] uppercase leading-tight pt-1">CAI</span>
          <span className="text-[1.575rem] font-display font-bold tracking-[0.0125em] uppercase leading-tight pt-1">CANVAS</span>
        </div>
        <div className="flex items-center gap-6 font-mono text-xs leading-normal tracking-wide uppercase">
          <button onClick={toggleTheme} className="hover:opacity-60 transition-opacity">
            {theme === 'light' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex flex-1 min-h-0 w-full flex-col landscape:flex-row overflow-hidden relative">
        
        <section 
          ref={canvasRef as React.RefObject<HTMLElement>}
          className={`flex-1 relative overflow-hidden transition-all duration-300 ${canvasMode === 'pan' ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onDragStart={(e) => e.preventDefault()}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* V114: SVG Overlay Layer for UI helpers (Lasso, etc) */}
          <div className="absolute inset-0 pointer-events-none z-[100]">
            {/* Lasso Selection SVG- V188: Corrected Coordinate System */}
            {isLassoing && lassoPath.length > 1 && (
              <svg
                key="lasso-svg"
                className="absolute inset-0 w-full h-full pointer-events-none z-[100]"
                style={{ overflow: 'visible' }}
              >
                <g style={{ transform: `translate(${canvasOffset.x + window.innerWidth/2}px, ${canvasOffset.y + window.innerHeight/2}px) scale(${canvasZoom/100})` }}>
                  <path
                    d={`M ${lassoPath.map(p => `${p.x} ${p.y}`).join(' L ')} Z`}
                    fill="rgba(30, 144, 255, 0.05)"
                    stroke="rgb(30, 144, 255)"
                    strokeWidth={2 / (canvasZoom/100)}
                    strokeDasharray={`${4 / (canvasZoom/100)} ${4 / (canvasZoom/100)}`}
                  />
                </g>
              </svg>
            )}
          </div>

          {/* V173/V174: Integrated Left Tool Bar Area - Now FIXED OUTSIDE Scale Layer */}
          <div className="absolute left-[12px] top-1/2 -translate-y-1/2 z-30 flex flex-col items-center pointer-events-none">
            {/* Main Control Bar */}
            <div 
              className={`
                flex flex-col items-center gap-2
                bg-white/80 dark:bg-black/80 border border-black/10 dark:border-white/10 pointer-events-auto
                transition-all duration-300 rounded-full py-2 w-11 backdrop-blur-sm
              `}
              style={{
                boxShadow: '0 4px 16px rgba(0,0,0,0.08)'
              }}
            >
              {/* 1. 도구 모드 (Toggle: Select / Pan) */}
              <button 
                onClick={() => setCanvasMode(canvasMode === 'select' ? 'pan' : 'select')}
                className={`w-8 h-8 flex items-center justify-center rounded-full transition-all bg-black text-white dark:bg-white dark:text-black hover:cursor-pointer`}
                title={canvasMode === 'select' ? 'Switch to Pan Mode' : 'Switch to Select Mode'}
              >
                {canvasMode === 'select' ? <MousePointer2 size={18} /> : <Hand size={18} />}
              </button>

              <div className="w-6 h-[1px] bg-black/10 dark:bg-white/10 my-1" />

              {/* 2. Undo & Redo Buttons */}
              <button 
                onClick={handleUndo}
                disabled={historyStates.length === 0}
                className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors ${historyStates.length === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-black/5 dark:hover:bg-white/5 hover:cursor-pointer'}`}
                title="Undo"
              >
                <Undo size={18} />
              </button>
              <button 
                onClick={handleRedo}
                disabled={redoStates.length === 0}
                className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors ${redoStates.length === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-black/5 dark:hover:bg-white/5 hover:cursor-pointer'}`}
                title="Redo"
              >
                <Redo size={18} />
              </button>

              <div className="w-6 h-[1px] bg-black/10 dark:bg-white/10 my-1" />

              {/* 3. Search (Expandable Zoom Interface) */}
              <div className="relative">
                <button 
                  onClick={() => setIsSearchExpanded(!isSearchExpanded)} 
                  className={`w-8 h-8 flex items-center justify-center rounded-full transition-all ${isSearchExpanded ? 'bg-black text-white dark:bg-white dark:text-black' : 'hover:bg-black/5 dark:hover:bg-white/5 hover:cursor-pointer'}`}
                  title="Zoom Controls"
                >
                  <Search size={16} />
                </button>

                {/* Horizontal Expanded Bar */}
                {isSearchExpanded && (
                  <div 
                    className="absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2 flex items-center bg-white/80 dark:bg-black/80 border border-black/10 dark:border-white/10 rounded-full h-11 px-2 backdrop-blur-sm"
                    style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
                  >
                    {/* Fit Screen (Corners only icon) */}
                    <button 
                      onClick={handleFocus} 
                      className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors hover:cursor-pointer" 
                      title="Fit to Screen"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M15 3h6v6M9 21H3v-6M21 15v6h-6M3 9V3h6" />
                      </svg>
                    </button>

                    <div className="w-[1px] h-7 bg-black/10 dark:bg-white/10 mx-1" />

                    {/* Zoom Level */}
                    <div className="flex items-center">
                      <button onClick={() => zoomStep(-1)} className="w-9 h-9 flex items-center justify-center rounded-full font-mono text-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors hover:cursor-pointer">−</button>
                      <div className="min-w-[50px] text-center font-mono text-xs font-bold">{Math.round(canvasZoom)}%</div>
                      <button onClick={() => zoomStep(1)} className="w-9 h-9 flex items-center justify-center rounded-full font-mono text-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors hover:cursor-pointer">+</button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* V174: Relocated Independent Upload Button (Desired 18px gap between circles) */}
            {/* Toolbar has py-2 (8px), so mt-[10px] makes total 18px gap */}
            <div className="mt-[10px] flex flex-col items-center">
              <button 
                onClick={() => fileInputRef.current?.click()} 
                className="w-11 h-11 flex items-center justify-center rounded-full bg-black text-white hover:bg-neutral-800 transition-colors shadow-lg pointer-events-auto hover:cursor-pointer"
                title="Upload Image"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7" />
                  <line x1="16" y1="5" x2="22" y2="5" />
                  <line x1="19" y1="2" x2="19" y2="8" />
                  <path d="M7 16l3-3 2 2 4-4 3 3" />
                </svg>
              </button>
              <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
            </div>
          </div>

          <div 
            className="absolute inset-0 transition-transform duration-75 ease"
            style={{ 
              transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px) scale(${canvasZoom / 100})`,
              transformOrigin: 'center'
            }}
          >

          {/* Transform Wrapper */}
          <div 
            className="w-full h-full flex items-center justify-center relative touch-none pointer-events-none"
          >
            {/* Infinite Composite Grid Background (5x5 Module, 60px/12px) */}
            <div 
              className="absolute pointer-events-none"
              style={{
                top: '-15000px', left: '-15000px',
                width: '30000px', height: '30000px',
                backgroundColor: 'rgba(0, 0, 255, 0.01)',
                backgroundImage: `
                  linear-gradient(to right, rgba(128,128,128,0.1) 1px, transparent 1px),
                  linear-gradient(to bottom, rgba(128,128,128,0.1) 1px, transparent 1px),
                  linear-gradient(to right, rgba(128,128,128,0.2) 1px, transparent 1px),
                  linear-gradient(to bottom, rgba(128,128,128,0.2) 1px, transparent 1px)
                `,
                backgroundSize: '12px 12px, 12px 12px, 60px 60px, 60px 60px',
                zIndex: -1
              }}
            />

            {/* Render Canvas Items (V56: Standardized Center-Origin Rendering) */}
            {canvasItems.map((item) => (
              <div 
                key={item.id}
                style={{ 
                  position: 'absolute',
                  // V56 Fix: Align item 0,0 with screen center (50%) to match getCanvasCoords math
                  left: `calc(50% + ${item.x}px)`,
                  top: `calc(50% + ${item.y}px)`,
                  width: item.width,
                  height: item.height,
                  zIndex: selectedItemIds.includes(item.id) ? 20 : 10,
                  // Disable pointer events on items during PAN mode to allow background panning
                  pointerEvents: canvasMode === 'pan' ? 'none' : 'auto',
                  cursor: 'inherit'
                }}
              >
                <img 
                  src={item.src} 
                  alt={item.id} 
                  className="w-full h-full object-contain pointer-events-none shadow-xl border border-black/5 dark:border-white/5"
                  referrerPolicy="no-referrer"
                  draggable={false}
                />
                
                {/* V136: Hide labels if zoom is 30% or less (V173 adjusted) */}
                {(() => {
                  if (canvasZoom <= 30) return null;
                  const labelText = item.type === 'upload'
                    ? 'ORIGINAL'
                    : (() => {
                        const siblings = canvasItems.filter(i => i.type === 'generated' && (i.motherId === item.motherId || i.motherId === item.id));
                        const viewIdx = siblings.findIndex(s => s.id === item.id);
                        return `VIEWPOINT ${String(viewIdx + 1).padStart(2, '0')}`;
                      })();
                  return (
                    <div
                      className="absolute bottom-0 left-1/2 pointer-events-none z-[25] origin-top"
                      style={{ 
                        transform: `translateX(-50%) translateY(100%) scale(${1 / (canvasZoom / 100)})`,
                        paddingTop: '12px',
                        lineHeight: 1
                      }}
                    >
                      <span className="font-mono text-[15px] tracking-widest uppercase opacity-40 whitespace-nowrap">
                        {labelText}
                      </span>
                    </div>
                  );
                })()}
                
                {/* Selection Overlay (Blue Border & Circle Handles) */}
                {selectedItemIds.includes(item.id) && (
                  <div 
                    className="absolute -inset-[1px] pointer-events-none border-[#1d4ed8] z-[30]"
                    style={{ 
                      // 1.2pt ≈ 1.6px
                      borderWidth: `${1.6 / (canvasZoom / 100)}px`
                    }}
                  >
                    {/* V80/V81: Floating Control Bar for All Images */}
                    <div 
                      className={`absolute flex items-center bg-white/70 dark:bg-black/70 backdrop-blur-md z-[40] px-1.5 rounded-full pointer-events-auto transition-all duration-300`}
                      style={{
                        top: `-${56 / (canvasZoom / 100)}px`,
                        right: 0,
                        height: `${44 / (canvasZoom / 100)}px`,
                        boxShadow: '0 4px 16px rgba(0,0,0,0.08)'
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                    >
                      {/* V182: Add Copy (Duplicate) button at the leftmost */}
                      <button 
                        onClick={() => {
                          const newItem: CanvasItem = {
                            ...item,
                            id: `${item.id}-copy-${Date.now()}`,
                            x: item.x + 40,
                            y: item.y + 40,
                          };
                          setCanvasItems(prev => [...prev, newItem]);
                          setSelectedItemIds([newItem.id]);
                        }}
                        className="flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors rounded-full"
                        style={{ width: `${36 / (canvasZoom / 100)}px`, height: `${36 / (canvasZoom / 100)}px` }}
                        title="복제 (Duplicate)"
                      >
                        <svg width={12 / (canvasZoom / 100)} height={12 / (canvasZoom / 100)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                      </button>
                      <div className="w-[1px] bg-black/10 dark:bg-white/10 mx-0.5" style={{ height: (28 / (canvasZoom / 100)) + 'px' }} />

                      {item.type === 'generated' && (
                        /* V82: Add Download button for generated images */
                        <>
                          <a 
                            href={item.src}
                            download="simulation.png"
                            className="flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors rounded-full"
                            style={{ width: `${36 / (canvasZoom / 100)}px`, height: `${36 / (canvasZoom / 100)}px` }}
                            title="다운로드"
                          >
                            <Download size={14 / (canvasZoom / 100)} />
                          </a>
                          <div className="w-[1px] bg-black/10 dark:bg-white/10 mx-0.5" style={{ height: (28 / (canvasZoom / 100)) + 'px' }} />
                        </>
                      )}
                      {/* V180: Library button enabled concurrently with GENERATE button */}
                      <button 
                        onClick={() => {
                          const isOpening = openLibraryItemId !== item.id;
                          setOpenLibraryItemId(isOpening ? item.id : null);
                          if (isOpening) setArtboardPage(1); 
                        }}
                        disabled={!item.parameters?.analyzedOpticalParams && item.type !== 'generated'}
                        className={`flex items-center justify-center transition-all rounded-full ${openLibraryItemId === item.id ? 'bg-black/10 dark:bg-white/10' : 'hover:bg-black/5 dark:hover:bg-white/5'} ${(!item.parameters?.analyzedOpticalParams && item.type !== 'generated') ? 'opacity-20 cursor-not-allowed' : 'opacity-100'}`}
                        style={{ width: `${36 / (canvasZoom / 100)}px`, height: `${36 / (canvasZoom / 100)}px` }}
                        title="라이브러리 (아트보드)"
                      >
                        <Book size={12 / (canvasZoom / 100)} />
                      </button>
                      <div className="w-[1px] bg-black/10 dark:bg-white/10 mx-0.5" style={{ height: (28 / (canvasZoom / 100)) + 'px' }} />
                      <button 
                        onClick={() => {
                          setHistoryStates(prevH => [...prevH, canvasItems]);
                          setRedoStates([]);
                          setCanvasItems(prev => prev.filter(i => i.id !== item.id && i.motherId !== item.id));
                          setSelectedItemIds([]);
                        }}
                        className="flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-red-500 rounded-full"
                        style={{ width: `${36 / (canvasZoom / 100)}px`, height: `${36 / (canvasZoom / 100)}px` }}
                        title="삭제"
                      >
                        <Trash2 size={12 / (canvasZoom / 100)} />
                      </button>
                    </div>

                    {/* V75/V81/V160: Item-bound Library Artboard */}
                    {openLibraryItemId === item.id && (
                      <div 
                        className="absolute flex flex-col bg-white/90 dark:bg-[#1E1E1E]/90 backdrop-blur-xl shadow-xl rounded-2xl p-6 pointer-events-auto cursor-default"
                        style={{
                          left: 'calc(100% + 12px)',
                          top: 0,
                          width: '800px',
                          height: '600px',
                          border: 'none',
                        }}
                        onPointerDown={(e) => e.stopPropagation()}
                      >
                        {/* V180: Header & Tabs */}
                        <div className="flex justify-between items-center mb-4 shrink-0">
                          <span className="font-mono text-xs tracking-widest uppercase font-bold text-black/70 dark:text-white/70">
                            {artboardPage === 1 && "1. ANALYSIS REPORT"}
                            {artboardPage === 2 && "2. FRONT VIEW (06:00)"}
                            {artboardPage === 3 && "3. RIGHT VIEW (03:00)"}
                            {artboardPage === 4 && "4. REAR VIEW (12:00)"}
                            {artboardPage === 5 && "5. LEFT VIEW (09:00)"}
                            {artboardPage === 6 && "6. TOP VIEW"}
                          </span>
                          <div className="flex gap-2">
                            {[1, 2, 3, 4, 5, 6].map((p) => (
                              <button 
                                key={p}
                                onClick={() => setArtboardPage(p)}
                                className={`w-8 h-8 flex items-center justify-center rounded-full text-xs font-mono transition-colors ${artboardPage === p ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10'}`}
                              >
                                {p}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* V180: Content */}
                        <div className="flex-1 w-full border border-black/10 dark:border-white/10 rounded-xl overflow-hidden bg-black/5 flex">
                          {artboardPage === 1 ? (
                              /* Page 1: Extracted Details (Analysis Report) */
                              <div className="flex w-full h-full">
                                 {/* Left: Source Image */}
                                 <div className="w-[45%] h-full p-4 border-r border-black/10 dark:border-white/10 flex flex-col">
                                   <span className="font-mono text-[10px] uppercase opacity-50 mb-3 tracking-widest block text-center">Source Image</span>
                                   <div className="flex-1 w-full relative flex items-center justify-center bg-black/5 dark:bg-white/5 rounded-lg border border-black/5 dark:border-white/5 p-2 overflow-hidden">
                                     <img src={item.src} className="max-w-full max-h-full object-contain rounded drop-shadow-md" alt="Source" />
                                   </div>
                                 </div>
                                 
                                 {/* Right: Extracted Text Parameters */}
                                 <div className="w-[55%] h-full p-6 overflow-y-auto font-mono text-[11px] leading-relaxed custom-scrollbar">
                                   <span className="font-mono text-[10px] uppercase opacity-50 block mb-4 tracking-widest">Extracted Parameters</span>
                                   
                                   {item.parameters?.analyzedOpticalParams && (
                                     <div className="mb-6">
                                       <h4 className="font-bold mb-2 text-blue-600 dark:text-blue-400 border-b border-black/10 dark:border-white/10 pb-1">Optical Parameters</h4>
                                       <pre className="whitespace-pre-wrap text-[10px] bg-white/50 dark:bg-black/50 p-3 rounded-lg border border-black/5 dark:border-white/5">
                                         {JSON.stringify(item.parameters.analyzedOpticalParams, null, 2)}
                                       </pre>
                                     </div>
                                   )}
                                   
                                   {item.parameters?.elevationParams ? (
                                     <div>
                                       <h4 className="font-bold mb-2 text-teal-600 dark:text-teal-400 border-b border-black/10 dark:border-white/10 pb-1">Architectural Parameters (AEPL)</h4>
                                       <pre className="whitespace-pre-wrap text-[10px] bg-white/50 dark:bg-black/50 p-3 rounded-lg border border-black/5 dark:border-white/5">
                                         {JSON.stringify(item.parameters.elevationParams, null, 2)}
                                       </pre>
                                     </div>
                                   ) : (
                                     <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-center">
                                       No AEPL Parameters Found
                                     </div>
                                   )}
                                 </div>
                              </div>
                          ) : (
                             /* Pages 2-5: Elevation Views */
                             <div className="relative w-full h-full flex items-center justify-center p-4">
                               {(() => {
                                 const views = item.parameters?.elevationImages;
                                 let displayImg = null;
                                 if (artboardPage === 2) displayImg = views?.front;
                                 if (artboardPage === 3) displayImg = views?.right;
                                 if (artboardPage === 4) displayImg = views?.rear;
                                 if (artboardPage === 5) displayImg = views?.left;
                                 if (artboardPage === 6) displayImg = views?.top;

                                 if (displayImg) {
                                   return <img src={displayImg} className="max-w-full max-h-full object-contain mix-blend-multiply dark:mix-blend-screen" alt={`Page ${artboardPage}`} />;
                                 } else {
                                   return (
                                     <div className="flex flex-col items-center gap-4">
                                       <Loader2 size={32} className="animate-spin text-black/20 dark:text-white/20" />
                                       <p className="font-mono opacity-40 uppercase tracking-widest text-[12px]">Generating Elevation Data...</p>
                                     </div>
                                   );
                                 }
                               })()}
                             </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* V156: Reverted to original white circular Loader2 */}
                    {isGenerating && selectedItemIds.includes(item.id) && (
                      <div className="absolute inset-0 z-[50] flex flex-col items-center justify-center bg-white/50 backdrop-blur-md pointer-events-auto">
                        <Loader2 
                          size={42}
                          className="animate-spin text-white" 
                        />
                      </div>
                    )}
                    {/* Corner Handles (Scale Invariant Circles, 4-corner resizable) */}
                    {[
                      { top: true,    left: true,  dx: -1, dy: -1, cursor: 'nwse-resize' }, // top-left
                      { top: true,    right: true, dx:  1, dy: -1, cursor: 'nesw-resize' }, // top-right
                      { bottom: true, left: true,  dx: -1, dy:  1, cursor: 'nesw-resize' }, // bottom-left
                      { bottom: true, right: true, dx:  1, dy:  1, cursor: 'nwse-resize' }, // bottom-right
                    ].map((pos, idx) => {
                      const s = 1 / (canvasZoom / 100);
                      const size = 12 * s;
                      const style: any = {
                        width: size,
                        height: size,
                        borderWidth: 1.6 * s,
                        position: 'absolute',
                        zIndex: 60,
                        backgroundColor: 'white',
                        borderColor: '#808080',
                        borderRadius: '999px',
                        top: pos.top ? -size / 2 : 'auto',
                        bottom: pos.bottom ? -size / 2 : 'auto',
                        left: pos.left ? -size / 2 : 'auto',
                        right: pos.right ? -size / 2 : 'auto',
                        pointerEvents: 'auto',
                        cursor: pos.cursor,
                      };
                      return <div key={idx} className="resize-handle" data-dx={pos.dx} data-dy={pos.dy} style={style} />;
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

        {/* RIGHT SIDEBAR WRAPPER (V177: Detached Header & Minimal Footer) */}
        <div className="absolute top-0 right-0 h-full z-50 pointer-events-none flex justify-end p-[12px]">
          <div className={`
            relative h-full transition-all duration-500 ease-in-out flex flex-col items-end
            ${isRightPanelOpen ? 'w-[284px]' : 'w-0'}
          `}>
          
            {/* V177 Detached Header Row (CHANGE VIEWPOINT + PanelLeft) */}
            <div className={`
              w-[284px] shrink-0 h-[44px] flex items-center gap-[12px] mb-[12px] transition-all duration-500
              ${isRightPanelOpen ? 'translate-x-0' : 'translate-x-0'}
            `}>
              <button 
                onClick={() => {
                  const currentIndex = canvasItems.findIndex(i => i.id === selectedItemIds[0]);
                  const nextIndex = (currentIndex + 1) % canvasItems.length;
                  if (canvasItems[nextIndex]) {
                    setSelectedItemIds([canvasItems[nextIndex].id]);
                    selectedItemIdsRef.current = [canvasItems[nextIndex].id];
                  }
                }}
                className={`
                  flex-1 h-full rounded-full bg-white/80 dark:bg-black/80 border border-black/10 dark:border-white/10 flex items-center justify-center backdrop-blur-sm shadow-sm hover:bg-black/5 dark:hover:bg-white/5 transition-all pointer-events-auto
                  ${isRightPanelOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
                `}
              >
                <span className="font-display tracking-widest uppercase font-medium text-[13px]">
                  CHANGE VIEWPOINT
                </span>
              </button>

              <button 
                onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}
                className={`
                  w-11 h-11 rounded-full bg-white/80 dark:bg-black/80 border border-black/10 dark:border-white/10 flex items-center justify-center backdrop-blur-sm shadow-sm hover:bg-black/5 dark:hover:bg-white/5 transition-all pointer-events-auto
                `}
              >
                {isRightPanelOpen ? <PanelLeft size={18} /> : <PanelLeft size={18} className="rotate-180" />}
              </button>
            </div>

            {/* V177 Main Sidebar Card (Separated by 12px) */}
            <div className={`
              flex-1 w-[284px] transition-all duration-500
              ${isRightPanelOpen ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10 pointer-events-none'}
            `}>
              <aside 
                className="h-full w-full rounded-[20px] flex flex-col overflow-hidden pointer-events-auto bg-white/80 dark:bg-black/80 backdrop-blur-sm border border-black/10 dark:border-white/10"
              >
                <div className="flex flex-col h-full">
                  {/* Master Box Container (Scrollable) */}
                  <div className="flex-1 overflow-y-auto px-4 pb-4 pt-4 min-h-0 flex flex-col gap-5 custom-scrollbar">

                    {/* V124 Site Plan Indicator (Replaced with new minimal version) */}
                    <div className="flex-shrink-0 w-full aspect-square mx-auto pointer-events-none rounded-[20px] bg-white/30 dark:bg-black/30 border border-black/5 dark:border-white/5">
                      <SitePlanDiagram 
                        angle={ANGLES[angleIndex]} 
                        isAnalyzing={isAnalyzing}
                        analysisStep={analysisStep}
                        lens={LENSES[lensIndex].value}
                        sitePlanImage={sitePlanImage}
                      />
                    </div>
                    
                    {/* Sliders */}
                    <div className={`flex flex-col space-y-4 px-1 transition-opacity ${areSlidersLocked ? 'opacity-30 pointer-events-none' : ''}`}>
                      <div>
                        <div className="flex justify-between font-mono text-xs leading-normal tracking-wide mb-1.5">
                          <span className="opacity-70 uppercase tracking-widest">Angle</span>
                          <span className="font-bold">{ANGLES[angleIndex]}</span>
                        </div>
                        <input type="range" min="0" max={ANGLES.length - 1} step="1" value={angleIndex} onChange={(e) => setAngleIndex(Number(e.target.value))} className="w-full accent-black dark:accent-white cursor-pointer" />
                      </div>
                      <div>
                        <div className="flex justify-between font-mono text-xs leading-normal tracking-wide mb-1.5">
                          <span className="opacity-70 uppercase tracking-widest">Altitude</span>
                          <span className="font-bold">{ALTITUDES[altitudeIndex].label}</span>
                        </div>
                        <input type="range" min="0" max={ALTITUDES.length-1} step="1" value={altitudeIndex} onChange={(e) => setAltitudeIndex(Number(e.target.value))} className="w-full accent-black dark:accent-white cursor-pointer" />
                      </div>
                      <div>
                        <div className="flex justify-between font-mono text-xs leading-normal tracking-wide mb-1.5">
                          <span className="opacity-70 uppercase tracking-widest">Lens</span>
                          <span className="font-bold">{LENSES[lensIndex].label}</span>
                        </div>
                        <input type="range" min="0" max={LENSES.length-1} step="1" value={lensIndex} onChange={(e) => setLensIndex(Number(e.target.value))} className="w-full accent-black dark:accent-white cursor-pointer" />
                      </div>
                      <div>
                        <div className="flex justify-between font-mono text-xs leading-normal tracking-wide mb-1.5">
                          <span className="opacity-70 uppercase tracking-widest">Time</span>
                          <span className="font-bold">{TIMES[timeIndex]}</span>
                        </div>
                        <input type="range" min="0" max={TIMES.length-1} step="1" value={timeIndex} onChange={(e) => setTimeIndex(Number(e.target.value))} className="w-full accent-black dark:accent-white cursor-pointer" />
                      </div>
                    </div>

                    {/* V177 ANALYSIS REPORT Removed */}
                  </div>

                  {/* V124 GENERATE BUTTON (External to Scroll Box, Bottom Locked) */}
                  <div className="px-4 pb-2 pt-2 shrink-0">
                    <button 
                      onClick={isGenerating ? handleCancelGenerate : handleGenerate}
                      disabled={(!isGenerating && areSlidersLocked) || selectedItemIds.length === 0 || (!canvasItems.find(i => i.id === selectedItemIds[0])?.parameters?.analyzedOpticalParams && canvasItems.find(i => i.id === selectedItemIds[0])?.type !== 'generated')}
                      className="relative w-full h-[44px] rounded-full transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center overflow-hidden border border-black/10 dark:border-white/10 enabled:bg-black enabled:text-white enabled:dark:bg-white enabled:dark:text-black"
                    >
                       <span className="font-display tracking-widest uppercase font-medium text-[16px] z-10">
                         {isGenerating ? 'CANCEL' : 'GENERATE'}
                       </span>
                    </button>
                  </div>

                  {/* BOTTOM FOOTER - V177: Copyright only, No version marker */}
                  <div className="p-3 mt-auto shrink-0 flex flex-col items-center gap-1">
                    <p className="font-mono text-[10px] opacity-40 text-center tracking-tighter">
                      © CRETE CO.,LTD. 2026. ALL RIGHTS RESERVED.
                    </p>
                  </div>
                </div>
            </aside>
          </div>
        </div>
      </div>
      </main>
    </div>
  );
}
