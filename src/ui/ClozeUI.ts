/**
 * ClozeUI — DOM-only 4-choice answer buttons + reveal panel (v0.6).
 *
 * v0.6: buttons and reveal panel are now ordinary flex-flow children
 * mounted into slots provided by GameHUD. No more `position: fixed`
 * stacked over everything. Reveal panel toggles `display: none` ↔
 * `block` in place of the buttons (so they don't compete for the same
 * vertical space).
 *
 *   Buttons: 4 stacked answer choices (A/B/C/D), Duolingo 3D depth
 *   Reveal:  Correct/Wrong header + explanation + green CTA "CONTINUE"
 *
 * Aesthetic unchanged from v0.4: white button bg, 2px gray border,
 * 4px darker bottom border (Duolingo press treatment), green-active
 * for the correct answer, red-active for wrong selection.
 */

import { useRunStore } from '../store/runStore';
import type { ClozeQuestion } from '../data/sentences';
import { applyStyle } from './domUtil';

export interface ClozeUIHandlers {
  onAnswer: (selectedIndex: number) => void;
  onContinue: () => void;
  /** v0.8 story mode: called when a wrong answer's "再試一次" prompt
   *  is shown and the player taps the correct (highlighted) option.
   *  PlayScene should clear the answered flag (retryRound) and treat
   *  this as a successful "force-correct" advance. */
  onForceCorrect?: (selectedIndex: number) => void;
}

export interface ClozeUIOptions {
  /** Hex accent color used as a subtle highlight (currently unused;
   *  Duolingo aesthetic uses global green for correct, red for wrong,
   *  scenario tint is reflected via the HUD chip instead). */
  accent: string;
  /** Flex slot for the 4 answer buttons. */
  buttonsSlot: HTMLElement;
  /** Flex slot for the reveal panel. */
  revealSlot: HTMLElement;
  /** v0.8: when true, ClozeUI runs in story-mode force-correct flow:
   *  - wrong answers DISABLE the Continue button
   *  - the correct option stays clickable for a forced retry
   *  - on forced retry tap, onForceCorrect is invoked instead of onAnswer */
  forceCorrectMode?: boolean;
}

interface BtnRefs {
  el: HTMLButtonElement;
  label: HTMLSpanElement;
  letter: HTMLSpanElement;
}

const LETTERS = ['A', 'B', 'C', 'D'];

// Duolingo palette — semantic tokens (mirrors --pickup-* in style.css)
const COLOR_GREEN = '#58cc02';
const COLOR_GREEN_DARK = '#58a700';
const COLOR_GREEN_TINT = '#e0f5d0';
const COLOR_RED = '#ff4b4b';
const COLOR_RED_DARK = '#cc3a3a';
const COLOR_RED_TINT = '#ffd6d6';
const COLOR_BORDER = '#ead9bb';
const COLOR_BORDER_DARK = '#d4c098';
const COLOR_TEXT_DARK = '#3d2817';
const COLOR_TEXT_MUTED = '#8b6f4a';

// v0.10 — encouraging microcopy with character (Duolingo principle 4).
// Vary the copy per call so it stays fresh rather than feeling canned.
const PRAISE_CORRECT = ['Brilliant!', 'Nice!', 'You got it!', 'Perfect!', 'Yes!', "That's the one!"];
const PRAISE_TIMEOUT = ['Time up · tap the green button', 'Almost · tap the green one'];
const PRAISE_WRONG = ['Try again', 'Almost', 'Not quite · keep going', 'One more try'];

function pickPraise(pool: readonly string[]): string {
  return pool[Math.floor(Math.random() * pool.length)];
}

export class ClozeUI {
  private buttonsSlot: HTMLElement;
  private revealSlot: HTMLElement;
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
  /** v0.8: when true, this instance applies story-mode force-correct flow. */
  private forceCorrectMode = false;
  /** v0.8 force-correct: index of the correct option, kept so the button
   *  click handler can route the forced retry tap to onForceCorrect. */
  private currentCorrectIndex = -1;
  /** v0.8 force-correct: true after a wrong answer is shown and we are
   *  waiting for the player to tap the correct option. */
  private awaitingForceCorrect = false;
  /** v0.8.1 blind retry: cached explanation text from the first wrong tap,
   *  shown only after the player finally lands on the correct option. */
  private pendingExplanationZh = '';

