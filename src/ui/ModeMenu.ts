/**
 * ModeMenu — top-level menu (v0.4 Duolingo aesthetic).
 *
 * UX flow:
 *   1. Mode selection: two big Duolingo-style cards
 *      🎯 自由練習 (Free Practice) — 10 random A2 questions
 *      🎬 情境模式 (Scenario Mode) — pick a scenario
 *   2a. Free Practice → starts immediately
 *   2b. Scenario → second screen with 5 scenario cards
 *
 * Aesthetic: white bg, bold rounded sans-serif, white card buttons
 * with 2px border + 4px bottom border (Duolingo 3D depth).
 */

import { applyStyle } from './domUtil';
import {
  SCENARIO_META,
  SCENARIOS_IN_ORDER,
  readBestScore,
  isScenarioCompleted,
  type ScenarioId,
} from '../data/scenarios';
import { useRunStore } from '../store/runStore';
import type { Difficulty } from '../data/sentences';

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
};

export interface ModeMenuHandlers {
  onStartStory: () => void;
  onStartFree: () => void;
  onStartScenario: (id: ScenarioId) => void;
}

const LS_INTRO_DISMISSED = 'wordwar.introDismissed';

// v0.10 — semantic tokens mirror --pickup-* in style.css
const COLOR_GREEN = '#58cc02';
const COLOR_GREEN_DARK = '#58a700';
const COLOR_BLUE = '#1cb0f6';
const COLOR_BLUE_DARK = '#0b8ec9';
const COLOR_YELLOW = '#ffc800';
const COLOR_AMBER = '#e7a44a';
const COLOR_AMBER_DARK = '#b07a2a';
const COLOR_CREAM = '#fef8ed';
const COLOR_BORDER = '#ead9bb';
const COLOR_BORDER_DARK = '#d4c098';
const COLOR_TEXT_DARK = '#3d2817';
const COLOR_TEXT_MUTED = '#8b6f4a';

export class ModeMenu {
  private root: HTMLDivElement;
  private content: HTMLDivElement;
  private handlers: ModeMenuHandlers;

  constructor(handlers: ModeMenuHandlers) {
    this.handlers = handlers;

    this.root = document.createElement('div');
    this.root.id = 'mode-menu';
    applyStyle(this.root, {
      position: 'fixed',
      inset: '0',
      background: COLOR_CREAM,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start',
      paddingTop: 'max(36px, env(safe-area-inset-top))',
      paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
      overflowY: 'auto',
      zIndex: '20',
      fontFamily:
        '"Nunito", "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      color: COLOR_TEXT_DARK,
    });

    this.content = document.createElement('div');
    applyStyle(this.content, {
      width: 'min(420px, calc(100vw - 32px))',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'stretch',
    });
    this.root.appendChild(this.content);

    document.body.appendChild(this.root);
    this.renderModeView();
  }

  destroy(): void {
    this.root.remove();
  }

  // ─── Mode view ────────────────────────────────────────────────────────────

