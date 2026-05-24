/**
 * Mascot — DOM overlay that renders the current NPC SVG and switches
 * between idle / happy / sad animation states via CSS classes.
 *
 * v0.4: positioning re-anchored to sit centered horizontally and
 * vertically aligned to where GameHUD draws the colored halo circle.
 * GameHUD's halo is in the document flow (top → chip → halo → card);
 * the mascot is fixed-positioned and visually overlays the halo.
 *
 * CSS animations only — no requestAnimationFrame loops. Idle bobs
 * continuously, happy/sad are one-shot then auto-revert to idle.
 */

import { applyStyle } from './domUtil';
import { getMascotSvg, type MascotAnim } from './mascots';

const ONE_SHOT_MS = 700;

export class Mascot {
  private root: HTMLDivElement;
  private inner: HTMLDivElement;
  private currentMascot = '';
  private oneShotTimer?: number;

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
      transform: 'translateX(-50%)',
      width: '160px',
      height: '180px',
      pointerEvents: 'none',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: '11',
    });

    this.inner = document.createElement('div');
    this.inner.className = 'mascot-wrap mascot-idle';
    applyStyle(this.inner, {
      width: '140px',
      height: '160px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    });
    this.root.appendChild(this.inner);

    document.body.appendChild(this.root);
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

  destroy(): void {
    this.clearOneShot();
    this.root.remove();
  }

  show(): void {
    this.root.style.display = 'flex';
  }

  hide(): void {
    this.root.style.display = 'none';
  }

  private clearOneShot(): void {
    if (this.oneShotTimer !== undefined) {
      window.clearTimeout(this.oneShotTimer);
      this.oneShotTimer = undefined;
    }
  }
}
