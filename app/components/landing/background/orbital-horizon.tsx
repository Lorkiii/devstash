import React from "react";

export function OrbitalHorizon() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden select-none"
    >
      {/* Planetary Horizon Sphere Curve */}
      <div
        className="absolute left-1/2 -translate-x-1/2 rounded-[50%] transition-transform duration-1000"
        style={{
          bottom: "-1500px",
          width: "2400px",
          height: "1800px",
          background: "radial-gradient(ellipse at 50% 0%, #0c182c 0%, #070c16 45%, #05070d 85%)",
          borderTop: "1px solid rgba(110, 168, 255, 0.45)",
          boxShadow: "0 -40px 160px rgba(110, 168, 255, 0.2), inset 0 2px 30px rgba(110, 168, 255, 0.12)",
        }}
      />

      {/* Atmospheric Starlight Diffuse Bloom */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 pointer-events-none opacity-60"
        style={{
          background: "radial-gradient(ellipse 60% 50% at 50% 100%, rgba(110, 168, 255, 0.18), transparent 70%)",
        }}
      />

      {/* Top Subtle Vignette */}
      <div
        className="absolute top-0 left-0 right-0 h-40 pointer-events-none"
        style={{
          background: "linear-gradient(to bottom, rgba(5, 7, 13, 0.8) 0%, transparent 100%)",
        }}
      />
    </div>
  );
}