  private renderModeView(): void {
    this.content.innerHTML = '';

    const title = document.createElement('div');
    title.textContent = 'Pickup';
    applyStyle(title, {
      fontSize: '32px',
      fontWeight: '900',
      textAlign: 'center',
      color: COLOR_AMBER,
      letterSpacing: '-0.5px',
      marginBottom: '2px',
      textShadow: `0 2px 0 ${COLOR_AMBER_DARK}`,
    });
    this.content.appendChild(title);

    const subtitle = document.createElement('div');
    subtitle.textContent = 'Pick up moments. Learn English.';
    applyStyle(subtitle, {
      fontSize: '14px',
      fontWeight: '600',
      fontStyle: 'italic',
      color: COLOR_TEXT_MUTED,
      textAlign: 'center',
      marginBottom: '24px',
      letterSpacing: '0.4px',
    });
    this.content.appendChild(subtitle);

    if (!this.introDismissed()) {
      this.content.appendChild(this.makeIntroCard());
    }

    // v1.7.0: difficulty picker, relocated from the deleted BootScene
    // splash. Stays compact + collapsed by default. Sits above the
    // primary Story card so first-time players see it before picking
    // a mode.
    this.content.appendChild(this.makeDifficultyPill());

    const chooseLabel = document.createElement('div');
    chooseLabel.textContent = 'Choose a mode';
    applyStyle(chooseLabel, {
      fontSize: '12px',
      color: COLOR_TEXT_MUTED,
      fontWeight: '800',
      letterSpacing: '1.5px',
      textTransform: 'uppercase',
      marginBottom: '10px',
      paddingLeft: '4px',
    });
    this.content.appendChild(chooseLabel);

    // v0.8: Story mode is the primary CTA — larger, amber accent, top of list.
    this.content.appendChild(
      this.makeModeCard({
        emoji: '',
        title: "Story · A Cat's Way Home",
        sub: '8 cozy chapters · 48 A2 questions',
        primary: COLOR_AMBER,
        primaryDark: COLOR_AMBER_DARK,
        primaryCta: true,
        onClick: () => this.handlers.onStartStory(),
      })
    );

    // Secondary modes (smaller, ghost-style cards)
    const secondaryLabel = document.createElement('div');
    secondaryLabel.textContent = 'Other modes';
    applyStyle(secondaryLabel, {
      fontSize: '11px',
      color: COLOR_TEXT_MUTED,
      fontWeight: '800',
      letterSpacing: '1.5px',
      textTransform: 'uppercase',
      marginTop: '10px',
      marginBottom: '8px',
      paddingLeft: '4px',
    });
    this.content.appendChild(secondaryLabel);

    this.content.appendChild(
      this.makeModeCard({
        emoji: '',
        title: 'Free Practice',
        sub: '10 random A2 questions',
        primary: COLOR_GREEN,
        primaryDark: COLOR_GREEN_DARK,
        onClick: () => this.handlers.onStartFree(),
      })
    );

    this.content.appendChild(
      this.makeModeCard({
        emoji: '',
        title: 'Scenarios',
        sub: '5 themes · 10 sentences each',
        primary: COLOR_BLUE,
        primaryDark: COLOR_BLUE_DARK,
        onClick: () => this.renderScenarioView(),
      })
    );

    const footer = document.createElement('div');
    footer.textContent = 'v1.7.15';
    applyStyle(footer, {
      marginTop: '24px',
      fontSize: '11px',
      color: '#a8a2b3',
      textAlign: 'center',
      fontFamily:
        'ui-monospace, "SFMono-Regular", Consolas, "Liberation Mono", monospace',
    });
    this.content.appendChild(footer);
  }

