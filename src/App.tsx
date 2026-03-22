import React, { useState, useRef, useEffect } from 'react';
import { Upload, Moon, Sun, Loader2, Search, Hand, MousePointer2, Compass, Book, Wand2, Sparkles, Trash2, Undo, Redo, Download, ChevronLeft, ChevronRight } from 'lucide-react';
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
const SitePlanDiagram = ({ angle, isAnalyzing }: { angle: string, lens: number, sitePlanImage: string | null, isAnalyzing: boolean }) => {
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

      {/* Analyzing Overlay */}
      {isAnalyzing && (
        <div className="absolute inset-0 bg-white/80 dark:bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-30 transition-colors duration-300 rounded-full">
          <Loader2 size={32} className="animate-spin mb-3 text-black dark:text-white" />
          <p className="font-display text-[10px] uppercase tracking-widest text-center px-4">Analyzing...</p>
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
    architecturalSheetImage?: string | null;
  } | null;
}

export default function App() {
  // --- State ---
  const [canvasItems, setCanvasItems] = useState<CanvasItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Drag & Resize Refs (Ref 기반 — stale closure 방지)
  const isDraggingItemRef = useRef(false);
  const isResizingItemRef = useRef(false);
  const isDraggingPanRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const dragStartRef = useRef({ x: 0, y: 0 });
  const resizeStartRef = useRef({ x: 0, y: 0, width: 0, height: 0, itemX: 0, itemY: 0 });
  const resizeCornerRef = useRef({ dx: 1, dy: 1 });
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
  const [activeTab, setActiveTab] = useState<'create' | 'result'>('create');
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [sitePlanImage, setSitePlanImage] = useState<string | null>(null);
  const [architecturalSheetImage, setArchitecturalSheetImage] = useState<string | null>(null);

  // Zoom & Pan State
  const [canvasZoom, setCanvasZoom] = useState(100);
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const [focusMode, setFocusMode] = useState<'all' | 'target'>('all');
  const [canvasMode, setCanvasMode] = useState<'select' | 'pan'>('select');

  // V75: Item-bound Library State
  const [openLibraryItemId, setOpenLibraryItemId] = useState<string | null>(null);

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
      setSelectedItemId(null);
    }
  };

  const handleRedo = () => {
    if (redoStates.length > 0) {
      const currentState = [...canvasItems];
      const nextState = redoStates[redoStates.length - 1];

      setHistoryStates(prev => [...prev, currentState]);
      setCanvasItems(nextState);
      setRedoStates(prev => prev.slice(0, -1));
      setSelectedItemId(null);
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
    if (!selectedItemId) {
      // Background click -> Reset to default empty state
      setAngleIndex(4);
      setAltitudeIndex(2);
      setLensIndex(0);
      setTimeIndex(2);
      setAnalyzedOpticalParams(null);
      setElevationParams(null);
      setSitePlanImage(null);
      setArchitecturalSheetImage(null);
      return;
    }

    const item = canvasItems.find(i => i.id === selectedItemId);
    const motherItem = (item?.type === 'generated' && item.motherId) 
      ? canvasItems.find(i => i.id === item.motherId) 
      : null;

    if (item && item.parameters) {
      // 1. Viewpoint Sliders (Independent) -> Always from current item snapshot
      setAngleIndex(item.parameters.angleIndex);
      setAltitudeIndex(item.parameters.altitudeIndex);
      setLensIndex(item.parameters.lensIndex);
      setTimeIndex(item.parameters.timeIndex);

      // 2. Analysis Data (Shared) -> Prefer Mother's analysis for consistency in the project
      const analysisSource = motherItem?.parameters || item.parameters;
      
      setAnalyzedOpticalParams(analysisSource.analyzedOpticalParams || null);
      setElevationParams(analysisSource.elevationParams || null);
      setSitePlanImage(analysisSource.sitePlanImage || null);
      setArchitecturalSheetImage(analysisSource.architecturalSheetImage || null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedItemId]); // only trigger on selection change

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
  const ZOOM_STEPS_BUTTON = [10, 25, 50, 75, 100, 125, 150];

  const zoomStep = (dir: 1 | -1) => {
    setCanvasZoom(prev => {
      if (dir === 1) {
        const next = ZOOM_STEPS_BUTTON.find(v => v > prev);
        return next !== undefined ? next : 150;
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
      const targetItem = selectedItemId 
        ? canvasItems.find(i => i.id === selectedItemId) 
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
    setCanvasZoom(prev => Math.min(Math.max(prev + zoomFactor, 10), 150));
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
    const isUIInteraction = (e.target as HTMLElement).closest('.pointer-events-auto');
    if (isUIInteraction) return;

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

    // 1. Check Resize Handles first (if an item is selected)
    if (selectedItemId) {
      const item = canvasItems.find(i => i.id === selectedItemId);
      if (item) {
        const scale = canvasZoom / 100;
        const hitRadius = 15 / scale;

        // 4 corner definitions: position + resize direction multipliers
        const corners = [
          { x: item.x,              y: item.y,               dx: -1, dy: -1, cursor: 'nwse-resize' }, // top-left
          { x: item.x + item.width, y: item.y,               dx:  1, dy: -1, cursor: 'nesw-resize' }, // top-right
          { x: item.x,              y: item.y + item.height, dx: -1, dy:  1, cursor: 'nesw-resize' }, // bottom-left
          { x: item.x + item.width, y: item.y + item.height, dx:  1, dy:  1, cursor: 'nwse-resize' }, // bottom-right
        ];

        for (const corner of corners) {
          const dist = Math.hypot(coords.x - corner.x, coords.y - corner.y);
          if (dist < hitRadius) {
            // V113: Save state before resizing
            setHistoryStates(prev => [...prev, canvasItems]);
            setRedoStates([]);

            isResizingItemRef.current = true;
            setIsResizingItem(true);
            resizeCornerRef.current = { dx: corner.dx, dy: corner.dy };
            resizeStartRef.current = { x: coords.x, y: coords.y, width: item.width, height: item.height, itemX: item.x, itemY: item.y };
            e.currentTarget.setPointerCapture(e.pointerId);
            return;
          }
        }
      }
    }

    // 2. Check Image Click for Selection/Drag
    const clickedItem = [...canvasItems].reverse().find(item => 
      coords.x >= item.x && coords.x <= item.x + item.width &&
      coords.y >= item.y && coords.y <= item.y + item.height
    );

    if (clickedItem) {
      // V113: Save state before moving item
      setHistoryStates(prev => [...prev, canvasItems]);
      setRedoStates([]);

      // V125: Tablet/Touch Interaction Fix - Require second tap to drag if using touch
      const isAlreadySelected = selectedItemId === clickedItem.id;
      setSelectedItemId(clickedItem.id);

      if (e.pointerType === 'mouse' || isAlreadySelected) {
        isDraggingItemRef.current = true;
        setIsDraggingItem(true);
        dragOffsetRef.current = { x: coords.x - clickedItem.x, y: coords.y - clickedItem.y };
        e.currentTarget.setPointerCapture(e.pointerId);
      }
      return;
    }

    // 3. Background click in Select Mode → Panning
    setSelectedItemId(null);
    setOpenLibraryItemId(null); // V81: Close library on background click
    isDraggingPanRef.current = true;
    setIsDraggingPan(true);
    dragStartRef.current = { x: e.clientX - canvasOffset.x, y: e.clientY - canvasOffset.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const coords = getCanvasCoords(e.clientX, e.clientY);

    if (isDraggingPanRef.current) {
      setCanvasOffset({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y
      });
    } else if (isDraggingItemRef.current && selectedItemId) {
      setCanvasItems(prev => prev.map(item => 
        item.id === selectedItemId 
          ? { ...item, x: coords.x - dragOffsetRef.current.x, y: coords.y - dragOffsetRef.current.y }
          : item
      ));
    } else if (isResizingItemRef.current && selectedItemId) {
      const dx = coords.x - resizeStartRef.current.x;
      const dy = coords.y - resizeStartRef.current.y;
      const aspect = resizeStartRef.current.width / resizeStartRef.current.height;

      setCanvasItems(prev => prev.map(item => {
        if (item.id !== selectedItemId) return item;

        // Width changes: right corner → expand right, left corner → expand left (flip sign)
        const rawDeltaW = dx * resizeCornerRef.current.dx;
        const newWidth = Math.max(resizeStartRef.current.width + rawDeltaW, 50);
        const newHeight = newWidth / aspect;

        // Position: left corners move x; top corners move y
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

  const handlePointerUp = (e: React.PointerEvent) => {
    isDraggingPanRef.current = false;
    isDraggingItemRef.current = false;
    isResizingItemRef.current = false;
    setIsDraggingPan(false);
    setIsDraggingItem(false);
    setIsResizingItem(false);
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
      const dist = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
      if (lastTouchDist.current !== null) {
        const delta = (dist - lastTouchDist.current) * 0.5;
        setCanvasZoom(prev => Math.min(Math.max(prev + delta, 10), 150));
      }
      lastTouchDist.current = dist;

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
        
        setIsAnalyzing(true);
        let finalBase64 = base64Image;

        // V124: Auto-Regenerate image using gemini-3.1-flash-image-preview
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
                console.log("[V124] Image successfully regenerated via", IMAGE_GEN);
                break;
              }
            }
          }
        } catch (error) {
          console.error("[V124] Image regeneration failed, falling back to original:", error);
        }

        // Load image to get dimensions for initial canvas item
        const img = new Image();
        img.onload = () => {
          const newItemId = `item-${Date.now()}`;
          // Calculate Y position: Place below the bottom-most item if exists
          let newY = -img.height / 2;
          let newX = -img.width / 2;
          
          if (canvasItems.length > 0) {
            const leftMostItem = canvasItems.reduce((prev, current) => 
              (prev.x < current.x) ? prev : current
            );
            const bottomMostItem = canvasItems.reduce((prev, current) => 
              (prev.y + prev.height > current.y + current.height) ? prev : current
            );
            
            // Place below the bottom-most item, aligned to the leftmost X
            newX = leftMostItem.x;
            newY = bottomMostItem.y + bottomMostItem.height + 40;
          }

          const newItem: CanvasItem = {
            id: newItemId,
            type: 'upload',
            src: finalBase64,
            x: newX,
            y: newY,
            width: img.width,
            height: img.height,
            motherId: newItemId, // V74: acts as its own mother
            parameters: null // V74: filled post-analysis
          };

          setHistoryStates(prevH => [...prevH, canvasItems]);
          setCanvasItems(prev => [...prev, newItem]);
          setSelectedItemId(newItemId);
          setSitePlanImage(null);
          setActiveTab('create');

          // V124: Auto-trigger Phase 2 Analysis
          analyzeViewpoint(finalBase64, newItemId);
        };
        img.src = finalBase64;
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeViewpoint = async (base64Image: string, itemId?: string) => {
    setIsAnalyzing(true);
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
        
        const analyzedOpt = {
          angle: data.angle,
          altitude: ALTITUDES[Number(data.altitude_index) || 0]?.label || 'N/A',
          lens: LENSES[Number(data.lens_index) || 0]?.label || 'N/A',
          time: TIMES[Number(data.time_index) || 0] || 'N/A'
        };
        setAnalyzedOpticalParams(analyzedOpt);
        
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
        
        // After parameter analysis, trigger site plan generation with extracted params for synthesis
        await generateSitePlan(base64Image, data.elevation_parameters, itemId);
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
    }
  };


  const generateSitePlan = async (base64Image: string, extractedParams?: any, itemId?: string) => {
    // Note: In a real app, this would call an AI model to generate a top-down view.
    // For this simulation, we'll use the same API structure but with a specific site-plan prompt.
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const contextualParamsStr = extractedParams ? JSON.stringify(extractedParams) : "Utilize implicit building context";

      const sitePlanPrompt = `
        [Architectural Multi-View Reference Sheet - System Protocol B Node 3 & 4]
        [Reference: Architectural Top-down View Logic]
        TASK: Generate a single integrated orthographic reference sheet containing 5 views (Top, Front, Right, Rear, Left) in a standard cross-layout.
        
        [CONTEXTUAL IMAGE SYNTHESIS]
        - Clone and PRESERVE the exact textures, materials, and architectural geometry of the visible facades from the uploaded original image (Source of Truth).
        - SYNTHESIZE the blind spots (Rear, unseen sides) logically, matching the established context and the following extracted parameters: ${contextualParamsStr}
        - The result must be a holistic pixel-level generation combining Known (Source Image) + Unknown (AI Inferred Constraints).
        
        [ORIENTATION RULE]
        - Align the FRONT Elevation to face the BOTTOM of the image layout.
        - The Top View (Roof Plan) must logically correlate with this "Front = Bottom" orientation.
        
        LAYOUT SPECIFICATION (3x3 Grid):
        - Row 1: [Empty | TOP (Roof Plan) | Empty]
        - Row 2: [LEFT Elevation | FRONT Elevation | RIGHT Elevation]
        - Row 3: [Empty | REAR Elevation | Empty]
        
        PROJECTION: True Orthographic (FOV=0), absolute zero perspective.
        STYLE: Realistic architectural elevation style matching the original rendering or photo's texture, NO perspective effects.
        BACKGROUND: Pure Transparent Background (Optical Null Space).
        
        CONSTRAINTS: All views must be perfectly aligned at the vertices. NO 3D perspective, NO text, NO labels.
      `.trim();

      const base64Data = base64Image.split(',')[1];
      const mimeType = base64Image.split(';')[0].split(':')[1];

      // Phase 2 (Sub-task): Multi-View Generation
      const runGeneration = async (modelName: string) => {
        const result = await ai.models.generateContent({
          model: modelName,
          contents: {
            parts: [
              { inlineData: { data: base64Data, mimeType: mimeType } },
              { text: sitePlanPrompt },
            ],
          },
        });

        if (result.candidates?.[0]?.content?.parts) {
          for (const part of result.candidates[0].content.parts) {
            if (part.inlineData) {
              const fullSheetData = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
              setArchitecturalSheetImage(fullSheetData);
              
              // Extract TOP VIEW from the 3x3 cross layout grid
              const img = new Image();
              img.onload = () => {
                const canvas = document.createElement('canvas');
                const cellW = img.width / 3;
                const cellH = img.height / 3;
                canvas.width = cellW;
                canvas.height = cellH;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                  // TOP View is at Row 0, Col 1
                  ctx.drawImage(img, cellW, 0, cellW, cellH, 0, 0, cellW, cellH);
                  const generatedSitePlan = canvas.toDataURL();
                  setSitePlanImage(generatedSitePlan);

                  if (itemId) {
                    setCanvasItems(prev => prev.map(item => {
                      if (item.id === itemId && item.parameters) {
                        return {
                          ...item,
                          parameters: {
                            ...item.parameters,
                            architecturalSheetImage: fullSheetData,
                            sitePlanImage: generatedSitePlan
                          }
                        };
                      }
                      return item;
                    }));
                  }
                }
              };
              img.src = fullSheetData;
              return true;
            }
          }
        }
        return false;
      };

      try {
        const success = await runGeneration(IMAGE_GEN);
        if (!success) throw new Error("No image data returned from primary model");
      } catch (primaryError) {
        console.warn(`Primary model (${IMAGE_GEN}) failed, retrying with fallback...`, primaryError);
        const success = await runGeneration(IMAGE_GEN_FALLBACK);
        if (!success) throw new Error("Fallback failed");
      }
    } catch (err) {
      console.warn("Multi-view generation failed", err);
    }
  };

  // ---
  // PHASE 4: SYNTHESIS & GENERATION
  // Layer A (Geometry) + Layer B (5-IVSP Viewpoint) + Layer C (Property Slave)
  // ---
  const handleGenerate = async () => {
    // [PHASE 4 - Step 1] Integration Validation
    const sourceItem = selectedItemId 
      ? canvasItems.find(item => item.id === selectedItemId) 
      : (canvasItems.length > 0 ? canvasItems[0] : null);

    if (!sourceItem) {
      alert("Please upload at least one image first.");
      return;
    }

    // V102: Check if this is the first generation for this mother image
    const hasInitialViews = canvasItems.some(i => i.type === 'generated' && (i.motherId === sourceItem.id || (i.motherId === undefined && i.id === sourceItem.id)));
    const isFirstTime = sourceItem.type === 'upload' && !hasInitialViews;

    setIsGenerating(true);
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

      const viewsToGenerate = [];

      if (isFirstTime) {
        const baseAngle = v0_angle === 'Unknown' ? '06:00' : v0_angle;
        const cornerAngle = getAngle(baseAngle);
        const perspectiveAngle = baseAngle === '06:00' ? cornerAngle : '06:00';
        
        viewsToGenerate.push({
          name: "Bird's Eye View",
          angle: cornerAngle,
          altitude: "150m (Bird's eye view)",
          lens: "32mm Aerial Lens",
          distance: "approx 200m",
          scenario: "Aerial / Bird's eye",
        });
        viewsToGenerate.push({
          name: "Perspective View",
          angle: perspectiveAngle,
          altitude: "1.6m (Street level)",
          lens: "24mm Wide or 23mm Tilt-Shift Lens (Choose best)",
          distance: "Standard",
          scenario: "Street View",
        });
        viewsToGenerate.push({
          name: "Street View",
          angle: "AI Choice: 04:30 OR 07:30 (Select optimal visible corner based on 06:00)",
          altitude: "1.6m (Street level)",
          lens: "AI Choice: 35mm (Wide Standard) OR 45mm (Standard)",
          distance: "approx 2m~5m",
          scenario: "Street-Level Facade Detail (Lower facade visible on left or right)",
        });
      } else {
        viewsToGenerate.push({
          name: "Custom View",
          angle: ANGLES[angleIndex],
          altitude: ALTITUDES[altitudeIndex].label,
          lens: LENSES[lensIndex].label,
          distance: "Standard",
          scenario: determineScenario(ANGLES[angleIndex], ALTITUDES[altitudeIndex].value, LENSES[lensIndex].value),
        });
      }

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
- V₀ (Current Camera Position — AI Reverse-Engineered):
    Angle: ${v0_angle} o'clock | Altitude: ${v0_altitude} | Lens: ${v0_lens} | Time: ${v0_time}
    This is the exact camera position from which the SOURCE IMAGE (IMAGE 1) was captured.
- V₁ (Target Camera Position — User Command):
    Angle: ${viewConfig.angle} o'clock | Altitude: ${viewConfig.altitude} | Lens: ${viewConfig.lens} | Time: ${currentTime}
- Δ Movement Vector: Orbit from ${v0_angle} → ${viewConfig.angle} | Altitude change: ${v0_altitude} → ${viewConfig.altitude}
    Execute this as a precise Physical Camera Orbit around the immutable building geometry.

## Step 1: Coordinate Anchoring & Vector Calculation
- Reference: Building main facade fixed at 06:00 (Front).
- Target Vector: ${viewConfig.angle}
- Altitude: ${viewConfig.altitude}

## Step 2: Scenario Mapping & Optical Engineering
- Scenario: ${viewConfig.scenario}
- Lens: ${viewConfig.lens}
- Time of Day: ${currentTime}`;

        const layerC_property = elevationParams 
          ? `
## Step 5: Structural & Material Parameters (PHASE 2 AEPL Data — Immutable)
- Mass Typology: ${elevationParams.mass_typology || 'N/A'}
- Core Typology: ${elevationParams.core_typology || 'N/A'}
- Base Material: ${elevationParams.base_material || 'N/A'}
- Fenestration: ${elevationParams.fenestration_type || 'N/A'}
- Balcony/Projection: ${elevationParams.has_balcony || 'False'}`
          : '';

        const layerC_blindspot = `
## Step 3: Layering & Blind Spot Inference
- Perspective: ${viewConfig.angle === '06:00' ? '1-Point (face-on)' : '2-Point (corner/side)'}
- Blind Spot Logic: If target is Rear (12:00) or hidden side, extract Design DNA from front, infer MEP/Service Door placement.
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

          if (architecturalSheetImage) {
            for (const slot of activeElevationSlots) {
              try {
                const croppedElevation = await cropElevationFromSheet(architecturalSheetImage, slot);
                const cropBase64 = croppedElevation.split(',')[1];
                parts.push({ inlineData: { data: cropBase64, mimeType: 'image/png' } });
                console.log(`[V70] Injecting cropped elevation: ${slot.label} (Row${slot.row}, Col${slot.col})`);
              } catch (e) {
                console.warn('[V70] Elevation crop failed:', slot.label, e);
              }
            }
          }

          parts.push({ text: finalPrompt });

          const response = await ai.models.generateContent({
            model: modelName,
            contents: { parts },
          });

          if (response.candidates && response.candidates[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
              if (part.inlineData) {
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

                    const newGenItem: CanvasItem = {
                      id: `gen-${Date.now()}-${Math.floor(Math.random()*1000)}`,
                      type: 'generated',
                      src: generatedSrc,
                      x: 0,
                      y: sourceItem.y,
                      width: (img.width / img.height) * sourceItem.height,
                      height: sourceItem.height,
                      motherId: sourceItem.motherId || sourceItem.id,
                      parameters: {
                        angleIndex:    snapAngleIndex,
                        altitudeIndex: snapAltIndex,
                        lensIndex:     snapLensIndex,
                        timeIndex,
                        analyzedOpticalParams,
                        elevationParams,
                        sitePlanImage,
                        architecturalSheetImage
                      }
                    };
                    
                    setCanvasItems(prev => {
                      setHistoryStates(prevH => [...prevH, prev]);
                      
                      // V102: Place to the right of the rightmost image in the current row
                      let maxEdgeX = sourceItem.x + sourceItem.width;
                      for (const item of prev) {
                        if (Math.abs(item.y - sourceItem.y) < 10) {
                            const rightEdge = item.x + item.width;
                            if (rightEdge > maxEdgeX) maxEdgeX = rightEdge;
                        }
                      }
                      
                      let currentX = maxEdgeX + 40;
                      let currentY = sourceItem.y;
                      let hasOverlap = true;
                      while (hasOverlap) {
                        hasOverlap = false;
                        for (const item of prev) {
                          if (
                            currentX < item.x + item.width &&
                            currentX + newGenItem.width > item.x &&
                            currentY < item.y + item.height &&
                            currentY + newGenItem.height > item.y
                          ) {
                            currentX = item.x + item.width + 40;
                            hasOverlap = true;
                            break;
                          }
                        }
                      }

                      newGenItem.x = currentX;
                      newGenItem.y = currentY;

                      return [...prev, newGenItem];
                    });
                    setSelectedItemId(newGenItem.id);
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
          return false;
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
    }
  };

  const currentSourceItem = selectedItemId ? canvasItems.find(item => item.id === selectedItemId) : (canvasItems.length > 0 ? canvasItems[0] : null);
  const isSelectedItemUpload = currentSourceItem?.type === 'upload';
  const hasInitialViews = canvasItems.some(i => i.type === 'generated' && (i.motherId === currentSourceItem?.id || (i.motherId === undefined && i.id === currentSourceItem?.id)));
  const areSlidersLocked = isSelectedItemUpload && !hasInitialViews;

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-white dark:bg-black text-black dark:text-white font-sans transition-colors duration-300 selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black overflow-hidden">
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
          className={`flex-1 min-w-0 relative bg-[#fcfcfc] dark:bg-[#050505] overflow-hidden flex items-center justify-center transition-colors duration-300 select-none touch-none
            ${canvasMode === 'pan' 
              ? (isDraggingPan ? 'cursor-grabbing' : 'cursor-grab') 
              : (isDraggingItem ? 'cursor-move' : 'cursor-default')
            }`}
          onWheel={handleWheel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onDragStart={(e) => e.preventDefault()}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >

          <div 
            className={`
              absolute left-[12px] top-1/2 -translate-y-1/2 z-30 flex flex-col items-center gap-2
              bg-white/90 dark:bg-black/90 border border-black/10 dark:border-white/10 pointer-events-auto
              transition-all duration-300 rounded-full py-2.5 w-11 backdrop-blur-sm
            `}
            style={{
              boxShadow: 'inset 1px 1px 2px rgba(255, 255, 255, 1), inset -1px -1px 2px rgba(0, 0, 0, 0.2)'
            }}
          >
            {/* 1. 도구 모드 (Select / Pan) */}
            <button 
              onClick={() => setCanvasMode('select')}
              className={`w-9 h-9 aspect-square flex items-center justify-center rounded-full transition-colors ${canvasMode === 'select' ? 'bg-black text-white dark:bg-white dark:text-black' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
              title="Select Mode"
            >
              <MousePointer2 size={18} />
            </button>
            <button 
              onClick={() => {
                setCanvasMode('pan');
              }}
              className={`w-9 h-9 aspect-square flex items-center justify-center rounded-full transition-colors ${canvasMode === 'pan' ? 'bg-black text-white dark:bg-white dark:text-black' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
              title="Pan Mode"
            >
              <Hand size={18} />
            </button>

            {/* V75/V113: Undo & Redo Buttons */}
            <div className="w-6 h-[1px] bg-black/10 dark:bg-white/10 my-1" />
            <button 
              onClick={handleUndo}
              disabled={historyStates.length === 0}
              className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors ${historyStates.length === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
              title="Undo"
            >
              <Undo size={18} />
            </button>
            <button 
              onClick={handleRedo}
              disabled={redoStates.length === 0}
              className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors ${redoStates.length === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
              title="Redo"
            >
              <Redo size={18} />
            </button>
          </div>

          {/* V71: Dynamic Horizontal Control Bar (Upload + Zoom + Compass) */}
          <div 
            className={`
              absolute bottom-[12px] z-30 flex items-center
              bg-white/90 dark:bg-black/90 border border-black/10 dark:border-white/10 pointer-events-auto
              transition-all duration-500 ease-in-out rounded-full overflow-hidden h-11 backdrop-blur-sm
            `}
            style={{
              left: isRightPanelOpen ? '50%' : 'calc(100% - 12px)',
              transform: isRightPanelOpen ? 'translateX(-50%)' : 'translateX(-100%)',
              whiteSpace: 'nowrap',
              paddingLeft: '6px',
              paddingRight: '6px',
              boxShadow: 'inset 1px 1px 2px rgba(255, 255, 255, 1), inset -1px -1px 2px rgba(0, 0, 0, 0.2)'
            }}
          >
            {/* 1. 이미지 업로드 버튼 */}
            <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
            <div className="flex px-1 min-h-[44px] items-center">
              <button 
                onClick={() => fileInputRef.current?.click()} 
                className="w-9 h-9 aspect-square flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors" 
                title="Upload Image"
              >
                <Upload size={18} />
              </button>
            </div>

            <div className="w-[1px] h-7 bg-black/10 dark:bg-white/10" />

            {/* 2. 돋보기 / 초기화 */}
            <div className="flex px-1 min-h-[44px] items-center">
              <button 
                onClick={handleFocus} 
                className="w-9 h-9 aspect-square flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors" 
                title="Fit to 100% / Focus Target"
              >
                <Search size={18} />
              </button>
            </div>

            <div className="w-[1px] h-7 bg-black/10 dark:bg-white/10" />

            {/* 3. 줌 컨트롤 */}
            <div className="flex px-1 select-none items-center min-h-[44px]">
              <button onClick={() => zoomStep(-1)} className="w-9 h-9 aspect-square flex items-center justify-center rounded-full font-mono text-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors" title="Zoom Out">−</button>
              <div className="min-w-[60px] h-full flex items-center justify-center font-mono text-sm px-1 font-bold">{Math.round(canvasZoom)}%</div>
              <button onClick={() => zoomStep(1)} className="w-9 h-9 aspect-square flex items-center justify-center rounded-full font-mono text-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors" title="Zoom In">+</button>
            </div>

            <div className="w-[1px] h-7 bg-black/10 dark:bg-white/10" />

            {/* 4. 나침반 (패널 토글) */}
            <div className="flex px-1">
              <button 
                onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}
                className={`w-9 h-9 aspect-square flex items-center justify-center rounded-full transition-colors ${
                  isRightPanelOpen 
                    ? 'bg-black text-white dark:bg-white dark:text-black' 
                    : 'hover:bg-black/5 dark:hover:bg-white/5'
                }`}
                title="Toggle Panel"
              >
                <Compass size={18} />
              </button>
            </div>
          </div>

          {/* Transform Wrapper */}
          <div 
            style={{ 
              transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px) scale(${canvasZoom / 100})`,
              transformOrigin: 'center center',
              willChange: 'transform'
            }}
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
                  zIndex: selectedItemId === item.id ? 20 : 10,
                  // Disable pointer events on items during PAN mode to allow background panning
                  pointerEvents: canvasMode === 'pan' ? 'none' : 'auto'
                }}
              >
                <img 
                  src={item.src} 
                  alt={item.id} 
                  className="w-full h-full object-contain pointer-events-none shadow-xl border border-black/5 dark:border-white/5"
                  referrerPolicy="no-referrer"
                  draggable={false}
                />
                
                {/* Selection Overlay (Blue Border & Circle Handles) */}
                {selectedItemId === item.id && (
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
                        top: `-${56 / (canvasZoom / 100)}px`, // Adjusted top margin
                        right: 0,
                        height: `${44 / (canvasZoom / 100)}px`,
                        boxShadow: 'inset 1px 1px 2px rgba(255, 255, 255, 1), inset -1px -1px 2px rgba(0, 0, 0, 0.2)'
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                    >
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
                      <button 
                        onClick={() => setOpenLibraryItemId(prev => prev === item.id ? null : item.id)}
                        className={`flex items-center justify-center transition-colors rounded-full ${openLibraryItemId === item.id ? 'bg-black/10 dark:bg-white/10' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
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
                          setSelectedItemId(null);
                        }}
                        className="flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-red-500 rounded-full"
                        style={{ width: `${36 / (canvasZoom / 100)}px`, height: `${36 / (canvasZoom / 100)}px` }}
                        title="삭제"
                      >
                        <Trash2 size={12 / (canvasZoom / 100)} />
                      </button>
                    </div>

                    {/* V75/V81: Item-bound Library Artboard */}
                    {openLibraryItemId === item.id && (
                      <div 
                        className={`absolute flex bg-white/90 dark:bg-[#1E1E1E]/90 backdrop-blur-xl shadow-xl rounded-2xl p-6 ${canvasMode === 'pan' ? 'pointer-events-none' : 'pointer-events-auto'}`}
                        style={{
                          left: 'calc(100% + 12px)',
                          top: 0,
                          width: '800px',
                          height: '600px',
                          border: 'none',
                        }}
                        onPointerDown={(e) => e.stopPropagation()}
                      >
                        <div className="flex w-full h-full">
                            {/* Left: Architectural Sheet (V82: Only sheet shown) */}
                            <div className="flex-1 flex w-full h-full border border-black/10 dark:border-white/10 rounded-xl overflow-hidden bg-black/5">
                                {item.parameters?.architecturalSheetImage ? (
                                    <div className="relative w-full h-full flex items-center justify-center p-4">
                                      <img src={item.parameters.architecturalSheetImage} className="max-w-full max-h-full object-contain mix-blend-multiply dark:mix-blend-screen" alt="Site Plan" />
                                    </div>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-center p-4">
                                      <p className="font-mono opacity-40 uppercase tracking-widest text-[14px]">No Architectural Sheet Generated</p>
                                    </div>
                                )}
                            </div>
                        </div>
                      </div>
                    )}

                    {/* V87: Loader directly on the selected generating item */}
                    {isGenerating && selectedItemId === item.id && (
                      <div className="absolute inset-0 z-[50] flex flex-col items-center justify-center bg-white/50 backdrop-blur-md pointer-events-auto">
                        <Loader2 
                          className="animate-spin text-white" 
                        />
                      </div>
                    )}
                    {/* Corner Handles (Scale Invariant Circles, 4-corner resizable) */}
                    {[
                      { top: true,    left: true,  cursor: 'nwse-resize' }, // top-left
                      { top: true,    right: true, cursor: 'nesw-resize' }, // top-right
                      { bottom: true, left: true,  cursor: 'nesw-resize' }, // bottom-left
                      { bottom: true, right: true, cursor: 'nwse-resize' }, // bottom-right
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
                      return <div key={idx} style={style} />;
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Loading Overlay Deleted in V82 */}
        </section>

        {/* RIGHT SIDEBAR WRAPPER (V55: More compact, absolute fixed center) */}
        <div className="absolute top-0 right-0 h-full z-50 pointer-events-none flex justify-end p-[12px]">
          <div className={`
            relative h-full transition-all duration-500 ease-in-out flex items-center
            ${isRightPanelOpen ? 'w-[284px]' : 'w-0'}
          `}>
            {/* FLOATING PANEL - V59: Target Transparency (10% / 90% opacity) */}
            <div className={`w-full h-full transition-all duration-500 ${isRightPanelOpen ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10 pointer-events-none'}`}>
              <aside 
                className="h-full w-[284px] rounded-[20px] flex flex-col overflow-hidden pointer-events-auto bg-white/80 dark:bg-black/80 backdrop-blur-sm border border-black/10 dark:border-white/10"
              >
                {/* Sidebar Content Wrapper */}
                <div className={`flex flex-col h-full transition-opacity duration-200 ${isRightPanelOpen ? 'opacity-100 delay-150' : 'opacity-0'}`}>
                
                  {/* Top Navigation - V124: < CHANGE VIEWPOINT > */}
                  <div className="pt-4 pb-2 px-4 shrink-0">
                    <div className="flex items-center justify-between gap-1.5">
                      <button 
                        onClick={() => {
                          const currentIndex = canvasItems.findIndex(i => i.id === selectedItemId);
                          if (currentIndex > 0) setSelectedItemId(canvasItems[currentIndex - 1].id);
                        }} 
                        disabled={!selectedItemId || canvasItems.findIndex(i => i.id === selectedItemId) <= 0}
                        className="w-9 h-9 rounded-full flex items-center justify-center bg-transparent border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 transition-colors disabled:opacity-20 flex-shrink-0"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      
                      <div className="flex-1 h-9 rounded-full bg-white/50 dark:bg-black/50 border border-black/10 dark:border-white/10 flex items-center justify-center backdrop-blur-sm">
                        <span className="font-display tracking-widest uppercase text-center font-medium text-[13px]">
                          CHANGE VIEWPOINT
                        </span>
                      </div>

                      <button 
                         onClick={() => {
                          const currentIndex = canvasItems.findIndex(i => i.id === selectedItemId);
                          if (currentIndex !== -1 && currentIndex < canvasItems.length - 1) setSelectedItemId(canvasItems[currentIndex + 1].id);
                        }} 
                        disabled={!selectedItemId || canvasItems.findIndex(i => i.id === selectedItemId) >= canvasItems.length - 1}
                        className="w-9 h-9 rounded-full flex items-center justify-center bg-transparent border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 transition-colors disabled:opacity-20 flex-shrink-0"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>

                  {/* V124 Master Box Container (Scrollable) */}
                  <div className="flex-1 overflow-y-auto px-4 pb-4 min-h-0 flex flex-col gap-5 custom-scrollbar">

                    {/* V124 Site Plan Indicator (Replaced with new minimal version) */}
                    <div className="flex-shrink-0 w-full aspect-square mx-auto pointer-events-none rounded-[20px] bg-white/30 dark:bg-black/30 border border-black/5 dark:border-white/5">
                      <SitePlanDiagram 
                        angle={ANGLES[angleIndex]} 
                        isAnalyzing={isAnalyzing}
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

                    {/* V124 ANALYSIS REPORT Area (Inside Master Box) */}
                    <div className="font-mono text-xs leading-normal tracking-widest space-y-3 border border-black/10 dark:border-white/10 bg-white/30 dark:bg-black/30 p-4 rounded-[20px] flex-1">
                      <span className="opacity-50 block font-display uppercase tracking-widest text-xs mb-3">ANALYSIS REPORT</span>
                      {elevationParams && typeof elevationParams === 'object' ? (
                        <div className="space-y-4">
                          {Object.entries(elevationParams).map(([groupKey, groupVal]: [string, any]) => {
                            if (typeof groupVal !== 'object' || groupVal === null) return null;
                            return (
                              <div key={groupKey} className="text-[10px]">
                                <span className="opacity-50 block uppercase mb-1.5">{groupKey.replace(/^[0-9]+_/, '').replace(/_/g, ' ')}</span>
                                <div className="pl-3 border-l-2 border-black/10 dark:border-white/10 space-y-1.5">
                                  {Object.entries(groupVal).map(([key, val]) => (
                                    <div key={key} className="flex justify-between items-start gap-2">
                                      <span className="opacity-60 capitalize whitespace-nowrap">{key.replace(/_/g, ' ')}</span>
                                      <span className="text-right flex-1 break-words">
                                        {typeof val === 'object' && val !== null 
                                          ? JSON.stringify(val).replace(/["{}]/g, '').replace(/,/g, ', ') 
                                          : String(val)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="opacity-30 text-center py-6">Pending...</div>
                      )}
                    </div>
                  </div>

                  {/* V124 GENERATE BUTTON (External to Scroll Box, Bottom Locked) */}
                  <div className="px-4 pb-2 pt-2 shrink-0">
                    <button 
                      onClick={handleGenerate}
                      disabled={isGenerating || !selectedItemId || (!currentSourceItem?.parameters?.analyzedOpticalParams && currentSourceItem?.type !== 'generated')}
                      className="relative w-full h-[44px] rounded-full hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center overflow-hidden border border-black/10 dark:border-white/10"
                    >
                       <span className="font-display tracking-widest uppercase font-medium text-[16px] z-10">{isGenerating ? 'GENERATING...' : 'GENERATE'}</span>
                    </button>
                  </div>

                  {/* BOTTOM FOOTER */}
                  <div className="p-3 mt-auto shrink-0 border-t border-black/10 dark:border-white/10">
                    <p className="font-mono text-[9px] opacity-40 text-center tracking-tighter">
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
