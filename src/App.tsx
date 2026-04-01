import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, Moon, Sun, Loader2, Search, Hand, MousePointer2, Compass, Book, Wand2, Sparkles, Trash2, Undo, Redo, Download, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Footprints, Plus, PanelLeft, Lasso, X, Copy, Pencil, Eraser, Type, Bot, Orbit, GitBranch, Shield, Zap, Wind, Hash, History, Target, Cpu, PenTool, Box, Scale } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { saveImageToDB, loadImageFromDB, deleteImageFromDB } from './lib/imageDB';
import { ANALYSIS, IMAGE_GEN, ANALYSIS_FALLBACK, IMAGE_GEN_FALLBACK } from './constants';
import { EXPERTS as PLANNER_EXPERTS } from './lib/plannerExperts';
import { generateDiscussion, type DiscussionResult } from './lib/plannerGenerate';

// --- V263: PLANNERS Expert Icon Map ---
const PLANNER_ICON_MAP: Record<string, React.ElementType> = {
  Orbit, Search, GitBranch, Shield, Zap, Compass, Wind, Hash,
  History, Target, Cpu, PenTool, Box, Scale, Bot,
};

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

const STYLE_DESCRIPTIONS: Record<string, { title: { ko: string, en: string }, keywords: { ko: string, en: string }[] }> = {
  'A': {
    title: { ko: '장중한 메스의 규칙', en: 'Vitruvian Tectonics' },
    keywords: [
      { en: 'Fragment', ko: '분절' },
      { en: 'Stagger', ko: '엇갈림' },
      { en: 'Deep Set Recess', ko: '창호의 깊이감' },
      { en: 'Contextual Material Derivation', ko: '맥락적 재료 파생' },
      { en: 'Diffuse Timelessness', ko: '확산된 시간성' }
    ]
  },
  'B': {
    title: { ko: '순수한 기하학적형태', en: 'Geometric Purity' },
    keywords: [
      { en: 'Orthogonal Grid', ko: '직교 그리드' },
      { en: 'Layered Transparency', ko: '레이어 투명성' },
      { en: 'Elevated Massing', ko: '띄워진 매스' },
      { en: 'Absolute Whiteness', ko: '절대 백색' },
      { en: 'Hard Sunlight Chiaroscuro', ko: '강렬한 명암법' }
    ]
  },
  'C': {
    title: { ko: '가구식 구조', en: 'Particlization' },
    keywords: [
      { en: 'Divide', ko: '분할' },
      { en: 'Kigumi Joinery', ko: '결구 접합' },
      { en: 'Deep Eaves', ko: '깊은 처마' },
      { en: 'Blurred Edge', ko: '흐릿한 경계' },
      { en: 'Komorebi Lighting', ko: '목과 빛' }
    ]
  },
  'D': {
    title: { ko: '고지식한 조형성', en: 'Incised Geometry' },
    keywords: [
      { en: 'Platonic Extrusion', ko: '플라톤적 돌출' },
      { en: 'Strategic Incision', ko: '전략적 절개' },
      { en: 'Horizontal Striping', ko: '수평 줄무늬' },
      { en: 'Brick Pattern Variation', ko: '벽돌 패턴 변주' },
      { en: 'Grounded Solidity', ko: '접지된 견고함' }
    ]
  },
  'E': {
    title: { ko: '조형적인 유선형', en: 'Sculptural Fluidity' },
    keywords: [
      { en: 'Collide & Explode', ko: '충돌과 폭발' },
      { en: 'Curve & Crumple', ko: '곡면과 구김' },
      { en: 'Metallic Skin', ko: '금속 피부' },
      { en: 'Asymmetric Fragmentation', ko: '비대칭 파편화' },
      { en: 'Oblique Sunlight Drama', ko: '비스듬한 햇빛 드라마' }
    ]
  },
  'F': {
    title: { ko: '다이어그램의 구조화', en: 'Diagrammatic Formalism' },
    keywords: [
      { en: 'Dual Grid Superimposition', ko: '이중 그리드 중첩' },
      { en: 'Transformation Sequence', ko: '변형 연산 시퀀스' },
      { en: 'Indexical Trace', ko: '지표적 흔적' },
      { en: 'Anti-Compositional Logic', ko: '반구성 논리' },
      { en: 'White Neutrality', ko: '백색 중립성' }
    ]
  },
  'G': {
    title: { ko: '노출된 하이테크', en: 'Tectonic Transparency' },
    keywords: [
      { en: 'Kit of Parts', ko: '부품 조립' },
      { en: 'Multi-Layered Facade', ko: '다층 입면' },
      { en: 'Floating Roof', ko: '떠 있는 지붕' },
      { en: 'Exposed Services', ko: '노출 설비' },
      { en: 'Adaptive Permeability', ko: '적응적 투과성' }
    ]
  }
};

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
  if (angle === '3:00') return [{ row: 1, col: 2, label: 'RIGHT' }];
  if (angle === '09:00') return [{ row: 1, col: 0, label: 'LEFT' }];
  // Corner angles → composite (both adjacent faces)
  if (angle === '1:30') return [{ row: 2, col: 1, label: 'REAR' }, { row: 1, col: 2, label: 'RIGHT' }];
  if (angle === '04:30') return [{ row: 1, col: 2, label: 'RIGHT' }, { row: 1, col: 1, label: 'FRONT' }];
  if (angle === '07:30') return [{ row: 1, col: 1, label: 'FRONT' }, { row: 1, col: 0, label: 'LEFT' }];
  if (angle === '10:30') return [{ row: 1, col: 0, label: 'LEFT' }, { row: 2, col: 1, label: 'REAR' }];
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


// --- Vector / Arc Helpers ---
function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
  return {
    x: centerX + (radius * Math.cos(angleInRadians)),
    y: centerY + (radius * Math.sin(angleInRadians))
  };
}

function describeArc(x: number, y: number, radius: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(x, y, radius, endAngle);
  const end = polarToCartesian(x, y, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return [
    "M", start.x, start.y,
    "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y
  ].join(" ");
}

// --- Site Plan Diagram Component ---
// V272: onImageDrop / drag&drop / upload 제거
const SitePlanDiagram = ({ angle, lens, isAnalyzing, analysisStep, visibleV0Index }: { angle: string, lens: number, isAnalyzing: boolean, analysisStep: string, visibleV0Index?: number | null }) => {
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
    <div
      className="w-full aspect-square relative flex items-center justify-center overflow-hidden transition-colors duration-300"
    >

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

        {/* V305: Visible Area Arc (±45 deg = 90 deg range) */}
        {visibleV0Index != null && (
          <path
            d={describeArc(
              cx, cy, radius,
              angleMap[ANGLES[Math.max(0, visibleV0Index - 1)]],
              angleMap[ANGLES[Math.min(ANGLES.length - 1, visibleV0Index + 1)]]
            )}
            fill="none"
            stroke="black"
            className="dark:stroke-white"
            strokeWidth="3"
            strokeLinecap="round"
          />
        )}

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
  type: 'upload' | 'generated' | 'artboard' | 'sketch_generated' | 'path' | 'text';
  src: string | null;
  isLocked?: boolean;
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
    architecturalSheetImage?: string | null; // V297 H
    buildingDescription?: string; // V297 D-5
    elevationImages?: {
      front: string | null;
      right: string | null;
      rear: string | null;
      left: string | null;
      top: string | null;
    } | null;
    // V2.3: Path & Text specific properties
    points?: { x: number, y: number }[];
    strokeColor?: string;
    strokeWidth?: number;
    content?: string;
    fontSize?: number;
    color?: string;
    // V262: PLANNERS result card flag
    isPlannerResult?: boolean;
    // V263: PLANNERS structured debate result
    debateResult?: DiscussionResult;
    plannerPrompt?: string;           // V268
    // V268: Sketch to Image generation params
    sketchMode?: string;
    sketchStyle?: string | null;
    activeDetailStyle?: string | null;
    resolution?: string;
    aspectRatio?: string | null;
    sketchPrompt?: string;  // V269
    // V268: Change Viewpoint prompt
    cvPrompt?: string;
  } | null;
  // V272: Bottom label
  label?: string;
  // V276: Edit tab system (generated/upload)
  editVersions?: Array<{ src: string; label: string }>;
  activeVersionIndex?: number;
  // V278: sketch_generated artboard stack
  childArtboardIds?: string[];
  activeChildIndex?: number;
}