  private makeModeCard(opts: {
    emoji: string;
    title: string;
    sub: string;
    primary: string;
    primaryDark: string;
    primaryCta?: boolean;
    onClick: () => void;
  }): HTMLButtonElement {
    const card = document.createElement('button');
    card.type = 'button';
    const isPrimary = !!opts.primaryCta;
    applyStyle(card, {
      display: 'flex',
      alignItems: 'center',
      gap: '14px',
      minHeight: isPrimary ? '88px' : '64px',
      padding: isPrimary ? '22px 20px' : '14px 18px',
      marginBottom: isPrimary ? '20px' : '12px',
      borderRadius: isPrimary ? '20px' : '14px',
      border: `2px solid ${opts.primary}`,
      borderBottom: `${isPrimary ? '6' : '4'}px solid ${opts.primaryDark}`,
      background: opts.primary,
      color: '#ffffff',
      cursor: 'pointer',
      textAlign: 'left',
      fontFamily: 'inherit',
      touchAction: 'manipulation',
      WebkitTapHighlightColor: 'transparent',
      transition: 'transform 100ms cubic-bezier(0.2, 0.8, 0.4, 1), box-shadow 200ms ease-out, border-bottom-width 100ms cubic-bezier(0.2, 0.8, 0.4, 1)',
      boxShadow: isPrimary ? '0 6px 20px rgba(231, 164, 74, 0.3)' : 'none',
    });
    if (isPrimary) {
      // Primary CTA gets attention pulse — Duolingo principle 2.
      card.classList.add('pickup-pulse');
    }

    if (opts.emoji) {
      const iconBox = document.createElement('div');
      iconBox.textContent = opts.emoji;
      applyStyle(iconBox, {
        fontSize: isPrimary ? '44px' : '32px',
        flex: '0 0 auto',
        lineHeight: '1',
      });
      card.appendChild(iconBox);
    }

    const text = document.createElement('div');
    applyStyle(text, {
      display: 'flex',
      flexDirection: 'column',
      gap: '3px',
      flex: '1 1 auto',
    });
    const titleEl = document.createElement('div');
    titleEl.textContent = opts.title;
    applyStyle(titleEl, {
      fontSize: isPrimary ? '22px' : '18px',
      fontWeight: '800',
    });
    const subEl = document.createElement('div');
    subEl.textContent = opts.sub;
    applyStyle(subEl, {
      fontSize: isPrimary ? '13px' : '12px',
      fontWeight: '600',
      opacity: '0.92',
    });
    text.appendChild(titleEl);
    text.appendChild(subEl);
    card.appendChild(text);

    const arrow = document.createElement('div');
    arrow.textContent = '→';
    applyStyle(arrow, {
      fontSize: isPrimary ? '24px' : '20px',
      fontWeight: '800',
      opacity: '0.9',
    });
    card.appendChild(arrow);

    const restBottom = isPrimary ? '6px' : '4px';
    card.addEventListener('pointerdown', () => {
      card.style.transform = 'translateY(2px)';
      card.style.borderBottomWidth = '3px';
    });
    const release = () => {
      card.style.transform = '';
      card.style.borderBottomWidth = restBottom;
    };
    card.addEventListener('pointerup', release);
    card.addEventListener('pointerleave', release);
    card.addEventListener('pointercancel', release);
    card.addEventListener('click', (e) => {
      e.preventDefault();
      opts.onClick();
    });
    return card;
  }

  private makeIntroCard(): HTMLElement {
    const intro = document.createElement('div');
    applyStyle(intro, {
      padding: '12px 36px 12px 14px',
      marginBottom: '18px',
      background: '#fff9e0',
      border: `2px solid ${COLOR_YELLOW}`,
      borderRadius: '12px',
      fontSize: '13px',
      fontWeight: '600',
      lineHeight: '1.55',
      color: COLOR_TEXT_DARK,
      position: 'relative',
    });
    intro.textContent =
      "Answering feels like a chat. Get it right and the story moves on; miss it and just try again.";

    const dismiss = document.createElement('button');
    dismiss.type = 'button';
    dismiss.textContent = '×';
    dismiss.setAttribute('aria-label', 'Dismiss intro');
    applyStyle(dismiss, {
      position: 'absolute',
      top: '4px',
      right: '6px',
      background: 'transparent',
      border: 'none',
      color: COLOR_TEXT_MUTED,
      fontSize: '20px',
      fontWeight: '800',
      cursor: 'pointer',
      padding: '4px 8px',
      lineHeight: '1',
      touchAction: 'manipulation',
      WebkitTapHighlightColor: 'transparent',
      fontFamily: 'inherit',
    });
    dismiss.addEventListener('click', (e) => {
      e.preventDefault();
      try {
        localStorage.setItem(LS_INTRO_DISMISSED, '1');
      } catch {
        // ignore
      }
      intro.remove();
    });
    intro.appendChild(dismiss);
    return intro;
  }

  // ─── Scenario view ────────────────────────────────────────────────────────

