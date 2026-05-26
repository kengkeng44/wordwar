/**
 * GameHUD — owns the PlayScene DOM layout (v0.6 flex-column rework).
 *
 * v0.6 mounts the entire play-view layout into #app as flex-flow
 * children. The tree:
 *
 *   #app (flex column, padding+gap, full dvh)
 *     ├── header        (streak / progress / HP / mute)
 *     ├── chip          (scenario mode only)
 *     ├── mascotSlot    ← Mascot mounts here
 *     ├── sentenceCard  (sentence + timer pill)
 *     ├── buttonsSlot   ← ClozeUI mounts answer buttons here
 *     ├── revealSlot    ← ClozeUI mounts reveal panel here
 *     └── changeLink    ("← change")
 *
 * Other components (Mascot, ClozeUI) ask GameHUD for their slot via
 * `mascotSlot()`, `buttonsSlot()`, `revealSlot()` and mount themselves
 * into it. No more competing fixed positioning.
 *
 * Aesthetic: Duolingo — white card surface, bold rounded sans-serif,
 * green (#58cc02) primary accent, red (#ff4b4b) hearts.
 */

import { applyStyle } from './domUtil';
// audio import removed — audio managed by PlayScene/AudioManager directly, not the HUD

export interface GameHUDOptions {
  /** Hex accent color used for chip + sentence underline + timer ring. */
  accent: string;
  /** Hex tint color used for mascot halo bg. */
  tint: string;
  /** Total questions in this run. */
  totalRounds: number;
  /** Scenario chip text (empty string hides the chip). */
  scenarioLabel: string;
  /** Mascot scenario emoji. */
  emoji: string;
  /** Callback for "← change" link (back to menu). */
  onChange: () => void;
  /** v0.8 story mode: hide the HP heart counter entirely. */
  hideHp?: boolean;
}

export interface GameHUDState {
  hp: number;
  hpMax: number;
  streak: number;
  currentRound: number; // 1-based, the question being shown right now
  totalRounds: number;
  scenarioLabel: string;
  /** Sentence with placeholder; "___" runs are stylized. */
  sentence: string;
  /** Seconds remaining (display value). */
  timerSeconds: number;
  /** 0..1 ratio for timer arc. */
  timerRatio: number;
  /** True when remaining time is low → pulse + red. */
  timerLow: boolean;
  /** Show timer "expired" gray styling. */
  timerExpired: boolean;
}

export class GameHUD {
  private appRoot: HTMLElement;
  private root: HTMLDivElement;
  private header!: HTMLDivElement;
  private streakEl!: HTMLDivElement;
  private streakNum!: HTMLSpanElement;
  private progressTrack!: HTMLDivElement;
  private progressFill!: HTMLDivElement;
  private hpEl!: HTMLDivElement;
  private hpHearts: HTMLSpanElement[] = [];
  // muteBtn removed — audio always on (user controls via phone volume)
  private chipEl?: HTMLDivElement;
  private chipText!: HTMLSpanElement;
  private mascotHalo!: HTMLDivElement;
  /** Inner container inside the halo where Mascot mounts itself. */
  private mascotMount!: HTMLDivElement;
  private card!: HTMLDivElement;
  private sentenceEl!: HTMLDivElement;
  private timerEl!: HTMLDivElement;
  private timerNum!: HTMLSpanElement;
  private buttonsSlotEl!: HTMLDivElement;
  private revealSlotEl!: HTMLDivElement;
  private changeLink!: HTMLButtonElement;
  /** Flash overlay div (replaces Phaser flash overlay). */
  private flashEl!: HTMLDivElement;
  /** Ambient drifting shapes between header and mascot. */
  private ambientEls: HTMLDivElement[] = [];
  // unsubAudio removed — no audio subscription needed in HUD
  private opts: GameHUDOptions;

  constructor(opts: GameHUDOptions) {
    this.opts = opts;
    const app = document.getElementById('app');
    if (!app) {
      throw new Error('GameHUD: #app element not found');
    }
    this.appRoot = app;

    this.root = document.createElement('div');
    this.root.id = 'pickup-hud';
    applyStyle(this.root, {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'stretch',
      gap: '10px',
      width: '100%',
      flex: '1 1 auto',
      minHeight: '0',
      fontFamily:
        '"Nunito", "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      color: '#3c3c3c',
    });

    this.buildHeader();
    this.buildChip();
    this.buildAmbient();
    this.buildMascotSlot();
    this.buildSentenceCard();
    this.buildButtonsSlot();
    this.buildRevealSlot();
    this.buildChangeLink();
    this.buildFlashOverlay();

    this.appRoot.appendChild(this.root);
  }