  constructor(handlers: ClozeUIHandlers, opts: ClozeUIOptions) {
    this.handlers = handlers;
    this.buttonsSlot = opts.buttonsSlot;
    this.revealSlot = opts.revealSlot;
    this.forceCorrectMode = !!opts.forceCorrectMode;

    // Build 4 stacked answer buttons directly into the buttonsSlot.
    for (let i = 0; i < 4; i++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.setAttribute('data-cloze-idx', String(i));
      applyStyle(btn, {
        width: '100%',
        minHeight: '60px', // >= 44px iOS touch target + comfortable
        padding: '14px 18px',
        borderRadius: '14px',
        border: `2px solid ${COLOR_BORDER}`,
        borderBottom: `4px solid ${COLOR_BORDER_DARK}`,
        background: '#ffffff',
        color: COLOR_TEXT_DARK,
        fontSize: '17px',
        fontWeight: '700',
        fontFamily: 'inherit',
        cursor: 'pointer',
        transition:
          'transform 100ms cubic-bezier(0.2, 0.8, 0.4, 1), background 200ms ease-out, border-color 200ms ease-out, color 200ms ease-out, box-shadow 200ms ease-out',
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent',
        userSelect: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        textAlign: 'left',
        boxSizing: 'border-box',
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
        const idx = Number(btn.getAttribute('data-cloze-idx'));
        // v0.8.1 blind retry: in force-correct mode, after a wrong tap
        // the player keeps trying. Wrong tap → mark red locally (no
        // onAnswer, store already recorded the original wrong answer
        // for SRS). Correct tap → fire onForceCorrect; PlayScene clears
        // state and advances.
        if (this.awaitingForceCorrect && this.forceCorrectMode) {
          if (btn.disabled) return;
          if (idx === this.currentCorrectIndex) {
            this.handlers.onForceCorrect?.(idx);
          } else {
            this.markWrongButton(idx);
          }
          return;
        }
        if (this.locked) return;
        this.handlers.onAnswer(idx);
      });
      btn.addEventListener('pointerdown', () => {
        if (this.locked) return;
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
      this.buttonsSlot.appendChild(btn);
    }

    // Reveal panel — built into revealSlot, hidden until revealAnswer().
    this.revealPanel = document.createElement('div');
    // a11y: announce reveal text to screen readers without stealing focus.
    this.revealPanel.setAttribute('role', 'status');
    this.revealPanel.setAttribute('aria-live', 'polite');
    this.revealPanel.setAttribute('aria-atomic', 'true');
    applyStyle(this.revealPanel, {
      width: '100%',
      padding: '14px 16px',
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
      boxSizing: 'border-box',
    });

    this.revealHeader = document.createElement('div');
    applyStyle(this.revealHeader, {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      marginBottom: '6px',
      fontSize: '18px',
      fontWeight: '800',
    });
    this.revealHeaderIcon = document.createElement('span');
    applyStyle(this.revealHeaderIcon, {
      width: '28px',
      height: '28px',
      borderRadius: '50%',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '16px',
      fontWeight: '900',
      lineHeight: '1',
    });
    this.revealHeader.appendChild(this.revealHeaderIcon);
    this.revealHeaderText = document.createElement('span');
    this.revealHeader.appendChild(this.revealHeaderText);
    this.revealPanel.appendChild(this.revealHeader);

    this.revealText = document.createElement('div');
    applyStyle(this.revealText, {
      fontSize: '14px',
      fontWeight: '600',
      lineHeight: '1.55',
      color: COLOR_TEXT_DARK,
    });
    this.revealPanel.appendChild(this.revealText);

    this.revealContinue = document.createElement('button');
    this.revealContinue.type = 'button';
    this.revealContinue.textContent = 'Continue →';
    applyStyle(this.revealContinue, {
      marginTop: '12px',
      padding: '13px 22px',
      borderRadius: '14px',
      border: 'none',
      borderBottom: `4px solid ${COLOR_GREEN_DARK}`,
      background: COLOR_GREEN,
      color: '#ffffff',
      fontSize: '16px',
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

    this.revealSlot.appendChild(this.revealPanel);

    this.unsub = useRunStore.subscribe((state) => {
      this.syncFromState(state.round);
    });
    const init = useRunStore.getState();
    this.syncFromState(init.round);
  }

  show(): void {
    for (const { el } of this.buttons) el.style.display = 'flex';
  }

  hide(): void {
    for (const { el } of this.buttons) el.style.display = 'none';
    this.revealPanel.style.display = 'none';
  }

  destroy(): void {
    this.unsub?.();
    for (const { el } of this.buttons) el.remove();
    this.revealPanel.remove();
  }

  resetForRound(): void {
    this.locked = false;
    this.awaitingForceCorrect = false;
    this.currentCorrectIndex = -1;
    this.pendingExplanationZh = '';
    for (const { el, letter } of this.buttons) {
      el.disabled = false;
      el.style.display = 'flex';
      el.style.background = '#ffffff';
      el.style.borderColor = COLOR_BORDER;
      el.style.borderBottomColor = COLOR_BORDER_DARK;
      el.style.color = COLOR_TEXT_DARK;
      el.style.transform = '';
      el.style.borderBottomWidth = '4px';
      el.style.cursor = 'pointer';
      el.style.opacity = '1';
      el.style.animation = '';
      el.removeAttribute('aria-label');
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
    this.currentCorrectIndex = correctIndex;
    const correct =
      typeof isCorrect === 'boolean'
        ? isCorrect
        : selectedIndex === correctIndex && selectedIndex >= 0;

    // v0.8 force-correct: a wrong answer in story mode keeps the correct
    // button clickable so the player MUST tap it themselves to advance.
    const forceCorrectRetry = this.forceCorrectMode && !correct;
    // v0.8.1 "blind retry": in force-correct mode after a wrong tap, do
    // NOT reveal which option is correct. Only mark the WRONG-tapped
    // button red + disable it; leave all OTHER buttons enabled so the
    // player can keep trying until they hit the correct one. No reveal
    // panel until they actually answer correctly (or time out).
    const blindRetry =
      this.forceCorrectMode &&
      !correct &&
      selectedIndex >= 0 &&
      selectedIndex !== correctIndex;

    if (blindRetry) {
      // Mark only the wrong button as wrong, keep all OTHER buttons
      // clickable. Subsequent taps are routed through the
      // awaitingForceCorrect branch in the click handler (wrong → mark
      // red locally, correct → onForceCorrect). No hint about which
      // option is correct, and no reveal panel until the player nails it.
      this.locked = true; // block onAnswer from re-firing into the store
      this.awaitingForceCorrect = true;
      this.pendingExplanationZh = explanationZh;
      this.markWrongButton(selectedIndex);
      this.revealPanel.style.display = 'none';
      this.revealPanel.style.opacity = '0';
      this.revealPanel.style.transform = 'translateY(40px)';
      return;
    }

    this.locked = true;
    this.awaitingForceCorrect = forceCorrectRetry;

    for (let i = 0; i < this.buttons.length; i++) {
      const { el, letter, label } = this.buttons[i];
      el.disabled = true;
      el.style.cursor = 'default';
      if (i === correctIndex) {
        el.style.background = COLOR_GREEN;
        el.style.borderColor = COLOR_GREEN_DARK;
        el.style.borderBottomColor = COLOR_GREEN_DARK;
        el.style.color = '#ffffff';
        letter.style.background = '#ffffff';
        letter.style.borderColor = '#ffffff';
        letter.style.color = COLOR_GREEN_DARK;
        el.setAttribute('aria-label', `Correct answer: ${label.textContent ?? ''}`);
        // Celebratory bounce on the correct option (only on correct
        // answers — for wrong-then-retry the bounce signals "tap me").
        if (correct) {
          el.classList.remove('pickup-bounce');
          void el.offsetWidth;
          el.classList.add('pickup-bounce');
          window.setTimeout(() => el.classList.remove('pickup-bounce'), 420);
        }
        // Re-enable the correct button for the forced retry tap
        // (only relevant for time-out path now — wrong clicks are
        // handled by the blindRetry branch above).
        if (forceCorrectRetry) {
          el.disabled = false;
          el.style.cursor = 'pointer';
          if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
            el.style.animation =
              'mascot-happy-bounce 0.9s ease-in-out infinite';
          }
        }
      } else if (i === selectedIndex && selectedIndex !== correctIndex) {
        el.style.background = COLOR_RED_TINT;
        el.style.borderColor = COLOR_RED;
        el.style.borderBottomColor = COLOR_RED_DARK;
        el.style.color = COLOR_RED_DARK;
        letter.style.background = COLOR_RED;
        letter.style.borderColor = COLOR_RED;
        letter.style.color = '#ffffff';
        el.setAttribute('aria-label', `Your wrong choice: ${label.textContent ?? ''}`);
        // Gentle wobble on the wrong button — "no, try again" without harshness.
        el.classList.remove('pickup-wobble');
        void el.offsetWidth;
        el.classList.add('pickup-wobble');
        window.setTimeout(() => el.classList.remove('pickup-wobble'), 380);
      } else {
        el.style.opacity = '0.55';
      }
    }

    if (correct) {
      this.revealHeaderIcon.textContent = '✓';
      this.revealHeaderIcon.style.background = COLOR_GREEN;
      this.revealHeaderIcon.style.color = '#ffffff';
      this.revealHeaderText.textContent = pickPraise(PRAISE_CORRECT);
      this.revealHeaderText.style.color = COLOR_GREEN_DARK;
      this.revealPanel.style.background = COLOR_GREEN_TINT;
      this.revealContinue.style.background = COLOR_GREEN;
      this.revealContinue.style.borderBottomColor = COLOR_GREEN_DARK;
      this.revealContinue.disabled = false;
      this.revealContinue.style.opacity = '1';
      this.revealContinue.style.cursor = 'pointer';
      this.revealContinue.textContent = 'Continue →';
    } else {
      this.revealHeaderIcon.textContent = '✕';
      this.revealHeaderIcon.style.background = COLOR_RED;
      this.revealHeaderIcon.style.color = '#ffffff';
      this.revealHeaderText.textContent =
        selectedIndex < 0
          ? this.forceCorrectMode
            ? pickPraise(PRAISE_TIMEOUT)
            : 'Time up'
          : this.forceCorrectMode
            ? 'Almost · tap the green button'
            : pickPraise(PRAISE_WRONG);
      this.revealHeaderText.style.color = COLOR_RED_DARK;
      this.revealPanel.style.background = COLOR_RED_TINT;
      this.revealContinue.style.background = forceCorrectRetry
        ? '#cccccc'
        : COLOR_RED;
      this.revealContinue.style.borderBottomColor = forceCorrectRetry
        ? '#999999'
        : COLOR_RED_DARK;
      this.revealContinue.disabled = forceCorrectRetry;
      this.revealContinue.style.opacity = forceCorrectRetry ? '0.6' : '1';
      this.revealContinue.style.cursor = forceCorrectRetry
        ? 'not-allowed'
        : 'pointer';
      this.revealContinue.textContent = forceCorrectRetry
        ? 'Answer first'
        : 'Continue →';
    }

    this.revealText.textContent = explanationZh;
    this.revealPanel.style.display = 'block';
    void this.revealPanel.offsetHeight;
    this.revealPanel.style.opacity = '1';
    this.revealPanel.style.transform = 'translateY(0)';

    // Auto-scroll: ensure the Continue button is visible on short viewports.
    // Use 'end' so the bottom of the panel (CTA) is brought to the bottom
    // of the viewport. Delay slightly so the slide-up animation can start
    // first — feels less jarring than scrolling instantly.
    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.setTimeout(() => {
      try {
        this.revealPanel.scrollIntoView({
          behavior: reduceMotion ? 'auto' : 'smooth',
          block: 'end',
        });
      } catch {
        // Older browsers without smooth scroll options — fall back silently.
        this.revealPanel.scrollIntoView(false);
      }
    }, 120);
  }

  revealTimeout(correctIndex: number, explanationZh: string): void {
    this.revealAnswer(-1, correctIndex, explanationZh, false);
  }

  /**
   * v0.8 story mode — called by PlayScene after the player taps the
   * correct option on retry. Stops the bounce animation, freezes the
   * correct button (no longer clickable), enables the Continue button.
   */
  acknowledgeForceCorrect(): void {
    this.awaitingForceCorrect = false;
    this.locked = true;
    for (let i = 0; i < this.buttons.length; i++) {
      const { el, letter, label } = this.buttons[i];
      el.disabled = true;
      el.style.cursor = 'default';
      if (i === this.currentCorrectIndex) {
        el.style.animation = '';
        // v0.8.1: in blind-retry flow the correct button was never
        // painted green by revealAnswer — do it here so the player
        // sees what they finally got right.
        el.style.background = COLOR_GREEN;
        el.style.borderColor = COLOR_GREEN_DARK;
        el.style.borderBottomColor = COLOR_GREEN_DARK;
        el.style.color = '#ffffff';
        letter.style.background = '#ffffff';
        letter.style.borderColor = '#ffffff';
        letter.style.color = COLOR_GREEN_DARK;
        el.setAttribute('aria-label', `Correct answer: ${label.textContent ?? ''}`);
      }
    }
    this.revealHeaderIcon.textContent = '✓';
    this.revealHeaderIcon.style.background = COLOR_GREEN;
    this.revealHeaderIcon.style.color = '#ffffff';
    this.revealHeaderText.textContent = pickPraise(PRAISE_CORRECT);
    this.revealHeaderText.style.color = COLOR_GREEN_DARK;
    this.revealPanel.style.background = COLOR_GREEN_TINT;
    this.revealContinue.disabled = false;
    this.revealContinue.style.background = COLOR_GREEN;
    this.revealContinue.style.borderBottomColor = COLOR_GREEN_DARK;
    this.revealContinue.style.opacity = '1';
    this.revealContinue.style.cursor = 'pointer';
    this.revealContinue.textContent = 'Continue →';
    // v0.8.1: blind-retry path skipped the reveal panel earlier. Make
    // sure it's shown now with the cached explanation.
    if (this.pendingExplanationZh) {
      this.revealText.textContent = this.pendingExplanationZh;
      this.pendingExplanationZh = '';
    }
    if (this.revealPanel.style.display === 'none') {
      this.revealPanel.style.display = 'block';
      void this.revealPanel.offsetHeight;
      this.revealPanel.style.opacity = '1';
      this.revealPanel.style.transform = 'translateY(0)';
      const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.setTimeout(() => {
        try {
          this.revealPanel.scrollIntoView({
            behavior: reduceMotion ? 'auto' : 'smooth',
            block: 'end',
          });
        } catch {
          this.revealPanel.scrollIntoView(false);
        }
      }, 120);
    }
  }

  /**
   * v0.8.1 blind retry — visually mark a wrong-tapped button and disable
   * it so the player can't tap it again. Used during force-correct retry
   * when we deliberately HIDE which option is correct.
   */
  private markWrongButton(idx: number): void {
    const btn = this.buttons[idx];
    if (!btn) return;
    const { el, letter, label } = btn;
    el.disabled = true;
    el.style.cursor = 'default';
    el.style.background = COLOR_RED_TINT;
    el.style.borderColor = COLOR_RED;
    el.style.borderBottomColor = COLOR_RED_DARK;
    el.style.color = COLOR_RED_DARK;
    letter.style.background = COLOR_RED;
    letter.style.borderColor = COLOR_RED;
    letter.style.color = '#ffffff';
    el.setAttribute('aria-label', `Your wrong choice: ${label.textContent ?? ''}`);
    // v0.10 — gentle wobble (Duolingo pacing principle) replaces the
    // harsher shake on blind-retry follow-up taps. PlayScene still
    // shakes the entire app on the first wrong tap.
    el.classList.remove('pickup-wobble');
    void el.offsetWidth;
    el.classList.add('pickup-wobble');
    window.setTimeout(() => el.classList.remove('pickup-wobble'), 380);
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
