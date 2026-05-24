/**
 * ClozeUI — DOM overlay rendering the 4 cloze answer buttons + reveal
 * panel, positioned in the bottom half of the portrait phone layout.
 *
 * v0.4 — Duolingo aesthetic.
 *   - White button bg, 2px gray border, 4px darker bottom border
 *     (Duolingo's signature "3D depth" press treatment).
 *   - A/B/C/D circle indicator on the left, letter in gray on white.
 *   - On press: translateY(2px), bottom-border shortens to 2px.
 *   - On reveal: correct button flips to green-active state (bg #58cc02,
 *     dark-green bottom border, white text). Wrong selection turns red.
 *   - Reveal panel: full-width sheet, slides up from bottom of viewport.
 *     Header row ("Correct!" / "Wrong") with icon, explanation body,
 *     then a green CTA "CONTINUE" button (3D depth).
 */

import { useRunStore } from '../store/runStore';
import type { ClozeQuestion } from '../data/sentences';
import { applyStyle } from './domUtil';

export interface ClozeUIHandlers {
  onAnswer: (selectedIndex: number) => void;
  onContinue: () => void;
}

export interface ClozeUIOptions {
  /** Hex accent color used as a subtle highlight (currently unused;
   *  Duolingo aesthetic uses global green for correct, red for wrong,
   *  scenario tint is reflected via the HUD chip instead). */
  accent: string;
}

interface BtnRefs {
  el: HTMLButtonElement;
  label: HTMLSpanElement;
  letter: HTMLSpanElement;
}

const LETTERS = ['A', 'B', 'C', 'D'];

// Duolingo palette
const COLOR_GREEN = '#58cc02';
const COLOR_GREEN_DARK = '#58a700';
const COLOR_GREEN_TINT = '#e0f5d0';
const COLOR_RED = '#ff4b4b';
const COLOR_RED_DARK = '#cc3a3a';
const COLOR_RED_TINT = '#ffd6d6';
const COLOR_BORDER = '#e5e5e5';
const COLOR_BORDER_DARK = '#d4d4d4';
const COLOR_TEXT_DARK = '#3c3c3c';
const COLOR_TEXT_MUTED = '#777777';

export class ClozeUI {
  private root: HTMLDivElement;
  private btnCol: HTMLDivElement;
  private buttons: BtnRefs[] = [];
  private revealPanel: HTMLDivElement;
  private revealHeader: HTMLDivElement;
  private revealHeaderIcon: HTMLSpanElement;
  private revealHeaderText: HTMLSpanElement;
  private revealText: HTMLDivElement;
  private revealContinue: HTMLButtonElement;
  private unsub?: () => void;
  private handlers: ClozeUIHandlers;
  private currentQuestion: ClozeQuestion | null = null;
  private locked = false;