  private renderScenarioView(): void {
    this.content.innerHTML = '';

    // Header row: back button + title
    const headerRow = document.createElement('div');
    applyStyle(headerRow, {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      marginBottom: '18px',
    });

    const back = document.createElement('button');
    back.type = 'button';
    back.textContent = '←';
    back.setAttribute('aria-label', 'Back');
    applyStyle(back, {
      background: '#ffffff',
      border: `2px solid ${COLOR_BORDER}`,
      borderBottom: `4px solid ${COLOR_BORDER_DARK}`,
      borderRadius: '12px',
      padding: '8px 14px',
      fontSize: '18px',
      fontWeight: '800',
      color: COLOR_TEXT_MUTED,
      cursor: 'pointer',
      fontFamily: 'inherit',
      touchAction: 'manipulation',
      WebkitTapHighlightColor: 'transparent',
      lineHeight: '1',
    });
    back.addEventListener('click', (e) => {
      e.preventDefault();
      this.renderModeView();
    });
    headerRow.appendChild(back);

    const title = document.createElement('div');
    title.textContent = 'Choose a scenario';
    applyStyle(title, {
      fontSize: '22px',
      fontWeight: '800',
      flex: '1 1 auto',
      textAlign: 'center',
      marginRight: '52px',
    });
    headerRow.appendChild(title);

    this.content.appendChild(headerRow);

    for (const id of SCENARIOS_IN_ORDER) {
      this.content.appendChild(this.makeScenarioCard(id));
    }
  }