  destroy(): void {
    this.root.remove();
    this.flashEl?.remove();
    for (const el of this.ambientEls) el.remove();
    this.ambientEls = [];
    // Reset any shake class that may have been applied.
    this.appRoot.classList.remove('pickup-shake');
  }

  /** Slot the Mascot component mounts into. */
  mascotSlot(): HTMLElement {
    return this.mascotMount;
  }

  /** Slot for the 4 answer buttons (vertical stack). */
  buttonsSlot(): HTMLElement {
    return this.buttonsSlotEl;
  }

  /** Slot for the reveal panel (initially display:none). */
  revealSlot(): HTMLElement {
    return this.revealSlotEl;
  }

  /** Trigger a CSS shake on #app (replaces Phaser camera shake). */
  shake(): void {
    this.appRoot.classList.remove('pickup-shake');
    // Force reflow so the animation restarts.
    void this.appRoot.offsetWidth;
    this.appRoot.classList.add('pickup-shake');
    window.setTimeout(() => {
      this.appRoot.classList.remove('pickup-shake');
    }, 220);
  }

  /** Trigger a CSS-driven screen flash (replaces Phaser screen flash). */
  flash(color: string, peakAlpha: number): void {
    this.flashEl.style.background = color;
    this.flashEl.style.setProperty('--flash-peak', String(peakAlpha));
    this.flashEl.classList.remove('pickup-flash-on');
    void this.flashEl.offsetWidth;
    this.flashEl.classList.add('pickup-flash-on');
  }

  // ─── Build ────────────────────────────────────────────────────────────────

  private buildHeader(): void {
    this.header = document.createElement('div');
    applyStyle(this.header, {
      width: '100%',
      padding: '6px 0 0 0',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      flex: '0 0 auto',
    });

    // Streak (left): "🔥 x N" — biggest element on the screen per Duolingo
    // hierarchy. Hot orange (--pickup-streak), bold display weight.
    this.streakEl = document.createElement('div');
    applyStyle(this.streakEl, {
      display: 'flex',
      alignItems: 'baseline',
      gap: '4px',
      minWidth: '58px',
      fontSize: '26px',
      fontWeight: '900',
      color: 'var(--pickup-streak)',
      textShadow: '0 1px 0 rgba(204, 120, 0, 0.25)',
      letterSpacing: '-0.5px',
      lineHeight: '1',
    });
    const streakLabel = document.createElement('span');
    streakLabel.textContent = '×';
    applyStyle(streakLabel, {
      fontSize: '15px',
      fontWeight: '800',
      lineHeight: '1',
      opacity: '0.9',
    });
    this.streakEl.appendChild(streakLabel);
    this.streakNum = document.createElement('span');
    this.streakNum.textContent = '0';
    applyStyle(this.streakNum, {
      fontSize: '26px',
      fontWeight: '900',
      lineHeight: '1',
      transformOrigin: 'center',
    });
    this.streakEl.appendChild(this.streakNum);
    this.header.appendChild(this.streakEl);

    // Progress bar (center, flexes)
    this.progressTrack = document.createElement('div');
    applyStyle(this.progressTrack, {
      flex: '1 1 auto',
      height: '14px',
      background: 'rgba(234, 217, 187, 0.55)',
      borderRadius: '7px',
      overflow: 'hidden',
      position: 'relative',
      boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.06)',
    });
    this.progressFill = document.createElement('div');
    applyStyle(this.progressFill, {
      width: '0%',
      height: '100%',
      background: 'var(--pickup-success)',
      borderRadius: '7px',
      transition: 'width 360ms cubic-bezier(0.2, 0.8, 0.4, 1)',
      boxShadow: 'inset 0 -3px 0 rgba(0,0,0,0.12), inset 0 2px 0 rgba(255,255,255,0.25)',
    });
    this.progressTrack.appendChild(this.progressFill);
    this.header.appendChild(this.progressTrack);

