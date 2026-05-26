/**
 * EndOverlay — Duolingo lesson-complete celebration page (v0.5).
 *
 * Layout (top → bottom):
 *   1. "LESSON COMPLETE!" yellow bouncy banner
 *   2. Big mascot scaled 1.8× (uses existing Mascot.ts via setExtraScale)
 *   3. Optional scenario achievement card (only in scenario mode)
 *   4. Stats row: 4 colorful tiles (XP / Accuracy / Time / Best streak)
 *   5. CTA stack: primary "Play again" + secondary "Change mode"
 *
 * Confetti is triggered by EndScene on first paint when score > previous
 * best — this component just lays out + animates the page.
 *
 * DOM-only — Phaser only paints the white background underneath. All
 * lifecycle (mount/destroy) is owned by EndScene.
 */

import { applyStyle } from './domUtil';
import { SCENARIO_META, type ScenarioId } from '../data/scenarios';

export interface EndOverlayOptions {
  dead: boolean;
  score: number;
  rankTitle: string;
  rankColor: string;
  correct: number;
  wrong: number;
  totalAnswered: number;
  bestStreak: number;
  /** Round duration in seconds (sum of run time). */
  totalTimeSeconds: number;
  /** Achievement copy if scenario completed; '' otherwise. */
  achievementText: string;
  newBest: boolean;
  bestScore: number;
  isScenario: boolean;
  scenarioId: ScenarioId | null;
  onPlayAgain: () => void;
  onChangeMode: () => void;
}

// v0.10 — semantic tokens (mirrors --pickup-* in style.css)
const COLOR_GREEN = '#58cc02';
const COLOR_GREEN_DARK = '#58a700';
const COLOR_YELLOW = '#ffc800';
const COLOR_YELLOW_DARK = '#e5b400';
const COLOR_BLUE = '#1cb0f6';
const COLOR_ORANGE = '#ff9600';
const COLOR_RED = '#ff4b4b';
const COLOR_TEXT = '#3d2817';
const COLOR_MUTED = '#8b6f4a';
const COLOR_BORDER = '#ead9bb';
const COLOR_BORDER_DARK = '#d4c098';

// v0.10 — Duolingo-style encouraging summaries.
const COMPLETE_PRAISE = [
  'Picked up another moment',
  'A little stronger today',
  'Keep going like this',
  'Nice · another round done',
  'Your English is settling in',
];
function pickPraise(pool: readonly string[]): string {
  return pool[Math.floor(Math.random() * pool.length)];
}

export class EndOverlay {
  private root: HTMLDivElement;
  private content: HTMLDivElement;
  private mascotSlotEl!: HTMLDivElement;
  private scoreEl!: HTMLDivElement;
  private opts: EndOverlayOptions;

  constructor(opts: EndOverlayOptions) {
    this.opts = opts;

    this.root = document.createElement('div');
    this.root.id = 'end-overlay';
    applyStyle(this.root, {
      position: 'fixed',
      inset: '0',
      // Subtle radial gradient: green tint at top, white at bottom.
      background:
        'radial-gradient(ellipse at top, #e0f5d0 0%, #f4fbe9 35%, #ffffff 75%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start',
      paddingTop: 'max(24px, env(safe-area-inset-top))',
      paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
      overflowY: 'auto',
      zIndex: '20',
      fontFamily:
        '"Nunito", "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      color: COLOR_TEXT,
    });

    this.content = document.createElement('div');
    applyStyle(this.content, {
      width: 'min(420px, calc(100vw - 24px))',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'stretch',
      gap: '14px',
    });
    this.root.appendChild(this.content);

    this.build();
    document.body.appendChild(this.root);
  }

  /** Returns the score number element so EndScene can drive count-up. */
  scoreElement(): HTMLDivElement {
    return this.scoreEl;
  }

  /** Slot for the celebration mascot — EndScene mounts a Mascot here. */
  mascotSlot(): HTMLElement {
    return this.mascotSlotEl;
  }

  destroy(): void {
    this.root.remove();
  }

  // ─── Build ──────────────────────────────────────────────────────────────────

  private build(): void {
    this.content.appendChild(this.makeBanner());

    // Mascot slot — in-flow flex child. EndScene mounts a Mascot here
    // after construction. v0.6: replaces the fixed-position+spacer
    // hack that caused overlap on short viewports.
    this.mascotSlotEl = document.createElement('div');
    applyStyle(this.mascotSlotEl, {
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flex: '0 0 auto',
    });
    this.content.appendChild(this.mascotSlotEl);

    if (this.opts.isScenario && this.opts.scenarioId) {
      this.content.appendChild(this.makeScenarioCard());
    }

    this.content.appendChild(this.makeRank());
    this.content.appendChild(this.makeStatsRow());
    this.content.appendChild(this.makeCtas());
    this.content.appendChild(this.makeFooter());
  }

