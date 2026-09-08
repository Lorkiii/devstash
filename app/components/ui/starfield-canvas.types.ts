export type StarHue = "cool" | "cyan" | "white";

export interface Star {
  x: number;
  y: number;
  r: number;
  v: number;
  p: number;
  f: number;
  hue: StarHue;
}

export interface StarfieldCanvasProps {
  className?: string;
  starCount?: number;
}