    // HP hearts (right)
    this.hpEl = document.createElement('div');
    applyStyle(this.hpEl, {
      display: 'flex',
      alignItems: 'center',
      gap: '2px',
      lineHeight: '1',
      color: 'var(--pickup-error)',
      fontWeight: '800',
      minWidth: '44px',
      justifyContent: 'flex-end',
    });
    const heart = document.createElement('span');
    heart.textContent = '♥';
    applyStyle(heart, {
      fontSize: '20px',
      fontWeight: '900',
      letterSpacing: '0px',
      opacity: '0.95',
      lineHeight: '1',
    });
    const hpCount = document.createElement('span');
    hpCount.textContent = '3';
    applyStyle(hpCount, {
      fontSize: '20px',
      fontWeight: '900',
      color: 'var(--pickup-error)',
      marginLeft: '4px',
      lineHeight: '1',
    });
    this.hpEl.appendChild(heart);
    this.hpEl.appendChild(hpCount);
    this.hpHearts = [heart, hpCount];
    this.header.appendChild(this.hpEl);
    if (this.opts.hideHp) {
      this.hpEl.style.display = 'none';
    }

    // Timer pill — right of HP (replaces former mute button; user controls audio via phone volume)
    this.timerEl = document.createElement('div');
    applyStyle(this.timerEl, {
      minWidth: '44px',
      height: '36px',
      padding: '0 10px',
      borderRadius: '10px',
      background: 'var(--pickup-surface)',
      border: '2px solid var(--pickup-border)',
      borderBottom: '3px solid var(--pickup-border-dark)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'inherit',
      fontWeight: '900',
      fontSize: '17px',
      color: 'var(--pickup-text)',
      pointerEvents: 'none',
      flex: '0 0 auto',
      transition: 'color 200ms ease, border-color 200ms ease, transform 200ms ease',
    });
    this.timerNum = document.createElement('span');
    this.timerNum.textContent = '15';
    this.timerEl.appendChild(this.timerNum);
    this.header.appendChild(this.timerEl);

