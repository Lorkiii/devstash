import React from "react";

export function OrbitalHorizon() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden select-none"
    >
      {/* Planetary Horizon Sphere Curve */}
      <div
        className="orbital-horizon-sphere absolute left-1/2 -translate-x-1/2 rounded-[50%] transition-transform duration-1000"
      />

      {/* Atmospheric Starlight Diffuse Bloom */}
      <div
        className="orbital-horizon-bloom absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 pointer-events-none opacity-60"
      />

      {/* Top Subtle Vignette */}
      <div
        className="orbital-top-vignette absolute top-0 left-0 right-0 h-40 pointer-events-none"
      />
    </div>
  );
}
