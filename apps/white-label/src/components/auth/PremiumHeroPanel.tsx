import { CSSProperties, useCallback, useEffect, useRef, useState } from 'react';
import { clsx } from 'clsx';
import { getCssVarRgbTuple, toRgba } from '@/lib/themeColors';
import { DEFAULT_COMPANY_COLOR } from '@/lib/themeConstants';

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

interface PremiumHeroPanelProps {
  basicColor?: string;
}

function clampChannel(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function hexToRgbTuple(hex: string): [number, number, number] | null {
  const normalized = hex.replace('#', '').trim();
  if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(normalized)) return null;
  const expanded =
    normalized.length === 3
      ? normalized
          .split('')
          .map((char) => `${char}${char}`)
          .join('')
      : normalized;
  const r = parseInt(expanded.slice(0, 2), 16);
  const g = parseInt(expanded.slice(2, 4), 16);
  const b = parseInt(expanded.slice(4, 6), 16);
  return [r, g, b];
}

function parseRgbTuple(value: string): [number, number, number] | null {
  const cleaned = value.replace(/rgb\(/i, '').replace(/\)/g, '').replace(/\//g, ' ').trim();
  const parts = cleaned.split(/[\s,]+/).filter(Boolean);
  if (parts.length < 3) return null;

  const [r, g, b] = parts.slice(0, 3).map((part) => Number(part));
  if ([r, g, b].some((channel) => Number.isNaN(channel))) return null;
  return [Math.round(r), Math.round(g), Math.round(b)];
}

function mixRgb(
  from: [number, number, number],
  to: [number, number, number],
  amount: number
): [number, number, number] {
  const ratio = Math.max(0, Math.min(1, amount));
  return [
    clampChannel(from[0] + (to[0] - from[0]) * ratio),
    clampChannel(from[1] + (to[1] - from[1]) * ratio),
    clampChannel(from[2] + (to[2] - from[2]) * ratio),
  ];
}

function rgbToTupleCss(tuple: [number, number, number]): string {
  return `${tuple[0]} ${tuple[1]} ${tuple[2]}`;
}

export default function PremiumHeroPanel({ basicColor }: PremiumHeroPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointsRef = useRef<Particle[]>([]);
  const pointerRef = useRef({ x: 0, y: 0, vx: 0, vy: 0, active: false });
  const sizeRef = useRef({ width: 0, height: 0 });
  const particleFrameRef = useRef<number | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const fallbackPrimaryTuple = getCssVarRgbTuple('--color-primary-400', DEFAULT_COMPANY_COLOR);
  const configuredTuple = parseRgbTuple(basicColor || '') || hexToRgbTuple(basicColor || '');
  const primaryTuple = configuredTuple || fallbackPrimaryTuple;
  const [primaryR, primaryG, primaryB] = primaryTuple;
  const deepTuple = mixRgb(primaryTuple, [0, 0, 0], 0.88);
  const midTuple = mixRgb(primaryTuple, [0, 0, 0], 0.8);
  const surfaceTuple = mixRgb(primaryTuple, [0, 0, 0], 0.72);
  const glowTuple = mixRgb(primaryTuple, [255, 255, 255], 0.12);
  const starTuple = mixRgb(primaryTuple, [255, 255, 255], 0.48);

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
  }, [reduceMotion, primaryR, primaryG, primaryB]);

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

  const drawParticles = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      ctx.clearRect(0, 0, width, height);
      const shadow = toRgba(`rgb(${starTuple[0]} ${starTuple[1]} ${starTuple[2]})`, 0.36);

      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      ctx.shadowBlur = 10;
      ctx.shadowColor = shadow;
      const prefix = `rgba(${starTuple[0]}, ${starTuple[1]}, ${starTuple[2]}, `;

      pointsRef.current.forEach((point) => {
        ctx.beginPath();
        ctx.fillStyle = `${prefix}${point.alpha})`;
        ctx.arc(point.x, point.y, point.r, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.restore();
    },
    [starTuple]
  );

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
  }, [reduceMotion, primaryR, primaryG, primaryB, drawParticles]);

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
  }, [reduceMotion, drawParticles]);

  return (
    <div
      ref={panelRef}
      className={clsx('relative h-full w-full overflow-hidden')}
      style={
        {
          '--login-hero-base-rgb': rgbToTupleCss(primaryTuple),
          '--login-hero-deep-rgb': rgbToTupleCss(deepTuple),
          '--login-hero-mid-rgb': rgbToTupleCss(midTuple),
          '--login-hero-surface-rgb': rgbToTupleCss(surfaceTuple),
          '--login-hero-glow-rgb': rgbToTupleCss(glowTuple),
          '--login-hero-star-rgb': rgbToTupleCss(starTuple),
          backgroundImage: [
            'linear-gradient(170deg, rgb(var(--login-hero-surface-rgb)) 0%, rgb(var(--login-hero-mid-rgb)) 40%, rgb(var(--login-hero-deep-rgb)) 100%)',
            'radial-gradient(130% 90% at 16% 12%, rgb(var(--login-hero-glow-rgb) / 0.18) 0%, transparent 55%)',
            'radial-gradient(120% 90% at 82% 84%, rgb(var(--login-hero-base-rgb) / 0.1) 0%, transparent 62%)',
          ].join(','),
        } as CSSProperties
      }
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(95% 65% at 52% 44%, rgb(var(--login-hero-base-rgb) / 0.08) 0%, transparent 68%)',
        }}
      />

      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 opacity-90" />

      <div
        className="absolute inset-0"
        style={{
          boxShadow: 'inset 0 0 0 1px rgb(var(--login-hero-star-rgb) / 0.16)',
        }}
      />
    </div>
  );
}
