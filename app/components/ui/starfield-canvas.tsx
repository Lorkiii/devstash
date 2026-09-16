"use client";

import React, { useEffect, useRef } from "react";
import { useTheme } from "@/app/components/theme/theme-provider";
import { THEME_STARFIELD_COLORS } from "@/app/lib/theme";
import type {
  OrbitLayer,
  Star,
  StarHue,
  StarfieldCanvasProps,
} from "./starfield-canvas.types";

const ORBIT_LAYERS: readonly OrbitLayer[] = [
  {
    depth: "far",
    glowScale: 0,
    minRadius: 0.35,
    maxRadius: 0.8,
    minOpacity: 0.28,
    maxOpacity: 0.5,
    minSpeed: 0.006,
    maxSpeed: 0.012,
  },
  {
    depth: "middle",
    glowScale: 2.6,
    minRadius: 0.7,
    maxRadius: 1.3,
    minOpacity: 0.46,
    maxOpacity: 0.76,
    minSpeed: 0.012,
    maxSpeed: 0.022,
  },
  {
    depth: "near",
    glowScale: 3.4,
    minRadius: 1.15,
    maxRadius: 1.8,
    minOpacity: 0.7,
    maxOpacity: 0.96,
    minSpeed: 0.022,
    maxSpeed: 0.035,
  },
];

const getOrbitLayer = (roll: number) => {
  if (roll < 0.55) return ORBIT_LAYERS[0];
  if (roll < 0.9) return ORBIT_LAYERS[1];
  return ORBIT_LAYERS[2];
};

const interpolate = (minimum: number, maximum: number, amount: number) =>
  minimum + (maximum - minimum) * amount;

const REDUCED_ORBIT_SPEED_SCALE = 0.5;

