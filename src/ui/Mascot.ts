/**
 * Mascot — DOM overlay that renders the current NPC SVG and switches
 * between idle / happy / sad animation states via CSS classes.
 *
 * v0.4: positioning re-anchored to sit centered horizontally and
 * vertically aligned to where GameHUD draws the colored halo circle.
 *
 * v0.5: responsive scale-down on short viewports. On phones with
 * limited vertical space (iPhone SE ~600px effective, address bar
 * visible) the 180px mascot was overlapping the sentence card. A
 * shared ResizeObserver watches the document body and writes a CSS
 * variable --mascot-scale that the mascot's width/height reference.
 *
 *   innerHeight >= 720   → scale 1.00 (160 × 180)
 *   innerHeight >= 620   → scale 0.75 (120 × 135)
 *   innerHeight <  620   → scale 0.60 ( 96 × 108)
 *
 * CSS animations only — no requestAnimationFrame loops. Idle bobs
 * continuously, happy/sad are one-shot then auto-revert to idle.
 */

import { applyStyle } from './domUtil';
import { getMascotSvg, type MascotAnim } from './mascots';

const ONE_SHOT_MS = 700;

// ─── Shared responsive scale watcher ─────────────────────────────────────────
// One observer for the whole app. Instances subscribe; observer disconnects
// itself when the last subscriber leaves. Re-attaches on next subscription.

type ScaleListener = (scale: number) => void;

let scaleObserver: ResizeObserver | null = null;
let scaleWindowListener: (() => void) | null = null;
const scaleListeners = new Set<ScaleListener>();
let currentScale = computeScale();

function computeScale(): number {
  if (typeof window === 'undefined') return 1;
  const h = window.innerHeight;
  if (h < 620) return 0.6;
  if (h < 720) return 0.75;
  return 1;
}

function recomputeAndBroadcast(): void {
  const next = computeScale();
  if (next === currentScale) return;
  currentScale = next;
  scaleListeners.forEach((cb) => cb(next));
}

function subscribeScale(cb: ScaleListener): () => void {
  scaleListeners.add(cb);
  cb(currentScale);
  if (scaleListeners.size === 1 && typeof window !== 'undefined') {
    if (typeof ResizeObserver !== 'undefined') {
      scaleObserver = new ResizeObserver(() => recomputeAndBroadcast());
      scaleObserver.observe(document.documentElement);
    }
    scaleWindowListener = () => recomputeAndBroadcast();
    window.addEventListener('resize', scaleWindowListener);
    window.addEventListener('orientationchange', scaleWindowListener);
  }
  return () => {
    scaleListeners.delete(cb);
    if (scaleListeners.size === 0) {
      if (scaleObserver) {
        scaleObserver.disconnect();
        scaleObserver = null;
      }
      if (scaleWindowListener && typeof window !== 'undefined') {
        window.removeEventListener('resize', scaleWindowListener);
        window.removeEventListener('orientationchange', scaleWindowListener);
        scaleWindowListener = null;
      }
    }
  };
}

// ─── Mascot ─────────────────────────────────────────────────────────────────

export class Mascot {
  private root: HTMLDivElement;
  private inner: HTMLDivElement;
  private currentMascot = '';
  private oneShotTimer?: number;
  private unsubScale?: () => void;
  /** Optional multiplier on top of the responsive viewport scale. */
  private extraScale = 1;
  /** Last responsive scale seen (cached for re-application on extraScale changes). */
  private viewportScale = currentScale;

  constructor() {
    this.root = document.createElement('div');
    this.root.id = 'wordwar-mascot';
    // Position over the GameHUD halo. The HUD has, from top:
    //   header (~56px tall + ~12px top margin)
    //   chip (only in scenario mode, ~28px tall + ~4px gap)
    //   halo (180px tall + ~14px top margin)
    // We center the mascot vertically within the halo. With safe-area
    // and either header height, ~120px from top is a good baseline; the
    // setScenarioStripVisible adjusts for the chip's extra ~36px.
    applyStyle(this.root, {
      position: 'fixed',
      top: 'calc(80px + max(0px, env(safe-area-inset-top)))',
      left: '50%',
      // Width/height inherit from CSS var so changes flow through.
      width: 'calc(160px * var(--mascot-scale, 1))',
      height: 'calc(180px * var(--mascot-scale, 1))',
      // Center horizontally — translateX(-50%) compensates for fixed width.
      transform: 'translateX(-50%)',
      pointerEvents: 'none',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: '11',
      transition: 'width 200ms ease-out, height 200ms ease-out',
    });

    this.inner = document.createElement('div');
    this.inner.className = 'mascot-wrap mascot-idle';
    applyStyle(this.inner, {
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    });
    this.root.appendChild(this.inner);

    document.body.appendChild(this.root);

    // Subscribe to viewport scale changes — recompute the CSS variable
    // on the document root so other consumers (EndOverlay scaled mascot)
    // can opt-in too via the same var.
    this.unsubScale = subscribeScale((s) => {
      this.viewportScale = s;
      this.applyScale();
    });
  }

  setScenarioStripVisible(visible: boolean): void {
    // When scenario chip is present, push mascot down by ~36px.
    this.root.style.top = visible
      ? 'calc(116px + max(0px, env(safe-area-inset-top)))'
      : 'calc(80px + max(0px, env(safe-area-inset-top)))';
  }

  setMascot(mascotId: string): void {
    if (mascotId === this.currentMascot) return;
    this.currentMascot = mascotId;
    this.inner.innerHTML = getMascotSvg(mascotId);
  }

  setAnim(anim: MascotAnim): void {
    this.clearOneShot();
    this.inner.classList.remove('mascot-idle', 'mascot-happy', 'mascot-sad');
    this.inner.classList.add(`mascot-${anim}`);
    if (anim !== 'idle') {
      this.oneShotTimer = window.setTimeout(() => {
        this.setAnim('idle');
      }, ONE_SHOT_MS);
    }
  }

  /**
   * Apply an additional scale multiplier on top of the responsive viewport
   * scale — used by EndOverlay to render a larger celebration mascot.
   */
  setExtraScale(s: number): void {
    this.extraScale = s;
    this.applyScale();
  }

  destroy(): void {
    this.clearOneShot();
    this.unsubScale?.();
    this.unsubScale = undefined;
    this.root.remove();
  }

  show(): void {
    this.root.style.display = 'flex';
  }

  hide(): void {
    this.root.style.display = 'none';
  }

  private applyScale(): void {
    const total = this.viewportScale * this.extraScale;
    this.root.style.setProperty('--mascot-scale', String(total));
  }

  private clearOneShot(): void {
    if (this.oneShotTimer !== undefined) {
      window.clearTimeout(this.oneShotTimer);
      this.oneShotTimer = undefined;
    }
  }
}
