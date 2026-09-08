"use client";

import React, { useEffect, useRef } from "react";
import type { Star, StarHue, StarfieldCanvasProps } from "./starfield-canvas.types";

export function StarfieldCanvas({
  className = "absolute inset-0 pointer-events-none",
  starCount = 180,
}: StarfieldCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // DPR scaling for razor sharp rendering
    const updateSize = () => {
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    updateSize();

    // Check prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    // Seeded-like random generator for consistent aesthetic density
    let seed = 42;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };

    const hues: StarHue[] = ["cool", "cyan", "white"];

    const stars: Star[] = Array.from({ length: starCount }, () => {
      const hIndex = Math.floor(rand() * 3);
      return {
        x: rand() * width,
        y: rand() * height,
        r: 0.4 + rand() * 1.3,
        v: 2 + rand() * 10,
        p: rand() * Math.PI * 2,
        f: 0.4 + rand() * 1.2,
        hue: hues[hIndex] || "cool",
      };
    });

    let lastTime = performance.now();

    const draw = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];

        if (!prefersReducedMotion) {
          s.x -= s.v * dt;
          if (s.x < -4) {
            s.x = width + 4;
            s.y = Math.random() * height;
          }
        }

        const twinkle = prefersReducedMotion
          ? 0.65
          : 0.22 + 0.72 * Math.abs(Math.sin((now / 1000) * s.f + s.p));

        ctx.globalAlpha = Math.min(1, Math.max(0.1, twinkle));

        if (s.hue === "cyan") {
          ctx.fillStyle = "#6ea8ff";
        } else if (s.hue === "white") {
          ctx.fillStyle = "#ffffff";
        } else {
          ctx.fillStyle = "#dbe7ff";
        }

        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();

        // Add soft glow to larger brighter stars
        if (s.r > 1.2 && twinkle > 0.6) {
          ctx.globalAlpha = twinkle * 0.25;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r * 2.8, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.globalAlpha = 1;
      animationFrameId = requestAnimationFrame(draw);
    };

    animationFrameId = requestAnimationFrame(draw);

    const handleResize = () => {
      updateSize();
    };

    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
    };
  }, [starCount]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={className}
      style={{
        display: "block",
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
      }}
    />
  );
}