export function StarfieldCanvas({
  className = "absolute inset-0 pointer-events-none",
  starCount = 180,
  motion = "drift",
}: StarfieldCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;
    const colors = THEME_STARFIELD_COLORS[theme];

    let animationFrameId: number | null = null;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Orbit geometry mirrors the planet dome in orbital-horizon.tsx: a
    // 2400x1800px ellipse pinned at bottom:-1500px, so its center sits 600px
    // below the viewport bottom. Keep these in sync if the dome changes.
    let orbitCenterX = 0;
    let orbitCenterY = 0;
    let minOrbitRadius = 0;
    let maxOrbitRadius = 0;

    // DPR scaling for razor sharp rendering
    const updateSize = () => {
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      orbitCenterX = width / 2;
      orbitCenterY = height + 600;
      minOrbitRadius = 950; // just clears the horizon at screen center
      maxOrbitRadius = Math.hypot(width / 2, height + 600) + 40;
    };

    updateSize();

    const motionPreference = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );
    let prefersReducedMotion = motionPreference.matches;

    // Seeded-like random generator for consistent aesthetic density
    let seed = 42;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };

    const hues: StarHue[] = ["cool", "cyan", "white"];

    const stars: Star[] = Array.from({ length: starCount }, () => {
      const hIndex = Math.floor(rand() * 3);
      const star: Star = {
        x: rand() * width,
        y: rand() * height,
        r: 0.4 + rand() * 1.3,
        v: 2 + rand() * 10,
        p: rand() * Math.PI * 2,
        f: 0.4 + rand() * 1.2,
        hue: hues[hIndex] || "cool",
      };

      if (motion === "orbit") {
        const layer = getOrbitLayer(rand());

        star.depth = layer.depth;
        star.r = interpolate(layer.minRadius, layer.maxRadius, rand());
        star.baseOpacity = interpolate(
          layer.minOpacity,
          layer.maxOpacity,
          rand()
        );
        star.glowScale = layer.glowScale;
        star.angle = rand() * Math.PI * 2;
        star.radiusT = rand();
        // Negative angular velocity sweeps leftward across the sky. Layered
        // speeds create depth while keeping the movement calm behind content.
        star.angularSpeed = -interpolate(
          layer.minSpeed,
          layer.maxSpeed,
          rand()
        );
      }

      return star;
    });

    const positionOrbitStar = (star: Star) => {
      if (star.angle === undefined || star.radiusT === undefined) return;

      const orbitRadius =
        minOrbitRadius + star.radiusT * (maxOrbitRadius - minOrbitRadius);
      star.x = orbitCenterX + Math.cos(star.angle) * orbitRadius;
      star.y = orbitCenterY + Math.sin(star.angle) * orbitRadius;
    };

    if (motion === "orbit") {
      stars.forEach(positionOrbitStar);
    }

    const isMotionEnabled = () =>
      motion === "orbit" || !prefersReducedMotion;

    let lastTime = performance.now();

    const draw = (now: number, scheduleNextFrame = true) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];

        if (motion === "orbit") {
          if (
            s.angle !== undefined &&
            s.angularSpeed !== undefined
          ) {
            const speedScale = prefersReducedMotion
              ? REDUCED_ORBIT_SPEED_SCALE
              : 1;
            s.angle += s.angularSpeed * speedScale * dt;
          }
          positionOrbitStar(s);
        } else if (!prefersReducedMotion) {
          s.x -= s.v * dt;
          if (s.x < -4) {
            s.x = width + 4;
            s.y = Math.random() * height;
          }
        }

        const pulse = Math.abs(Math.sin((now / 1000) * s.f + s.p));
        const twinkle = prefersReducedMotion
          ? motion === "orbit"
            ? (s.baseOpacity ?? 0.65)
            : 0.65
          : motion === "orbit"
            ? (s.baseOpacity ?? 0.65) *
              (s.depth === "far" ? 0.82 + pulse * 0.18 : 0.62 + pulse * 0.38)
            : 0.22 + 0.72 * pulse;

        const themeOpacity = theme === "light" ? 0.46 : 1;
        ctx.globalAlpha = Math.min(1, Math.max(0.08, twinkle * themeOpacity));

        if (s.hue === "cyan") {
          ctx.fillStyle = colors.cyan;
        } else if (s.hue === "white") {
          ctx.fillStyle = colors.white;
        } else {
          ctx.fillStyle = colors.cool;
        }

        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();

        const glowScale =
          motion === "orbit" ? (s.glowScale ?? 0) : s.r > 1.2 ? 2.8 : 0;

        if (glowScale > 0 && twinkle > 0.55) {
          ctx.globalAlpha = twinkle * (s.depth === "near" ? 0.28 : 0.18);
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r * glowScale, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.globalAlpha = 1;

      if (scheduleNextFrame && isMotionEnabled()) {
        animationFrameId = requestAnimationFrame(draw);
      } else {
        animationFrameId = null;
      }
    };

    const startAnimation = () => {
      if (animationFrameId !== null || !isMotionEnabled()) return;

      lastTime = performance.now();
      animationFrameId = requestAnimationFrame(draw);
    };

    const drawStaticFrame = () => {
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }

      lastTime = performance.now();
      draw(lastTime, false);
    };

    if (isMotionEnabled()) {
      startAnimation();
    } else {
      drawStaticFrame();
    }

    const handleResize = () => {
      updateSize();

      if (motion === "orbit") {
        stars.forEach(positionOrbitStar);
      }

      if (!isMotionEnabled()) {
        drawStaticFrame();
      }
    };

    const handleMotionPreferenceChange = (event: MediaQueryListEvent) => {
      prefersReducedMotion = event.matches;

      if (isMotionEnabled()) {
        startAnimation();
      } else {
        drawStaticFrame();
      }
    };

    window.addEventListener("resize", handleResize);
    motionPreference.addEventListener("change", handleMotionPreferenceChange);

    return () => {
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
      window.removeEventListener("resize", handleResize);
      motionPreference.removeEventListener(
        "change",
        handleMotionPreferenceChange
      );
    };
  }, [starCount, motion, theme]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`block size-full ${className}`}
    />
  );
}
