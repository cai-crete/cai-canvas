export interface CanvasItem {
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