  private makeBanner(): HTMLElement {
    const wrap = document.createElement('div');
    applyStyle(wrap, {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '4px',
      marginBottom: '4px',
    });

    const banner = document.createElement('div');
    banner.textContent = this.opts.dead ? "So close · don't give up" : 'Round Complete!';
    applyStyle(banner, {
      fontSize: '32px',
      fontWeight: '900',
      letterSpacing: '-0.3px',
      textAlign: 'center',
      color: this.opts.dead ? COLOR_RED : COLOR_YELLOW_DARK,
      textShadow: this.opts.dead
        ? 'none'
        : `0 2px 0 ${COLOR_YELLOW}, 0 4px 12px rgba(255, 200, 0, 0.4)`,
      animation: 'pickup-banner-pop 520ms cubic-bezier(0.34, 1.56, 0.64, 1)',
      padding: '4px 8px',
    });
    wrap.appendChild(banner);

    // Sub-tagline microcopy with character — Duolingo principle 4.
    if (!this.opts.dead) {
      const sub = document.createElement('div');
      sub.textContent = pickPraise(COMPLETE_PRAISE);
      applyStyle(sub, {
        fontSize: '14px',
        fontWeight: '600',
        fontStyle: 'italic',
        color: COLOR_MUTED,
        animation: 'pickup-stat-in 480ms ease-out 280ms both',
        opacity: '0',
      });
      wrap.appendChild(sub);
    }
    return wrap;
  }

  private makeRank(): HTMLElement {
    const rank = document.createElement('div');
    rank.textContent = this.opts.rankTitle;
    applyStyle(rank, {
      fontSize: '16px',
      fontWeight: '800',
      textAlign: 'center',
      color: this.opts.rankColor,
      marginTop: '-4px',
      marginBottom: '4px',
    });
    return rank;
  }

  private makeScenarioCard(): HTMLElement {
    const meta = SCENARIO_META[this.opts.scenarioId!];
    const card = document.createElement('div');
    applyStyle(card, {
      padding: '12px 16px',
      borderRadius: '16px',
      background: meta.tint,
      border: `2px solid ${meta.accent}`,
      borderBottom: `4px solid ${meta.accent}`,
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
      alignItems: 'center',
      animation: 'pickup-stat-in 360ms ease-out both',
      animationDelay: '40ms',
    });

    const head = document.createElement('div');
    head.textContent = meta.labelEn;
    applyStyle(head, {
      fontSize: '15px',
      fontWeight: '800',
      color: meta.accent,
    });
    card.appendChild(head);

    if (this.opts.achievementText) {
      const ach = document.createElement('div');
      ach.textContent = this.opts.achievementText;
      applyStyle(ach, {
        fontSize: '14px',
        fontWeight: '700',
        color: COLOR_TEXT,
        textAlign: 'center',
      });
      card.appendChild(ach);
    }

    const best = document.createElement('div');
    best.textContent = this.opts.newBest
      ? `New best · ${this.opts.bestScore}`
      : `Best ${this.opts.bestScore}`;
    applyStyle(best, {
      fontSize: '12px',
      fontWeight: this.opts.newBest ? '800' : '600',
      color: this.opts.newBest ? COLOR_YELLOW_DARK : COLOR_MUTED,
      fontFamily:
        'ui-monospace, "SFMono-Regular", Consolas, "Liberation Mono", monospace',
    });
    card.appendChild(best);

    return card;
  }

  private makeStatsRow(): HTMLElement {
    const row = document.createElement('div');
    applyStyle(row, {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '8px',
      width: '100%',
    });

    const accuracy =
      this.opts.totalAnswered > 0
        ? Math.round((this.opts.correct / this.opts.totalAnswered) * 100)
        : 0;
    const mins = Math.floor(this.opts.totalTimeSeconds / 60);
    const secs = this.opts.totalTimeSeconds % 60;
    const timeLabel =
      mins > 0 ? `${mins}:${String(secs).padStart(2, '0')}` : `${secs}s`;

    // v0.10 — cascade reveal with larger stagger (100ms between tiles)
    // for dramatic dopamine pacing per Duolingo's UX playbook.
    row.appendChild(
      this.makeStatTile({
        icon: '',
        label: 'XP',
        value: '',
        color: COLOR_YELLOW,
        countUpTo: this.opts.score,
        delayMs: 200,
      })
    );
    row.appendChild(
      this.makeStatTile({
        icon: '',
        label: 'Accuracy',
        value: `${accuracy}%`,
        color: COLOR_GREEN,
        delayMs: 320,
      })
    );
    row.appendChild(
      this.makeStatTile({
        icon: '',
        label: 'Time',
        value: timeLabel,
        color: COLOR_BLUE,
        delayMs: 440,
      })
    );
    row.appendChild(
      this.makeStatTile({
        icon: '',
        label: 'Streak',
        value: String(this.opts.bestStreak),
        color: COLOR_ORANGE,
        delayMs: 560,
      })
    );

    return row;
  }