  private makeScenarioCard(id: ScenarioId): HTMLButtonElement {
    const meta = SCENARIO_META[id];
    const best = readBestScore(id);
    const completed = isScenarioCompleted(id);

    const card = document.createElement('button');
    card.type = 'button';
    applyStyle(card, {
      display: 'flex',
      alignItems: 'center',
      gap: '14px',
      padding: '14px 16px',
      marginBottom: '12px',
      borderRadius: '16px',
      border: `2px solid ${COLOR_BORDER}`,
      borderBottom: `4px solid ${COLOR_BORDER_DARK}`,
      background: '#ffffff',
      color: COLOR_TEXT_DARK,
      cursor: 'pointer',
      textAlign: 'left',
      fontFamily: 'inherit',
      touchAction: 'manipulation',
      WebkitTapHighlightColor: 'transparent',
      transition: 'transform 80ms ease-out',
    });

    // Colored circle (scenario-tinted) — shows scenario initial letter
    const iconBox = document.createElement('div');
    iconBox.textContent = meta.labelEn.charAt(0);
    applyStyle(iconBox, {
      width: '48px',
      height: '48px',
      borderRadius: '50%',
      background: meta.tint,
      border: `2px solid ${meta.accent}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '20px',
      fontWeight: '800',
      color: meta.accent,
      flex: '0 0 auto',
    });
    card.appendChild(iconBox);

    const text = document.createElement('div');
    applyStyle(text, {
      display: 'flex',
      flexDirection: 'column',
      gap: '3px',
      flex: '1 1 auto',
    });
    const titleEl = document.createElement('div');
    titleEl.textContent = meta.labelEn;
    applyStyle(titleEl, { fontSize: '17px', fontWeight: '800' });
    const subEl = document.createElement('div');
    const bestText = best > 0 ? `Best ${best}` : 'Not yet attempted';
    subEl.textContent = completed ? `${bestText} · Cleared` : bestText;
    applyStyle(subEl, {
      fontSize: '12px',
      fontWeight: '700',
      color: completed ? COLOR_GREEN_DARK : COLOR_TEXT_MUTED,
    });
    text.appendChild(titleEl);
    text.appendChild(subEl);
    card.appendChild(text);

    const arrow = document.createElement('div');
    arrow.textContent = '→';
    applyStyle(arrow, {
      fontSize: '20px',
      fontWeight: '800',
      color: COLOR_TEXT_MUTED,
    });
    card.appendChild(arrow);

    card.addEventListener('pointerdown', () => {
      card.style.transform = 'translateY(2px)';
      card.style.borderBottomWidth = '2px';
    });
    const release = () => {
      card.style.transform = '';
      card.style.borderBottomWidth = '4px';
    };
    card.addEventListener('pointerup', release);
    card.addEventListener('pointerleave', release);
    card.addEventListener('pointercancel', release);
    card.addEventListener('click', (e) => {
      e.preventDefault();
      this.handlers.onStartScenario(id);
    });
    return card;
  }

  private introDismissed(): boolean {
    if (typeof localStorage === 'undefined') return false;
    try {
      return localStorage.getItem(LS_INTRO_DISMISSED) === '1';
    } catch {
      return false;
    }
  }

  /**
   * v1.7.0: compact difficulty pill. Sits above the Story card,
   * native <details> auto-collapses after the user picks. First-time
   * users see it pre-expanded with a one-liner hint.
   */
  private makeDifficultyPill(): HTMLElement {
    const details = document.createElement('details');
    applyStyle(details, {
      marginBottom: '16px',
      background: '#ffffff',
      border: `2px solid ${COLOR_BORDER}`,
      borderBottom: `3px solid ${COLOR_BORDER_DARK}`,
      borderRadius: '14px',
      padding: '0',
      overflow: 'hidden',
    });

    // First-time UX: pre-expand on first visit so the affordance is obvious.
    let seen = false;
    try {
      seen = localStorage.getItem('pickup.difficulty-seen') === '1';
    } catch { /* ignore */ }
    if (!seen) details.open = true;

    const current = useRunStore.getState().difficulty;

    const summary = document.createElement('summary');
    applyStyle(summary, {
      listStyle: 'none',
      cursor: 'pointer',
      padding: '10px 14px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      fontSize: '13px',
      fontWeight: '700',
      color: COLOR_TEXT_MUTED,
    });
    summary.innerHTML =
      `<span>Difficulty · <span class="pickup-diff-cur" style="color:${COLOR_TEXT_DARK};">${DIFFICULTY_LABELS[current]}</span></span>` +
      `<span style="font-size:14px;">⌄</span>`;
    details.appendChild(summary);

    let hintEl: HTMLDivElement | null = null;
    if (!seen) {
      hintEl = document.createElement('div');
      hintEl.textContent = 'Pick your level first';
      applyStyle(hintEl, {
        padding: '0 14px 4px',
        fontSize: '11px',
        fontStyle: 'italic',
        color: COLOR_TEXT_MUTED,
      });
      details.appendChild(hintEl);
    }

    const opts = document.createElement('div');
    applyStyle(opts, {
      display: 'flex',
      gap: '8px',
      padding: '8px 12px 12px',
    });

    const tiers: Difficulty[] = ['easy', 'medium', 'hard'];
    const buttons = new Map<Difficulty, HTMLButtonElement>();

    const paint = (active: Difficulty) => {
      for (const [id, el] of buttons) {
        const isActive = id === active;
        applyStyle(el, {
          background: isActive ? COLOR_AMBER : '#ffffff',
          color: isActive ? '#ffffff' : COLOR_TEXT_MUTED,
          borderColor: isActive ? COLOR_AMBER_DARK : COLOR_BORDER,
        });
      }
      const cur = summary.querySelector('.pickup-diff-cur');
      if (cur) cur.textContent = DIFFICULTY_LABELS[active];
    };

    for (const tier of tiers) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = DIFFICULTY_LABELS[tier];
      applyStyle(btn, {
        flex: '1',
        padding: '8px 0',
        fontSize: '13px',
        fontWeight: '800',
        background: '#ffffff',
        color: COLOR_TEXT_MUTED,
        border: `2px solid ${COLOR_BORDER}`,
        borderRadius: '10px',
        cursor: 'pointer',
        fontFamily: 'inherit',
        transition: 'background 160ms ease, color 160ms ease',
      });
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        useRunStore.getState().setDifficulty(tier);
        paint(tier);
        if (!seen) {
          seen = true;
          try { localStorage.setItem('pickup.difficulty-seen', '1'); } catch { /* ignore */ }
          hintEl?.remove();
          hintEl = null;
        }
        window.setTimeout(() => { details.open = false; }, 160);
      });
      buttons.set(tier, btn);
      opts.appendChild(btn);
    }
    paint(current);
    details.appendChild(opts);

    return details;
  }
}
