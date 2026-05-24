/**
 * Confetti — lightweight canvas confetti FX for the EndScene
 * "new best score" celebration. No dependencies.
 *
 * ~80 colored squares fall from above the viewport, each with rotation
 * + horizontal drift + fade-out. Auto-removes itself after the cycle.
 *
 * Usage:
 *   const c = new Confetti();
 *   c.burst();            // fires once, removes self when done
 *
 * Animation is rAF-driven; respects prefers-reduced-motion (no-ops).
 */

import { applyStyle } from './domUtil';

interface Piece {
  x: number;
  y: number;
  size: number;
  rot: number;
  rotSpeed: number;
  vx: number;
  vy: number;
  color: string;
  // Per-piece alpha (begins at 1, fades to 0 in the back-half of cycle).
  alpha: number;
}

const COLORS = [
  '#58cc02', // green
  '#1cb0f6', // blue
  '#ffc800', // yellow
  '#ff4b4b', // red
  '#ce82ff', // purple
  '#ff9600', // orange
];

const DURATION_MS = 2500;
const PIECE_COUNT = 80;

export class Confetti {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null;
  private pieces: Piece[] = [];
  private startedAt = 0;
  private rafId = 0;
  private finished = false;

  constructor() {
    this.canvas = document.createElement('canvas');
    applyStyle(this.canvas, {
      position: 'fixed',
      inset: '0',
      width: '100vw',
      height: '100vh',
      pointerEvents: 'none',
      zIndex: '30',
    });
    this.ctx = this.canvas.getContext('2d');
    document.body.appendChild(this.canvas);
    this.resize();
    window.addEventListener('resize', this.resize);
  }

  burst(): void {
    if (
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      this.cleanup();
      return;
    }
    if (!this.ctx) {
      this.cleanup();
      return;
    }
    const w = this.canvas.width / (window.devicePixelRatio || 1);
    for (let i = 0; i < PIECE_COUNT; i++) {
      this.pieces.push({
        x: Math.random() * w,
        y: -20 - Math.random() * 80,
        size: 6 + Math.random() * 8,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.3,
        vx: (Math.random() - 0.5) * 1.6,
        vy: 2.2 + Math.random() * 2.4,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        alpha: 1,
      });
    }
    this.startedAt = performance.now();
    this.tick();
  }

  destroy(): void {
    this.cleanup();
  }

  private resize = (): void => {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    if (this.ctx) this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  private tick = (): void => {
    if (this.finished || !this.ctx) return;
    const now = performance.now();
    const elapsed = now - this.startedAt;
    const t = elapsed / DURATION_MS;

    const w = this.canvas.width / (window.devicePixelRatio || 1);
    const h = this.canvas.height / (window.devicePixelRatio || 1);

    this.ctx.clearRect(0, 0, w, h);

    // Fade gravity-pulled drift, fade alpha in second half.
    const fadeStart = 0.55;
    for (const p of this.pieces) {
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.rotSpeed;
      if (t > fadeStart) {
        p.alpha = Math.max(0, 1 - (t - fadeStart) / (1 - fadeStart));
      }

      this.ctx.save();
      this.ctx.globalAlpha = p.alpha;
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate(p.rot);
      this.ctx.fillStyle = p.color;
      this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      this.ctx.restore();
    }

    if (elapsed >= DURATION_MS) {
      this.cleanup();
      return;
    }
    this.rafId = requestAnimationFrame(this.tick);
  };

  private cleanup(): void {
    if (this.finished) return;
    this.finished = true;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    window.removeEventListener('resize', this.resize);
    this.canvas.remove();
  }
}
