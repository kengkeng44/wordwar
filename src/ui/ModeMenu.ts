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

export interface ModeMenuHandlers {
  onStartStory: () => void;
  onStartFree: () => void;
  onStartScenario: (id: ScenarioId) => void;
}

const LS_INTRO_DISMISSED = 'wordwar.introDismissed';

// v0.8 palette — warm cream + amber accent layered over Duolingo green
const COLOR_GREEN = '#58cc02';
const COLOR_GREEN_DARK = '#58a700';
const COLOR_BLUE = '#1cb0f6';
const COLOR_BLUE_DARK = '#0b8ec9';
const COLOR_YELLOW = '#ffc800';
const COLOR_AMBER = '#e7a44a';
const COLOR_AMBER_DARK = '#b07a2a';
const COLOR_CREAM = '#fef8ed';
const COLOR_BORDER = '#e5e5e5';
const COLOR_BORDER_DARK = '#d4d4d4';
const COLOR_TEXT_DARK = '#3c3c3c';
const COLOR_TEXT_MUTED = '#777777';

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
    title.textContent = 'WordWar';
    applyStyle(title, {
      fontSize: '40px',
      fontWeight: '900',
      textAlign: 'center',
      color: COLOR_GREEN,
      letterSpacing: '-0.5px',
      marginBottom: '4px',
    });
    this.content.appendChild(title);

    const subtitle = document.createElement('div');
    subtitle.textContent = 'CEFR cloze · 填空挑戰';
    applyStyle(subtitle, {
      fontSize: '13px',
      fontWeight: '600',
      color: COLOR_TEXT_MUTED,
      textAlign: 'center',
      marginBottom: '24px',
    });
    this.content.appendChild(subtitle);

    if (!this.introDismissed()) {
      this.content.appendChild(this.makeIntroCard());
    }

    const chooseLabel = document.createElement('div');
    chooseLabel.textContent = '選擇模式';
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

    // v0.8: 新故事 is the primary CTA — larger, amber accent, top of list.
    this.content.appendChild(
      this.makeModeCard({
        emoji: '🐈',
        title: '新故事 · 小貓回家路',
        sub: '5 章治癒系故事 · 30 題 A2',
        primary: COLOR_AMBER,
        primaryDark: COLOR_AMBER_DARK,
        primaryCta: true,
        onClick: () => this.handlers.onStartStory(),
      })
    );

    // Secondary modes (smaller, ghost-style cards)
    const secondaryLabel = document.createElement('div');
    secondaryLabel.textContent = '其他模式';
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
        emoji: '🎯',
        title: '自由練習',
        sub: '10 題隨機 A2 題目',
        primary: COLOR_GREEN,
        primaryDark: COLOR_GREEN_DARK,
        onClick: () => this.handlers.onStartFree(),
      })
    );

    this.content.appendChild(
      this.makeModeCard({
        emoji: '🎬',
        title: '情境模式',
        sub: '5 個主題,每題 10 句',
        primary: COLOR_BLUE,
        primaryDark: COLOR_BLUE_DARK,
        onClick: () => this.renderScenarioView(),
      })
    );

    const footer = document.createElement('div');
    footer.textContent = 'v0.8.0';
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
      transition: 'transform 80ms ease-out',
      boxShadow: isPrimary ? '0 6px 20px rgba(231, 164, 74, 0.3)' : 'none',
    });

    const iconBox = document.createElement('div');
    iconBox.textContent = opts.emoji;
    applyStyle(iconBox, {
      fontSize: isPrimary ? '44px' : '32px',
      flex: '0 0 auto',
      lineHeight: '1',
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
      '選句子中空格最適合的單字。答對加分,答錯扣血。每回合 15 秒,慢了會自動算錯。';

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
    title.textContent = '🎬 選擇情境';
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

    // Colored emoji circle (scenario-tinted)
    const iconBox = document.createElement('div');
    iconBox.textContent = meta.emoji;
    applyStyle(iconBox, {
      width: '48px',
      height: '48px',
      borderRadius: '50%',
      background: meta.tint,
      border: `2px solid ${meta.accent}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '24px',
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
    titleEl.textContent = `${meta.labelZh} (${meta.labelEn})`;
    applyStyle(titleEl, { fontSize: '17px', fontWeight: '800' });
    const subEl = document.createElement('div');
    const bestText = best > 0 ? `最佳 ${best} 分` : '尚未挑戰';
    subEl.textContent = completed ? `${bestText} · ✓ 已通關` : bestText;
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
}
