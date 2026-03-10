'use client';

import { useEffect, useRef } from 'react';

export function HeroGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const GRID_SIZE = 60;
    let frame = 0;
    let animId: number;

    const draw = () => {
      const W = canvas.width;
      const H = canvas.height;
      const VANISH_X = W / 2;
      const VANISH_Y = H * 0.4;

      ctx.clearRect(0, 0, W, H);
      frame++;

      const offset = (frame * 0.5) % GRID_SIZE;

      // 水平線（透視投影）
      for (let y = VANISH_Y; y < H + GRID_SIZE; y += GRID_SIZE) {
        const progress = (y - VANISH_Y) / (H - VANISH_Y);
        const alpha = Math.min(progress * 0.3, 0.25);
        ctx.strokeStyle = `rgba(0, 212, 255, ${alpha})`;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(0, y + offset * progress);
        ctx.lineTo(W, y + offset * progress);
        ctx.stroke();
      }

      // 縦線（透視投影）
      const NUM_LINES = 20;
      for (let i = 0; i <= NUM_LINES; i++) {
        const x = (W / NUM_LINES) * i;
        const alpha = 0.08 + Math.abs(Math.sin(frame * 0.01 + i * 0.3)) * 0.08;
        ctx.strokeStyle = `rgba(0, 212, 255, ${alpha})`;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(VANISH_X + (x - VANISH_X) * 0.1, VANISH_Y);
        ctx.lineTo(x, H);
        ctx.stroke();
      }

      animId = requestAnimationFrame(draw);
    };

    animId = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
}