  constructor(handlers: ClozeUIHandlers, _opts: ClozeUIOptions) {
    this.handlers = handlers;

    this.root = document.createElement('div');
    this.root.id = 'cloze-overlay';
    applyStyle(this.root, {
      position: 'fixed',
      inset: '0',
      pointerEvents: 'none',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-end',
      alignItems: 'center',
      paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
      zIndex: '10',
      fontFamily:
        '"Nunito", "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    });

    // Vertical button column.
    this.btnCol = document.createElement('div');
    applyStyle(this.btnCol, {
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      width: 'min(420px, calc(100vw - 24px))',
      pointerEvents: 'none',
      marginBottom: '8px',
    });

    for (let i = 0; i < 4; i++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.setAttribute('data-cloze-idx', String(i));
      applyStyle(btn, {
        pointerEvents: 'auto',
        minHeight: '62px',
        padding: '12px 16px',
        borderRadius: '14px',
        border: `2px solid ${COLOR_BORDER}`,
        borderBottom: `4px solid ${COLOR_BORDER_DARK}`,
        background: '#ffffff',
        color: COLOR_TEXT_DARK,
        fontSize: '18px',
        fontWeight: '700',
        fontFamily: 'inherit',
        cursor: 'pointer',
        transition:
          'transform 80ms ease-out, background 160ms ease-out, border-color 160ms ease-out, color 160ms ease-out',
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent',
        userSelect: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        textAlign: 'left',
      });

      const letter = document.createElement('span');
      letter.textContent = LETTERS[i];
      applyStyle(letter, {
        width: '28px',
        height: '28px',
        borderRadius: '50%',
        border: `2px solid ${COLOR_BORDER}`,
        background: '#ffffff',
        color: COLOR_TEXT_MUTED,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '14px',
        fontWeight: '800',
        flex: '0 0 auto',
      });
      btn.appendChild(letter);

      const label = document.createElement('span');
      applyStyle(label, { flex: '1 1 auto' });
      btn.appendChild(label);

      btn.addEventListener('click', (e) => {
        e.preventDefault();
        if (this.locked) return;
        const idx = Number(btn.getAttribute('data-cloze-idx'));
        this.handlers.onAnswer(idx);
      });
      btn.addEventListener('pointerdown', () => {
        if (this.locked) return;
        // Duolingo "press in" effect: translateY 2px down,
        // bottom border shortens by 2px so total height stays consistent.
        btn.style.transform = 'translateY(2px)';
        btn.style.borderBottomWidth = '2px';
      });
      const releasePress = () => {
        btn.style.transform = '';
        btn.style.borderBottomWidth = '4px';
      };
      btn.addEventListener('pointerup', releasePress);
      btn.addEventListener('pointerleave', releasePress);
      btn.addEventListener('pointercancel', releasePress);

      this.buttons.push({ el: btn, label, letter });
      this.btnCol.appendChild(btn);
    }
    this.root.appendChild(this.btnCol);

    // Reveal panel
    this.revealPanel = document.createElement('div');
    applyStyle(this.revealPanel, {
      pointerEvents: 'auto',
      width: 'min(420px, calc(100vw - 24px))',
      marginTop: '4px',
      padding: '16px 18px 16px 18px',
      borderRadius: '16px',
      background: COLOR_GREEN_TINT,
      color: COLOR_TEXT_DARK,
      fontSize: '15px',
      lineHeight: '1.55',
      fontFamily: 'inherit',
      boxShadow: '0 -8px 24px rgba(0,0,0,0.05)',
      transform: 'translateY(40px)',
      opacity: '0',
      transition: 'transform 240ms ease-out, opacity 240ms ease-out',
      display: 'none',
    });

    this.revealHeader = document.createElement('div');
    applyStyle(this.revealHeader, {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      marginBottom: '8px',
      fontSize: '20px',
      fontWeight: '800',
    });
    this.revealHeaderIcon = document.createElement('span');
    applyStyle(this.revealHeaderIcon, {
      width: '30px',
      height: '30px',
      borderRadius: '50%',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '18px',
      fontWeight: '900',
      lineHeight: '1',
    });
    this.revealHeader.appendChild(this.revealHeaderIcon);
    this.revealHeaderText = document.createElement('span');
    this.revealHeader.appendChild(this.revealHeaderText);
    this.revealPanel.appendChild(this.revealHeader);

    this.revealText = document.createElement('div');
    applyStyle(this.revealText, {
      fontSize: '15px',
      fontWeight: '600',
      lineHeight: '1.55',
      color: COLOR_TEXT_DARK,
    });
    this.revealPanel.appendChild(this.revealText);

    this.revealContinue = document.createElement('button');
    this.revealContinue.type = 'button';
    this.revealContinue.textContent = 'CONTINUE';
    applyStyle(this.revealContinue, {
      marginTop: '14px',
      padding: '14px 22px',
      borderRadius: '14px',
      border: 'none',
      borderBottom: `4px solid ${COLOR_GREEN_DARK}`,
      background: COLOR_GREEN,
      color: '#ffffff',
      fontSize: '17px',
      fontWeight: '800',
      letterSpacing: '0.8px',
      fontFamily: 'inherit',
      cursor: 'pointer',
      touchAction: 'manipulation',
      WebkitTapHighlightColor: 'transparent',
      width: '100%',
      transition: 'transform 80ms ease-out',
    });
    this.revealContinue.addEventListener('pointerdown', () => {
      this.revealContinue.style.transform = 'translateY(2px)';
      this.revealContinue.style.borderBottomWidth = '2px';
    });
    const releaseContinue = () => {
      this.revealContinue.style.transform = '';
      this.revealContinue.style.borderBottomWidth = '4px';
    };
    this.revealContinue.addEventListener('pointerup', releaseContinue);
    this.revealContinue.addEventListener('pointerleave', releaseContinue);
    this.revealContinue.addEventListener('pointercancel', releaseContinue);
    this.revealContinue.addEventListener('click', (e) => {
      e.preventDefault();
      this.handlers.onContinue();
    });
    this.revealPanel.appendChild(this.revealContinue);

    this.root.appendChild(this.revealPanel);

    document.body.appendChild(this.root);

    this.unsub = useRunStore.subscribe((state) => {
      this.syncFromState(state.round);
    });
    const init = useRunStore.getState();
    this.syncFromState(init.round);
  }

  show(): void {
    this.root.style.display = 'flex';
  }

  hide(): void {
    this.root.style.display = 'none';
  }

  destroy(): void {
    this.unsub?.();
    this.root.remove();
  }

  resetForRound(): void {
    this.locked = false;
    for (const { el, letter } of this.buttons) {
      el.disabled = false;
      el.style.background = '#ffffff';
      el.style.borderColor = COLOR_BORDER;
      el.style.borderBottomColor = COLOR_BORDER_DARK;
      el.style.color = COLOR_TEXT_DARK;
      el.style.transform = '';
      el.style.borderBottomWidth = '4px';
      el.style.cursor = 'pointer';
      el.style.opacity = '1';
      letter.style.background = '#ffffff';
      letter.style.borderColor = COLOR_BORDER;
      letter.style.color = COLOR_TEXT_MUTED;
    }
    this.revealPanel.style.display = 'none';
    this.revealPanel.style.opacity = '0';
    this.revealPanel.style.transform = 'translateY(40px)';
  }

  revealAnswer(
    selectedIndex: number,
    correctIndex: number,
    explanationZh: string,
    isCorrect?: boolean
  ): void {
    this.locked = true;
    for (let i = 0; i < this.buttons.length; i++) {
      const { el, letter } = this.buttons[i];
      el.disabled = true;
      el.style.cursor = 'default';
      if (i === correctIndex) {
        // Green-active style.
        el.style.background = COLOR_GREEN;
        el.style.borderColor = COLOR_GREEN_DARK;
        el.style.borderBottomColor = COLOR_GREEN_DARK;
        el.style.color = '#ffffff';
        letter.style.background = '#ffffff';
        letter.style.borderColor = '#ffffff';
        letter.style.color = COLOR_GREEN_DARK;
      } else if (i === selectedIndex && selectedIndex !== correctIndex) {
        // Wrong selection: red active style.
        el.style.background = COLOR_RED_TINT;
        el.style.borderColor = COLOR_RED;
        el.style.borderBottomColor = COLOR_RED_DARK;
        el.style.color = COLOR_RED_DARK;
        letter.style.background = COLOR_RED;
        letter.style.borderColor = COLOR_RED;
        letter.style.color = '#ffffff';
      } else {
        el.style.opacity = '0.55';
      }
    }

    // Reveal panel content.
    const correct =
      typeof isCorrect === 'boolean'
        ? isCorrect
        : selectedIndex === correctIndex && selectedIndex >= 0;

    if (correct) {
      this.revealHeaderIcon.textContent = '✓';
      this.revealHeaderIcon.style.background = COLOR_GREEN;
      this.revealHeaderIcon.style.color = '#ffffff';
      this.revealHeaderText.textContent = 'Correct!';
      this.revealHeaderText.style.color = COLOR_GREEN_DARK;
      this.revealPanel.style.background = COLOR_GREEN_TINT;
      this.revealContinue.style.background = COLOR_GREEN;
      this.revealContinue.style.borderBottomColor = COLOR_GREEN_DARK;
    } else {
      this.revealHeaderIcon.textContent = '✕';
      this.revealHeaderIcon.style.background = COLOR_RED;
      this.revealHeaderIcon.style.color = '#ffffff';
      this.revealHeaderText.textContent = selectedIndex < 0 ? "Time's up" : 'Wrong';
      this.revealHeaderText.style.color = COLOR_RED_DARK;
      this.revealPanel.style.background = COLOR_RED_TINT;
      this.revealContinue.style.background = COLOR_RED;
      this.revealContinue.style.borderBottomColor = COLOR_RED_DARK;
    }

    this.revealText.textContent = explanationZh;
    this.revealPanel.style.display = 'block';
    void this.revealPanel.offsetHeight;
    this.revealPanel.style.opacity = '1';
    this.revealPanel.style.transform = 'translateY(0)';
  }

  revealTimeout(correctIndex: number, explanationZh: string): void {
    this.revealAnswer(-1, correctIndex, explanationZh, false);
  }

  private syncFromState(round: ClozeQuestion | null): void {
    if (round !== this.currentQuestion) {
      this.currentQuestion = round;
      if (round) {
        for (let i = 0; i < this.buttons.length; i++) {
          this.buttons[i].label.textContent = round.options[i];
        }
        this.resetForRound();
      }
    }
  }
}