    this.root.appendChild(this.header);
  }

  private buildChip(): void {
    if (!this.opts.scenarioLabel) return;
    this.chipEl = document.createElement('div');
    applyStyle(this.chipEl, {
      alignSelf: 'center',
      padding: '6px 14px',
      borderRadius: '999px',
      background: this.opts.accent,
      color: '#ffffff',
      fontSize: '12px',
      fontWeight: '900',
      letterSpacing: '0.8px',
      textTransform: 'uppercase',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1), inset 0 -2px 0 rgba(0,0,0,0.12)',
      flex: '0 0 auto',
    });
    this.chipText = document.createElement('span');
    this.chipText.textContent = this.opts.scenarioLabel;
    this.chipEl.appendChild(this.chipText);
    this.root.appendChild(this.chipEl);
  }

  private buildAmbient(): void {
    // Three ambient drifting shapes — mounted on #app, absolutely
    // positioned so they don't affect the flex flow. They sit BEHIND
    // everything (z-index 0; flex children default to auto / above).
    for (let i = 1; i <= 3; i++) {
      const el = document.createElement('div');
      el.classList.add('pickup-ambient', `pickup-ambient-${i}`);
      this.appRoot.appendChild(el);
      this.ambientEls.push(el);
    }
  }

  private buildMascotSlot(): void {
    // The halo is the colored circle that sits behind the mascot.
    // It scales together with the mascot via --mascot-scale.
    this.mascotHalo = document.createElement('div');
    applyStyle(this.mascotHalo, {
      alignSelf: 'center',
      width: 'calc(180px * var(--mascot-scale, 1))',
      height: 'calc(180px * var(--mascot-scale, 1))',
      borderRadius: '50%',
      background: this.opts.tint || '#e0f5d0',
      flex: '0 0 auto',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      transition: 'width 200ms ease-out, height 200ms ease-out',
    });
    // The mascot DOM lives inside the halo, centered on it.
    this.mascotMount = document.createElement('div');
    applyStyle(this.mascotMount, {
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    });
    this.mascotHalo.appendChild(this.mascotMount);
    this.root.appendChild(this.mascotHalo);
  }

  private buildSentenceCard(): void {
    this.card = document.createElement('div');
    this.card.classList.add('pickup-breathing');
    applyStyle(this.card, {
      width: '100%',
      background: 'var(--pickup-surface)',
      borderRadius: '18px',
      border: '2px solid var(--pickup-border)',
      borderBottom: '4px solid var(--pickup-border-dark)',
      padding: '20px 20px 16px 20px',
      boxShadow: '0 4px 14px rgba(120, 90, 40, 0.08)',
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      boxSizing: 'border-box',
      flex: '0 0 auto',
    });

    this.sentenceEl = document.createElement('div');
    applyStyle(this.sentenceEl, {
      fontSize: '20px',
      fontWeight: '700',
      lineHeight: '1.6',
      color: 'var(--pickup-text)',
      textAlign: 'center',
      display: 'block',
      minHeight: '64px',
      transition: 'opacity 260ms ease-out, transform 260ms ease-out',
      letterSpacing: '0.2px',
    });
    this.card.appendChild(this.sentenceEl);

    // Timer lives in the header row — see buildHeader. No element here.

    this.root.appendChild(this.card);
  }

  private buildButtonsSlot(): void {
    this.buttonsSlotEl = document.createElement('div');
    applyStyle(this.buttonsSlotEl, {
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      width: '100%',
      flex: '0 0 auto',
    });
    this.root.appendChild(this.buttonsSlotEl);
  }

  private buildRevealSlot(): void {
    this.revealSlotEl = document.createElement('div');
    applyStyle(this.revealSlotEl, {
      width: '100%',
      flex: '0 0 auto',
    });
    this.root.appendChild(this.revealSlotEl);
  }

  private buildChangeLink(): void {
    this.changeLink = document.createElement('button');
    this.changeLink.type = 'button';
    this.changeLink.textContent = '← Change mode';
    applyStyle(this.changeLink, {
      alignSelf: 'center',
      marginTop: 'auto',
      minHeight: '44px', // iOS touch target
      background: 'transparent',
      border: 'none',
      padding: '10px 16px',
      color: 'var(--pickup-text-muted)',
      fontFamily: 'inherit',
      fontSize: '13px',
      fontWeight: '700',
      cursor: 'pointer',
      touchAction: 'manipulation',
      WebkitTapHighlightColor: 'transparent',
      flex: '0 0 auto',
      borderRadius: '8px',
      transition: 'color 160ms ease-out, background 160ms ease-out',
    });
    this.changeLink.addEventListener('pointerover', () => {
      this.changeLink.style.color = 'var(--pickup-text)';
    });
    this.changeLink.addEventListener('pointerout', () => {
      this.changeLink.style.color = 'var(--pickup-text-muted)';
    });
    this.changeLink.addEventListener('click', (e) => {
      e.preventDefault();
      this.opts.onChange();
    });
    this.root.appendChild(this.changeLink);
  }

  private buildFlashOverlay(): void {
    this.flashEl = document.createElement('div');
    this.flashEl.id = 'pickup-flash';
    document.body.appendChild(this.flashEl);
  }

  // refreshMute removed — audio always on (user controls via phone volume)

  // ─── State update ─────────────────────────────────────────────────────────

  /** Render full state (per-round). */
  render(state: GameHUDState): void {
    this.hpHearts[1].textContent = String(Math.max(0, state.hp));

    // Streak: hide when < 2. v0.10 — bigger, brighter, more dopamine.
    if (state.streak >= 2) {
      this.streakEl.style.opacity = '1';
      this.streakNum.textContent = String(state.streak);
      // Visual treat: streaks of 5+ get a glow that scales with momentum.
      if (state.streak >= 5) {
        this.streakEl.style.filter = `drop-shadow(0 0 ${Math.min(state.streak, 10)}px rgba(255, 150, 0, 0.45))`;
      } else {
        this.streakEl.style.filter = '';
      }
    } else {
      this.streakEl.style.opacity = '0.35';
      this.streakEl.style.filter = '';
      this.streakNum.textContent = '0';
    }

    const r = Math.max(
      0,
      Math.min(1, (state.currentRound - 1) / Math.max(1, state.totalRounds))
    );
    this.progressFill.style.width = `${Math.round(r * 100)}%`;

    if (this.chipEl && state.scenarioLabel) {
      this.chipText.textContent = state.scenarioLabel;
      this.chipEl.style.display = 'inline-flex';
    } else if (this.chipEl) {
      this.chipEl.style.display = 'none';
    }

    this.sentenceEl.innerHTML = renderSentence(state.sentence);

    this.timerNum.textContent = String(state.timerSeconds);
    const low = state.timerLow;
    this.timerEl.style.color = low ? 'var(--pickup-error)' : 'var(--pickup-text)';
    this.timerEl.style.borderColor = low ? '#ffb3b3' : 'var(--pickup-border)';
    this.timerEl.style.borderBottomColor = low ? 'var(--pickup-error)' : 'var(--pickup-border-dark)';
    this.timerEl.style.transform = low ? 'scale(1.06)' : '';
  }

  /** Update timer only — called every 50ms from tick. */
  updateTimer(seconds: number, low: boolean): void {
    this.timerNum.textContent = String(seconds);
    this.timerEl.style.color = low ? 'var(--pickup-error)' : 'var(--pickup-text)';
    this.timerEl.style.borderColor = low ? '#ffb3b3' : 'var(--pickup-border)';
    this.timerEl.style.borderBottomColor = low ? 'var(--pickup-error)' : 'var(--pickup-border-dark)';
    this.timerEl.style.transform = low ? 'scale(1.06)' : '';
  }

  /** v0.8 story mode: hide the timer pill in the header. */
  hideTimer(): void {
    this.timerEl.style.display = 'none';
  }

  /** v0.8 story mode: total rounds may grow once SRS reviews are computed. */
  setTotalRounds(n: number): void {
    if (n > 0) this.opts.totalRounds = n;
  }

  /** Tiny pulse on the sentence card on round-in. v0.10 uses
   *  pickup-fade-up keyframe for consistency with the design system. */
  animateSentenceIn(): void {
    this.sentenceEl.classList.remove('pickup-fade-up');
    this.sentenceEl.style.opacity = '0';
    this.sentenceEl.style.transform = 'translateY(8px)';
    void this.sentenceEl.offsetHeight;
    this.sentenceEl.classList.add('pickup-fade-up');
    this.sentenceEl.style.opacity = '';
    this.sentenceEl.style.transform = '';
  }

  /** Heart-loss shake on the HP element. */
  shakeHp(): void {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const el = this.hpEl;
    el.animate(
      [
        { transform: 'translateX(0)' },
        { transform: 'translateX(-4px)' },
        { transform: 'translateX(4px)' },
        { transform: 'translateX(-3px)' },
        { transform: 'translateX(3px)' },
        { transform: 'translateX(0)' },
      ],
      { duration: 360, easing: 'ease-in-out' }
    );
  }

  /** Pulse the streak counter when it increments. v0.10 — uses the
   *  pickup-streak-pop keyframe (spring-easing scale + glow) on the
   *  number itself for a more satisfying dopamine hit. */
  pulseStreak(): void {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // Number pop with glow halo
    this.streakNum.classList.remove('pickup-streak-pop');
    void this.streakNum.offsetWidth;
    this.streakNum.classList.add('pickup-streak-pop');
    window.setTimeout(() => {
      this.streakNum.classList.remove('pickup-streak-pop');
    }, 520);

    // Whole element subtle bounce
    this.streakEl.animate(
      [
        { transform: 'scale(1)' },
        { transform: 'scale(1.2)' },
        { transform: 'scale(0.96)' },
        { transform: 'scale(1)' },
      ],
      { duration: 380, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }
    );
  }

  // ─── Mascot halo (color exposure for PlayScene re-tinting) ───────────────
  setMascotHaloTint(tint: string): void {
    this.mascotHalo.style.background = tint;
  }
}

/**
 * Stylize the sentence: turn runs of underscores into a visual blank
 * placeholder with an accent underline. Otherwise just text.
 */
function renderSentence(raw: string): string {
  const escaped = escapeHtml(raw);
  return escaped.replace(
    /_{3,}/g,
    () =>
      `<span aria-label="blank" style="display:inline-block;min-width:60px;border-bottom:3px solid var(--pickup-accent);margin:0 4px;padding:0 4px;color:var(--pickup-accent);">&nbsp;</span>`
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
