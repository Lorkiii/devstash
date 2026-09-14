export type StarHue = "cool" | "cyan" | "white";

export type StarDepth = "far" | "middle" | "near";

export type StarfieldMotion = "drift" | "orbit";

export interface OrbitLayer {
  depth: StarDepth;
  glowScale: number;
  maxOpacity: number;
  maxRadius: number;
  maxSpeed: number;
  minOpacity: number;
  minRadius: number;
  minSpeed: number;
}

export interface Star {
  x: number;
  y: number;
  r: number;
  v: number;
  p: number;
  f: number;
  hue: StarHue;
  depth?: StarDepth;
  baseOpacity?: number;
  glowScale?: number;
  angle?: number;
  radiusT?: number;
  angularSpeed?: number;
}

export interface StarfieldCanvasProps {
  className?: string;
  starCount?: number;
  motion?: StarfieldMotion;
}