export default function App() {
  // --- State ---
  const [canvasItems, setCanvasItems] = useState<CanvasItem[]>(() => {
    try {
      const saved = localStorage.getItem('crete_canvasItems');
      // src is intentionally stripped before saving — restored async from IndexedDB below
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // [V308] On mount: restore src from IndexedDB for all items
  useEffect(() => {
    const restoreSrcs = async () => {
      const restored = await Promise.all(
        (JSON.parse(localStorage.getItem('crete_canvasItems') || '[]') as CanvasItem[]).map(async (item) => {
          if (!item.src) {
            const src = await loadImageFromDB(item.id);
            return { ...item, src: src || null };
          }
          return item;
        })
      );
      setCanvasItems(restored);
    };
    restoreSrcs();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // [V308] Persist: save src to IndexedDB separately, strip from localStorage to avoid QuotaExceededError
  useEffect(() => {
    const persist = async () => {
      // Save all srcs to IndexedDB
      await Promise.all(
        canvasItems.map(async (item) => {
          if (item.src) {
            await saveImageToDB(item.id, item.src);
          }
        })
      );
      // Save stripped state (no base64) to localStorage
      const stripped = canvasItems.map((item) => ({ ...item, src: null }));
      try {
        localStorage.setItem('crete_canvasItems', JSON.stringify(stripped));
      } catch (err) {
        console.error('[V308] localStorage.setItem failed (stripped):', err);
      }
    };
    persist();
  }, [canvasItems]);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const selectedItemIdsRef = useRef<string[]>([]);
  const [isLassoing, setIsLassoing] = useState(false);
  const isLassoingRef = useRef(false);
  const [lassoPath, setLassoPath] = useState<{ x: number, y: number }[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false); // V2.3: Pen drawing state
  const [isCreatingText, setIsCreatingText] = useState(false); // V2.3: Text box drag state
  const [textStartPos, setTextStartPos] = useState<{ x: number, y: number } | null>(null);
  const [currentStroke, setCurrentStroke] = useState<{ x: number, y: number }[]>([]);
  const isDrawingRef = useRef(false); // V2.4: Atomic lock for drawing
  const isCreatingTextRef = useRef(false); // V2.4: Atomic lock for text box
  const isErasingRef = useRef(false); // V254: Atomic lock for erasing
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 }); // V2.3: Tracking for previews
  // V255: Stroke width & eraser size
  const [penStrokeWidth, setPenStrokeWidth] = useState(2);
  const [eraserStrokeWidth, setEraserStrokeWidth] = useState(8);
  const [showStrokePanel, setShowStrokePanel] = useState<'pen' | 'eraser' | null>(null);

  // Drag & Resize Refs (Ref 기반 — stale closure 방지)
  const isDraggingItemRef = useRef(false);
  const isResizingItemRef = useRef(false);
  const isDraggingPanRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const dragStartRef = useRef({ x: 0, y: 0 });
  const resizeStartRef = useRef<{ 
    x: number, y: number, width: number, height: number, itemX: number, itemY: number, 
    childPaths?: Record<string, any> 
  }>({ x: 0, y: 0, width: 0, height: 0, itemX: 0, itemY: 0 });
  const resizeCornerRef = useRef({ dx: 1, dy: 1 });
  // V189: Store multiple starting positions for drag
  const clickedItemStartPositionsRef = useRef<Record<string, { x: number, y: number }>>({});
  const pendingToggleItemIdRef = useRef<string | null>(null);
  const isTwoFingerActiveRef = useRef(false); // V198: Block lasso on two-finger touch
  const previousCanvasModeRef = useRef<'select' | 'pan' | 'lasso' | 'pen' | 'eraser' | 'text'>('select'); // V199: Pan persistence
  const tempRestoreCanvasModeRef = useRef<'pen' | 'eraser' | null>(null); // V268: temp cursor fallback
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
  const [toastMessage, setToastMessage] = useState<string>(''); // V276
  const [activeTab, setActiveTab] = useState<'control' | 'result'>('control');
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
  const [canvasMode, setCanvasMode] = useState<'select' | 'pan' | 'lasso' | 'pen' | 'eraser' | 'text'>('select');

  // V203: Right panel function selector
  const [isFunctionSelectorOpen, setIsFunctionSelectorOpen] = useState(true);
  const [selectedFunction, setSelectedFunction] = useState<string | null>(null); // V264: no default panel

  // V265: CHANGE VIEWPOINT prompt state
  const [cvPrompt, setCvPrompt] = useState('');

  // V209: Sketch To Image Panel State
  const [sketchPrompt, setSketchPrompt] = useState('');
  const [sketchMode, setSketchMode] = useState('');
  const [sketchStyle, setSketchStyle] = useState<string | null>(null);
  const [activeDetailStyle, setActiveDetailStyle] = useState<string | null>(null);

  // V218/V263: PLANNERS Panel States
  const [plannerPrompt, setPlannerPrompt] = useState<string>("");
  const [lastDebateResult, setLastDebateResult] = useState<DiscussionResult | null>(null);
  const [selectedPlannerCardId, setSelectedPlannerCardId] = useState<string | null>(null);

  // V217: PRINT Panel States
  const [printPrompt, setPrintPrompt] = useState<string>("");
  const [printTemplate, setPrintTemplate] = useState<string>(""); // V287 A: 초기 미선택
  const [printPages, setPrintPages] = useState<number>(1); // V286 C: 초기값 1

  // V250: Mother App Common States (Resolution & Aspect Ratio)
  const [resolution, setResolution] = useState<string>('');
  const [aspectRatio, setAspectRatio] = useState<string | null>(null); // V265: null = unselected

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

  const artboardFileInputRef = useRef<HTMLInputElement>(null); // V257: artboard image upload
  const pendingArtboardIdRef = useRef<string | null>(null); // V257: target artboard for upload
  const activeDrawBoundsRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null); // V257: C-10 drawing bounds
  const activeDrawTargetIdRef = useRef<string | null>(null); // V258: artboard/item ID for motherId linkage
  const canvasRef = useRef<HTMLElement>(null); // V54: Absolute ref for canvas section
  const canvasOffsetRef = useRef({ x: 0, y: 0 });
  const canvasZoomRef = useRef(100);
  useEffect(() => { canvasOffsetRef.current = canvasOffset; }, [canvasOffset]);
  useEffect(() => { canvasZoomRef.current = canvasZoom; }, [canvasZoom]);
  // V255: Close stroke panel when switching away from pen/eraser
  useEffect(() => {
    if (canvasMode !== 'pen' && canvasMode !== 'eraser') {
      setShowStrokePanel(null);
    }
  }, [canvasMode]);

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
      // V268: Reset all panel input states on canvas deselect
      setCvPrompt('');
      setSketchMode('');
      setSketchStyle(null);
      setActiveDetailStyle(null);
      setResolution('');
      setAspectRatio(null);
      setSketchPrompt('');  // V269
      setPlannerPrompt('');
      setLastDebateResult(null);
      setSelectedPlannerCardId(null);
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

      // V268: Type-specific panel restore
      if (item.type === 'generated') {
        setCvPrompt(item.parameters.cvPrompt || '');
        // V278: setSelectedFunction 제거 — 클릭 시 패널 자동 전환 방지
      } else if (item.type === 'sketch_generated') {
        setSketchMode(item.parameters.sketchMode || '');
        setSketchStyle(item.parameters.sketchStyle ?? null);
        setActiveDetailStyle(item.parameters.activeDetailStyle ?? null);
        setResolution(item.parameters.resolution || '');
        setAspectRatio(item.parameters.aspectRatio ?? null);
        setSketchPrompt(item.parameters.sketchPrompt || '');  // V269
        // V278: setSelectedFunction 제거 — 클릭 시 패널 자동 전환 방지
      } else if (item.parameters?.isPlannerResult) {
        setLastDebateResult(item.parameters.debateResult || null);
        setPlannerPrompt(item.parameters.plannerPrompt || '');
      }
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

  // V200-3: Non-passive wheel listener for web zoom
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const prevZoom = canvasZoomRef.current;
      const prevOffset = canvasOffsetRef.current;
      const prevScale = prevZoom / 100;
      const cursorCanvasX = (e.clientX - cx - prevOffset.x) / prevScale;
      const cursorCanvasY = (e.clientY - cy - prevOffset.y) / prevScale;
      const zoomFactor = -e.deltaY * 0.1;
      const newZoom = Math.min(Math.max(prevZoom + zoomFactor, 10), 200);
      const newScale = newZoom / 100;
      setCanvasZoom(newZoom);
      setCanvasOffset({
        x: e.clientX - cx - cursorCanvasX * newScale,
        y: e.clientY - cy - cursorCanvasY * newScale,
      });
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, []);

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

  // V254: Partial erase helpers (V256: segment-circle intersection for precise erasure)

  // V256: Returns [t1, t2] where segment P1→P2 intersects circle (c, r), or null if no intersection
  const segmentCircleIntersect = (
    p1: { x: number; y: number },
    p2: { x: number; y: number },
    c: { x: number; y: number },
    r: number
  ): [number, number] | null => {
    const dx = p2.x - p1.x, dy = p2.y - p1.y;
    const fx = p1.x - c.x, fy = p1.y - c.y;
    const a = dx * dx + dy * dy;
    if (a === 0) return null;
    const b = 2 * (fx * dx + fy * dy);
    const cv = fx * fx + fy * fy - r * r;
    const disc = b * b - 4 * a * cv;
    if (disc < 0) return null;
    const sq = Math.sqrt(disc);
    const t1 = (-b - sq) / (2 * a);
    const t2 = (-b + sq) / (2 * a);
    if (t2 < 0 || t1 > 1) return null;
    return [Math.max(0, t1), Math.min(1, t2)];
  };

  const lerpPt = (
    p1: { x: number; y: number },
    p2: { x: number; y: number },
    t: number
  ): { x: number; y: number } => ({
    x: p1.x + (p2.x - p1.x) * t,
    y: p1.y + (p2.y - p1.y) * t,
  });

  const createPathItemFromAbsolutePoints = (
    absolutePoints: { x: number; y: number }[],
    originalItem: CanvasItem
  ): CanvasItem => {
    const minX = Math.min(...absolutePoints.map(p => p.x));
    const minY = Math.min(...absolutePoints.map(p => p.y));
    const maxX = Math.max(...absolutePoints.map(p => p.x));
    const maxY = Math.max(...absolutePoints.map(p => p.y));
    return {
      ...originalItem,
      id: `path-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      x: minX,
      y: minY,
      width: Math.max(maxX - minX, 2),
      height: Math.max(maxY - minY, 2),
      parameters: {
        ...originalItem.parameters,
        points: absolutePoints.map(p => ({ x: p.x - minX, y: p.y - minY })),
      },
    };
  };

  // V256: Precise erase using segment-circle intersection clipping
  const eraseAtPoint = (coords: { x: number; y: number }) => {
    setCanvasItems(prev => {
      const r = eraserStrokeWidth;
      let globalChanged = false;
      const newItems: CanvasItem[] = [];

      for (const item of prev) {
        if (item.type !== 'path') { newItems.push(item); continue; }

        const pts = (item.parameters?.points || []).map((p: { x: number; y: number }) => ({
          x: item.x + p.x, y: item.y + p.y,
        }));
        if (pts.length < 2) continue;

        const inside = (p: { x: number; y: number }) =>
          (p.x - coords.x) ** 2 + (p.y - coords.y) ** 2 <= r * r;

        const outSegs: { x: number; y: number }[][] = [];
        let seg: { x: number; y: number }[] = [];
        let pathChanged = false;

        if (!inside(pts[0])) {
          seg.push(pts[0]);
        } else {
          pathChanged = true;
        }

        for (let i = 1; i < pts.length; i++) {
          const p0 = pts[i - 1], p1 = pts[i];
          const p0in = inside(p0), p1in = inside(p1);
          const its = segmentCircleIntersect(p0, p1, coords, r);

          if (!p0in && !p1in) {
            if (its) {
              // 선분이 원을 통과: 진입점까지 저장 → 새 세그먼트를 탈출점부터 시작
              pathChanged = true;
              seg.push(lerpPt(p0, p1, its[0]));
              if (seg.length >= 2) outSegs.push(seg);
              seg = [lerpPt(p0, p1, its[1]), p1];
            } else {
              seg.push(p1);
            }
          } else if (!p0in && p1in) {
            // 원 진입: 진입점에서 세그먼트 종료
            pathChanged = true;
            if (its) seg.push(lerpPt(p0, p1, its[0]));
            if (seg.length >= 2) outSegs.push(seg);
            seg = [];
          } else if (p0in && !p1in) {
            // 원 탈출: 탈출점부터 새 세그먼트 시작
            pathChanged = true;
            if (its) seg.push(lerpPt(p0, p1, its[1]));
            seg.push(p1);
          }
          // p0in && p1in: 둘 다 원 안 → skip
        }
        if (seg.length >= 2) outSegs.push(seg);

        if (!pathChanged) {
          newItems.push(item);
        } else {
          globalChanged = true;
          for (const s of outSegs) {
            if (s.length >= 2) newItems.push(createPathItemFromAbsolutePoints(s, item));
          }
        }
      }

      return globalChanged ? newItems : prev;
    });
  };

  const getCanvasCoords = (clientX: number, clientY: number) => {
    const scale = canvasZoom / 100;
    const canvas = (canvasRef as any).current;
    
    // V2.7: Strict High-Precision Mapping (Addressing User's Best Practices)
    const rect = canvas?.getBoundingClientRect() || { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
    
    // Account for potential borders/padding that might shift the logical center
    let borderLeft = 0, borderTop = 0;
    if (canvas) {
      const style = window.getComputedStyle(canvas);
      borderLeft = parseFloat(style.borderLeftWidth) || 0;
      borderTop = parseFloat(style.borderTopWidth) || 0;
    }

    // Precise logical center of the content area
    const contentWidth = rect.width - (borderLeft * 2);
    const contentHeight = rect.height - (borderTop * 2);
    const cx = rect.left + borderLeft + contentWidth / 2;
    const cy = rect.top + borderTop + contentHeight / 2;

    return {
      x: (clientX - cx - canvasOffset.x) / scale,
      y: (clientY - cy - canvasOffset.y) / scale
    };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    const isUIInteraction = target.closest('.pointer-events-auto');
    const isCanvasItem = target.closest('[data-canvas-item="true"]');
    // V187: Allow resize handles to bypass UI block
    const isResizeHandle = target.classList.contains('resize-handle') || target.style.cursor?.endsWith('-resize');
    
    // V310: In drawing/text modes, allow clicking on items even if they are 'pointer-events-auto'
    const isDrawingMode = ['pen', 'eraser', 'text'].includes(canvasMode);
    if (isUIInteraction && !isResizeHandle && !(isDrawingMode && isCanvasItem)) return;

    // V184: Auto-collapse expanded search ONLY when NOT clicking UI elements (Canvas or Item clicks)
    setShowStrokePanel(null); // V255: Close stroke width panel on canvas click

    // V201-2: Stylus (pen) unblock - reset two-finger flag on pen input
    if (e.pointerType === 'pen') isTwoFingerActiveRef.current = false;

    // V306: 생성/분석 중 선택 락업 (빈 캔버스 및 다른 아이템 클릭 시 선택 해제 방지)
    if (isGenerating || isAnalyzing) {
      if (canvasMode === 'pan' || canvasMode === 'select') {
        isDraggingPanRef.current = true;
        setIsDraggingPan(true);
        dragStartRef.current = { x: e.clientX - canvasOffset.x, y: e.clientY - canvasOffset.y };
        e.currentTarget.setPointerCapture(e.pointerId);
      }
      return;
    }

    const coords = getCanvasCoords(e.clientX, e.clientY);

    if (canvasMode === 'pan') {
      // In Pan mode, clicking ANYTHING (including images) leads to Panning.
      isDraggingPanRef.current = true;
      setIsDraggingPan(true);
      dragStartRef.current = { x: e.clientX - canvasOffset.x, y: e.clientY - canvasOffset.y };
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }

    // --- Select Mode only: resize + item click ---
    // V254: eraser/pen/lasso/text modes bypass item selection entirely (B-1, B-2)

    if (canvasMode === 'select') {
      // 1. Check Resize Handles first (if exactly one item is selected)
      const resizeCorner = (target.closest('.resize-handle') as HTMLElement)?.dataset;
      if (resizeCorner && selectedItemIds.length === 1) {
        const selectedId = selectedItemIds[0];
        const item = canvasItems.find(i => i.id === selectedId);
        if (item && !(item.type === 'artboard' && item.isLocked)) { // V258: locked artboard cannot be resized
          setHistoryStates(prev => [...prev, canvasItems]);
          setRedoStates([]);

          isResizingItemRef.current = true;
          setIsResizingItem(true);
          resizeCornerRef.current = { dx: parseInt(resizeCorner.dx!), dy: parseInt(resizeCorner.dy!) };
          
          // V281: 해당 아이템에 종속된 스케치선 정보 임시 저장
          const childPaths: Record<string, any> = {};
          canvasItems.forEach(child => {
            if (child.motherId === item.id && child.type === 'path') {
               childPaths[child.id] = {
                 x: child.x, y: child.y, width: child.width, height: child.height, 
                 points: child.parameters?.points ? [...child.parameters.points] : [],
                 strokeWidth: child.parameters?.strokeWidth ?? 2
               };
            }
          });
          
          resizeStartRef.current = { x: coords.x, y: coords.y, width: item.width, height: item.height, itemX: item.x, itemY: item.y, childPaths };
          e.currentTarget.setPointerCapture(e.pointerId);
          return;
        }
      }

      // 2. Check Item Click for Selection/Drag (V254: path excluded — B-3)
      const clickedItem = [...canvasItems].reverse().find((item: CanvasItem) => {
        if (item.type === 'path') return false;
        // V264: locked artboard can be selected — drag blocked separately below
        return coords.x >= item.x && coords.x <= item.x + item.width &&
               coords.y >= item.y && coords.y <= item.y + item.height;
      });

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
          // V287 B: Planners 카드 재클릭 = 상세 페이지 열기 (deselect 없음)
          if (clickedItem.parameters?.isPlannerResult) {
            setSelectedPlannerCardId(clickedItem.id);
            setIsRightPanelOpen(true);
            setSelectedFunction('PLANNERS');
            setIsFunctionSelectorOpen(false);
          } else {
            pendingToggleItemIdRef.current = clickedItem.id;
          }
        }

        // V141: Transition library if open
        if (openLibraryItemId && !currentSelection.includes(clickedItem.id)) {
          setOpenLibraryItemId(clickedItem.id);
        }

        // V264: locked artboard — selection allowed, drag blocked
        // V313: All items movable in select mode (removed V309 derived block)
        if (!(clickedItem.type === 'artboard' && clickedItem.isLocked)) {
          isDraggingItemRef.current = true;
          setIsDraggingItem(true);
          dragStartRef.current = { x: coords.x, y: coords.y };

          // V193: Deselect Toggle Logic Init
          // V287 B: Planners 카드는 deselect 없음
          if (selectedItemIds.includes(clickedItem.id) && !clickedItem.parameters?.isPlannerResult) {
            pendingToggleItemIdRef.current = clickedItem.id;
          }

          // V258 C-6: Also collect start positions of motherId-linked children
          const startPositions: Record<string, { x: number; y: number }> = {};
          for (const id of currentSelection) {
            const itm = canvasItems.find((i: CanvasItem) => i.id === id);
            if (itm) {
              startPositions[id] = { x: itm.x, y: itm.y };
              if (itm.type === 'artboard' || itm.type === 'upload' || itm.type === 'generated' || itm.type === 'sketch_generated') { // V281: sketch_generated 자식 묶음
                canvasItems.forEach((child: CanvasItem) => {
                  if (child.motherId === id && (child.type === 'path' || child.type === 'text')) {
                    startPositions[child.id] = { x: child.x, y: child.y };
                  }
                });
              }
            }
          }
          clickedItemStartPositionsRef.current = startPositions;
        }

        e.currentTarget.setPointerCapture(e.pointerId);
        return;
      }
    }

    // 3. No Item Clicked
    // V198: Block lasso if two-finger touch is active
    if (isTwoFingerActiveRef.current) return;
    setSelectedItemIds([]);
    selectedItemIdsRef.current = [];
    setOpenLibraryItemId(null);
    // V306: 패널 전체 닫기가 아닌 초기(SELECT TOOLS) 상태로 복귀
    setIsRightPanelOpen(true);
    setIsFunctionSelectorOpen(true);

    if (canvasMode === 'lasso') {
      if (e.pointerType === 'touch') return; // V267: block touch only, allow mouse+pen
      // V201-1: Lasso mode only
      setIsLassoing(true);
      isLassoingRef.current = true;
      setLassoPath([{ x: coords.x, y: coords.y }]);
      e.currentTarget.setPointerCapture(e.pointerId);
    } else if (canvasMode === 'pen') {
      if (e.pointerType === 'touch') {
        // V286 A: 손가락 터치 → 임시 pan (tempRestoreCanvasModeRef 활용, pointerUp에서 자동 복귀)
        tempRestoreCanvasModeRef.current = 'pen';
        setCanvasMode('pan');
        isDraggingPanRef.current = true;
        setIsDraggingPan(true);
        dragStartRef.current = { x: e.clientX - canvasOffset.x, y: e.clientY - canvasOffset.y };
        e.currentTarget.setPointerCapture(e.pointerId);
        return;
      }
      // V314: Smart Target - Enable sketching on artboard (even if blank) or any item with src/motherId
      const drawTarget = canvasItems.find((item: CanvasItem) =>
        (item.src || item.motherId || item.type === 'artboard') &&
        coords.x >= item.x && coords.x <= item.x + item.width &&
        coords.y >= item.y && coords.y <= item.y + item.height
      );
      if (!drawTarget) {
        tempRestoreCanvasModeRef.current = 'pen'; // V268: temp cursor fallback
        setCanvasMode('pan'); // V269: pan instead of select
        return;
      }
      activeDrawBoundsRef.current = { x: drawTarget.x, y: drawTarget.y, width: drawTarget.width, height: drawTarget.height };
      activeDrawTargetIdRef.current = drawTarget.id; // V258: save target for motherId
      setHistoryStates(prev => [...prev, canvasItems]);
      setRedoStates([]);
      setIsDrawing(true);
      isDrawingRef.current = true; // V2.4: Set atomic lock
      setCurrentStroke([coords]);
      e.currentTarget.setPointerCapture(e.pointerId);
    } else if (canvasMode === 'eraser') {
      if (e.pointerType === 'touch') {
        // V286 B: 손가락 터치 → 임시 pan (tempRestoreCanvasModeRef 활용, pointerUp에서 자동 복귀)
        tempRestoreCanvasModeRef.current = 'eraser';
        setCanvasMode('pan');
        isDraggingPanRef.current = true;
        setIsDraggingPan(true);
        dragStartRef.current = { x: e.clientX - canvasOffset.x, y: e.clientY - canvasOffset.y };
        e.currentTarget.setPointerCapture(e.pointerId);
        return;
      }
      // V318: Smart Target - Enable erasing on artboard (even if blank), any item with src/motherId, OR any existing path (for background cleanup)
      const eraseTarget = canvasItems.find((item: CanvasItem) =>
        (item.src || item.motherId || item.type === 'artboard' || item.type === 'path') &&
        coords.x >= item.x && coords.x <= item.x + item.width &&
        coords.y >= item.y && coords.y <= item.y + item.height
      );
      if (!eraseTarget) {
        tempRestoreCanvasModeRef.current = 'eraser'; // V268: temp cursor fallback
        setCanvasMode('pan'); // V269: pan instead of select
        return;
      }
      activeDrawBoundsRef.current = { x: eraseTarget.x, y: eraseTarget.y, width: eraseTarget.width, height: eraseTarget.height };
      setHistoryStates(prev => [...prev, canvasItems]);
      setRedoStates([]);
      isErasingRef.current = true;
      eraseAtPoint(coords);
      e.currentTarget.setPointerCapture(e.pointerId);
    } else if (canvasMode === 'text') {
      // V258 C-4: Restrict text to drawable item bounds
      // V296 A: sketch_generated 타입 텍스트 입력 허용
      const textTarget = canvasItems.find((item: CanvasItem) =>
        (item.type === 'upload' || item.type === 'generated' || item.type === 'artboard' || item.type === 'sketch_generated') &&
        coords.x >= item.x && coords.x <= item.x + item.width &&
        coords.y >= item.y && coords.y <= item.y + item.height
      );
      if (!textTarget) return;
      activeDrawTargetIdRef.current = textTarget.id; // V258: save target for motherId
      setIsCreatingText(true);
      isCreatingTextRef.current = true; // V2.4: Set atomic lock
      setTextStartPos(coords);
      e.currentTarget.setPointerCapture(e.pointerId);
    } else {
      // V201-1: Select mode background click → pan
      isDraggingPanRef.current = true;
      setIsDraggingPan(true);
      dragStartRef.current = { x: e.clientX - canvasOffset.x, y: e.clientY - canvasOffset.y };
      e.currentTarget.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const coords = getCanvasCoords(e.clientX, e.clientY);
    setLastMousePos(coords);

    if (isErasingRef.current) {
      eraseAtPoint(coords);
    } else if (isLassoingRef.current) {
      setLassoPath(prev => [...prev, coords]);
    } else if (isDrawing) {
      // V257 C-10: Clip points to drawable bounds
      const b = activeDrawBoundsRef.current;
      const clipped = b ? {
        x: Math.max(b.x, Math.min(b.x + b.width, coords.x)),
        y: Math.max(b.y, Math.min(b.y + b.height, coords.y)),
      } : coords;
      setCurrentStroke(prev => [...prev, clipped]);
    } else if (isCreatingText) {
      // Logic handled in UI via textStartPos and current coords
    } else if (isDraggingPanRef.current) {
      setCanvasOffset({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y
      });
    } else if (isDraggingItemRef.current && selectedItemIdsRef.current.length > 0) {
      const dx = coords.x - dragStartRef.current.x;
      const dy = coords.y - dragStartRef.current.y;

      const threshold = (e.pointerType === 'pen' || e.pointerType === 'stylus') ? 6 : 3;
      if (pendingToggleItemIdRef.current && (Math.abs(dx) > threshold || Math.abs(dy) > threshold)) {
        pendingToggleItemIdRef.current = null;
      }

      setCanvasItems(prev => prev.map(item => {
        const startPos = clickedItemStartPositionsRef.current[item.id];
        if (!startPos) return item;
        // V258 C-6: Move selected items + motherId-linked children (path/text)
        return { ...item, x: startPos.x + dx, y: startPos.y + dy };
      }));
    } else if (isResizingItemRef.current && selectedItemIdsRef.current.length === 1) {
      const selectedId = selectedItemIdsRef.current[0];
      const dx = coords.x - resizeStartRef.current.x;
      const dy = coords.y - resizeStartRef.current.y;
      const aspect = resizeStartRef.current.width / resizeStartRef.current.height;

      // V281: 부모 리사이징 비율 선계산
      const rawDeltaW = dx * resizeCornerRef.current.dx;
      const newWidth = Math.max(resizeStartRef.current.width + rawDeltaW, 50);
      const newHeight = newWidth / aspect;
      const scaleRatio = newWidth / resizeStartRef.current.width;

      const newX = resizeCornerRef.current.dx === -1
        ? resizeStartRef.current.itemX + (resizeStartRef.current.width - newWidth)
        : resizeStartRef.current.itemX;
      const newY = resizeCornerRef.current.dy === -1
        ? resizeStartRef.current.itemY + (resizeStartRef.current.height - newHeight)
        : resizeStartRef.current.itemY;

      setCanvasItems(prev => prev.map(item => {
        if (item.id === selectedId) {
          return { ...item, x: newX, y: newY, width: newWidth, height: newHeight };
        } else if (item.motherId === selectedId && item.type === 'path' && resizeStartRef.current.childPaths?.[item.id]) {
          // V281: 스케치선 사이즈 연동 동기화
          const original = resizeStartRef.current.childPaths[item.id];
          const scaledRelX = (original.x - resizeStartRef.current.itemX) * scaleRatio;
          const scaledRelY = (original.y - resizeStartRef.current.itemY) * scaleRatio;
          
          return { 
            ...item, 
            x: newX + scaledRelX, 
            y: newY + scaledRelY, 
            width: original.width * scaleRatio, 
            height: original.height * scaleRatio,
            parameters: {
              ...item.parameters,
              points: original.points.map((p: any) => ({ x: p.x * scaleRatio, y: p.y * scaleRatio })),
              strokeWidth: original.strokeWidth * scaleRatio
            }
          };
        }
        return item;
      }));
    }
  };

  const isPointInPolygon = (point: { x: number, y: number }, polygon: { x: number, y: number }[]) => {
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
    const coords = getCanvasCoords(e.clientX, e.clientY);
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

    if (isDrawingRef.current) {
      if (currentStroke.length > 2) {
        const minX = Math.min(...currentStroke.map(p => p.x));
        const minY = Math.min(...currentStroke.map(p => p.y));
        const maxX = Math.max(...currentStroke.map(p => p.x));
        const maxY = Math.max(...currentStroke.map(p => p.y));
        
        const relativePoints = currentStroke.map(p => ({
          x: p.x - minX,
          y: p.y - minY
        }));

        const newItem: CanvasItem = {
          id: `path-${Date.now()}`,
          type: 'path',
          src: '',
          x: minX, y: minY,
          width: Math.max(maxX - minX, 2),
          height: Math.max(maxY - minY, 2),
          motherId: activeDrawTargetIdRef.current, // V258: link to parent item
          parameters: {
            points: relativePoints,
            strokeColor: theme === 'dark' ? '#FFFFFF' : '#000000',
            strokeWidth: penStrokeWidth,
            angleIndex: 0, altitudeIndex: 0, lensIndex: 0, timeIndex: 0
          }
        };
        setCanvasItems(prev => [...prev, newItem]);
      }
      setIsDrawing(false);
      isDrawingRef.current = false; // V2.4: Release atomic lock
      setCurrentStroke([]);
    }

    if (isCreatingTextRef.current && textStartPos) {
      const width = Math.abs(coords.x - textStartPos.x);
      const height = Math.abs(coords.y - textStartPos.y);
      if (width > 10 && height > 10) {
        setHistoryStates(prev => [...prev, canvasItems]);
        setRedoStates([]);
        // V258 C-5: Clip text box to parent item bounds
        const textParent = canvasItems.find((i: CanvasItem) => i.id === activeDrawTargetIdRef.current);
        const rawX = Math.min(coords.x, textStartPos.x);
        const rawY = Math.min(coords.y, textStartPos.y);
        const clampedX = textParent ? Math.max(textParent.x, rawX) : rawX;
        const clampedY = textParent ? Math.max(textParent.y, rawY) : rawY;
        const clampedW = textParent ? Math.min(width, textParent.x + textParent.width - clampedX) : width;
        const clampedH = textParent ? Math.min(height, textParent.y + textParent.height - clampedY) : height;
        const newItem: CanvasItem = {
          id: `text-${Date.now()}`,
          type: 'text',
          src: '',
          x: clampedX,
          y: clampedY,
          width: clampedW,
          height: clampedH,
          motherId: activeDrawTargetIdRef.current, // V258: link to parent item
          parameters: {
            content: "", // V2.4: Start with empty content
            fontSize: 14,
            color: theme === 'dark' ? '#FFFFFF' : '#000000',
            angleIndex: 0, altitudeIndex: 0, lensIndex: 0, timeIndex: 0
          }
        };
        setCanvasItems(prev => [...prev, newItem]);
        setSelectedItemIds([newItem.id]);
        selectedItemIdsRef.current = [newItem.id];
      }
      setIsCreatingText(false);
      isCreatingTextRef.current = false; // V2.4: Release atomic lock
      setTextStartPos(null);
    }

    if (pendingToggleItemIdRef.current) {
      const tid = pendingToggleItemIdRef.current;
      setSelectedItemIds(prev => prev.includes(tid) ? prev.filter(id => id !== tid) : [...prev, tid]);
      pendingToggleItemIdRef.current = null;
    }

    isErasingRef.current = false;
    activeDrawBoundsRef.current = null; // V257 C-10: clear draw bounds
    activeDrawTargetIdRef.current = null; // V258 C-5: clear target id
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

    // V268: Restore pen/eraser after temp cursor fallback
    if (tempRestoreCanvasModeRef.current) {
      setCanvasMode(tempRestoreCanvasModeRef.current);
      tempRestoreCanvasModeRef.current = null;
    }
  };

  // --- Tablet Touch Handlers ---
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      isTwoFingerActiveRef.current = true; // V198: Block lasso
      // V288 B: tempRestore 우선 참조
      previousCanvasModeRef.current = (tempRestoreCanvasModeRef.current || canvasMode) as 'select' | 'pan' | 'pen' | 'eraser';
      if (tempRestoreCanvasModeRef.current) tempRestoreCanvasModeRef.current = null;
      setCanvasMode('pan');
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
      setCanvasZoom(prev => Math.min(Math.max(prev + dist, 10), 200));
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
    const wasTwo = isTwoFingerActiveRef.current; // V200-1: Read before reset
    isTwoFingerActiveRef.current = false;
    lastTouchDist.current = null;
    lastTouchCenter.current = null;
    if (wasTwo) setCanvasMode(previousCanvasModeRef.current); // V200-1: Restore only after two-finger gesture
  };

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  // V257: Artboard image upload — replaces src of target artboard, fits width=595
  const handleArtboardImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const artboardId = pendingArtboardIdRef.current;
    const file = e.target.files?.[0];
    if (!artboardId || !file) return;
    e.target.value = '';
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Image = reader.result as string;
      const img = new Image();
      img.onload = () => {
        const newHeight = Math.round(img.height * (960 / img.width));
        setCanvasItems((prev: CanvasItem[]) => prev.map((i: CanvasItem) =>
          i.id === artboardId ? { ...i, src: base64Image, height: newHeight, label: i.label || 'ORIGINAL' } : i
        ));
      };
      img.src = base64Image;
    };
    reader.readAsDataURL(file);
  };


  // V257: handleImageUpload removed — upload now handled by artboard [Upload] button (handleArtboardImageUpload)

  // V276: Navigate between editVersions tabs
  const navigateVersion = (itemId: string, direction: number) => {
    setCanvasItems((prev: CanvasItem[]) => prev.map((i: CanvasItem) => {
      if (i.id !== itemId || !i.editVersions) return i;
      const newIdx = Math.max(0, Math.min(i.editVersions.length - 1, (i.activeVersionIndex ?? 0) + direction));
      return { ...i, activeVersionIndex: newIdx };
    }));
  };

  // V278: Navigate between childArtboardIds stack (sketch_generated)
  const navigateStack = (parentId: string, direction: number) => {
    setCanvasItems((prev: CanvasItem[]) => prev.map((i: CanvasItem) => {
      if (i.id !== parentId || !i.childArtboardIds) return i;
      const maxIdx = i.childArtboardIds.length;
      const newIdx = Math.max(0, Math.min(maxIdx, (i.activeChildIndex ?? 0) + direction));
      return { ...i, activeChildIndex: newIdx };
    }));
  };

  // V297 D-6: Phase 0 묘사 공통 함수
  const getArchitecturalDescription = async (src: string): Promise<string> => {
    try {
      const b64 = src.split(',')[1];
      const mime = src.split(';')[0].split(':')[1];
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const descResult = await ai.models.generateContent({
        model: ANALYSIS,
        contents: {
          parts: [
            { inlineData: { data: b64, mimeType: mime } },
            { text: 'Describe this architectural image in detail. Cover building form, massing, materials, fenestration, roof type, proportions, surrounding environment, sky, landscaping, weather, and any distinctive features. Be precise and comprehensive. Respond in English only.' }
          ]
        }
      });
      return descResult.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } catch { return ''; }
  };

  // V272: ANALYZE button handler — image regen (gemini-3.1-pro-preview) + PHASE 1 + PHASE 2
  const handleAnalyze = async () => {
    const sourceItem = canvasItems.find(i => i.id === selectedItemIds[0]);
    if (!sourceItem?.src) return;

    setIsAnalyzing(true);
    setAnalysisStep('이미지 묘사 분석 중...');

    // V297 D-3: Phase 0 — 이미지 재생성 → 텍스트 묘사 호출 (원본 이미지 불변)
    let buildingDescription = '';
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const base64Data = sourceItem.src.split(',')[1];
      const mimeType = sourceItem.src.split(';')[0].split(':')[1];
      const descResult = await ai.models.generateContent({
        model: ANALYSIS,
        contents: {
          parts: [
            { inlineData: { data: base64Data, mimeType } },
            { text: 'Describe this architectural image in detail. Cover building form, massing, materials, fenestration, roof type, proportions, surrounding environment, sky, landscaping, weather, and any distinctive features. Be precise and comprehensive. Respond in English only.' }
          ]
        }
      });
      if (abortControllerRef.current?.signal.aborted) return;
      buildingDescription = descResult.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } catch (descErr) {
      console.warn('[V297 D] Phase 0 묘사 호출 실패, 묘사 없이 진행', descErr);
    } finally {
      setIsAnalyzing(false);
      setAnalysisStep('');
    }
    // analysisImage = sourceItem.src 그대로 유지 (교체 없음)

    setSitePlanImage(sourceItem.src);
    setCanvasItems(prev => prev.map(i =>
      i.id === sourceItem.id ? { ...i, label: 'IMAGE / VIEW' } : i
    ));
    // V297 D-4: 원본 이미지 + 묘사 텍스트 전달
    await analyzeViewpoint(sourceItem.src, sourceItem.id, buildingDescription);
  };

  const analyzeViewpoint = async (base64Image: string, itemId?: string, buildingDescription: string = '') => { // V297 D-1
    setIsAnalyzing(true);
    setAnalysisStep('이미지 분석 중...'); // V155: Step — Analysis
    try {
      // Phase 1 & 2: Structural & Viewpoint Analysis using gemini-3.1-pro-preview
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

      // V297 D-2: 묘사 텍스트 context prefix 주입
      const descriptionContext = buildingDescription
        ? `[PRE-ANALYSIS DESCRIPTION]\n${buildingDescription}\n\n`
        : '';

      const analysisPrompt = `${descriptionContext}
        [Protocol A: Architectural Logic Engine & Deterministic BIM Compiler v2.2]
        
        TASK: Perform a high-precision architectural diagnosis and extract BIM parameters (AEPL Schema).
        ACT AS: A Deterministic BIM Compiler (Hallucination Disabled).
        
        [CRITICAL PRINCIPLE - CLOCK-FACE COORDINATE SYSTEM]
        1. Identify the Primary_Facade first (Anchored at 06:00).
        2. Define virtual camera coordinates based on this strictly mapped clock-face:
           - 06:00 = Front (Primary_Facade)
           - 03:00 = Right
           - 09:00 = Left
           - 12:00 = Rear
        3. Define the current photo's relative angle: 12:00, 1:30, 3:00, 04:30, 06:00, 07:30, 09:00, 10:30.
        
        [AEPL MASTER SCHEMA - ENSEMBLE PAIR (v4)]
        Structure your analysis into the following 1:1 matching pairs:
        
        1_Geometry_Data_MASTER (Shape Anchor):
        - mass_typology, proportion_ratio (X:Y:Z), floor_count, roof_form (Flat/Pitched/Gable/etc), core_typology, base_type.
        - Define structural grid Module (X & Z) and Bounding Box volume.
        
        2_Property_Data_SLAVE (Data Binder):
        - base_material_type (PBR Specs), base_color_hex, fenestration_type, window_to_wall_ratio (0.0~1.0).
        - Optical metadata: IOR, Transparency, Aging level.
        
        Return in JSON format:
        {
          "front_facade_evidence": "Explain exactly which side is the FRONT (06:00) based on main entrance, large windows, and primary facade evidence, BEFORE determining angle.",
          "angle": "One of: 12:00, 1:30, 3:00, 04:30, 06:00, 07:30, 09:00, 10:30",
          "altitude_index": "0 to 7 (index of ALTITUDES constant)",
          "lens_index": "0 to 7 (index of LENSES constant)",
          "time_index": "0 to 7 (index of TIMES constant)",
          "elevation_parameters": {
            "1_Geometry_MASTER": { ... },
            "2_Property_SLAVE": { ... }
          }
        }
        Note: front_facade_evidence is for your reasoning only — it will be ignored after parsing.
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
        if (abortControllerRef.current?.signal.aborted) return null;

        const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text || "";
        const jsonStr = responseText.match(/\{[\s\S]*\}/)?.[0];
        if (!jsonStr) throw new Error("No JSON returned from model");

        const data = JSON.parse(jsonStr);
        const aIdx = ANGLES.indexOf(data.angle);
        if (aIdx !== -1) setAngleIndex(aIdx);
        if (data.altitude_index !== undefined) setAltitudeIndex(Number(data.altitude_index));
        if (data.lens_index !== undefined) setLensIndex(Number(data.lens_index));
        if (data.time_index !== undefined) setTimeIndex(Number(data.time_index));

        // --- V2.2: ENSEMBLE PAIR VALIDATION GATE ---
        const hasElevParams = data.elevation_parameters &&
          data.elevation_parameters['1_Geometry_MASTER'] &&
          data.elevation_parameters['2_Property_SLAVE'];

        if (!hasElevParams) {
          console.error('[PROTOCOL-FAIL] Phase 2 검증 실패: AEPL 필수 객체(ENSEMBLE PAIR) 누락');
          setCanvasItems(prev => prev.filter(item => item.id !== itemId));
          setIsAnalyzing(false);
          setIsGenerating(false);
          return null;
        }
        console.log('[PROTOCOL-PASS] Phase 2 검증 통과: BIM 앙상블 페어 동결 완료');
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
          buildingDescription,   // V297 D-5: Phase 2/4에서 참조
          sitePlanImage: null,
          architecturalSheetImage: null
        };

        setCanvasItems(prev => prev.map(item =>
          item.id === itemId ? { ...item, parameters: newParams } : item
        ));

        // After parameter analysis, trigger elevation generation with extracted params
        const elImages = await generateElevations(base64Image, data.elevation_parameters, itemId, buildingDescription); // V297 F-2
        return { elevationParameters: data.elevation_parameters, analyzedOpt, elevationImages: elImages }; // V257
      };

      let analysisResult: { elevationParameters: any; analyzedOpt: any; elevationImages: any } | null = null;
      try {
        const r = await runAnalysis(ANALYSIS);
        if (r !== null) analysisResult = r;
      } catch (primaryError) {
        console.warn(`Primary model (${ANALYSIS}) failed, retrying with fallback...`, primaryError);
        const r2 = await runAnalysis(ANALYSIS_FALLBACK);
        if (!r2) throw new Error("Fallback failed");
        if (r2 !== null) analysisResult = r2;
      }

      return analysisResult; // V257: return params for handleGenerate

    } catch (err) {
      if (abortControllerRef.current?.signal.aborted) return null;
      console.warn("Analysis failed completely, using defaults", err);
      alert("분석 API 호출이 실패하거나 할당량(Quota)을 초과했습니다. 기본값으로 세팅됩니다.");
      return null;
    } finally {
      if (!abortControllerRef.current?.signal.aborted) {
        setIsAnalyzing(false);
        setAnalysisStep(''); // V155: 메시지 초기화
      }
    }
  };


  const generateElevations = async (base64Image: string, extractedParams?: any, itemId?: string, buildingDescription: string = '') => { // V300 A: base64Image 복원
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const contextualParamsStr = extractedParams ? JSON.stringify(extractedParams) : "BIM Lock-on Active";

      setAnalysisStep('기하학 절대 객체 락온 중...');

      // V300 A: base64Data/mimeType 복원
      const base64Data = base64Image.split(',')[1];
      const mimeType = base64Image.split(';')[0].split(':')[1];

      // V2.2: New Sequence (Front -> Top -> Right -> Left -> Rear)
      const viewConfigs = [
        { key: 'front', label: 'FRONT', angle: '06:00', az: 0, alt: 0, normal: '0, -1, 0' },
        { key: 'top', label: 'TOP', angle: 'TOP_VIEW', az: 0, alt: 90, normal: '0, 0, 1' },
        { key: 'right', label: 'RIGHT', angle: '03:00', az: 90, alt: 0, normal: '1, 0, 0' },
        { key: 'left', label: 'LEFT', angle: '09:00', az: 270, alt: 0, normal: '-1, 0, 0' },
        { key: 'rear', label: 'REAR', angle: '12:00', az: 180, alt: 0, normal: '0, 1, 0' }
      ];

      // Helper — API 결과에서 이미지 추출
      const extractImage = (result: any): string | null => {
        if (result.candidates?.[0]?.content?.parts) {
          for (const part of result.candidates[0].content.parts) {
            if (part.inlineData) {
              return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
          }
        }
        return null;
      };

      // V302 B: Modality strict separation (Filtering out Geometry)
      let onlyPropertyParamsStr = "BIM Property Lock-on Active";
      if (extractedParams) {
        // extractedParams.elevationParams가 존재할 경우 타켓팅
        const targetObj = extractedParams.elevationParams || extractedParams;
        const propertiesOnly: Record<string, any> = {};
        for (const [key, value] of Object.entries(targetObj)) {
          // '2_Property' 또는 'material'을 포함하는 키만 추출 (1_Geometry 등은 제외)
          if (key.includes('2_') || key.toLowerCase().includes('property') || key.toLowerCase().includes('material')) {
            propertiesOnly[key] = value;
          }
        }
        if (Object.keys(propertiesOnly).length > 0) {
          onlyPropertyParamsStr = JSON.stringify(propertiesOnly);
        } else {
          onlyPropertyParamsStr = JSON.stringify(targetObj); // Fallback: 패턴 매칭 실패시 전체 주입
        }
      }

      // V302 A: Restore Parallel Generation & Independent Internal 3D Execution
      setAnalysisStep('Protocol B 결정론적 파이프라인 병렬 렌더링 중...');
      
      const generateOne = async (config: typeof viewConfigs[0]) => {
        const descBlock = buildingDescription
          ? `\n[SOURCE IMAGE DESCRIPTION]\n${buildingDescription}\n`
          : '';

        // V302 C: Protocol B Prompt - Dictating Internal 3D Whitebox extraction
        const prompt = `
[PROTOCOL B: Visualization Execution Engine v2.2]
TASK: Deterministic Projection of the building's ${config.label} Orthographic View.
${descBlock}
[PHASE 1: GEOMETRY MASTER LOCKING (Image Prompt Execution)]
1. Analyze the attached SOURCE IMAGE. Internally construct a rigid 3D Whitebox of its bounding volume.
2. Re-project this 3D Whitebox strictly constrained to the Absolute Camera Vector: 
   - Azimuth: ${config.az}°
   - Altitude: ${config.alt}°
   - Normal Vector: ${config.normal}
CRITICAL FOR TOP VIEW (Alt 90): You MUST look strictly down upon the roof. Do NOT project the front facade. This is an absolute geometric constraint.

[PHASE 2: PROPERTY SLAVE INJECTION (Text Prompt Execution)]
- Texture & Material Guidelines:
${onlyPropertyParamsStr}
-> Cast these surface properties onto the re-projected 3D geometry.
- Constraint: Apply materials ONLY. Do not alter the Phase 1 geometric projection.

CONSTRAINTS: NO text, NO labels, Pure Transparent Background (Alpha).
        `.trim();

        const result = await ai.models.generateContent({
          model: IMAGE_GEN,
          contents: {
            parts: [
              { inlineData: { data: base64Data, mimeType: mimeType } }, // 1_Geometry_MASTER anchor
              { text: prompt }, // 2_Property_SLAVE anchor
            ],
          },
          config: { temperature: 0.1, topK: 1 } // Protocol standard
        });
        return extractImage(result);
      };

      // V302 A: Execute 5 views simultaneously (DAG model)
      const results = await Promise.all(viewConfigs.map(config => generateOne(config)));

      const newImages = {
        front: results[0],
        top: results[1],
        right: results[2],
        left: results[3],
        rear: results[4]
      } as const;

      setElevationImages(newImages);
      // V180: Use TOP VIEW for sitePlanImage compat
      if (newImages.top) setSitePlanImage(newImages.top);

      // V297 H: Cross 합성 + ELEVATION SHEET 캔버스 아이템 자동 생성
      const buildCrossComposite = (imgs: typeof newImages): Promise<string | null> =>
        new Promise((resolve) => {
          const entries = [
            { key: 'rear',  col: 1, row: 0 },
            { key: 'left',  col: 0, row: 1 },
            { key: 'top',   col: 1, row: 1 },
            { key: 'right', col: 2, row: 1 },
            { key: 'front', col: 1, row: 2 },
          ];
          const cellW = 512; // V298 A: 16:9 기준
          const cellH = 288; // 864 / 3
          const canvas = document.createElement('canvas');
          canvas.width  = cellW * 3; // 1536
          canvas.height = cellH * 3; // 864
          const ctx = canvas.getContext('2d');
          if (!ctx) { resolve(null); return; }
          ctx.fillStyle = '#FFFFFF'; // V298 A: Pure White
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          let loaded = 0;
          for (const { key, col, row } of entries) {
            const src = (imgs as any)[key];
            if (!src) { if (++loaded === 5) resolve(canvas.toDataURL('image/png')); continue; }
            const img = new Image();
            img.onload = () => {
              ctx.drawImage(img, col * cellW, row * cellH, cellW, cellH); // V298 A
              if (++loaded === 5) resolve(canvas.toDataURL('image/png'));
            };
            img.onerror = () => { if (++loaded === 5) resolve(canvas.toDataURL('image/png')); };
            img.src = src;
          }
        });

      const sheetImage = await buildCrossComposite(newImages);

      if (itemId) {
        setCanvasItems(prev => {
          const sourceItem = prev.find(i => i.id === itemId);

          // ① 소스 아이템 parameters 업데이트
          const updatedItems = prev.map(item => {
            if (item.id === itemId && item.parameters) {
              return {
                ...item,
                parameters: {
                  ...item.parameters,
                  elevationImages: newImages,
                  sitePlanImage: newImages.top,
                  architecturalSheetImage: sheetImage ?? null
                }
              };
            }
            return item;
          });

          if (!sourceItem || !sheetImage) return updatedItems;

          // ② ELEVATION SHEET 캔버스 아이템 자동 생성
          const sheetItem: CanvasItem = {
            id: `elevation-sheet-${Date.now()}`,
            type: 'sketch_generated',
            src: sheetImage,
            x: sourceItem.x,
            y: sourceItem.y + sourceItem.height + 100,
            width: sourceItem.width,
            height: sourceItem.width * (9 / 16), // V299 A: 16:9 비율
            motherId: itemId,
            label: 'ELEVATION SHEET',
            parameters: {
              architecturalSheetImage: sheetImage,
              angleIndex: 0, altitudeIndex: 0, lensIndex: 0, timeIndex: 0
            }
          };

          return [...updatedItems, sheetItem];
        });
      }

      return newImages; // V257: return for handleGenerate inline use

    } catch (err) {
      console.warn("Elevation generation failed", err);
      return null;
    } finally {
      setAnalysisStep('');
    }
  };

  // --- V2.6.0: Local Server Image Save Helper ---
  const saveImageToLocal = async (base64Data: string, type: 'sketch' | 'print' | 'viewpoint') => {
    try {
      const folderMap = {
        sketch: 'cai-sketch',
        print: 'cai-print',
        viewpoint: 'cai-sketch' // Standardized as per instructions
      };
      
      const response = await fetch('/api/save-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: [base64Data],
          folderName: folderMap[type]
        })
      });
      
      const result = await response.json();
      console.log(`[V2.6.0] Save to ${folderMap[type]} result:`, result);
      return result;
    } catch (err) {
      console.error('[V2.6.0] Failed to save image locally:', err);
      return null;
    }
  };

  // ---
  // PHASE 4: SYNTHESIS & GENERATION (Mother App Unified Controller)
  // ---
  const handleGenerate = async () => {
    // 0. FUNCTION MULTIPLEXER
    if (selectedFunction === 'CHANGE VIEWPOINT') {
      // V257: Accept artboard/upload/generated as source
      const sourceItem = selectedItemIds[0]
        ? canvasItems.find(item => item.id === selectedItemIds[0])
        : canvasItems.find(item => item.type === 'artboard' || item.type === 'upload');

      if (!sourceItem || !sourceItem.src) {
        alert("아트보드에 이미지를 먼저 업로드하세요.");
        return;
      }

      // --- V153: PHASE 3 검증 (Viewpoint Configuration Validation) ---
      const isValidPhase3 = ANGLES[angleIndex] && ALTITUDES[altitudeIndex] && LENSES[lensIndex] && TIMES[timeIndex];
      if (!isValidPhase3) {
        console.error('[PROTOCOL-FAIL] Phase 3 검증 실패: 유효하지 않은 5-IVSP 시점 파라미터가 감지되어 재추론을 시도합니다.');
        return;
      }
      console.log('[PROTOCOL-PASS] Phase 3 검증 통과: 5-IVSP 파라미터 셋업 유효함');

      const hasInitialViews = canvasItems.some(i => i.type === 'generated' && (i.motherId === sourceItem.id || (i.motherId === undefined && i.id === sourceItem.id)));
      const isFirstTime = (sourceItem.type === 'upload' || sourceItem.type === 'artboard') && !hasInitialViews;

      setIsGenerating(true);
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

        // V257: C-7~C-9 — inline V128 regen if first time (no elevationParams on item)
        let localElevationParams: any = sourceItem.parameters?.elevationParams || elevationParams;
        let localElevationImages: any = sourceItem.parameters?.elevationImages || elevationImages;
        let localAnalyzedOpt: any = sourceItem.parameters?.analyzedOpticalParams || analyzedOpticalParams;
        const localBuildingDescription: string = sourceItem.parameters?.buildingDescription || ''; // V297 G-1

        if (!localElevationParams) {
          console.log('[V257] No elevationParams found — running V128 regen pipeline...');
          const activeSrc = sourceItem.src as string;
          // V297 D-6: inline 경로도 묘사 선행 호출
          const inlineDesc = await getArchitecturalDescription(activeSrc);
          const analysisResult = await analyzeViewpoint(activeSrc, sourceItem.id, inlineDesc);
          if (!analysisResult) {
            setIsGenerating(false);
            return;
          }
          localElevationParams = analysisResult.elevationParameters;
          localElevationImages = analysisResult.elevationImages;
          localAnalyzedOpt = analysisResult.analyzedOpt;
        }

        const v0_angle = localAnalyzedOpt?.angle || 'Unknown';
        const v0_altitude = localAnalyzedOpt?.altitude || 'Unknown';
        const v0_lens = localAnalyzedOpt?.lens || 'Unknown';
        const v0_time = localAnalyzedOpt?.time || 'Unknown';

        const getAngle = (base: string) => {
          if (['07:30', '09:00', '10:30'].includes(base)) return '07:30';
          return '04:30';
        };

        const getSemanticAngle = (base: string) => {
          switch (base) {
            case '06:00': return '06:00 (Direct Front / Primary Facade View)';
            case '04:30': return '04:30 (Front-Right Corner View / 2-Point Perspective)';
            case '3:00': return '3:00 (Direct Right Side / Profile View)'; // V297 B
            case '1:30': return '1:30 (Rear-Right Corner View / 2-Point Perspective)'; // V297 B
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
        if (sourceItem.type === 'generated' && sourceItem.motherId) {
          const motherItem = canvasItems.find(i => i.id === sourceItem.motherId);
          if (motherItem) actualImageSrc = motherItem.src;
        }

        const base64Data = (actualImageSrc as string).split(',')[1];
        const mimeType = (actualImageSrc as string).split(';')[0].split(':')[1];

        const generatePromises = viewsToGenerate.map(async (viewConfig) => {
          const currentTime = TIMES[timeIndex];
          const layerB_viewpoint = `
# ACTION PROTOCOL (MANDATORY EXECUTION WORKFLOW)
## Pre-Step: Reality Anchoring & Camera Delta Calculation
- V₀ (Current Camera Position): Angle: ${v0_angle} o'clock | Altitude: ${v0_altitude} | Lens: ${v0_lens} | Time: ${v0_time}
- V₁ (Target Camera Position): Angle: ${getSemanticAngle(viewConfig.angle)} | Altitude: ${viewConfig.altitude} | Lens: ${viewConfig.lens} | Time: ${currentTime}
- Δ Movement Vector: Orbit from ${v0_angle} → ${viewConfig.angle}
- Target Vector: ${getSemanticAngle(viewConfig.angle)}
## Step 2: Scenario Mapping & Optical Engineering
- Scenario: ${viewConfig.scenario} | Lens: ${viewConfig.lens} | Time of Day: ${currentTime}`;

          const layerC_property = localElevationParams ? `
## Step 5: Structural & Material Parameters (PHASE 2 AEPL Data — Immutable)
- Mass Typology: ${localElevationParams['1_Geometry_MASTER']?.mass_typology || 'N/A'}
- Roof Form: ${localElevationParams['1_Geometry_MASTER']?.roof_form || 'N/A'}
- Base Material: ${localElevationParams['2_Property_SLAVE']?.base_material_type || 'N/A'}
- Fenestration: ${localElevationParams['2_Property_SLAVE']?.fenestration_type || 'N/A'}` : ''; // V297 A: AEPL v4 키 통일

          // V297 G-2: MICRO-DESCRIPTION 블록 (Phase 0 묘사 → Phase 4 주입)
          const layerC_microDesc = localBuildingDescription
            ? `\n## Step 6: Original Image Micro-Description (Immutable Reference)\n[ORIGINAL IMAGE MICRO-DESCRIPTION]\n${localBuildingDescription}`
            : '';

          // V297 G-3: De-bake 그림자 분리 + 태양광 재계산 강령 추가
          const layerC_blindspot = `## Step 3: Layering & Blind Spot Inference (Void Mitigation)
- Context Void Mitigation: Synchronize Foreground/Background.
- Material Injection: Lock original textures. Relighting only for solar angle (${currentTime}).
- Shadow De-bake: Dark regions in source = CAST SHADOWS (not paint/texture).
  Do NOT copy shadow patterns to new surfaces.
  Re-cast shadows from sun position at ${currentTime}.`;

          let activeElevationSlots = getElevationSlot(viewConfig.angle);
          if (activeElevationSlots.length === 0) activeElevationSlots = getElevationSlot("06:00");
          const elevationLabel = activeElevationSlots.map(s => s.label).join('+');

          // V297 G-4: 권한 분리 룰 + MICRO-DESCRIPTION 블록 추가
          const finalPrompt = `
# SYSTEM: 5-Point Integrated Viewpoint Simulation Architect (5-IVSP)
# GOAL: Change the angle of view of the provided architectural image.
- Geometric Sanctuary: The building's proportions are Immutable Constants.
# INPUT IMAGES: IMAGE 1 (Primary) + IMAGE 2 (Geometric Reference: ${elevationLabel})
# IMAGE AUTHORITY RULE:
  - IMAGE 1 (Original): ABSOLUTE TRUTH for materials, textures, colors, and style.
  - IMAGE 2 (Elevation): GEOMETRY GUIDE ONLY — silhouette and proportions reference, NOT color/material source.
${layerB_viewpoint}\n${layerC_blindspot}\n${layerC_property}${layerC_microDesc}${cvPrompt.trim() ? `\n\n## Additional Creative Direction\n${cvPrompt.trim()}` : ''}
[GENERATE IMAGE NOW]`.trim();

          const runGen = async (modelName: string) => {
            const parts: any[] = [{ inlineData: { data: base64Data, mimeType: mimeType } }];
            if (localElevationImages) {
              for (const slot of activeElevationSlots) {
                const imgData = (localElevationImages as any)[slot.label.toLowerCase()];
                if (imgData) parts.push({ inlineData: { data: imgData.split(',')[1], mimeType: 'image/png' } });
              }
            }
            parts.push({ text: finalPrompt });
            const response = await ai.models.generateContent({ model: modelName, contents: { parts }, config: { temperature: 0.1, topK: 1 } }); // V297 G-5
            if (!abortControllerRef.current || abortControllerRef.current.signal.aborted) return false;

            if (response.candidates?.[0]?.content?.parts) {
              for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                  const generatedSrc = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                  await new Promise<void>((resolve) => {
                    const img = new Image();
                    img.onload = () => {
                      const updatedOpticalParams = { angle: ANGLES[angleIndex], altitude: ALTITUDES[altitudeIndex].label, lens: LENSES[lensIndex].label, time: TIMES[timeIndex] };
                      // V272 F-2: VIEWPOINT label 자동 증가
                      // V309: VIEW XX 넘버링 (모체 독립적)
                      const vpCount = canvasItems.filter((ci: CanvasItem) => ci.motherId === sourceItem.id && ci.label?.startsWith('VIEW ')).length + 1;
                      const newGenItem: CanvasItem = {
                        id: `gen-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                        type: 'generated',
                        src: generatedSrc,
                        x: 0, y: sourceItem.y,
                        width: img.width * 0.3, height: img.height * 0.3,
                        // V283 D: VIEWPOINT 01 연결선이 ANALYZED 모체에 직접 연결되도록
                        motherId: sourceItem.id,
                        label: `VIEW ${String(vpCount).padStart(2, '0')}`,  // V284 E
                        parameters: {
                          angleIndex, altitudeIndex, lensIndex, timeIndex,
                          analyzedOpticalParams: updatedOpticalParams,
                          elevationParams: localElevationParams, sitePlanImage, elevationImages: localElevationImages,
                          cvPrompt  // V268
                        }
                      };
                      
                      // V2.6.0: Save to local folder
                      saveImageToLocal(generatedSrc, 'viewpoint');
                      
                      setCanvasItems(prev => {
                        setHistoryStates(prevH => [...prevH, prev]);
                        // V283 D: siblings 필터 단순화 — sourceItem.id 직접 참조
                        const siblings = prev.filter((i: CanvasItem) => i.type === 'generated' && i.motherId === sourceItem.id);
                        if (siblings.length === 0) {
                          newGenItem.x = sourceItem.x + sourceItem.width + 120;
                          newGenItem.y = (sourceItem.y + sourceItem.height * 0.25) - newGenItem.height;
                        } else {
                          const bottomMost = siblings.reduce((p, c) => (c.y + c.height > p.y + p.height) ? c : p, siblings[0]);
                          newGenItem.x = bottomMost.x;
                          newGenItem.y = bottomMost.y + bottomMost.height + 96;
                        }
                        // V280: CHANGE VIEWPOINT 생성 후 모체 라벨을 ANALYZED로 덮어씌움
                        return [...prev.map(i => i.id === sourceItem.id ? { ...i, label: 'IMAGE / VIEW' } : i), newGenItem];
                      });
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
            await runGen(IMAGE_GEN_FALLBACK).catch(err => console.error("Generation failed", err));
          }
        });
        await Promise.all(generatePromises);
      } catch (error) {
        console.error("Generation Error:", error);
        alert("An error occurred during generation.");
      } finally {
        setIsGenerating(false);
        abortControllerRef.current = null;
        // V268: Reset CHANGE VIEWPOINT panel after generation
        setCvPrompt('');
        setSelectedItemIds([]);
      }
    }

    else if (selectedFunction === 'SKETCH TO IMAGE') {
      if (!sketchMode || !sketchStyle || !aspectRatio || !resolution) {
        alert("Please select both MODE and STYLE.");
        return;
      }

      setIsGenerating(true);
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const styleInfo = STYLE_DESCRIPTIONS[sketchStyle];
        const keywordsStr = styleInfo ? styleInfo.keywords.map(k => k.en).join(', ') : '';

        const systemPrompt = `
          [Architecture Blueprint Protocol - Sketch to Image V250]
          TASK: Transform the user's architectural sketch or description into a completed, realistic building.
          
          [CORE PRINCIPLES]
          - Ontological Status: The output must be a "Finished Building Photography."
          - Architectural Style: ${styleInfo?.title.en} (${keywordsStr}).
          - Mode: ${sketchMode} (${sketchMode === 'CONCEPT' ? 'Focus on creative suggestion and atmosphere.' : 'Focus on preserving the original sketch geometry strictly.'})
          
          [SPECIFICATION]
          - Format: High-quality architectural rendering (Fujifilm GFX 100S, 8k resolution).
          - Aspect Ratio: ${aspectRatio}
          - Quality: ${resolution}
          - Lighting: Pure architectural light, matching the style description.
          
          [CONSTRAINTS]
          - NO text, NO labels, NO humans unless specified.
          - Clean orthographic-leaning perspective.
        `.trim();

        const finalPrompt = `
          User Description: ${sketchPrompt || "A generic building in the specified style."}
          Please generate the image now adhering to the Blueprint Protocol.
        `.trim();

        // V258 C-8: Build composite image once (outside runGen to avoid duplicate on fallback)
        const sourceItem = selectedItemIds[0] ? canvasItems.find((item: CanvasItem) => item.id === selectedItemIds[0]) : null;

        const createArtboardComposite = (artboard: CanvasItem): Promise<string | null> =>
          new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            canvas.width = artboard.width;
            canvas.height = artboard.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) { resolve(null); return; }

            ctx.fillStyle = 'rgba(248, 244, 232, 1)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const drawOverlays = () => {
              // Paths with motherId === artboard.id
              canvasItems.filter((i: CanvasItem) => i.type === 'path' && i.motherId === artboard.id).forEach((pathItem: CanvasItem) => {
                const pts: { x: number; y: number }[] = pathItem.parameters?.points || [];
                if (pts.length < 2) return;
                ctx.beginPath();
                ctx.strokeStyle = pathItem.parameters?.strokeColor || '#000000';
                ctx.lineWidth = pathItem.parameters?.strokeWidth || 2;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                const ox = pathItem.x - artboard.x;
                const oy = pathItem.y - artboard.y;
                ctx.moveTo(ox + pts[0].x, oy + pts[0].y);
                for (let k = 1; k < pts.length; k++) ctx.lineTo(ox + pts[k].x, oy + pts[k].y);
                ctx.stroke();
              });
              // Text items with motherId === artboard.id
              canvasItems.filter((i: CanvasItem) => i.type === 'text' && i.motherId === artboard.id).forEach((textItem: CanvasItem) => {
                const content: string = textItem.parameters?.content || '';
                const fontSize: number = textItem.parameters?.fontSize || 14;
                const color: string = textItem.parameters?.color || '#000000';
                ctx.font = `${fontSize}px sans-serif`;
                ctx.fillStyle = color;
                const tx = textItem.x - artboard.x + 8;
                const ty = textItem.y - artboard.y;
                content.split('\n').forEach((line: string, li: number) => {
                  ctx.fillText(line, tx, ty + fontSize * 1.4 * (li + 1));
                });
              });
              resolve(canvas.toDataURL('image/png'));
            };

            if (artboard.src) {
              const img = new Image();
              img.onload = () => { ctx.drawImage(img, 0, 0, canvas.width, canvas.height); drawOverlays(); };
              img.onerror = () => drawOverlays();
              img.src = artboard.src;
            } else {
              drawOverlays();
            }
          });

        let compositeData: string | null = null;
        if (sourceItem?.type === 'artboard') {
          compositeData = await createArtboardComposite(sourceItem);
        } else if (sourceItem?.src) {
          compositeData = sourceItem.src;
        }

        const runGen = async (modelName: string) => {
          const parts: any[] = [{ text: systemPrompt }, { text: finalPrompt }];

          if (compositeData) {
            parts.unshift({ inlineData: {
              data: compositeData.split(',')[1],
              mimeType: compositeData.split(';')[0].split(':')[1]
            }});
          }

          const response = await ai.models.generateContent({ model: modelName, contents: { parts } });
          if (!abortControllerRef.current || abortControllerRef.current.signal.aborted) return false;

          if (response.candidates?.[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
              if (part.inlineData) {
                const generatedSrc = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                await new Promise<void>((resolve) => {
                  const img = new Image();
                  img.onload = () => {
                    // V2.6.0: Save to local folder
                    saveImageToLocal(generatedSrc, 'sketch');

                    // V276/V278 G-5: editVersions 분기 (generated/upload 전용, sketch_generated 제외)
                    if (sourceItem?.editVersions && sourceItem.type !== 'sketch_generated') {
                      setCanvasItems((prev: CanvasItem[]) => {
                        setHistoryStates((prevH: CanvasItem[][]) => [...prevH, prev]);
                        return prev.map((i: CanvasItem) => {
                          if (i.id !== sourceItem.id) return i;
                          // V284 C: EDIT XX label 폐기
                          const newVersion = { src: generatedSrc, label: undefined as unknown as string };
                          return { ...i, editVersions: [...i.editVersions!, newVersion], activeVersionIndex: i.editVersions!.length };
                        });
                      });
                    } else {
                      // 새 sketch_generated 아이템 생성 (V279: 파라미터 제외 & 팬아웃 스태킹)
                      // V283 B: EDITED 01 연결선이 EDIT 01에 연결되도록 sourceItem.id 직접 사용
                      const targetMotherId = sourceItem?.id ?? null;
                      
                      setCanvasItems((prev: CanvasItem[]) => {
                        // V288 D: 최신 소스 참조로 stale closure 해결
                        const currentSource = sourceItem ? (prev.find((i: CanvasItem) => i.id === sourceItem.id) ?? sourceItem) : null;
                        
                        // V288 A: 파생 아트보드 여부에 따른 첫 배치 분기
                        const newItemWidth = img.width * 0.4;
                        const newItemHeight = img.height * 0.4;
                        let newX = currentSource ? currentSource.x + currentSource.width + 120 : 0;
                        let newY = currentSource ? currentSource.y : 0;

                        if (targetMotherId) {
                          const siblings = prev.filter((c: CanvasItem) => c.motherId === targetMotherId);
                          const isOriginal = currentSource && currentSource.type === 'artboard' && !currentSource.motherId;

                          if (siblings.length > 0) {
                            const bottomMost = siblings.reduce((max, cur) => cur.y > max.y ? cur : max, siblings[0]);
                            newX = bottomMost.x;
                            newY = bottomMost.y + bottomMost.height + 120;
                          } else {
                            if (isOriginal) {
                              newX = currentSource.x + currentSource.width + 120;
                              newY = currentSource.y;
                            } else {
                              newX = currentSource.x;
                              newY = currentSource.y + currentSource.height + 120;
                            }
                          }
                        }

                        // V287 E: GENERATED → IMAGE
                        const genLabel = 'IMAGE';

                        const newGenItem: CanvasItem = {
                          id: `sketch-${Date.now()}`,
                          type: 'sketch_generated',
                          src: generatedSrc,
                          x: newX,
                          y: newY,
                          width: newItemWidth,
                          height: newItemHeight,
                          motherId: targetMotherId,
                          label: genLabel, // V280: 동적 네이밍 규칙 적용
                          parameters: {
                            angleIndex: 4, altitudeIndex: 2, lensIndex: 1, timeIndex: 2,
                            analyzedOpticalParams: null, 
                            elevationParams: null,
                            sketchMode, sketchStyle, activeDetailStyle, resolution, aspectRatio,
                            sketchPrompt  // V269
                          }
                        };
                        
                        setHistoryStates((prevH: CanvasItem[][]) => [...prevH, prev]);
                        
                        // V280: 소스 아트보드는 생성 후 SKETCH로 지정 (단, EDIT 상태는 제외)
                        if (sourceItem?.type === 'artboard') {
                          return [...prev.map((i: CanvasItem) =>
                            // V284 C: EDIT 조건 제거 — SKETCH 아닌 경우 → SKETCH
                            i.id === sourceItem.id && i.label !== 'SKETCH' ? { ...i, label: 'SKETCH' } : i
                          ), newGenItem];
                        } else {
                          return [...prev, newGenItem];
                        }
                      });
                    }
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

        const success = await runGen(IMAGE_GEN);
        if (!success) await runGen(IMAGE_GEN_FALLBACK);

      } catch (err) {
        console.error("Sketch to Image error", err);
        alert("Sketch generation failed.");
      } finally {
        setIsGenerating(false);
        abortControllerRef.current = null;
        // V268: Reset SKETCH TO IMAGE panel after generation
        setSketchMode('');
        setSketchStyle(null);
        setActiveDetailStyle(null);
        setResolution('');
        setAspectRatio(null);
        setSketchPrompt('');  // V269
        setSelectedItemIds([]);
      }
    }

    else if (selectedFunction === 'PLANNERS') {
      // V263: GEMS Protocol 2-Step API
      if (!plannerPrompt) {
        alert("Please enter the project prompt.");
        return;
      }
      setIsGenerating(true);
      abortControllerRef.current = new AbortController();
      setAnalysisStep('Expert squad selecting...');
      try {
        const allIds = PLANNER_EXPERTS.map(e => e.id);
        setAnalysisStep('Strategic debate in progress...');
        const result = await generateDiscussion(plannerPrompt, allIds);

        setLastDebateResult(result);

        const ts = Date.now();
        const scale = canvasZoom / 100;
        const cx = -canvasOffset.x / scale;
        const cy = -canvasOffset.y / scale;
        const newItem: CanvasItem = {
          id: `planner-${ts}`,
          type: 'text' as const,
          x: cx,
          y: cy,
          width: 540,
          height: 320,
          src: null,
          motherId: null,
          parameters: {
            angleIndex: 0, altitudeIndex: 0, lensIndex: 0, timeIndex: 0,
            content: result.shortFinalOutput,
            fontSize: 13,
            color: '#1a1a1a',
            isPlannerResult: true,
            debateResult: result,
            plannerPrompt,  // V268
          },
        };
        setCanvasItems((prev: CanvasItem[]) => {
          setHistoryStates((prevH: CanvasItem[][]) => [...prevH, prev]);
          return [...prev, newItem];
        });
        // V268: Reset PLANNERS panel after generation
        setPlannerPrompt('');
        setLastDebateResult(null);
        setSelectedPlannerCardId(null);
      } catch (err: any) {
        if (err.name !== 'AbortError') console.error("Planner error", err);
      } finally {
        setIsGenerating(false);
        setAnalysisStep('');
        abortControllerRef.current = null;
      }
    }

    else if (selectedFunction === 'PRINT') {
      if (!printPrompt) {
        alert("Please enter the printing requirements.");
        return;
      }
      setIsGenerating(true);
      const controller = new AbortController();
      abortControllerRef.current = controller;
      setAnalysisStep(`Generating ${printPages} pages of ${printTemplate}...`);
      
      try {
        // V2.6.0: PRINT Service Bridge Integration
        // Service URL: http://localhost:3001/api/generate-print (Mock/Placeholder for bridge)
        // We use AEPL parameters from selected item if available
        const sourceItem = selectedItemIds[0] ? canvasItems.find(i => i.id === selectedItemIds[0]) : null;
        
        const printParams = {
          prompt: printPrompt,
          template: printTemplate,
          pages: printPages,
          aepl: sourceItem?.parameters?.elevationParams || null,
          optical: sourceItem?.parameters?.analyzedOpticalParams || null,
          image: sourceItem?.src || null
        };

        // Bridge Call (Simulation for now, as instruction says "URL 서비스로 호출")
        console.log('[V2.6.0] Calling PRINT Service Bridge...', printParams);
        
        // Final Output Generation using Gemini for content structure
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const geminiPrompt = `
          [Architectural Print Engine - System Protocol V250]
          Generate a ${printTemplate} document based on: "${printPrompt}"
          AEPL Context: ${JSON.stringify(printParams.aepl)}
          Pages: ${printPages}
          Provide a highly structured architectural report/panel content.
        `;
        
        const result = await ai.models.generateContent({ model: ANALYSIS, contents: { parts: [{ text: geminiPrompt }] } });
        if (controller.signal.aborted) return;
        
        const printOutput = result.candidates?.[0]?.content?.parts?.[0]?.text || "";
        console.log("[V2.6.0] PRINT Output (Textual):", printOutput);

        if (sourceItem?.src) {
          saveImageToLocal(sourceItem.src, 'print');
        }

        console.log("[V2.6.0] PRINT complete:", printOutput.slice(0, 100));
      } catch (err) {
        if (err.name !== 'AbortError') console.error("Print error", err);
      } finally {
        setIsGenerating(false);
        setAnalysisStep('');
        abortControllerRef.current = null;
      }
    }
  };

  // V157: Cancel handler
  const handleCancelGenerate = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
    setIsAnalyzing(false);
    setAnalysisStep('');
    console.log("[V157] Generation canceled by user.");
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
          style={{ touchAction: 'none' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onDragStart={(e) => e.preventDefault()}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
            {/* V292 A: Connection Lines Layer moved to z-[0] below all rendering items */}
            <div className="absolute inset-0 pointer-events-none z-[0]">
              {(() => {
                const rect = (canvasRef as any).current?.getBoundingClientRect() || { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
                const cx = rect.width / 2;
                const cy = rect.height / 2;
                const baseTransform = `translate(${canvasOffset.x + cx}px, ${canvasOffset.y + cy}px) scale(${canvasZoom / 100})`;

                return (
                  <svg key="connection-svg" className="absolute inset-0 w-full h-full" style={{ overflow: 'visible' }}>
                    <g style={{ transform: baseTransform }}>
                      {(() => {
                        const cardItems = canvasItems.filter((i: CanvasItem) =>
                          ['upload', 'artboard', 'generated', 'sketch_generated'].includes(i.type)
                        );
                        return cardItems
                          .filter((child: CanvasItem) => !!child.motherId)
                          .map((child: CanvasItem) => {
                            const mother = cardItems.find((c: CanvasItem) => c.id === child.motherId);
                            if (!mother) return null;
                            
                            // V313: 연결 방향 최적화 (sketch_generated=가로, ELEVATION SHEET=세로)
                            const isElevationSheet = child.label === 'ANALYZED' || child.label === 'ELEVATION SHEET';
                            const isSketchGenerated = child.type === 'sketch_generated';
                            const isFirstArtboard = !mother.motherId && mother.type === 'artboard';
                            const isEditDerived = child.type === 'artboard';
                            const isViewpoint = child.type === 'generated';
                            // V315: '+' 버튼으로 승격된 upload 아이템(motherId 보유)은 가로 연결 유지
                            const isPromotedUpload = child.type === 'upload' && child.motherId !== null;
                            
                            const isHorizontalConnection = (isFirstArtboard || isEditDerived || isViewpoint || isSketchGenerated || isPromotedUpload) && !isElevationSheet;

                            const startX = isHorizontalConnection ? mother.x + mother.width : mother.x + mother.width / 2;
                            const startY = isHorizontalConnection ? mother.y + mother.height / 2 : mother.y + mother.height;

                            const endX = isHorizontalConnection ? child.x : child.x + child.width / 2;
                            const endY = isHorizontalConnection ? child.y + child.height / 2 : child.y;

                            const control1X = isHorizontalConnection ? startX + 50 : startX;
                            const control1Y = isHorizontalConnection ? startY : startY + 50;

                            const control2X = isHorizontalConnection ? endX - 50 : endX;
                            const control2Y = isHorizontalConnection ? endY : endY - 50;

                            const pathD = `M ${startX} ${startY} C ${control1X} ${control1Y}, ${control2X} ${control2Y}, ${endX} ${endY}`;

                            const isHighlighted = selectedItemIds.includes(mother.id) || selectedItemIds.includes(child.id);
                            const stroke = isHighlighted
                              ? (theme === 'dark' ? '#ffffff' : '#000000')
                              : (theme === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)');
                            const strokeWidth = isHighlighted ? 3 : 1.5;
                            return (
                              <g key={`chain-${mother.id}-${child.id}`}>
                                <path d={pathD} fill="none" stroke={stroke} strokeWidth={strokeWidth} style={{ transition: 'stroke 0.3s ease, stroke-width 0.3s ease' }} />
                                {isHighlighted && (
                                  <circle r="3" fill={theme === 'dark' ? '#ffffff' : '#000000'}>
                                    <animateMotion dur="2s" repeatCount="indefinite" path={pathD} />
                                  </circle>
                                )}
                              </g>
                            );
                          }).filter(Boolean);
                      })()}
                    </g>
                  </svg>
                );
              })()}
            </div>

            {/* V114/V2.6: Integrated Overlay Layer for all UI helpers (Lasso, Drawing) */}
            <div className="absolute inset-0 pointer-events-none z-[100]">
              {(() => {
                const rect = (canvasRef as any).current?.getBoundingClientRect() || { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
                const cx = rect.width / 2;
                const cy = rect.height / 2;
                const baseTransform = `translate(${canvasOffset.x + cx}px, ${canvasOffset.y + cy}px) scale(${canvasZoom / 100})`;

                return (
                  <>
                    {/* 1. Lasso Selection */}
                    {isLassoing && lassoPath.length > 1 && (
                      <svg key="lasso-svg" className="absolute inset-0 w-full h-full" style={{ overflow: 'visible' }}>
                        <g style={{ transform: baseTransform }}>
                          <path
                            d={`M ${lassoPath.map(p => `${p.x} ${p.y}`).join(' L ')} Z`}
                            fill="rgba(30, 144, 255, 0.05)"
                            stroke="rgb(30, 144, 255)"
                            strokeWidth={2 / (canvasZoom / 100)}
                            strokeDasharray={`${4 / (canvasZoom / 100)} ${4 / (canvasZoom / 100)}`}
                          />
                        </g>
                      </svg>
                    )}

                    {/* 2. Drawing Layer (Paths & Previews) */}
                    <svg key="drawing-svg" className="absolute inset-0 w-full h-full" style={{ overflow: 'visible' }}>
                      <g style={{ transform: baseTransform }}>
                        {canvasItems.filter(i => i.type === 'path').map(item => (
                          <polyline
                            key={item.id}
                            points={item.parameters?.points?.map(p => `${item.x + p.x},${item.y + p.y}`).join(' ')}
                            fill="none"
                            stroke={item.parameters?.strokeColor || (theme === 'dark' ? '#FFF' : '#000')}
                            strokeWidth={item.parameters?.strokeWidth || 2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            opacity={0.9}
                          />
                        ))}
                        {isDrawing && currentStroke.length > 0 && (
                          <polyline
                            points={currentStroke.map(p => `${p.x},${p.y}`).join(' ')}
                            fill="none"
                            stroke={theme === 'dark' ? '#FFF' : '#000'}
                            strokeWidth={penStrokeWidth}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            opacity={0.6}
                          />
                        )}
                        {isCreatingText && textStartPos && (
                          <rect
                            x={Math.min(textStartPos.x, lastMousePos.x)}
                            y={Math.min(textStartPos.y, lastMousePos.y)}
                            width={Math.abs(lastMousePos.x - textStartPos.x)}
                            height={Math.abs(lastMousePos.y - textStartPos.y)}
                            fill="rgba(29, 78, 216, 0.1)"
                            stroke="#1d4ed8"
                            strokeWidth="1"
                            strokeDasharray="4 2"
                          />
                        )}
                        {/* V255: Tool cursor indicator */}
                        {(canvasMode === 'pen' || canvasMode === 'eraser') && (
                          <circle
                            cx={lastMousePos.x}
                            cy={lastMousePos.y}
                            r={canvasMode === 'pen' ? penStrokeWidth / 2 : eraserStrokeWidth}
                            fill={canvasMode === 'pen' ? (theme === 'dark' ? '#FFFFFF' : '#000000') : 'none'}
                            stroke={theme === 'dark' ? '#FFFFFF' : '#000000'}
                            strokeWidth={canvasMode === 'eraser' ? 1 / (canvasZoom / 100) : 0}
                            pointerEvents="none"
                            opacity={0.6}
                          />
                        )}
                      </g>
                    </svg>


                  </>
                );
              })()}
            </div>

          {/* V173/V174: Integrated Left Tool Bar Area - Now FIXED OUTSIDE Scale Layer */}
          <div className="absolute left-[12px] top-1/2 -translate-y-1/2 z-[120] flex flex-col items-center gap-3 pointer-events-none">
            {/* V266: Upload Artboard Button — 최상단 배치 */}
            <div className="flex flex-col items-center">
              <button
                onClick={() => {
                  let newX = -842 / 2;
                  let newY = -595 / 2;
                  if (canvasItems.length > 0) {
                    const leftMost = canvasItems.reduce((p: CanvasItem, c: CanvasItem) => p.x < c.x ? p : c);
                    const bottomMost = canvasItems.reduce((p: CanvasItem, c: CanvasItem) =>
                      p.y + p.height > c.y + c.height ? p : c
                    );
                    newX = leftMost.x;
                    newY = bottomMost.y + bottomMost.height + 40;
                  }
                  const newArtboard: CanvasItem = {
                    id: `artboard-${Date.now()}`,
                    type: 'artboard',
                    src: null,
                    x: newX,
                    y: newY,
                    width: 842,
                    height: 595,
                    motherId: null,
                    parameters: null,
                    isLocked: false,
                  };
                  setHistoryStates((prev: CanvasItem[][]) => [...prev, canvasItems]);
                  setCanvasItems((prev: CanvasItem[]) => [...prev, newArtboard]);
                }}
                className="w-11 h-11 flex items-center justify-center rounded-full bg-black text-white hover:bg-neutral-800 transition-colors shadow-lg pointer-events-auto hover:cursor-pointer"
                title="Upload Artboard"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7" />
                  <line x1="16" y1="5" x2="22" y2="5" />
                  <line x1="19" y1="2" x2="19" y2="8" />
                  <path d="M7 16l3-3 2 2 4-4 3 3" />
                </svg>
              </button>
              <input type="file" ref={artboardFileInputRef} onChange={handleArtboardImageUpload} accept="image/*" className="hidden" />
            </div>

            {/* Pill 1: Tool buttons */}
            <div
              className="flex flex-col items-center gap-2 bg-white/80 dark:bg-black/80 border border-black/10 dark:border-white/10 pointer-events-auto transition-all duration-300 rounded-full py-2 w-11 backdrop-blur-sm"
              style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
            >
              {/* 1. 도구 모드 버튼: 커서/패닝 통합 토글 + Lasso (V202) */}
              <button
                onClick={() => setCanvasMode(canvasMode === 'select' ? 'pan' : 'select')}
                className={`w-8 h-8 flex items-center justify-center rounded-full transition-all hover:cursor-pointer ${(canvasMode === 'select' || canvasMode === 'pan') ? 'bg-black text-white dark:bg-white dark:text-black' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
                title={canvasMode === 'pan' ? 'Pan Mode (click to switch to Cursor)' : 'Cursor Mode (click to switch to Pan)'}
              >
                {canvasMode === 'pan' ? <Hand size={18} /> : <MousePointer2 size={18} />}
              </button>
              <button
                onClick={() => setCanvasMode('lasso')}
                className={`w-8 h-8 flex items-center justify-center rounded-full transition-all hover:cursor-pointer ${canvasMode === 'lasso' ? 'bg-black text-white dark:bg-white dark:text-black' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
                title="Lasso Select"
              >
                <Lasso size={18} />
              </button>

              <div className="w-6 h-[1px] bg-black/10 dark:bg-white/10 my-1" />

              {/* V255: Pen Tool with stroke width panel */}
              <div className="relative">
                <button
                  onClick={() => {
                    if (canvasMode === 'pen') {
                      setShowStrokePanel(prev => prev === 'pen' ? null : 'pen');
                    } else {
                      setCanvasMode('pen');
                      setShowStrokePanel(null);
                    }
                  }}
                  className={`w-8 h-8 flex items-center justify-center rounded-full transition-all hover:cursor-pointer ${canvasMode === 'pen' ? 'bg-black text-white dark:bg-white dark:text-black' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
                  title="Pen Tool"
                >
                  <Pencil size={18} />
                </button>
                {showStrokePanel === 'pen' && (
                  <div
                    className="absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2 flex items-center h-8 px-0.5 gap-0.5 bg-white/90 dark:bg-black/90 border border-black/10 dark:border-white/10 rounded-full backdrop-blur-sm pointer-events-auto"
                    style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }} /* V287 C: 애니메이션 제거 */
                  >
                    {([1, 2, 4, 6, 8] as const).map(size => (
                      <button
                        key={size}
                        onClick={() => setPenStrokeWidth(size)}
                        className="w-8 h-8 flex items-center justify-center rounded-full transition-all hover:cursor-pointer hover:bg-black/5 dark:hover:bg-white/5"
                      >
                        {penStrokeWidth === size ? (
                          <div
                            className="rounded-full flex items-center justify-center"
                            style={{
                              width: '24px', height: '24px',
                              backgroundColor: theme === 'dark' ? 'white' : 'black',
                            }}
                          >
                            <div
                              className="rounded-full"
                              style={{
                                width: `${size}px`, height: `${size}px`,
                                backgroundColor: theme === 'dark' ? 'black' : 'white',
                              }}
                            />
                          </div>
                        ) : (
                          <div
                            className="rounded-full"
                            style={{
                              width: `${size}px`, height: `${size}px`,
                              backgroundColor: theme === 'dark' ? 'white' : 'black',
                            }}
                          />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* V255: Eraser Tool with stroke width panel */}
              <div className="relative">
                <button
                  onClick={() => {
                    if (canvasMode === 'eraser') {
                      setShowStrokePanel(prev => prev === 'eraser' ? null : 'eraser');
                    } else {
                      setCanvasMode('eraser');
                      setShowStrokePanel(null);
                    }
                  }}
                  className={`w-8 h-8 flex items-center justify-center rounded-full transition-all hover:cursor-pointer ${canvasMode === 'eraser' ? 'bg-black text-white dark:bg-white dark:text-black' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
                  title="Eraser Tool"
                >
                  <Eraser size={18} />
                </button>
                {showStrokePanel === 'eraser' && (
                  <div
                    className="absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2 flex items-center h-8 px-0.5 gap-0.5 bg-white/90 dark:bg-black/90 border border-black/10 dark:border-white/10 rounded-full backdrop-blur-sm pointer-events-auto"
                    style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }} /* V287 C: 애니메이션 제거 */
                  >
                    {([2, 4, 6, 8, 10] as const).map(size => (
                      <button
                        key={size}
                        onClick={() => setEraserStrokeWidth(size)}
                        className="w-8 h-8 flex items-center justify-center rounded-full transition-all hover:cursor-pointer hover:bg-black/5 dark:hover:bg-white/5"
                      >
                        {eraserStrokeWidth === size ? (
                          <div
                            className="rounded-full flex items-center justify-center"
                            style={{
                              width: '24px', height: '24px',
                              backgroundColor: theme === 'dark' ? 'white' : 'black',
                            }}
                          >
                            <div
                              className="rounded-full"
                              style={{
                                width: `${size}px`, height: `${size}px`,
                                backgroundColor: theme === 'dark' ? 'black' : 'white',
                              }}
                            />
                          </div>
                        ) : (
                          <div
                            className="rounded-full"
                            style={{
                              width: `${size}px`, height: `${size}px`,
                              backgroundColor: theme === 'dark' ? 'white' : 'black',
                            }}
                          />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => setCanvasMode('text')}
                className={`w-8 h-8 flex items-center justify-center rounded-full transition-all hover:cursor-pointer ${canvasMode === 'text' ? 'bg-black text-white dark:bg-white dark:text-black' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
                title="Text Tool"
              >
                <Type size={18} />
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

            </div>

            {/* Pill 2: Fullscreen + Zoom Controls */}
            <div
              className="flex flex-col items-center gap-2 bg-white/80 dark:bg-black/80 border border-black/10 dark:border-white/10 pointer-events-auto transition-all duration-300 rounded-full py-2 w-11 backdrop-blur-sm"
              style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
            >
              <button
                onClick={handleFocus}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors hover:cursor-pointer"
                title="Fit to Screen"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 3h6v6M9 21H3v-6M21 15v6h-6M3 9V3h6" />
                </svg>
              </button>
              <div className="w-6 h-[1px] bg-black/10 dark:bg-white/10 my-1" />
              <button onClick={() => zoomStep(1)} className="w-8 h-8 flex items-center justify-center rounded-full font-mono text-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors hover:cursor-pointer">+</button>
              <div className="font-mono text-[10px] font-bold text-neutral-600 dark:text-neutral-400 select-none">{Math.round(canvasZoom)}%</div>
              <button onClick={() => zoomStep(-1)} className="w-8 h-8 flex items-center justify-center rounded-full font-mono text-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors hover:cursor-pointer">−</button>
            </div>

          </div>

          {/* V276: Toast notification */}
          {toastMessage && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[200] pointer-events-none">
              <div className="bg-black/80 dark:bg-white/80 text-white dark:text-black font-mono text-xs tracking-widest uppercase px-4 py-2 rounded-full shadow-lg">
                {toastMessage}
              </div>
            </div>
          )}

          {/* V282 B+C: 캔버스 레벨 로더 오버레이 (z-102) — 스케치(z-100) 위, 뷰 컨트롤(z-105) 아래 */}
          {(isAnalyzing || isGenerating) && selectedItemIds.length > 0 && (
            <div
              className="absolute inset-0 pointer-events-none z-[102]"
              style={{
                transform: `translate(calc(50% + ${canvasOffset.x}px), calc(50% + ${canvasOffset.y}px)) scale(${canvasZoom / 100})`,
                transformOrigin: '0 0'
              }}
            >
              {selectedItemIds.map((itemId: string) => {
                const loadingItem = canvasItems.find((i: CanvasItem) => i.id === itemId);
                if (!loadingItem || loadingItem.type === 'path' || loadingItem.type === 'text') return null;

                // V307: 줌 배율 30% 이하일 때 전체 히든
                if (canvasZoom <= 30) return null;

                return (
                  <div
                    key={`loader-${itemId}`}
                    style={{
                      position: 'absolute',
                      left: loadingItem.x,
                      top: loadingItem.y,
                      width: loadingItem.width,
                      height: loadingItem.height,
                    }}
                    className="flex flex-col items-center justify-center bg-white/50 dark:bg-black/50 backdrop-blur-md pointer-events-auto"
                  >
                    {/* V307: 줌 배율 역보정 적용 및 검은색 변경 */}
                    <Loader2 
                      size={42 / Math.max(0.1, canvasZoom / 100)} 
                      className="animate-spin text-black" 
                      style={{ marginBottom: `${12 / Math.max(0.1, canvasZoom / 100)}px` }}
                    />
                    {(isGenerating || isAnalyzing) && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleCancelGenerate(); }}
                        className="rounded-full bg-black text-white dark:bg-white dark:text-black font-mono tracking-widest hover:opacity-80 transition-opacity"
                        style={{
                          fontSize: `${15 / Math.max(0.1, canvasZoom / 100)}px`,
                          paddingTop: `${3 / Math.max(0.1, canvasZoom / 100)}px`,
                          paddingBottom: `${3 / Math.max(0.1, canvasZoom / 100)}px`,
                          paddingLeft: `${6 / Math.max(0.1, canvasZoom / 100)}px`,
                          paddingRight: `${6 / Math.max(0.1, canvasZoom / 100)}px`,
                        }}
                      >
                        CANCEL
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* V283 A: 섹션 레벨 selection border 오버레이 (z-105) — 로더(z-102) 위에 표시 */}
          {selectedItemIds.length > 0 && (
            <div
              className="absolute inset-0 pointer-events-none z-[105]"
              style={{
                transform: `translate(calc(50% + ${canvasOffset.x}px), calc(50% + ${canvasOffset.y}px)) scale(${canvasZoom / 100})`,
                transformOrigin: '0 0'
              }}
            >
              {selectedItemIds.map((itemId: string) => {
                const selItem = canvasItems.find((i: CanvasItem) => i.id === itemId);
                // V287 B: isPlannerResult 카드는 text 타입이어도 border 표시
                if (!selItem || selItem.type === 'path' || (selItem.type === 'text' && !selItem.parameters?.isPlannerResult)) return null;
                return (
                  <div
                    key={`sel-border-${itemId}`}
                    style={{
                      position: 'absolute',
                      left: selItem.x - 1,
                      top: selItem.y - 1,
                      width: selItem.width + 2,
                      height: selItem.height + 2,
                      borderWidth: `${1.6 / (canvasZoom / 100)}px`,
                      borderStyle: 'solid',
                      borderColor: '#1d4ed8',
                    }}
                  />
                );
              })}
            </div>
          )}

          {/* V285 C: 섹션 레벨 리사이즈 핸들 오버레이 (z-115) — 모든 오버레이 위 */}
          {selectedItemIds.length === 1 && (() => {
            const resItem = canvasItems.find((i: CanvasItem) => i.id === selectedItemIds[0]);
            if (!resItem || resItem.type === 'path' || resItem.type === 'text' || resItem.isLocked) return null;
            const s = 1 / (canvasZoom / 100);
            const size = 12 * s;
            return (
              <div
                className="absolute inset-0 pointer-events-none z-[115]"
                style={{
                  transform: `translate(calc(50% + ${canvasOffset.x}px), calc(50% + ${canvasOffset.y}px)) scale(${canvasZoom / 100})`,
                  transformOrigin: '0 0'
                }}
              >
                {[
                  { dx: -1, dy: -1, cursor: 'nwse-resize', x: resItem.x - size / 2, y: resItem.y - size / 2 },
                  { dx:  1, dy: -1, cursor: 'nesw-resize', x: resItem.x + resItem.width - size / 2, y: resItem.y - size / 2 },
                  { dx: -1, dy:  1, cursor: 'nesw-resize', x: resItem.x - size / 2, y: resItem.y + resItem.height - size / 2 },
                  { dx:  1, dy:  1, cursor: 'nwse-resize', x: resItem.x + resItem.width - size / 2, y: resItem.y + resItem.height - size / 2 },
                ].map((pos, idx) => (
                  <div
                    key={`rh-${idx}`}
                    className="resize-handle"
                    data-dx={pos.dx}
                    data-dy={pos.dy}
                    style={{
                      position: 'absolute',
                      left: pos.x,
                      top: pos.y,
                      width: size,
                      height: size,
                      borderWidth: 1.6 * s,
                      borderStyle: 'solid',
                      backgroundColor: 'white',
                      borderColor: '#808080',
                      borderRadius: '999px',
                      pointerEvents: 'auto',
                      cursor: pos.cursor,
                    }}
                  />
                ))}
              </div>
            );
          })()}

          {/* V124: Main Artboard Area (Scaled div containing all actual items) */}
          <div
            className="absolute inset-0"
            style={{
              transform: `translate(calc(50% + ${canvasOffset.x}px), calc(50% + ${canvasOffset.y}px)) scale(${canvasZoom / 100})`,
              transformOrigin: '0 0'
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
              {/* V253: path type is rendered in SVG overlay only — skip here */}
              {canvasItems.filter((item: CanvasItem) => item.type !== 'path').map((item: CanvasItem) => {
                // V278 D-3: childArtboardIds 스택 — 비활성 멤버 숨김 (sketch_generated 전용)
                const stackParent = canvasItems.find((p: CanvasItem) =>
                  p.childArtboardIds?.includes(item.id)
                );
                const isStackHidden = (() => {
                  if (item.childArtboardIds?.length && (item.activeChildIndex ?? 0) > 0) return true;
                  if (stackParent) {
                    const activeChildId = stackParent.childArtboardIds![
                      (stackParent.activeChildIndex ?? 1) - 1
                    ];
                    return activeChildId !== item.id;
                  }
                  return false;
                })();
                if (isStackHidden) return null;

                return (
                <div
                  key={item.id}
                  data-canvas-item="true"
                  draggable={false} // V313: Disable native drag to prevent interference with sketching
                  style={{
                    position: 'absolute',
                    left: item.x,
                    top: item.y,
                    width: item.width,
                    height: item.height,
                    zIndex: selectedItemIds.includes(item.id) ? 20 : 10,
                    // Disable pointer events on items during PAN mode or when artboard is locked
                    pointerEvents: canvasMode === 'pan' ? 'none' : 'auto',
                    cursor: 'inherit'
                  }}
                >
                  <div
                    className="w-full h-full relative"
                    style={{ pointerEvents: 'none' }}
                  >
                    {item.type === 'text' ? (
                      item.parameters?.isPlannerResult ? (
                        /* V263: PLANNERS 결과 카드 — TurnGroupNode 스타일 + 전문가 버튼 */
                        item.parameters?.debateResult ? (
                          /* V263: 구조화 데이터 있음 — 전문가 버튼 + Final Plan */
                          <div
                            className="w-full h-full rounded-[40px] bg-[#EEEEEE] p-3 shadow-2xl border border-neutral-200 flex items-stretch gap-1"
                            style={{ pointerEvents: canvasMode === 'select' ? 'auto' : 'none' }}
                          >
                            {/* 좌측: 전문가 버튼 4개 */}
                            <div className="flex flex-col gap-2 justify-center pl-2 pr-1 py-4 shrink-0">
                              {(['thesis', 'antithesis', 'synthesis', 'support'] as const).map((role) => {
                                const turnData = item.parameters!.debateResult![role];
                                const expert = PLANNER_EXPERTS.find(e => e.id === turnData.expertId);
                                const ExpertIcon = expert ? (PLANNER_ICON_MAP[expert.iconName] ?? Bot) : Bot;
                                const isSelected = selectedPlannerCardId === `${item.id}::${role}`;
                                return (
                                  <div
                                    key={role}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedPlannerCardId(`${item.id}::${role}`);
                                      setIsRightPanelOpen(true);
                                      setSelectedFunction('PLANNERS');
                                      setIsFunctionSelectorOpen(false);
                                    }}
                                    className={`w-11 h-11 rounded-[18px] flex items-center justify-center transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95 ${isSelected ? 'bg-black text-white shadow-xl' : 'bg-white text-neutral-400 hover:text-black border border-neutral-100'}`}
                                  >
                                    <ExpertIcon className="w-[18px] h-[18px]" />
                                  </div>
                                );
                              })}
                            </div>
                            {/* 우측: Final Plan 카드 */}
                            <div
                              className="flex-1 bg-white rounded-[32px] p-5 shadow-sm border border-neutral-100 flex flex-col min-w-0 cursor-pointer hover:shadow-md transition-all overflow-hidden"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPlannerCardId(item.id);
                                setIsRightPanelOpen(true);
                                setSelectedFunction('PLANNERS');
                                setIsFunctionSelectorOpen(false);
                              }}
                            >
                              <div className="flex items-center justify-between mb-3 opacity-30">
                                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-black">FINAL PLAN</span>
                              </div>
                              <div className="flex items-center gap-2 mb-4 shrink-0">
                                <div className="p-1.5 rounded-lg bg-black shadow-lg shrink-0"><Bot className="h-3 w-3 text-white" /></div>
                                <h2 className="text-[13px] font-black tracking-tight text-neutral-900 uppercase">Final Strategic Plan</h2>
                              </div>
                              <div className="relative pl-5 border-l border-neutral-100 overflow-hidden flex-1">
                                <p className="text-[12.5px] leading-[1.65] font-medium text-neutral-900 whitespace-pre-wrap">
                                  {item.parameters?.debateResult?.shortFinalOutput || item.parameters?.content || ''}
                                </p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          /* V262 fallback: debateResult 없는 기존 카드 */
                          <div
                            className="w-full h-full rounded-[32px] bg-[#EEEEEE] p-2.5 shadow-2xl border border-neutral-200 cursor-pointer"
                            style={{ pointerEvents: canvasMode === 'select' ? 'auto' : 'none' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPlannerCardId(item.id);
                              setIsRightPanelOpen(true);
                              setSelectedFunction('PLANNERS');
                              setIsFunctionSelectorOpen(false);
                            }}
                          >
                            <div className="w-full h-full bg-white rounded-[28px] p-5 shadow-sm border border-neutral-100 flex flex-col overflow-hidden">
                              <div className="flex items-center justify-between mb-3 opacity-30">
                                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-black">FINAL PLAN</span>
                              </div>
                              <div className="flex items-center gap-2 mb-4 shrink-0">
                                <div className="p-1.5 rounded-lg bg-black shadow-lg shrink-0"><Bot className="h-3 w-3 text-white" /></div>
                                <h2 className="text-[13px] font-black tracking-tight text-neutral-900 uppercase">Final Strategic Plan</h2>
                              </div>
                              <div className="relative pl-5 border-l border-neutral-100 overflow-hidden flex-1">
                                <p className="text-[12.5px] leading-[1.65] font-medium text-neutral-900 whitespace-pre-wrap">
                                  {item.parameters?.content || ''}
                                </p>
                              </div>
                            </div>
                          </div>
                        )
                      ) : (
                        <>
                          {canvasMode === 'select' && (
                            <div className="absolute inset-0" style={{ zIndex: 10, pointerEvents: 'auto' }} />
                          )}
                          <textarea
                            className="w-full h-full bg-transparent outline-none resize-none p-2 font-sans font-medium hover:bg-black/5 dark:hover:bg-white/5 transition-colors border-none"
                            style={{
                              color: item.parameters?.color || (theme === 'dark' ? '#FFF' : '#000'),
                              fontSize: `${item.parameters?.fontSize || 16}px`,
                              lineHeight: 1.4,
                              pointerEvents: canvasMode === 'text' ? 'auto' : 'none',
                              cursor: canvasMode === 'text' ? 'text' : 'inherit'
                            }}
                            value={item.parameters?.content}
                            onChange={(e) => {
                              setCanvasItems(prev => prev.map(i =>
                                i.id === item.id ? { ...i, parameters: { ...i.parameters, content: e.target.value } } : i
                              ));
                            }}
                            onPointerDown={(e) => e.stopPropagation()}
                            placeholder="Type here..."
                          />
                        </>
                      )
                    ) : item.type === 'artboard' ? (
                      /* V257: Artboard rendering */
                      <div
                        className="w-full h-full shadow-xl"
                        style={{
                          backgroundColor: 'rgba(248, 244, 232, 0.3)',
                          backdropFilter: 'blur(2px)',
                        }}
                      >
                        {/* V276 G-2: editVersions displaySrc */}
                        {(item.editVersions?.length ? (item.editVersions[item.activeVersionIndex ?? 0]?.src ?? item.src) : item.src) && (
                          <img
                            src={(item.editVersions?.length ? (item.editVersions[item.activeVersionIndex ?? 0]?.src ?? item.src) : item.src) || ''}
                            alt="artboard"
                            className="w-full h-full object-contain pointer-events-none"
                            draggable={false}
                          />
                        )}
                      </div>
                    ) : item.label === 'ELEVATION SHEET' ? (
                      /* V298 B: ELEVATION SHEET — 합성 이미지 + React CSS Grid 라벨 오버레이 */
                      <div className="w-full h-full relative" style={{ background: '#FFFFFF' }}>
                        <img
                          src={item.src || ''}
                          alt="elevation-sheet"
                          className="w-full h-full object-contain pointer-events-none"
                          draggable={false}
                        />
                        <div
                          className="absolute inset-0 grid pointer-events-none"
                          style={{
                            gridTemplateColumns: '1fr 1fr 1fr',
                            gridTemplateRows: '1fr 1fr 1fr',
                            gridTemplateAreas: '". rear ." "left top right" ". front ."',
                          }}
                        >
                          {canvasZoom > 40 && [
                            { area: 'rear',  label: 'REAR'  },
                            { area: 'left',  label: 'LEFT'  },
                            { area: 'top',   label: 'TOP'   },
                            { area: 'right', label: 'RIGHT' },
                            { area: 'front', label: 'FRONT' },
                          ].map(({ area, label }) => (
                            <div
                              key={area}
                              className="flex items-end justify-center"
                              style={{ gridArea: area, paddingBottom: `${12 / (canvasZoom / 100)}px` }}
                            >
                              <span
                                className="font-mono uppercase tracking-widest text-white bg-black opacity-90"
                                style={{
                                  fontSize: `${12 / (canvasZoom / 100)}px`,
                                  padding: `${3 / (canvasZoom / 100)}px`,
                                  display: 'inline-block',
                                }}
                              >
                                {label}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      /* V276 G-2: editVersions displaySrc */
                      <img
                        src={(item.editVersions?.length ? (item.editVersions[item.activeVersionIndex ?? 0]?.src ?? item.src) : item.src) || ''}
                        alt={item.id}
                        className="w-full h-full object-contain pointer-events-none shadow-xl border border-black/5 dark:border-white/5"
                        referrerPolicy="no-referrer"
                        draggable={false}
                      />
                    )}
                  </div>

                  {/* V278 E/F-3: label below item — no editVersions, no childArtboardIds */}
                  {!item.editVersions && !item.childArtboardIds?.length && item.label && item.type !== 'path' && item.type !== 'text' && canvasZoom > 30 && (
                    <div
                      className="absolute left-0 right-0 flex items-center justify-center pointer-events-none z-[25]"
                      style={{ top: '100%', paddingTop: `${12 / (canvasZoom / 100)}px` }}
                    >
                      <span
                        className="font-mono uppercase tracking-widest opacity-60"
                        style={{ fontSize: `${15 / (canvasZoom / 100)}px` }}
                      >
                        {item.label}
                      </span>
                    </div>
                  )}
                  {/* V278 E/G-4: editVersions tab nav — below item */}
                  {item.editVersions && item.editVersions.length > 0 && item.type !== 'path' && item.type !== 'text' && canvasZoom > 30 && (
                    <div
                      className="absolute left-0 right-0 flex items-center justify-between pointer-events-auto z-[25]"
                      style={{ top: '100%', paddingTop: `${12 / (canvasZoom / 100)}px` }}
                      onPointerDown={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => navigateVersion(item.id, -1)}
                        disabled={(item.activeVersionIndex ?? 0) === 0}
                        className="font-mono opacity-50 disabled:opacity-20 hover:opacity-100 transition-opacity"
                        style={{ fontSize: `${15 / (canvasZoom / 100)}px` }}
                      >{'<'}</button>
                      <span
                        className="font-mono uppercase tracking-widest opacity-60"
                        style={{ fontSize: `${15 / (canvasZoom / 100)}px` }}
                      >
                        {item.editVersions[item.activeVersionIndex ?? 0]?.label}
                      </span>
                      <button
                        onClick={() => navigateVersion(item.id, +1)}
                        disabled={(item.activeVersionIndex ?? 0) >= item.editVersions.length - 1}
                        className="font-mono opacity-50 disabled:opacity-20 hover:opacity-100 transition-opacity"
                        style={{ fontSize: `${15 / (canvasZoom / 100)}px` }}
                      >{'>'}</button>
                    </div>
                  )}
                  {/* V278 D-4/G-4b: childArtboardIds 스택 탐색 UI (sketch_generated 전용) */}
                  {(() => {
                    const parent = item.childArtboardIds?.length
                      ? item
                      : stackParent;
                    if (!parent || !parent.childArtboardIds || parent.childArtboardIds.length === 0) return null;
                    if (item.type === 'path' || item.type === 'text') return null;
                    if (canvasZoom <= 30) return null;
                    const activeIdx = parent.activeChildIndex ?? 0;
                    const activeLabel = activeIdx === 0
                      ? (parent.label || 'ORIGINAL')
                      : (() => {
                          const childId = parent.childArtboardIds![activeIdx - 1];
                          return canvasItems.find((c: CanvasItem) => c.id === childId)?.label
                            || `EDIT ${String(activeIdx).padStart(2, '0')}`;
                        })();
                    return (
                      <div
                        className="absolute left-0 right-0 flex items-center justify-between pointer-events-auto z-[25]"
                        style={{ top: '100%', paddingTop: `${12 / (canvasZoom / 100)}px` }}
                        onPointerDown={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => navigateStack(parent.id, -1)}
                          disabled={activeIdx === 0}
                          className="font-mono opacity-50 disabled:opacity-20 hover:opacity-100 transition-opacity"
                          style={{ fontSize: `${15 / (canvasZoom / 100)}px` }}
                        >{'<'}</button>
                        <span
                          className="font-mono uppercase tracking-widest opacity-60"
                          style={{ fontSize: `${15 / (canvasZoom / 100)}px` }}
                        >{activeLabel}</span>
                        <button
                          onClick={() => navigateStack(parent.id, +1)}
                          disabled={activeIdx >= parent.childArtboardIds!.length}
                          className="font-mono opacity-50 disabled:opacity-20 hover:opacity-100 transition-opacity"
                          style={{ fontSize: `${15 / (canvasZoom / 100)}px` }}
                        >{'>'}</button>
                      </div>
                    );
                  })()}

                  {/* Selection Overlay (Blue Border & Circle Handles) */}
                  {selectedItemIds.includes(item.id) && (
                    <div
                      className="absolute -inset-[1px] pointer-events-none border-[#1d4ed8] z-[105]"
                      style={{
                        // 1.2pt ≈ 1.6px
                        borderWidth: `${1.6 / (canvasZoom / 100)}px`
                      }}
                    >
                      {/* V257: Floating Control Bar — type-based */}
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
                        {/* V294 A: IMAGE / VIEW 통합 툴바 — edit(+) 클릭 시 우측 파생 아트보드 생성 */}
                        {item.label === 'IMAGE / VIEW' ? (
                          <>
                            <button
                              onClick={() => {
                                setCanvasItems((prev: CanvasItem[]) => {
                                  let newX = item.x + item.width + 120;
                                  let newY = item.y;
                                  
                                  const siblingEdits = prev.filter((c: CanvasItem) => c.type === 'artboard' && c.motherId === item.id);
                                  if (siblingEdits.length > 0) {
                                      const rightMost = siblingEdits.reduce((max, cur) => cur.x > max.x ? cur : max, siblingEdits[0]);
                                      newX = rightMost.x + rightMost.width + 120;
                                      newY = rightMost.y;
                                  }
                                  
                                  const newArtboard: CanvasItem = {
                                    id: `artboard-edit-${Date.now()}`,
                                    type: 'artboard',
                                    src: item.src,
                                    x: newX,
                                    y: newY,
                                    width: item.width,
                                    height: item.height,
                                    motherId: item.id,
                                    parameters: null
                                  };

                                  setHistoryStates((prevH: CanvasItem[][]) => [...prevH, prev]);
                                  return [...prev, newArtboard]; 
                                });
                              }}
                              className="flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors rounded-full"
                              style={{ width: `${36 / (canvasZoom / 100)}px`, height: `${36 / (canvasZoom / 100)}px` }}
                              title="편집 탭 추가"
                            >
                              <Plus size={12 / (canvasZoom / 100)} />
                            </button>
                            <div className="w-[1px] bg-black/10 dark:bg-white/10 mx-0.5" style={{ height: (28 / (canvasZoom / 100)) + 'px' }} />
                            <a
                              href={item.src || '#'}
                              download="analyzed.png"
                              className="flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors rounded-full"
                              style={{ width: `${36 / (canvasZoom / 100)}px`, height: `${36 / (canvasZoom / 100)}px` }}
                              title="다운로드"
                            >
                              <Download size={14 / (canvasZoom / 100)} />
                            </a>
                            {/* V297 I: LIBRARY 버튼 및 구분선 삭제 (ELEVATION SHEET는 Change H에 의해 자동 생성됨) */}
                            <div className="w-[1px] bg-black/10 dark:bg-white/10 mx-0.5" style={{ height: (28 / (canvasZoom / 100)) + 'px' }} />
                            <button
                              onClick={() => {
                                setHistoryStates((prevH: CanvasItem[][]) => [...prevH, canvasItems]);
                                setRedoStates([]);
                                setCanvasItems((prev: CanvasItem[]) => prev.filter((i: CanvasItem) => i.id !== item.id && i.motherId !== item.id));
                                setSelectedItemIds([]);
                              }}
                              className="flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-red-500 rounded-full"
                              style={{ width: `${36 / (canvasZoom / 100)}px`, height: `${36 / (canvasZoom / 100)}px` }}
                              title="삭제"
                            >
                              <Trash2 size={12 / (canvasZoom / 100)} />
                            </button>
                          </>
                        ) : item.type === 'artboard' ? (
                          /* V281: Artboard control bar — [Upload|Lock|Trash] */
                          /* 초기 업로드 기반 캔버스에만 업로드 버튼 렌더링 */
                          <>
                            {/* V292 B: motherId 있는 파생 아트보드는 Upload 버튼 숨김 */}
                            {(!item.label || item.label === 'SKETCH') && !item.motherId && (
                              <>
                                <button
                                  onClick={() => {
                                    pendingArtboardIdRef.current = item.id;
                                    artboardFileInputRef.current?.click();
                                  }}
                                  className="flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors rounded-full"
                                  style={{ width: `${36 / (canvasZoom / 100)}px`, height: `${36 / (canvasZoom / 100)}px` }}
                                  title="이미지 업로드"
                                >
                                  <Upload size={12 / (canvasZoom / 100)} />
                                </button>
                                <div className="w-[1px] bg-black/10 dark:bg-white/10 mx-0.5" style={{ height: (28 / (canvasZoom / 100)) + 'px' }} />
                              </>
                            )}
                            <button
                              onClick={() => {
                                setCanvasItems((prev: CanvasItem[]) => prev.map((i: CanvasItem) =>
                                  i.id === item.id ? { ...i, isLocked: !i.isLocked } : i
                                ));
                              }}
                              className={`flex items-center justify-center transition-colors rounded-full ${item.isLocked ? 'bg-black/10 dark:bg-white/10' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
                              style={{ width: `${36 / (canvasZoom / 100)}px`, height: `${36 / (canvasZoom / 100)}px` }}
                              title={item.isLocked ? "잠금 해제" : "잠금"}
                            >
                              {item.isLocked
                                ? <svg width={12/(canvasZoom/100)} height={12/(canvasZoom/100)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                                : <svg width={12/(canvasZoom/100)} height={12/(canvasZoom/100)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
                              }
                            </button>
                            {/* V282 D-2: artboard ANALYZED 모체 Book 버튼 */}
                            {item.label === 'ANALYZED' && (
                              <>
                                <div className="w-[1px] bg-black/10 dark:bg-white/10 mx-0.5" style={{ height: (28 / (canvasZoom / 100)) + 'px' }} />
                                <button
                                  onClick={() => setOpenLibraryItemId(openLibraryItemId === item.id ? null : item.id)}
                                  className="flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors rounded-full"
                                  style={{ width: `${36 / (canvasZoom / 100)}px`, height: `${36 / (canvasZoom / 100)}px` }}
                                  title="입면 전개도"
                                >
                                  <Book size={12 / (canvasZoom / 100)} />
                                </button>
                              </>
                            )}
                            <div className="w-[1px] bg-black/10 dark:bg-white/10 mx-0.5" style={{ height: (28 / (canvasZoom / 100)) + 'px' }} />
                            <button
                              onClick={() => {
                                setHistoryStates((prevH: CanvasItem[][]) => [...prevH, canvasItems]);
                                setRedoStates([]);
                                setCanvasItems((prev: CanvasItem[]) => prev.filter((i: CanvasItem) => i.id !== item.id && i.motherId !== item.id));
                                setSelectedItemIds([]);
                              }}
                              className="flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-red-500 rounded-full"
                              style={{ width: `${36 / (canvasZoom / 100)}px`, height: `${36 / (canvasZoom / 100)}px` }}
                              title="삭제"
                            >
                              <Trash2 size={12 / (canvasZoom / 100)} />
                            </button>
                          </>
                        ) : item.type === 'sketch_generated' ? (
                          /* V308: sketch_generated — [edit(+)|download|delete] */
                          <>
                            <button
                              onClick={() => {
                                // V308: 연결선을 유지하면서 스케치 가능 상태로 전환
                                // motherId 유지 → 모체와의 Bezier 연결선 보존
                                // editVersions 미생성 → < > 화살표 방지
                                setHistoryStates((prevH: CanvasItem[][]) => [...prevH, canvasItems]);
                                setRedoStates([]);
                                setCanvasItems((prev: CanvasItem[]) => prev.map((i: CanvasItem) => {
                                  if (i.id === item.id) {
                                    return {
                                      ...i,
                                      type: 'upload', // 스케치/편집 가능 상태로 승격
                                      motherId: i.motherId, // [V308] 모체 연결선 유지
                                      // editVersions 미생성 → < > 라벨 방지
                                      parameters: null
                                    };
                                  }
                                  return i;
                                }));
                                // V309: 스케치 즉각 활성화
                                setCanvasMode('pen');
                              }}
                              className="flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors rounded-full"
                              style={{ width: `${36 / (canvasZoom / 100)}px`, height: `${36 / (canvasZoom / 100)}px` }}
                              title="스케치 편집 모드로 전환"
                            >
                              <Plus size={12 / (canvasZoom / 100)} />
                            </button>
                            <div className="w-[1px] bg-black/10 dark:bg-white/10 mx-0.5" style={{ height: (28 / (canvasZoom / 100)) + 'px' }} />
                            <a
                              href={item.src || '#'}
                              download="sketch_result.png"
                              className="flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors rounded-full"
                              style={{ width: `${36 / (canvasZoom / 100)}px`, height: `${36 / (canvasZoom / 100)}px` }}
                              title="다운로드"
                            >
                              <Download size={14 / (canvasZoom / 100)} />
                            </a>
                            <div className="w-[1px] bg-black/10 dark:bg-white/10 mx-0.5" style={{ height: (28 / (canvasZoom / 100)) + 'px' }} />
                            <button
                              onClick={() => {
                                setHistoryStates((prevH: CanvasItem[][]) => [...prevH, canvasItems]);
                                setRedoStates([]);
                                setCanvasItems((prev: CanvasItem[]) => prev.filter((i: CanvasItem) => i.id !== item.id && i.motherId !== item.id));
                                setSelectedItemIds([]);
                              }}
                              className="flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-red-500 rounded-full"
                              style={{ width: `${36 / (canvasZoom / 100)}px`, height: `${36 / (canvasZoom / 100)}px` }}
                              title="삭제"
                            >
                              <Trash2 size={12 / (canvasZoom / 100)} />
                            </button>
                          </>
                        ) : item.type === 'generated' ? (
                          /* V308: generated — [edit(+)|download|delete] */
                          <>
                            <button
                              onClick={() => {
                                // V308: 제자리에서 스케치 가능 상태로 전환
                                // motherId 유지 → 모체와의 Bezier 연결선 보존
                                // editVersions 미생성 → < > 화살표 방지
                                setHistoryStates((prevH: CanvasItem[][]) => [...prevH, canvasItems]);
                                setRedoStates([]);
                                setCanvasItems((prev: CanvasItem[]) => prev.map((i: CanvasItem) => {
                                  if (i.id === item.id) {
                                    return {
                                      ...i,
                                      type: 'upload', // 스케치/편집 가능 상태로 승격
                                      motherId: i.motherId, // [V308] 모체 연결선 유지
                                      // editVersions 미생성 → < > 라벨 방지
                                      parameters: null
                                    };
                                  }
                                  return i;
                                }));
                                // V309: 스케치 즉각 활성화
                                setCanvasMode('pen');
                              }}
                              className="flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors rounded-full"
                              style={{ width: `${36 / (canvasZoom / 100)}px`, height: `${36 / (canvasZoom / 100)}px` }}
                              title="스케치 편집 모드로 전환"
                            >
                              <Plus size={12 / (canvasZoom / 100)} />
                            </button>
                            <div className="w-[1px] bg-black/10 dark:bg-white/10 mx-0.5" style={{ height: (28 / (canvasZoom / 100)) + 'px' }} />
                            <a
                              href={item.src || '#'}
                              download="viewpoint.png"
                              className="flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors rounded-full"
                              style={{ width: `${36 / (canvasZoom / 100)}px`, height: `${36 / (canvasZoom / 100)}px` }}
                              title="다운로드"
                            >
                              <Download size={14 / (canvasZoom / 100)} />
                            </a>
                            {/* V281: library 버튼을 ANALYZED 뷰(원본 모체)로 이전하므로 여기선 삭제됨 */}
                            <button
                              onClick={() => {
                                setHistoryStates((prevH: CanvasItem[][]) => [...prevH, canvasItems]);
                                setRedoStates([]);
                                setCanvasItems((prev: CanvasItem[]) => prev.filter((i: CanvasItem) => i.id !== item.id && i.motherId !== item.id));
                                setSelectedItemIds([]);
                              }}
                              className="flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-red-500 rounded-full"
                              style={{ width: `${36 / (canvasZoom / 100)}px`, height: `${36 / (canvasZoom / 100)}px` }}
                              title="삭제"
                            >
                              <Trash2 size={12 / (canvasZoom / 100)} />
                            </button>
                          </>
                        ) : (
                          /* V272: upload — [edit(+)|download|library*|delete] */
                          <>
                            {!item.motherId && (
                              <>
                                <button
                                  onClick={() => {
                                    // V276: editVersions 초기화 (패널 미오픈)
                                    setCanvasItems((prev: CanvasItem[]) => prev.map((i: CanvasItem) =>
                                      i.id === item.id
                                        ? { ...i, editVersions: i.editVersions || [{ src: i.src!, label: i.label || 'ORIGINAL' }], activeVersionIndex: i.editVersions ? i.activeVersionIndex : 0 }
                                        : i
                                    ));
                                  }}
                                  className="flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors rounded-full"
                                  style={{ width: `${36 / (canvasZoom / 100)}px`, height: `${36 / (canvasZoom / 100)}px` }}
                                  title="편집 탭 추가"
                                >
                                  <Plus size={12 / (canvasZoom / 100)} />
                                </button>
                                <div className="w-[1px] bg-black/10 dark:bg-white/10 mx-0.5" style={{ height: (28 / (canvasZoom / 100)) + 'px' }} />
                              </>
                            )}
                            <a
                              href={item.src || '#'}
                              download="image.png"
                              className="flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors rounded-full"
                              style={{ width: `${36 / (canvasZoom / 100)}px`, height: `${36 / (canvasZoom / 100)}px` }}
                              title="다운로드"
                            >
                              <Download size={14 / (canvasZoom / 100)} />
                            </a>
                            {/* V282 D-1: ANALYZED 모체에만 Book 버튼 표시 */}
                            {item.label === 'ANALYZED' && (
                              <>
                                <div className="w-[1px] bg-black/10 dark:bg-white/10 mx-0.5" style={{ height: (28 / (canvasZoom / 100)) + 'px' }} />
                                <button
                                  onClick={() => setOpenLibraryItemId(openLibraryItemId === item.id ? null : item.id)}
                                  className="flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors rounded-full"
                                  style={{ width: `${36 / (canvasZoom / 100)}px`, height: `${36 / (canvasZoom / 100)}px` }}
                                  title="입면 전개도"
                                >
                                  <Book size={12 / (canvasZoom / 100)} />
                                </button>
                              </>
                            )}
                            <div className="w-[1px] bg-black/10 dark:bg-white/10 mx-0.5" style={{ height: (28 / (canvasZoom / 100)) + 'px' }} />
                            <button
                              onClick={() => {
                                setHistoryStates((prevH: CanvasItem[][]) => [...prevH, canvasItems]);
                                setRedoStates([]);
                                setCanvasItems((prev: CanvasItem[]) => prev.filter((i: CanvasItem) => i.id !== item.id && i.motherId !== item.id));
                                setSelectedItemIds([]);
                              }}
                              className="flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-red-500 rounded-full"
                              style={{ width: `${36 / (canvasZoom / 100)}px`, height: `${36 / (canvasZoom / 100)}px` }}
                              title="삭제"
                            >
                              <Trash2 size={12 / (canvasZoom / 100)} />
                            </button>
                          </>
                        )}
                      </div>

                      {/* V180/V2.2: Item-bound Library Artboard (Architecture Sheet) */}
                      {openLibraryItemId === item.id && (
                        <div
                          className="absolute flex flex-col bg-[#121212] text-white shadow-2xl rounded-2xl p-0 pointer-events-auto cursor-default overflow-hidden border border-white/10"
                          style={{
                            left: 'calc(100% + 12px)',
                            top: 0,
                            width: '850px',
                            height: '650px',
                            fontFamily: "'Pretendard', sans-serif"
                          }}
                          onPointerDown={(e) => e.stopPropagation()}
                        >
                          {/* Header & Tabs */}
                          <div className="flex justify-between items-center px-6 py-4 shrink-0 bg-black/40 border-b border-white/5">
                            <h2 className="font-display text-2xl tracking-widest text-[#F4C430]">
                              {artboardPage === 1 && "01_ANALYSIS REPORT"}
                              {artboardPage === 2 && "02_FRONT VIEW (06:00)"}
                              {artboardPage === 3 && "03_TOP VIEW (PLAN)"}
                              {artboardPage === 4 && "04_RIGHT VIEW (03:00)"}
                              {artboardPage === 5 && "05_LEFT VIEW (09:00)"}
                              {artboardPage === 6 && "06_REAR VIEW (12:00)"}
                            </h2>
                            <div className="flex gap-1.5">
                              {[1, 2, 3, 4, 5, 6].map((p) => (
                                <button
                                  key={p}
                                  onClick={() => setArtboardPage(p)}
                                  className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-mono transition-all
                                    ${artboardPage === p 
                                      ? 'bg-[#F4C430] text-black font-bold scale-110' 
                                      : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white'}`}
                                >
                                  {String(p).padStart(2, '0')}
                                </button>
                              ))}
                              <button onClick={() => setOpenLibraryItemId(null)} className="ml-2 w-9 h-9 flex items-center justify-center rounded-lg bg-white/5 hover:bg-red-500/20 text-white/40 hover:text-red-500 transition-colors">
                                <X size={18} />
                              </button>
                            </div>
                          </div>

                          {/* Content Area */}
                          <div className="flex-1 w-full overflow-hidden bg-black/20 flex flex-col">
                            {artboardPage === 1 ? (
                              /* Page 1: Analysis Report (BIM AEPL Schema) */
                              <div className="flex w-full h-full p-6 gap-6">
                                {/* Left: Source Image */}
                                <div className="w-[40%] h-full flex flex-col">
                                  <span className="font-display text-sm uppercase text-[#F4C430] mb-3 tracking-[0.2em] block">SOURCE DIAGNOSIS</span>
                                  <div className="flex-1 w-full bg-white/5 rounded-2xl border border-white/5 p-4 flex items-center justify-center overflow-hidden">
                                    <img src={item.src} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" alt="Source" />
                                  </div>
                                </div>

                                {/* Right: AEPL Parameters */}
                                <div className="w-[60%] h-full flex flex-col">
                                  <span className="font-display text-sm uppercase text-[#F4C430] mb-3 tracking-[0.2em] block">BIM AEPL PARAMETERS (V4)</span>
                                  <div className="flex-1 bg-white/5 rounded-2xl border border-white/5 p-6 overflow-y-auto custom-scrollbar font-mono text-[11px] leading-relaxed">
                                    {item.parameters?.elevationParams ? (
                                      <div className="space-y-6">
                                        <section>
                                          <h4 className="text-[#F4C430] border-b border-white/10 pb-1 mb-2 font-bold uppercase tracking-wider">1_Geometry_MASTER</h4>
                                          <pre className="text-white/60 bg-black/30 p-4 rounded-xl">
                                            {JSON.stringify(item.parameters.elevationParams['1_Geometry_MASTER'] || item.parameters.elevationParams['1_macro_geometry'], null, 2)}
                                          </pre>
                                        </section>
                                        <section>
                                          <h4 className="text-[#F4C430] border-b border-white/10 pb-1 mb-2 font-bold uppercase tracking-wider">2_Property_SLAVE</h4>
                                          <pre className="text-white/60 bg-black/30 p-4 rounded-xl">
                                            {JSON.stringify(item.parameters.elevationParams['2_Property_SLAVE'] || item.parameters.elevationParams['3_material'], null, 2)}
                                          </pre>
                                        </section>
                                      </div>
                                    ) : (
                                      <div className="h-full flex flex-col items-center justify-center opacity-30 italic">
                                        <Loader2 className="animate-spin mb-2" />
                                        <span>Waiting for Deterministic BIM Compilation...</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              /* Pages 2-6: Elevation Sheets (Template-Layout) */
                              <div className="relative w-full h-full bg-[#121212] flex items-center justify-center p-8">
                                {(() => {
                                  const views = [
                                    { key: 'front', label: 'FRONT= 정면= 06:00' },
                                    { key: 'top', label: 'TOP= 평면/탑' },
                                    { key: 'right', label: 'RIGHT= 우측면= 03:00' },
                                    { key: 'left', label: 'LEFT= 좌측면= 09:00' },
                                    { key: 'rear', label: 'REAR= 배면= 12:00' },
                                  ];
                                  const currentView = views[artboardPage - 2];
                                  // V297 C: item.parameters 직접 참조, fallback null (component state 오염 차단)
                                  const elevImgs = item.parameters?.elevationImages ?? null;
                                  const imgSrc = elevImgs?.[currentView.key as keyof typeof elevImgs] ?? null;

                                  return (
                                    <div className="w-full h-full relative flex flex-col pt-12">
                                      {/* Title Overlay */}
                                      <h1 className="absolute top-0 left-0 font-display text-4xl text-white tracking-[2px] leading-none uppercase">
                                        IMAGE TO ELEVATION: {currentView.label}
                                      </h1>
                                      
                                      {/* Image Wrapper */}
                                      <div className="flex-1 w-full bg-white/5 rounded-t-2xl border-x border-t border-white/5 flex items-center justify-center relative overflow-hidden">
                                        {imgSrc ? (
                                          <img src={imgSrc} className="max-w-full max-h-full object-contain" alt={currentView.label} />
                                        ) : (
                                          <div className="flex flex-col items-center gap-3 opacity-20">
                                            <Loader2 className="animate-spin" size={40} />
                                            <span className="font-display tracking-[0.2em]">GENERATING VIEW...</span>
                                          </div>
                                        )}
                                      </div>

                                      {/* Label Item (Yellow Bar) */}
                                      <div className="h-14 bg-[#F4C430] flex items-center justify-center rounded-b-2xl shadow-lg shrink-0">
                                        <strong className="text-black font-medium text-lg tracking-[2px] uppercase">
                                          {currentView.label}
                                        </strong>
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* V282 B+C: 캔버스 레벨 로더로 이전 (z-102) */}
                      {/* V285 C-2: 리사이즈 핸들 섹션 레벨 오버레이(z-115)로 이전 — 여기선 제거 */}
                    </div>
                  )}
                </div>
              ); })}
            </div>
          </div>
        </section>

        {/* RIGHT SIDEBAR WRAPPER (V177: Detached Header & Minimal Footer) */}
        <div className="absolute top-0 right-0 h-full z-[120] pointer-events-none flex justify-end p-[12px]">
          <div className={`
            relative h-full transition-all duration-500 ease-in-out flex flex-col items-end
            ${isRightPanelOpen ? 'w-[284px]' : 'w-0'}
            ${(isGenerating || isAnalyzing) ? 'opacity-50 [&_*]:!pointer-events-none' : ''}
          `}>

            {/* V203: Detached Header Row - Function Selector Button + PanelLeft */}
            <div className={`
              w-[284px] shrink-0 h-[44px] flex items-center gap-[12px] mb-[12px] transition-all duration-500
            `}>
              <button
                onClick={() => {
                  // V264: always toggle — no auto-panel on initial state
                  setIsFunctionSelectorOpen((prev: boolean) => !prev);
                }}
                className={`
                  flex-1 h-full rounded-full bg-white/80 dark:bg-black/80 border border-black/10 dark:border-white/10 flex items-center justify-between px-5 backdrop-blur-sm shadow-sm hover:bg-black/5 dark:hover:bg-white/5 transition-all pointer-events-auto
                  ${isRightPanelOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
                `}
              >
                <span className="font-display tracking-widest uppercase font-medium text-[15px]">
                  {isFunctionSelectorOpen ? 'SELECT TOOLS' : (selectedFunction || 'SELECT TOOLS')}
                </span>
                {isFunctionSelectorOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
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

            <div className={`
              w-[228px] mr-[56px] flex flex-col gap-[6px] pb-[3px] transition-all duration-300 overflow-y-auto custom-scrollbar shrink-0
              ${isRightPanelOpen && isFunctionSelectorOpen
                ? 'max-h-[700px] opacity-100 mb-[12px] translate-y-0'
                : 'max-h-0 opacity-0 mb-0 -translate-y-4 pointer-events-none'}
            `}>
              {/* V316: 11-button expanded sequence */}
              {[
                'WRITER', 'PLANNERS', 'PARAMETER', 
                'SKETCH TO PLAN', 'PLAN TO VOLUME', 'PLAN TO DIAGRAM', 
                'SKETCH TO IMAGE', 'IMAGE TO ELEVATION', 'STYLE EDIT', 
                'CHANGE VIEWPOINT', 'PRINT'
              ].map(fn => {
                const sourceItem = selectedItemIds.length > 0 ? canvasItems.find((i: CanvasItem) => i.id === selectedItemIds[0]) : null;
                // V309: ELEVATION SHEET 락업
                const isElevationSheetSelected = sourceItem?.label === 'ELEVATION SHEET' || sourceItem?.label === 'ANALYZED';
                const isLockedButton = isElevationSheetSelected && (fn === 'IMAGE TO ELEVATION' || fn === 'CHANGE VIEWPOINT');
                
                // V316: 신규 버튼은 비활성 시각적 플레이스홀더 (Add Tools와 동일)
                const isPlaceholder = ['WRITER', 'PARAMETER', 'SKETCH TO PLAN', 'PLAN TO VOLUME', 'PLAN TO DIAGRAM', 'STYLE EDIT'].includes(fn);

                return (
                  <button
                    key={fn}
                    disabled={isLockedButton}
                    onClick={() => {
                      if (isPlaceholder) return; // V316: Placeholder buttons do nothing
                      
                      // V285 B: SKETCH TO IMAGE — 미선택 가드
                      if (fn === 'SKETCH TO IMAGE') {
                        if (selectedItemIds.length === 0) {
                          setToastMessage('스케치를 먼저 선택해주세요.');
                          setTimeout(() => setToastMessage(''), 3000);
                          return;
                        }
                      }
                      if (fn === 'CHANGE VIEWPOINT') {
                        if (!sourceItem?.src) {
                          setToastMessage('이미지를 먼저 선택해주세요.');
                          setTimeout(() => setToastMessage(''), 3000);
                          return;
                        }
                        // V304: PHASE 3 전담 — 기존 분석 파라미터 복원만 수행 (handleAnalyze 제거)
                        if (sourceItem.parameters?.analyzedOpticalParams) {
                          setSelectedFunction(fn);
                          setIsFunctionSelectorOpen(false);
                          setIsRightPanelOpen(true);
                          setAnalyzedOpticalParams(sourceItem.parameters.analyzedOpticalParams);
                          setElevationParams(sourceItem.parameters.elevationParams || null);
                          setSitePlanImage(sourceItem.parameters.sitePlanImage || null);
                          setElevationImages(sourceItem.parameters.elevationImages || null);
                          setCvPrompt(sourceItem.parameters.cvPrompt || '');
                          // V304: V0를 UI 슬라이더에 표시
                          if (sourceItem.parameters.angleIndex !== undefined) setAngleIndex(sourceItem.parameters.angleIndex);
                          if (sourceItem.parameters.altitudeIndex !== undefined) setAltitudeIndex(sourceItem.parameters.altitudeIndex);
                          if (sourceItem.parameters.lensIndex !== undefined) setLensIndex(sourceItem.parameters.lensIndex);
                          if (sourceItem.parameters.timeIndex !== undefined) setTimeIndex(sourceItem.parameters.timeIndex);
                        } else {
                          // V305: 파라미터 없을 때 패널 열림 차단 (return 처리)
                          setToastMessage('먼저 IMAGE TO ELEVATION을 실행해 분석하세요.');
                          setTimeout(() => setToastMessage(''), 3500);
                        }
                        return;
                      }
                      // V304 A: IMAGE TO ELEVATION — 미선택 가드 및 즉시 실행
                      if (fn === 'IMAGE TO ELEVATION') {
                        if (!sourceItem?.src) {
                          setToastMessage('이미지를 먼저 선택해주세요.');
                          setTimeout(() => setToastMessage(''), 3000);
                          return;
                        }
                        
                        // V309: 중복 실행 검사 및 토스트
                        const existingElevation = canvasItems.some(i => i.type === 'artboard' && i.motherId === sourceItem.id && i.label === 'ANALYZED');
                        if (existingElevation) {
                          setToastMessage('이미 전개도 생성이 완료된 이미지입니다.');
                          setTimeout(() => setToastMessage(''), 3000);
                          return;
                        }
                        
                        // V306: 패널 변경 없이 백그라운드 5면도 실행
                        handleAnalyze();
                        return;
                      }
                      setSelectedFunction(fn);
                      setIsFunctionSelectorOpen(false);
                    }}
                    style={{ 
                      // V317: PARAMETER/CHANGE VIEWPOINT 뒤에 6px 추가 여백 (기본 gap-6px와 합산하여 12px 구현)
                      marginBottom: (fn === 'PARAMETER' || fn === 'CHANGE VIEWPOINT') ? '6px' : '0px' 
                    }}
                    className={`h-[44px] w-full shrink-0 rounded-full bg-white/80 dark:bg-black/80 border border-black/10 dark:border-white/10 flex items-center px-5 backdrop-blur-sm shadow-sm transition-all pointer-events-auto 
                      ${isPlaceholder ? 'cursor-default' : (isLockedButton ? 'opacity-30 cursor-not-allowed' : 'hover:bg-black/5 dark:hover:bg-white/5')}`}
                  >
                    <span className="font-display tracking-widest uppercase font-medium text-[15px]">{fn}</span>
                  </button>
                );
              })}
              {/* V130: + ADD TOOLS - empty hover-only button */}
              <button
                className="h-[44px] w-full shrink-0 rounded-full bg-white/80 dark:bg-black/80 border border-black/10 dark:border-white/10 flex items-center px-5 backdrop-blur-sm shadow-sm hover:bg-black/5 dark:hover:bg-white/5 transition-all pointer-events-auto"
              >
                <span className="font-display tracking-widest uppercase font-medium text-[15px]">+ ADD TOOLS</span>
              </button>
            </div>

            {/* V209: Shared panel container for all function panels */}
            <div className="flex-1 relative w-[284px]">

              {/* V304 IMAGE TO ELEVATION Panel */}
              <div className={`
                absolute inset-0 transition-all duration-500 ease-in-out
                ${!isRightPanelOpen
                  ? 'translate-x-10 opacity-0 pointer-events-none'
                  : (isFunctionSelectorOpen || selectedFunction !== 'IMAGE TO ELEVATION')
                    ? 'translate-y-10 opacity-0 pointer-events-none'
                    : 'translate-0 opacity-100 pointer-events-auto'}
              `}>
                <aside className="h-full w-full rounded-[20px] flex flex-col overflow-hidden bg-white/80 dark:bg-black/80 backdrop-blur-sm border border-black/10 dark:border-white/10">
                  <div className="flex flex-col h-full">
                    <div className="flex-1 overflow-y-auto px-4 pb-4 pt-4 min-h-0 flex flex-col gap-4 custom-scrollbar">
                      <span className="font-mono text-xs opacity-70 uppercase tracking-widest">Image to Elevation</span>

                      {isAnalyzing ? (
                        <div className="flex-1 flex flex-col items-center justify-center gap-3 opacity-60">
                          <Loader2 size={28} className="animate-spin" />
                          <p className="font-mono text-xs text-center">{analysisStep || 'ANALYZING...'}</p>
                        </div>
                      ) : elevationImages ? (
                        /* 결과 미리보기: 5면도 썸네일 그리드 */
                        <div className="flex flex-col gap-3">
                          <span className="font-mono text-[10px] opacity-50 uppercase tracking-widest">Elevation Sheet Generated</span>
                          <div className="grid grid-cols-2 gap-2">
                            {(['front', 'rear', 'left', 'right', 'top'] as const).map((key) => {
                              const src = elevationImages[key as keyof typeof elevationImages];
                              return (
                                <div key={key} className="relative aspect-square rounded-[10px] overflow-hidden bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 flex items-center justify-center">
                                  {src
                                    ? <img src={src} alt={key} className="w-full h-full object-cover" />
                                    : <Loader2 size={16} className="animate-spin opacity-30" />}
                                  <span className="absolute bottom-1 left-1 font-mono text-[8px] uppercase tracking-widest bg-black/60 text-white px-1 rounded">{key}</span>
                                </div>
                              );
                            })}
                          </div>
                          <p className="font-mono text-[10px] opacity-40 text-center mt-1">ELEVATION SHEET placed on canvas</p>
                        </div>
                      ) : (
                        <div className="flex-1 flex flex-col items-center justify-center gap-3 opacity-30">
                          <Book size={28} />
                          <p className="font-mono text-xs text-center">Select an image and tap IMAGE TO ELEVATION to auto-generate the 5-view elevation sheet.</p>
                        </div>
                      )}
                    </div>

                    <div className="p-3 mt-auto shrink-0 flex flex-col items-center gap-1">
                      <p className="font-mono text-[10px] opacity-40 text-center tracking-tighter">
                        © CRETE CO.,LTD. 2026. ALL RIGHTS RESERVED.
                      </p>
                    </div>
                  </div>
                </aside>
              </div>

              {/* V177 CHANGE VIEWPOINT Panel */}
              <div className={`
                absolute inset-0 transition-all duration-500 ease-in-out
                ${!isRightPanelOpen
                  ? 'translate-x-10 opacity-0 pointer-events-none'
                  : (isFunctionSelectorOpen || selectedFunction !== 'CHANGE VIEWPOINT')
                    ? 'translate-y-10 opacity-0 pointer-events-none'
                    : 'translate-0 opacity-100 pointer-events-auto'}
              `}>
                <aside
                  className="h-full w-full rounded-[20px] flex flex-col overflow-hidden bg-white/80 dark:bg-black/80 backdrop-blur-sm border border-black/10 dark:border-white/10"
                >
                  <div className="flex flex-col h-full">
                    {/* V265: Single-page layout — Prompt + Viewpoint */}
                    <div className="flex-1 overflow-y-auto px-4 pb-4 pt-4 min-h-0 flex flex-col gap-5 custom-scrollbar">

                      {/* Prompt Section */}
                      <div className="flex flex-col gap-2">
                        <span className="font-mono text-xs opacity-70 uppercase tracking-widest">Prompt</span>
                        <textarea
                          value={cvPrompt}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCvPrompt(e.target.value)}
                          placeholder="이미지 생성에 적용할 추가 지시사항을 입력하세요..."
                          className="w-full h-[150px] resize-none rounded-[12px] border border-black/10 dark:border-white/10 bg-white/50 dark:bg-black/50 p-3 font-mono text-xs focus:outline-none focus:border-black/30 dark:focus:border-white/30"
                          onPointerDown={(e: React.PointerEvent) => e.stopPropagation()}
                        />
                      </div>

                      {/* Viewpoint Section */}
                      <div>
                        <span className="font-mono text-xs opacity-70 uppercase tracking-widest block mb-3">Viewpoint</span>
                        <div className="flex-shrink-0 w-full aspect-square mx-auto rounded-[20px] bg-white/30 dark:bg-black/30 border border-black/5 dark:border-white/5">
                          {(() => {
                            const sourceItem = canvasItems.find((i: CanvasItem) => i.id === selectedItemIds[0]);
                            const v0AngleStr = sourceItem?.parameters?.analyzedOpticalParams?.angle;
                            const v0Index = v0AngleStr ? ANGLES.indexOf(v0AngleStr) : -1;
                            return (
                              <SitePlanDiagram
                                angle={ANGLES[angleIndex]}
                                isAnalyzing={isAnalyzing}
                                analysisStep={analysisStep}
                                lens={LENSES[lensIndex].value}
                                visibleV0Index={v0Index !== -1 ? v0Index : null}
                              />
                            );
                          })()}
                        </div>
                      </div>

                      {/* Sliders */}
                      <div className={`flex flex-col space-y-4 px-1 transition-opacity ${areSlidersLocked ? 'opacity-30 pointer-events-none' : ''}`}>
                        {(() => {
                          const sourceItem = canvasItems.find((i: CanvasItem) => i.id === selectedItemIds[0]);
                          const v0AngleStr = sourceItem?.parameters?.analyzedOpticalParams?.angle;
                          const v0Index = v0AngleStr ? ANGLES.indexOf(v0AngleStr) : -1;
                          const minAngle = v0Index !== -1 ? Math.max(0, v0Index - 1) : 0;
                          const maxAngle = v0Index !== -1 ? Math.min(ANGLES.length - 1, v0Index + 1) : ANGLES.length - 1;

                          return (
                            <>
                              <div>
                                <div className="flex justify-between font-mono text-xs leading-normal tracking-wide mb-1.5">
                                  <span className="opacity-70 uppercase tracking-widest">Angle</span>
                                  <span className="font-bold">{ANGLES[angleIndex]}</span>
                                </div>
                                <input type="range" min={minAngle} max={maxAngle} step="1" value={angleIndex} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAngleIndex(Number(e.target.value))} className="w-full accent-black dark:accent-white cursor-pointer" />
                              </div>
                        <div>
                          <div className="flex justify-between font-mono text-xs leading-normal tracking-wide mb-1.5">
                            <span className="opacity-70 uppercase tracking-widest">Altitude</span>
                            <span className="font-bold">{ALTITUDES[altitudeIndex].label}</span>
                          </div>
                          <input type="range" min="0" max={ALTITUDES.length - 1} step="1" value={altitudeIndex} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAltitudeIndex(Number(e.target.value))} className="w-full accent-black dark:accent-white cursor-pointer" />
                        </div>
                        <div>
                          <div className="flex justify-between font-mono text-xs leading-normal tracking-wide mb-1.5">
                            <span className="opacity-70 uppercase tracking-widest">Lens</span>
                            <span className="font-bold">{LENSES[lensIndex].label}</span>
                          </div>
                          <input type="range" min="0" max={LENSES.length - 1} step="1" value={lensIndex} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLensIndex(Number(e.target.value))} className="w-full accent-black dark:accent-white cursor-pointer" />
                        </div>
                        <div>
                          <div className="flex justify-between font-mono text-xs leading-normal tracking-wide mb-1.5">
                            <span className="opacity-70 uppercase tracking-widest">Time</span>
                            <span className="font-bold">{TIMES[timeIndex]}</span>
                          </div>
                          <input type="range" min="0" max={TIMES.length - 1} step="1" value={timeIndex} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTimeIndex(Number(e.target.value))} className="w-full accent-black dark:accent-white cursor-pointer" />
                        </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    {/* V276: ANALYZE 버튼 폐기 — 항상 GENERATE 표시 */}
                    <div className="px-4 pb-2 pt-2 shrink-0">
                      <button
                        onClick={isGenerating ? handleCancelGenerate : handleGenerate}
                        disabled={isAnalyzing || !analyzedOpticalParams || areSlidersLocked}
                        className="relative w-full h-[44px] rounded-full transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center overflow-hidden border border-black/10 dark:border-white/10 enabled:bg-black enabled:text-white enabled:dark:bg-white enabled:dark:text-black"
                      >
                        <span className="font-display tracking-widest uppercase font-medium text-[16px] z-10">
                          {isAnalyzing
                            ? <Loader2 size={16} className="animate-spin z-10" />
                            : isGenerating ? 'CANCEL' : 'GENERATE'}
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

              {/* V209: SKETCH TO IMAGE Panel */}
              <div className={`
                absolute inset-0 transition-all duration-500 ease-in-out
                ${!isRightPanelOpen
                  ? 'translate-x-10 opacity-0 pointer-events-none'
                  : (isFunctionSelectorOpen || selectedFunction !== 'SKETCH TO IMAGE')
                    ? 'translate-y-10 opacity-0 pointer-events-none'
                    : 'translate-0 opacity-100 pointer-events-auto'}
              `}>
                <aside className="h-full w-full rounded-[20px] flex flex-col overflow-hidden bg-white/80 dark:bg-black/80 backdrop-blur-sm border border-black/10 dark:border-white/10">
                  <div className="flex flex-col h-full">
                    <div className="flex-1 overflow-hidden px-4 pb-0 pt-4 min-h-0 flex flex-col gap-5">

                      {/* PROMPT */}
                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="font-mono text-xs opacity-70 uppercase tracking-widest">Prompt</span>
                          <button
                            onClick={() => navigator.clipboard.writeText(sketchPrompt)}
                            className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-md transition-colors"
                          >
                            <Copy size={14} className="opacity-40" />
                          </button>
                        </div>
                        <textarea
                          value={sketchPrompt}
                          onChange={e => setSketchPrompt(e.target.value)}
                          placeholder="Describe materials, lighting..."
                          className="w-full h-[150px] resize-none rounded-[12px] border border-black/10 dark:border-white/10 bg-white/50 dark:bg-black/50 p-3 font-mono text-xs focus:outline-none focus:border-black/30 dark:focus:border-white/30"
                        />
                      </div>

                      {/* MODE */}
                      <div>
                        <span className="font-mono text-xs opacity-70 uppercase tracking-widest block mb-1.5">Mode</span>
                        <div className="flex gap-3">
                          {['CONCEPT', 'DETAIL'].map(mode => (
                            <button
                              key={mode}
                              onClick={() => setSketchMode(prev => prev === mode ? '' : mode)}
                              className={`flex-1 h-[44px] rounded-full font-display tracking-widest uppercase font-medium text-[14px] transition-all border border-black/10 dark:border-white/10
                                ${sketchMode === mode
                                  ? 'bg-black/5 dark:bg-white/5 text-black dark:text-white'
                                  : 'bg-transparent text-black dark:text-white hover:bg-black/5 dark:hover:bg-white/5'}`}
                            >
                              {mode}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* STYLE GRID + DETAIL PANEL GROUP */}
                      <div className="flex flex-col gap-5 shrink-0">
                        <div className="shrink-0">
                          <span className="font-mono text-xs opacity-70 uppercase tracking-widest block mb-1.5">CRE-TE STYLE</span>
                          <div className="grid grid-cols-4 gap-1.5">
                            {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'NONE'].map(style => (
                              <button
                                key={style}
                                onClick={() => {
                                  const nextStyle = sketchStyle === style ? 'NONE' : style;
                                  setSketchStyle(nextStyle);
                                  if (nextStyle !== 'NONE') setActiveDetailStyle(nextStyle);
                                  else setActiveDetailStyle(null);
                                }}
                                className={`h-[44px] rounded-full font-display tracking-widest uppercase font-medium text-[14px] border border-black/10 dark:border-white/10 transition-all
                                  ${sketchStyle === style
                                    ? 'bg-black/5 dark:bg-white/5 text-black dark:text-white'
                                    : 'bg-white/80 dark:bg-black/80 text-black dark:text-white hover:bg-black/5 dark:hover:bg-white/5'}`}
                              >
                                {style}
                              </button>
                            ))}
                          </div>
                        </div>

                        {activeDetailStyle && (
                          <div className="h-[200px] overflow-hidden transition-all duration-500 ease-in-out">
                            {STYLE_DESCRIPTIONS[activeDetailStyle] ? (
                              <div className="h-full bg-black/5 dark:bg-white/5 rounded-[20px] p-4 relative border border-black/5 dark:border-white/5 flex flex-col">
                                <div className="shrink-0 mb-3 pr-8">
                                  <h4 className="font-bold text-[13px] leading-tight">
                                    {STYLE_DESCRIPTIONS[activeDetailStyle].title.ko}
                                    <br />
                                    _{STYLE_DESCRIPTIONS[activeDetailStyle].title.en}
                                  </h4>
                                  <button onClick={() => setActiveDetailStyle(null)} className="absolute top-3 right-3 p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-full transition-colors group z-20">
                                    <X size={14} className="opacity-40 group-hover:opacity-100 transition-opacity" />
                                  </button>
                                </div>
                                <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
                                  <ul className="space-y-3 pb-2">
                                    {STYLE_DESCRIPTIONS[activeDetailStyle].keywords.map((kw, idx) => (
                                      <li key={idx} className="flex items-start">
                                        <span className="mr-2 mt-1.5 w-1 h-1 rounded-full bg-current shrink-0 opacity-40" />
                                        <div className="flex flex-col">
                                          <span className="text-[11px] font-medium leading-tight">{kw.en}</span>
                                          <span className="text-[11px] opacity-50 leading-tight">({kw.ko})</span>
                                        </div>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        )}
                      </div>

                      {/* ASPECT RATIO */}
                      <div className="shrink-0">
                        <span className="font-mono text-xs opacity-70 uppercase tracking-widest block mb-1.5">Aspect Ratio</span>
                        <div className="flex gap-2">
                          {['1:1', '4:3', '16:9'].map(ratio => (
                            <button
                              key={ratio}
                              onClick={() => setAspectRatio((prev: string | null) => prev === ratio ? null : ratio)}
                              className={`flex-1 h-[36px] rounded-full font-display tracking-widest uppercase font-medium text-[12px] transition-all border border-black/10 dark:border-white/10
                                ${aspectRatio === ratio
                                  ? 'bg-black/5 dark:bg-white/5 text-black dark:text-white'
                                  : 'bg-transparent text-black dark:text-white hover:bg-black/5 dark:hover:bg-white/5'}`}
                            >
                              {ratio}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* RESOLUTION */}
                      <div className="shrink-0">
                        <span className="font-mono text-xs opacity-70 uppercase tracking-widest block mb-1.5">Resolution</span>
                        <div className="flex gap-2">
                          {['FAST', 'NORMAL', 'HIGH'].map(res => (
                            <button
                              key={res}
                              onClick={() => setResolution((prev: string) => prev.startsWith(res) ? '' : res + ' QUALITY')}
                              className={`flex-1 h-[36px] rounded-full font-display tracking-widest uppercase font-medium text-[12px] transition-all border border-black/10 dark:border-white/10
                                ${resolution.startsWith(res)
                                  ? 'bg-black/5 dark:bg-white/5 text-black dark:text-white'
                                  : 'bg-transparent text-black dark:text-white hover:bg-black/5 dark:hover:bg-white/5'}`}
                            >
                              {res}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="px-4 pb-2 pt-5 shrink-0">
                      <button
                        onClick={handleGenerate}
                        disabled={
                          !sketchMode || !sketchStyle || !aspectRatio || !resolution || isGenerating ||
                          !selectedItemIds.length ||
                          !canvasItems.find((i: CanvasItem) =>
                            i.id === selectedItemIds[0] &&
                            (i.type === 'artboard' || i.type === 'upload' || i.type === 'generated')
                          )
                        }
                        className="relative w-full h-[44px] rounded-full transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center overflow-hidden border border-black/10 dark:border-white/10 enabled:bg-black enabled:text-white enabled:dark:bg-white enabled:dark:text-black"
                      >
                        <span className="font-display tracking-widest uppercase font-medium text-[16px] z-10">
                          {isGenerating ? <Loader2 size={20} className="animate-spin" /> : 'GENERATE'}
                        </span>
                      </button>
                    </div>

                    <div className="p-3 mt-auto shrink-0 flex flex-col items-center gap-1">
                      <p className="font-mono text-[10px] opacity-40 text-center tracking-tighter">
                        © CRETE CO.,LTD. 2026. ALL RIGHTS RESERVED.
                      </p>
                    </div>
                  </div>
                </aside>
              </div>

              {/* V218: PLANNERS Panel */}
              <div className={`
                absolute inset-0 transition-all duration-500 ease-in-out
                ${!isRightPanelOpen
                  ? 'translate-x-10 opacity-0 pointer-events-none'
                  : (isFunctionSelectorOpen || selectedFunction !== 'PLANNERS')
                    ? 'translate-y-10 opacity-0 pointer-events-none'
                    : 'translate-0 opacity-100 pointer-events-auto'}
              `}>
                <aside className="h-full w-full rounded-[20px] flex flex-col overflow-hidden bg-white/80 dark:bg-black/80 backdrop-blur-sm border border-black/10 dark:border-white/10">
                  <div className="flex flex-col h-full">
                    {/* V263: 3-view PLANNERS panel */}
                    {(() => {
                      const [plannerCardId, plannerRole] = (selectedPlannerCardId ?? '').split('::');
                      const plannerCard = plannerCardId ? canvasItems.find((i: CanvasItem) => i.id === plannerCardId) : null;
                      const debate = plannerCard?.parameters?.debateResult ?? null;
                      const roleTitles: Record<string, string> = { thesis: 'THESIS', antithesis: 'ANTITHESIS', synthesis: 'SYNTHESIS', support: 'SUPPORT' };

                      /* ── View C: 단일 전문가 상세 ── */
                      if (selectedPlannerCardId && plannerRole && debate) {
                        const role = plannerRole as 'thesis' | 'antithesis' | 'synthesis' | 'support';
                        const turnData = debate[role];
                        const expert = PLANNER_EXPERTS.find(e => e.id === turnData.expertId);
                        const ExpertIcon = expert ? (PLANNER_ICON_MAP[expert.iconName] ?? Bot) : Bot;
                        return (
                          <>
                            <div className="px-4 pt-4 pb-3 shrink-0 flex items-center gap-2 border-b border-black/5 dark:border-white/5">
                              <button onClick={() => setSelectedPlannerCardId(plannerCardId)} className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors">
                                <ChevronLeft size={16} />
                              </button>
                              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 dark:text-neutral-500">{roleTitles[role]}</span>
                            </div>
                            <div className="flex-1 overflow-y-auto px-5 py-4 custom-scrollbar min-h-0 flex flex-col gap-4">
                              <div className="flex items-center gap-3">
                                <div className="p-1.5 rounded-lg bg-black shadow-lg shrink-0"><ExpertIcon className="h-3.5 w-3.5 text-white" /></div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-[13px] font-black tracking-tight text-neutral-900 dark:text-neutral-100 truncate">{expert?.name}</div>
                                  <div className="text-[10px] text-neutral-400 dark:text-neutral-500 truncate">{expert?.personaName}</div>
                                </div>
                                <span className="shrink-0 text-[9px] font-black uppercase tracking-[0.15em] bg-black/5 dark:bg-white/10 px-2 py-1 rounded-full text-neutral-600 dark:text-neutral-300">{roleTitles[role]}</span>
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {turnData.keywords.map((kw: string) => (
                                  <span key={kw} className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-white/10 px-2 py-0.5 rounded-full">{kw}</span>
                                ))}
                              </div>
                              <div className="border-l-2 border-black dark:border-white pl-4">
                                <p className="text-[12px] font-semibold italic text-neutral-700 dark:text-neutral-300 leading-relaxed">"{turnData.shortContent}"</p>
                              </div>
                              <p className="text-[12px] leading-[1.8] text-neutral-800 dark:text-neutral-200 font-medium whitespace-pre-wrap">{turnData.fullContent}</p>
                            </div>
                            <div className="px-4 pb-4 pt-3 shrink-0 border-t border-black/5 dark:border-white/5">
                              <button onClick={() => navigator.clipboard.writeText(turnData.fullContent)} className="w-full flex items-center justify-center gap-2 rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-black/20 px-4 py-2.5 text-[12px] font-black text-black dark:text-white hover:bg-neutral-50 dark:hover:bg-white/5 transition-all shadow-sm active:scale-[0.98]">
                                <Copy size={14} /> Copy
                              </button>
                            </div>
                          </>
                        );
                      }

                      /* ── View B: 전체 Debate Log ── */
                      if (selectedPlannerCardId && debate) {
                        return (
                          <>
                            <div className="px-4 pt-4 pb-3 shrink-0 flex items-center gap-2 border-b border-black/5 dark:border-white/5">
                              <button onClick={() => setSelectedPlannerCardId(null)} className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors">
                                <ChevronLeft size={16} />
                              </button>
                              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 dark:text-neutral-500">Strategic Debate Log</span>
                            </div>
                            <div className="flex-1 overflow-y-auto px-4 py-4 custom-scrollbar min-h-0 flex flex-col gap-3">
                              {(['thesis', 'antithesis', 'synthesis', 'support'] as const).map((role) => {
                                const turnData = debate[role];
                                const expert = PLANNER_EXPERTS.find(e => e.id === turnData.expertId);
                                const ExpertIcon = expert ? (PLANNER_ICON_MAP[expert.iconName] ?? Bot) : Bot;
                                return (
                                  <div
                                    key={role}
                                    onClick={() => setSelectedPlannerCardId(`${plannerCardId}::${role}`)}
                                    className="bg-white dark:bg-black/30 rounded-2xl border border-neutral-100 dark:border-white/10 p-4 cursor-pointer hover:shadow-md hover:border-neutral-200 dark:hover:border-white/20 transition-all"
                                  >
                                    <div className="flex items-center gap-2 mb-2">
                                      <div className="p-1 rounded-md bg-black shrink-0"><ExpertIcon className="h-3 w-3 text-white" /></div>
                                      <span className="text-[12px] font-black text-neutral-900 dark:text-neutral-100 truncate">{expert?.name}</span>
                                      <span className="ml-auto shrink-0 text-[8px] font-black uppercase tracking-[0.15em] bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded-full text-neutral-500 dark:text-neutral-400">{roleTitles[role]}</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1 mb-2">
                                      {turnData.keywords.slice(0, 3).map((kw: string) => (
                                        <span key={kw} className="text-[9px] text-neutral-400 dark:text-neutral-500 bg-neutral-100 dark:bg-white/10 px-1.5 py-0.5 rounded-full">{kw}</span>
                                      ))}
                                    </div>
                                    <p className="text-[11.5px] leading-[1.7] text-neutral-700 dark:text-neutral-300 font-medium line-clamp-2">{turnData.shortContent}</p>
                                  </div>
                                );
                              })}
                              <div className="mt-2 pt-4">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 dark:text-neutral-500 block mb-3">Final Strategic Plan</span>
                                <p className="text-[12px] leading-[1.8] text-neutral-800 dark:text-neutral-200 font-medium whitespace-pre-wrap">{debate.finalOutput}</p>
                              </div>
                            </div>
                            <div className="px-4 pb-4 pt-3 shrink-0">
                              <button
                                onClick={() => {
                                  const fullLog = (['thesis', 'antithesis', 'synthesis', 'support'] as const)
                                    .map(r => `[${roleTitles[r]}] ${PLANNER_EXPERTS.find(e => e.id === debate[r].expertId)?.name}\n${debate[r].fullContent}`)
                                    .join('\n\n') + '\n\n---\n\n' + debate.finalOutput;
                                  navigator.clipboard.writeText(fullLog);
                                }}
                                className="relative w-full h-[44px] rounded-full border border-black/10 dark:border-white/10 bg-white dark:bg-black/20 text-black dark:text-white flex items-center justify-center transition-all hover:bg-neutral-50 active:scale-[0.98] shadow-sm overflow-hidden"
                              >
                                <span className="font-display tracking-widest uppercase font-medium text-[16px] z-10">COPY FULL LOG</span>
                              </button>
                            </div>
                          </>
                        );
                      }

                      /* ── View B fallback: V262 카드 (debateResult 없음) ── */
                      if (selectedPlannerCardId && !debate) {
                        return (
                          <>
                            <div className="px-4 pt-4 pb-3 shrink-0 flex items-center gap-2 border-b border-black/5 dark:border-white/5">
                              <button onClick={() => setSelectedPlannerCardId(null)} className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors">
                                <ChevronLeft size={16} />
                              </button>
                              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 dark:text-neutral-500">Final Plan</span>
                            </div>
                            <div className="flex-1 overflow-y-auto px-5 py-4 custom-scrollbar min-h-0">
                              <div className="flex items-center gap-2.5 mb-5">
                                <div className="p-1.5 rounded-lg bg-black shadow-lg shrink-0"><Bot className="h-3 w-3 text-white" /></div>
                                <h2 className="text-[13px] font-black tracking-tight text-neutral-900 dark:text-neutral-100 uppercase">Final Strategic Plan</h2>
                              </div>
                              <div className="relative pl-5 border-l-2 border-neutral-100 dark:border-white/10">
                                <p className="text-[12px] leading-[1.8] text-neutral-800 dark:text-neutral-200 font-medium whitespace-pre-wrap">
                                  {plannerCard?.parameters?.content || ''}
                                </p>
                              </div>
                            </div>
                            <div className="px-4 pb-4 pt-3 shrink-0 border-t border-black/5 dark:border-white/5">
                              <button onClick={() => navigator.clipboard.writeText(plannerCard?.parameters?.content || '')} className="w-full flex items-center justify-center gap-2 rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-black/20 px-4 py-2.5 text-[12px] font-black text-black dark:text-white hover:bg-neutral-50 dark:hover:bg-white/5 transition-all shadow-sm active:scale-[0.98]">
                                <Copy size={14} /> Copy
                              </button>
                            </div>
                          </>
                        );
                      }

                      /* ── View A: 입력 뷰 ── */
                      const selectedIds = lastDebateResult ? [
                        lastDebateResult.thesis.expertId, lastDebateResult.antithesis.expertId,
                        lastDebateResult.synthesis.expertId, lastDebateResult.support.expertId,
                      ] : [];
                      const roleMap: Record<string, string> = lastDebateResult ? {
                        [lastDebateResult.thesis.expertId]: 'THESIS',
                        [lastDebateResult.antithesis.expertId]: 'ANTITHESIS',
                        [lastDebateResult.synthesis.expertId]: 'SYNTHESIS',
                        [lastDebateResult.support.expertId]: 'SUPPORT',
                      } : {};
                      const sortedExperts = lastDebateResult
                        ? [...PLANNER_EXPERTS.filter(e => selectedIds.includes(e.id)), ...PLANNER_EXPERTS.filter(e => !selectedIds.includes(e.id))]
                        : PLANNER_EXPERTS;

                      return (
                        <>
                          <div className="flex-1 overflow-hidden px-4 pb-0 pt-4 min-h-0 flex flex-col gap-4">
                            {/* PROMPT */}
                            <div className="shrink-0">
                              <div className="flex justify-between items-center mb-1.5">
                                <span className="font-mono text-xs opacity-70 uppercase tracking-widest">Prompt</span>
                                <button onClick={() => navigator.clipboard.writeText(plannerPrompt)} className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-md transition-colors">
                                  <Copy size={14} className="opacity-40" />
                                </button>
                              </div>
                              <textarea
                                value={plannerPrompt}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setPlannerPrompt(e.target.value)}
                                placeholder="Tell me your project, and I'll start the best expert team for you right away."
                                className="w-full h-[130px] resize-none rounded-[12px] border border-black/10 dark:border-white/10 bg-white/50 dark:bg-black/50 p-3 font-mono text-xs focus:outline-none focus:border-black/30 dark:focus:border-white/30"
                              />
                            </div>
                            {/* EXPERTS */}
                            <div className="flex-1 flex flex-col min-h-0">
                              <span className="font-mono text-xs opacity-70 uppercase tracking-widest block mb-3">Experts</span>
                              <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2 custom-scrollbar pb-4">
                                {lastDebateResult && <div className="w-full h-px bg-black/5 dark:bg-white/5 mb-1" />}
                                {sortedExperts.map((expert, idx) => {
                                  const isSelected = selectedIds.includes(expert.id);
                                  const ExpertIcon = PLANNER_ICON_MAP[expert.iconName] ?? Bot;
                                  const showDivider = lastDebateResult && idx === selectedIds.length && idx > 0;
                                  return (
                                    <React.Fragment key={expert.id}>
                                      {showDivider && <div className="w-full h-px bg-black/5 dark:bg-white/5 my-1" />}
                                      <div className={`w-full rounded-full border border-black/10 dark:border-white/10 p-2 flex items-center gap-3 ${isSelected ? 'bg-black/5 dark:bg-white/5' : 'bg-white/40 dark:bg-black/40'}`}>
                                        <div className={`w-8 h-8 rounded-full shrink-0 border border-black/5 dark:border-white/5 flex items-center justify-center ${isSelected ? 'bg-black text-white' : 'bg-white/60 dark:bg-black/60 text-neutral-400'}`}>
                                          <ExpertIcon className="w-3.5 h-3.5" />
                                        </div>
                                        <span className="font-display tracking-[0.04em] uppercase font-medium text-[11px] text-black dark:text-white truncate flex-1">{expert.name}</span>
                                        {isSelected && roleMap[expert.id] && (
                                          <span className="shrink-0 text-[8px] font-black uppercase tracking-[0.1em] bg-black dark:bg-white text-white dark:text-black px-2 py-0.5 rounded-full">{roleMap[expert.id]}</span>
                                        )}
                                      </div>
                                    </React.Fragment>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                          {/* GENERATE */}
                          <div className="px-4 pb-2 pt-4 shrink-0">
                            {isGenerating && analysisStep && (
                              <p className="text-[10px] font-mono text-neutral-400 dark:text-neutral-500 text-center mb-2">{analysisStep}</p>
                            )}
                            <button
                              onClick={handleGenerate}
                              disabled={isGenerating}
                              className="relative w-full h-[44px] rounded-full transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center overflow-hidden border border-black/10 dark:border-white/10 enabled:bg-black enabled:text-white enabled:dark:bg-white enabled:dark:text-black"
                            >
                              <span className="font-display tracking-widest uppercase font-medium text-[16px] z-10">
                                {isGenerating ? <Loader2 size={20} className="animate-spin" /> : 'GENERATE'}
                              </span>
                            </button>
                          </div>
                          {/* COPYRIGHT */}
                          <div className="p-3 shrink-0 flex flex-col items-center gap-1">
                            <p className="font-mono text-[10px] opacity-40 text-center tracking-tighter">© CRETE CO.,LTD. 2026. ALL RIGHTS RESERVED.</p>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </aside>
              </div>

              {/* V217: PRINT Panel */}
              <div className={`
                absolute inset-0 transition-all duration-500 ease-in-out
                ${!isRightPanelOpen
                  ? 'translate-x-10 opacity-0 pointer-events-none'
                  : (isFunctionSelectorOpen || selectedFunction !== 'PRINT')
                    ? 'translate-y-10 opacity-0 pointer-events-none'
                    : 'translate-0 opacity-100 pointer-events-auto'}
              `}>
                <aside className="h-full w-full rounded-[20px] flex flex-col overflow-hidden bg-white/80 dark:bg-black/80 backdrop-blur-sm border border-black/10 dark:border-white/10">
                  <div className="flex flex-col h-full">
                    <div className="flex-1 overflow-hidden px-4 pb-0 pt-4 min-h-0 flex flex-col gap-5">

                      {/* PROMPT SECTION */}
                      <div className="shrink-0">
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="font-mono text-xs opacity-70 uppercase tracking-widest">Prompt</span>
                          <button
                            onClick={() => navigator.clipboard.writeText(printPrompt)}
                            className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-md transition-colors"
                          >
                            <Copy size={14} className="opacity-40" />
                          </button>
                        </div>
                        <textarea
                          value={printPrompt}
                          onChange={e => setPrintPrompt(e.target.value)}
                          placeholder="Tell me your project, and I'll make the best template for you."
                          className="w-full h-[150px] resize-none rounded-[12px] border border-black/10 dark:border-white/10 bg-white/50 dark:bg-black/50 p-3 font-mono text-xs focus:outline-none focus:border-black/30 dark:focus:border-white/30"
                        />
                      </div>

                      {/* TEMPLATE SECTION */}
                      <div className="flex flex-col gap-1.5 text-center">
                        <span className="font-mono text-xs opacity-70 uppercase tracking-widest block mb-1.5 text-left">Template</span>
                        <div className="flex flex-col gap-2">
                          {[
                            'REPORT',
                            'DRAWING & SPECIFICATION',
                            'PANEL',
                            'VIDEO'
                          ].map(template => (
                            <button
                              key={template}
                              onClick={() => setPrintTemplate(prev => prev === template ? '' : template)}
                              className={`w-full h-[44px] rounded-full font-display tracking-widest uppercase font-medium text-[14px] border border-black/10 dark:border-white/10 transition-all flex items-center justify-center
                                ${printTemplate === template
                                  ? 'bg-black/5 dark:bg-white/5 text-black dark:text-white'
                                  : 'bg-white/40 dark:bg-black/40 text-black dark:text-white hover:bg-black/5 dark:hover:bg-white/5'}`}
                            >
                              {template}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* NUMBER OF PAGES SECTION */}
                      <div>
                        <span className="font-mono text-xs opacity-70 uppercase tracking-widest block mb-4">Number of Pages</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setPrintPages(prev => Math.max(1, prev - 1))}
                            className="w-[44px] h-[44px] rounded-[12px] border border-black/10 dark:border-white/10 flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                          >
                            <span className="text-xl font-light">-</span>
                          </button>
                          <div className="flex-1 h-[44px] rounded-[12px] border border-black/10 dark:border-white/10 flex items-center justify-center font-mono text-sm bg-white/30 dark:bg-black/30">
                            {printPages}
                          </div>
                          <button
                            onClick={() => setPrintPages(prev => Math.min(10, prev + 1))}
                            className="w-[44px] h-[44px] rounded-[12px] border border-black/10 dark:border-white/10 flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                          >
                            <span className="text-xl font-light">+</span>
                          </button>
                        </div>
                      </div>

                    </div>

                    <div className="px-4 pb-2 pt-5 shrink-0">
                      <button
                        onClick={handleGenerate}
                        disabled={isGenerating || !printTemplate} // V286 D: TEMPLATE 미선택 시 비활성화
                        className="relative w-full h-[44px] rounded-full transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center overflow-hidden border border-black/10 dark:border-white/10 enabled:bg-black enabled:text-white enabled:dark:bg-white enabled:dark:text-black"
                      >
                        <span className="font-display tracking-widest uppercase font-medium text-[16px] z-10">
                          {isGenerating ? <Loader2 size={20} className="animate-spin" /> : 'GENERATE'}
                        </span>
                      </button>
                    </div>

                    <div className="p-3 mt-auto shrink-0 flex flex-col items-center gap-1">
                      <p className="font-mono text-[10px] opacity-40 text-center tracking-tighter">
                        © CRETE CO.,LTD. 2026. ALL RIGHTS RESERVED.
                      </p>
                    </div>
                  </div>
                </aside>
              </div>

            </div>{/* End Shared Panel Container */}
          </div>{/* End inner flex col */}
        </div>{/* End SIDEBAR WRAPPER outer */}
      </main>
    </div>
  );
}
