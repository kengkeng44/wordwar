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
    this.root.id = 'wordwar-hud';
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
    this.appRoot.classList.remove('wordwar-shake');
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
    this.appRoot.classList.remove('wordwar-shake');
    // Force reflow so the animation restarts.
    void this.appRoot.offsetWidth;
    this.appRoot.classList.add('wordwar-shake');
    window.setTimeout(() => {
      this.appRoot.classList.remove('wordwar-shake');
    }, 220);
  }

  /** Trigger a CSS-driven screen flash (replaces Phaser screen flash). */
  flash(color: string, peakAlpha: number): void {
    this.flashEl.style.background = color;
    this.flashEl.style.setProperty('--flash-peak', String(peakAlpha));
    this.flashEl.classList.remove('wordwar-flash-on');
    void this.flashEl.offsetWidth;
    this.flashEl.classList.add('wordwar-flash-on');
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

    // Streak (left): 🔥 + number
    this.streakEl = document.createElement('div');
    applyStyle(this.streakEl, {
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      minWidth: '50px',
      fontSize: '18px',
      fontWeight: '800',
      color: '#ff9600',
    });
    const flame = document.createElement('span');
    flame.textContent = '\u{1F525}';
    applyStyle(flame, { fontSize: '20px', lineHeight: '1' });
    this.streakEl.appendChild(flame);
    this.streakNum = document.createElement('span');
    this.streakNum.textContent = '0';
    this.streakEl.appendChild(this.streakNum);
    this.header.appendChild(this.streakEl);

    // Progress bar (center, flexes)
    this.progressTrack = document.createElement('div');
    applyStyle(this.progressTrack, {
      flex: '1 1 auto',
      height: '14px',
      background: '#e5e5e5',
      borderRadius: '7px',
      overflow: 'hidden',
      position: 'relative',
    });
    this.progressFill = document.createElement('div');
    applyStyle(this.progressFill, {
      width: '0%',
      height: '100%',
      background: '#58cc02',
      borderRadius: '7px',
      transition: 'width 240ms ease-out',
      boxShadow: 'inset 0 -3px 0 rgba(0,0,0,0.08)',
    });
    this.progressTrack.appendChild(this.progressFill);
    this.header.appendChild(this.progressTrack);

    // HP hearts (right)
    this.hpEl = document.createElement('div');
    applyStyle(this.hpEl, {
      display: 'flex',
      alignItems: 'center',
      gap: '2px',
      fontSize: '20px',
      lineHeight: '1',
      color: '#ff4b4b',
      fontWeight: '800',
      minWidth: '40px',
      justifyContent: 'flex-end',
    });
    const heart = document.createElement('span');
    heart.textContent = '❤';
    applyStyle(heart, { fontSize: '22px' });
    const hpCount = document.createElement('span');
    hpCount.textContent = '3';
    applyStyle(hpCount, {
      fontSize: '18px',
      fontWeight: '800',
      color: '#ff4b4b',
      marginLeft: '2px',
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
      minWidth: '38px',
      height: '34px',
      padding: '0 10px',
      borderRadius: '10px',
      background: '#ffffff',
      border: '2px solid #e5e5e5',
      borderBottom: '3px solid #d4d4d4',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'inherit',
      fontWeight: '800',
      fontSize: '15px',
      color: '#3c3c3c',
      pointerEvents: 'none',
      flex: '0 0 auto',
      transition: 'color 200ms ease, border-color 200ms ease',
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
      padding: '5px 12px',
      borderRadius: '999px',
      background: this.opts.accent,
      color: '#ffffff',
      fontSize: '12px',
      fontWeight: '800',
      letterSpacing: '0.3px',
      textTransform: 'uppercase',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
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
      el.classList.add('wordwar-ambient', `wordwar-ambient-${i}`);
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
    this.card.classList.add('wordwar-breathing');
    applyStyle(this.card, {
      width: '100%',
      background: '#ffffff',
      borderRadius: '16px',
      border: '2px solid #e5e5e5',
      padding: '18px 18px 14px 18px',
      boxShadow: '0 4px 10px rgba(0,0,0,0.06)',
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
      lineHeight: '1.55',
      color: '#3c3c3c',
      textAlign: 'center',
      display: 'block',
      minHeight: '60px',
      transition: 'opacity 220ms ease-out, transform 220ms ease-out',
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
    this.changeLink.textContent = '← change';
    applyStyle(this.changeLink, {
      alignSelf: 'center',
      marginTop: 'auto',
      background: 'transparent',
      border: 'none',
      padding: '6px 10px',
      color: '#777777',
      fontFamily: 'inherit',
      fontSize: '12px',
      fontWeight: '600',
      cursor: 'pointer',
      touchAction: 'manipulation',
      WebkitTapHighlightColor: 'transparent',
      flex: '0 0 auto',
    });
    this.changeLink.addEventListener('click', (e) => {
      e.preventDefault();
      this.opts.onChange();
    });
    this.root.appendChild(this.changeLink);
  }

  private buildFlashOverlay(): void {
    this.flashEl = document.createElement('div');
    this.flashEl.id = 'wordwar-flash';
    document.body.appendChild(this.flashEl);
  }

  // refreshMute removed — audio always on (user controls via phone volume)

  // ─── State update ─────────────────────────────────────────────────────────

  /** Render full state (per-round). */
  render(state: GameHUDState): void {
    this.hpHearts[1].textContent = String(Math.max(0, state.hp));

    // Streak: hide when < 2 (consistent with v0.3 behaviour)
    if (state.streak >= 2) {
      this.streakEl.style.opacity = '1';
      this.streakNum.textContent = String(state.streak);
    } else {
      this.streakEl.style.opacity = '0.35';
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
    this.timerEl.style.color = low ? '#ff4b4b' : '#3c3c3c';
    this.timerEl.style.borderColor = low ? '#ffb3b3' : '#e5e5e5';
    this.timerEl.style.borderBottomColor = low ? '#ff4b4b' : '#d4d4d4';
  }

  /** Update timer only — called every 50ms from tick. */
  updateTimer(seconds: number, low: boolean): void {
    this.timerNum.textContent = String(seconds);
    this.timerEl.style.color = low ? '#ff4b4b' : '#3c3c3c';
    this.timerEl.style.borderColor = low ? '#ffb3b3' : '#e5e5e5';
    this.timerEl.style.borderBottomColor = low ? '#ff4b4b' : '#d4d4d4';
  }

  /** v0.8 story mode: hide the timer pill in the header. */
  hideTimer(): void {
    this.timerEl.style.display = 'none';
  }

  /** v0.8 story mode: total rounds may grow once SRS reviews are computed. */
  setTotalRounds(n: number): void {
    if (n > 0) this.opts.totalRounds = n;
  }

  /** Tiny pulse on the sentence card on round-in. */
  animateSentenceIn(): void {
    this.sentenceEl.style.opacity = '0';
    this.sentenceEl.style.transform = 'translateY(-6px)';
    void this.sentenceEl.offsetHeight;
    this.sentenceEl.style.opacity = '1';
    this.sentenceEl.style.transform = 'translateY(0)';
  }

  /** Heart-loss shake on the HP element. */
  shakeHp(): void {
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

  /** Pulse the streak counter when it increments. */
  pulseStreak(): void {
    this.streakEl.animate(
      [
        { transform: 'scale(1)' },
        { transform: 'scale(1.18)' },
        { transform: 'scale(1)' },
      ],
      { duration: 280, easing: 'ease-out' }
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
      `<span style="display:inline-block;min-width:60px;border-bottom:3px solid #58cc02;margin:0 4px;padding:0 4px;color:#58cc02;">&nbsp;</span>`
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
