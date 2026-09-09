export type StarHue = "cool" | "cyan" | "white";

export type StarfieldMotion = "drift" | "orbit";

export interface Star {
  x: number;
  y: number;
  r: number;
  v: number;
  p: number;
  f: number;
  hue: StarHue;
  angle?: number;
  radiusT?: number;
  angularSpeed?: number;
}

export interface StarfieldCanvasProps {
  className?: string;
  starCount?: number;
  motion?: StarfieldMotion;
}
