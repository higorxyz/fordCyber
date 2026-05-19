"use client";

import { useEffect, useRef } from "react";

export default function GradientCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf: number;
    let t = 0;

    function resize() {
      canvas!.width = window.innerWidth;
      canvas!.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    const blobs = [
      { x: 0.25, y: 0.3, r: 0.45, speed: 0.0003, phase: 0 },
      { x: 0.7, y: 0.65, r: 0.5, speed: 0.00025, phase: 2 },
      { x: 0.5, y: 0.5, r: 0.35, speed: 0.00035, phase: 4 },
    ];

    function draw() {
      t++;
      const w = canvas!.width;
      const h = canvas!.height;

      ctx!.fillStyle = "#000000";
      ctx!.fillRect(0, 0, w, h);

      for (const b of blobs) {
        const cx = w * (b.x + Math.sin(t * b.speed + b.phase) * 0.08);
        const cy = h * (b.y + Math.cos(t * b.speed * 0.7 + b.phase) * 0.06);
        const radius = Math.min(w, h) * b.r;

        const grad = ctx!.createRadialGradient(cx, cy, 0, cx, cy, radius);
        grad.addColorStop(0, "rgba(0, 52, 120, 0.18)");
        grad.addColorStop(0.5, "rgba(0, 104, 214, 0.06)");
        grad.addColorStop(1, "rgba(0, 0, 0, 0)");

        ctx!.fillStyle = grad;
        ctx!.fillRect(0, 0, w, h);
      }

      raf = requestAnimationFrame(draw);
    }

    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}
