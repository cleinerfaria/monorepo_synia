import { useEffect, useRef, useState } from 'react';
import { clsx } from 'clsx';

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseVx: number;
  baseVy: number;
  r: number;
  alpha: number;
};

export default function PremiumHeroPanel() {
  const panelRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointsRef = useRef<Particle[]>([]);
  const pointerRef = useRef({ x: 0, y: 0, vx: 0, vy: 0, active: false });
  const sizeRef = useRef({ width: 0, height: 0 });
  const particleFrameRef = useRef<number | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduceMotion(mediaQuery.matches);
    update();

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', update);
      return () => mediaQuery.removeEventListener('change', update);
    }

    mediaQuery.addListener(update);
    return () => mediaQuery.removeListener(update);
  }, []);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel || reduceMotion) {
      pointerRef.current.active = false;
      pointerRef.current.vx = 0;
      pointerRef.current.vy = 0;
      return;
    }

    const handleMove = (event: MouseEvent) => {
      const rect = panel.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const pointer = pointerRef.current;
      pointer.vx = x - pointer.x;
      pointer.vy = y - pointer.y;
      pointer.x = x;
      pointer.y = y;
      pointer.active = true;
    };

    const handleLeave = () => {
      pointerRef.current.active = false;
      pointerRef.current.vx = 0;
      pointerRef.current.vy = 0;
    };

    panel.addEventListener('mousemove', handleMove);
    panel.addEventListener('mouseleave', handleLeave);

    return () => {
      panel.removeEventListener('mousemove', handleMove);
      panel.removeEventListener('mouseleave', handleLeave);
    };
  }, [reduceMotion]);

  const createParticles = (width: number, height: number) => {
    const area = width * height;
    const count = Math.min(360, Math.max(220, Math.floor(area / 2600)));
    const particles: Particle[] = [];

    for (let i = 0; i < count; i += 1) {
      const baseVx = (Math.random() - 0.5) * 0.5;
      const baseVy = (Math.random() - 0.5) * 0.5;
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: baseVx,
        vy: baseVy,
        baseVx,
        baseVy,
        r: 0.6 + Math.random() * 1.8,
        alpha: 0.35 + Math.random() * 0.55,
      });
    }

    pointsRef.current = particles;
  };

  const drawParticles = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.clearRect(0, 0, width, height);
    const color = { r: 56, g: 189, b: 248 };
    const shadow = 'rgba(56,189,248,0.45)';

    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.shadowBlur = 10;
    ctx.shadowColor = shadow;
    const prefix = `rgba(${color.r}, ${color.g}, ${color.b}, `;

    pointsRef.current.forEach((point) => {
      ctx.beginPath();
      ctx.fillStyle = `${prefix}${point.alpha})`;
      ctx.arc(point.x, point.y, point.r, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();
  };

  useEffect(() => {
    const panel = panelRef.current;
    const canvas = canvasRef.current;
    if (!panel || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const rect = panel.getBoundingClientRect();
      const width = Math.max(1, rect.width);
      const height = Math.max(1, rect.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sizeRef.current = { width, height };
      createParticles(width, height);
      if (reduceMotion) {
        drawParticles(ctx, width, height);
      }
    };

    const observer = new ResizeObserver(resize);
    observer.observe(panel);
    resize();

    return () => observer.disconnect();
  }, [reduceMotion]);

  useEffect(() => {
    if (reduceMotion) {
      if (particleFrameRef.current !== null) {
        cancelAnimationFrame(particleFrameRef.current);
        particleFrameRef.current = null;
      }
      pointerRef.current.active = false;
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastTime = performance.now();

    const tick = (time: number) => {
      const delta = Math.min(32, time - lastTime);
      lastTime = time;
      const { width, height } = sizeRef.current;
      if (!width || !height) {
        particleFrameRef.current = requestAnimationFrame(tick);
        return;
      }

      const pointer = pointerRef.current;
      const radius = 140;
      const repelStrength = 0.06;
      const mouseStrength = 0.002;
      const timeScale = delta / 16;

      pointsRef.current.forEach((point) => {
        point.vx += (point.baseVx - point.vx) * 0.02;
        point.vy += (point.baseVy - point.vy) * 0.02;

        if (pointer.active) {
          const dx = point.x - pointer.x;
          const dy = point.y - pointer.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < radius && dist > 0.01) {
            const influence = 1 - dist / radius;
            const repel = influence * repelStrength;
            point.vx += (dx / dist) * repel;
            point.vy += (dy / dist) * repel;
            point.vx += pointer.vx * mouseStrength * influence;
            point.vy += pointer.vy * mouseStrength * influence;
          }
        }

        point.x += point.vx * timeScale;
        point.y += point.vy * timeScale;

        if (point.x < -10) point.x = width + 10;
        if (point.x > width + 10) point.x = -10;
        if (point.y < -10) point.y = height + 10;
        if (point.y > height + 10) point.y = -10;
      });

      drawParticles(ctx, width, height);
      particleFrameRef.current = requestAnimationFrame(tick);
    };

    particleFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (particleFrameRef.current !== null) {
        cancelAnimationFrame(particleFrameRef.current);
        particleFrameRef.current = null;
      }
    };
  }, [reduceMotion]);

  const baseBackground = 'bg-gradient-to-br from-[#05060a] via-[#0b1120] to-[#0f172a]';
  const baseGlow = 'bg-[radial-gradient(circle_at_18%_22%,rgba(56,189,248,0.28),transparent_60%)]';

  const backFill = 'bg-gradient-to-br from-slate-900/80 via-[#0b1220]/80 to-[#1e293b]/70';
  const backGlow = 'bg-[radial-gradient(circle_at_30%_35%,rgba(59,130,246,0.18),transparent_60%)]';

  const midFill = 'bg-gradient-to-tr from-[#0ea5e9]/35 via-[#1d4ed8]/25 to-[#22d3ee]/30';
  const midGlow = 'bg-[radial-gradient(circle_at_70%_40%,rgba(212,175,55,0.2),transparent_60%)]';

  const frontFill = 'bg-gradient-to-br from-white/8 via-slate-400/10 to-[#38bdf8]/15';
  const frontGlow =
    'bg-[radial-gradient(circle_at_55%_65%,rgba(255,255,255,0.08),transparent_60%)]';

  return (
    <div ref={panelRef} className={clsx('relative h-full w-full overflow-hidden', 'bg-[#05060a]')}>
      <div className={clsx('absolute inset-0', baseBackground)} />
      <div className={clsx('absolute inset-0 opacity-80', baseGlow)} />

      <div className="pointer-events-none absolute inset-0">
        <div className={clsx('absolute inset-0 opacity-80', backFill)} />
        <div className={clsx('absolute -inset-20 opacity-50 blur-3xl', backGlow)} />
      </div>

      <div className="pointer-events-none absolute inset-0">
        <div className={clsx('absolute inset-0 opacity-70', midFill)} />
        <div className={clsx('absolute -inset-16 opacity-45 blur-2xl', midGlow)} />
      </div>

      <div className="pointer-events-none absolute inset-0">
        <div className={clsx('absolute inset-0 opacity-60', frontFill)} />
        <div className={clsx('absolute -inset-10 opacity-35 blur-2xl', frontGlow)} />
      </div>

      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 opacity-90" />

      <div className="absolute inset-0 ring-1 ring-white/10" />
    </div>
  );
}
