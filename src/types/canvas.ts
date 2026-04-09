import { DiscussionResult } from '../lib/plannerGenerate';

export interface CanvasItem {
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