  private makeStatTile(opts: {
    icon: string;
    label: string;
    value: string;
    color: string;
    countUpTo?: number;
    delayMs: number;
  }): HTMLElement {
    const tile = document.createElement('div');
    applyStyle(tile, {
      padding: '12px 6px',
      borderRadius: '14px',
      background: '#ffffff',
      border: `2px solid ${opts.color}`,
      borderBottom: `4px solid ${opts.color}`,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '4px',
      minWidth: '0',
      animation: 'pickup-stat-in 480ms cubic-bezier(0.34, 1.56, 0.64, 1) both',
      animationDelay: `${opts.delayMs}ms`,
      opacity: '0',
      boxShadow: `0 2px 8px ${opts.color}22`,
    });

    if (opts.icon) {
      const icon = document.createElement('div');
      icon.textContent = opts.icon;
      applyStyle(icon, { fontSize: '20px', lineHeight: '1' });
      tile.appendChild(icon);
    }

    const value = document.createElement('div');
    value.textContent = opts.value;
    applyStyle(value, {
      fontSize: '22px',
      fontWeight: '900',
      color: opts.color,
      lineHeight: '1.05',
      letterSpacing: '-0.3px',
    });
    tile.appendChild(value);

    if (opts.countUpTo !== undefined) {
      // Mark this as the score element so EndScene can drive count-up.
      this.scoreEl = value;
      value.textContent = '0';
    }

    const label = document.createElement('div');
    label.textContent = opts.label;
    applyStyle(label, {
      fontSize: '10px',
      fontWeight: '800',
      color: COLOR_MUTED,
      letterSpacing: '0.5px',
      textTransform: 'uppercase',
    });
    tile.appendChild(label);

    return tile;
  }

  private makeCtas(): HTMLElement {
    const wrap = document.createElement('div');
    applyStyle(wrap, {
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      marginTop: '4px',
    });

    const primary = this.makeCtaButton({
      text: 'Play again →',
      bg: COLOR_GREEN,
      bgDark: COLOR_GREEN_DARK,
      color: '#ffffff',
      onClick: () => this.opts.onPlayAgain(),
      pulse: true,
    });
    wrap.appendChild(primary);

    const secondary = this.makeCtaButton({
      text: this.opts.isScenario ? 'Try another scenario' : 'Change mode',
      bg: '#ffffff',
      bgDark: COLOR_BORDER_DARK,
      color: COLOR_MUTED,
      bordered: true,
      onClick: () => this.opts.onChangeMode(),
    });
    wrap.appendChild(secondary);

    return wrap;
  }

  private makeCtaButton(opts: {
    text: string;
    bg: string;
    bgDark: string;
    color: string;
    bordered?: boolean;
    onClick: () => void;
    pulse?: boolean;
  }): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = opts.text;
    applyStyle(btn, {
      width: '100%',
      minHeight: '52px',
      padding: '15px 18px',
      borderRadius: '14px',
      border: opts.bordered ? `2px solid ${COLOR_BORDER}` : 'none',
      borderBottom: `4px solid ${opts.bgDark}`,
      background: opts.bg,
      color: opts.color,
      fontSize: '17px',
      fontWeight: '900',
      letterSpacing: '0.4px',
      cursor: 'pointer',
      fontFamily: 'inherit',
      touchAction: 'manipulation',
      WebkitTapHighlightColor: 'transparent',
      transition: 'transform 100ms cubic-bezier(0.2, 0.8, 0.4, 1), box-shadow 200ms ease-out',
    });
    if (opts.pulse) {
      // Primary CTA gets attention-grabbing pulse — Duolingo principle 2.
      btn.classList.add('pickup-pulse');
    }
    btn.addEventListener('pointerdown', () => {
      btn.style.transform = 'translateY(2px)';
      btn.style.borderBottomWidth = '2px';
    });
    const release = () => {
      btn.style.transform = '';
      btn.style.borderBottomWidth = '4px';
    };
    btn.addEventListener('pointerup', release);
    btn.addEventListener('pointerleave', release);
    btn.addEventListener('pointercancel', release);
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      opts.onClick();
    });
    return btn;
  }

  private makeFooter(): HTMLElement {
    const footer = document.createElement('div');
    footer.textContent = 'v1.2.0';
    applyStyle(footer, {
      marginTop: '12px',
      fontSize: '11px',
      color: '#a8a2b3',
      textAlign: 'center',
      fontFamily:
        'ui-monospace, "SFMono-Regular", Consolas, "Liberation Mono", monospace',
    });
    return footer;
  }
}
