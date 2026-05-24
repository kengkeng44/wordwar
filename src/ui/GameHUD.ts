/**
 * GameHUD — DOM overlay that owns ALL text rendering for PlayScene.
 *
 * v0.4: Phaser canvas no longer draws text. The canvas only renders
 * solid backdrops + camera FX. Every visible string in PlayScene
 * (header HP, streak, progress bar, scenario chip, sentence body,
 * timer numeric, change-mode link, mute button) lives in the DOM
 * here so the browser renders crisp text at any device-pixel-ratio.
 *
 * Aesthetic: Duolingo. White card surface, bold rounded sans-serif,
 * green (#58cc02) primary accent, red (#ff4b4b) hearts.
 *
 * Mount/unmount lifecycle is owned by PlayScene; see PlayScene.bootstrap
 * for the create() call and SHUTDOWN handler for the destroy() call.
 */

import { applyStyle } from './domUtil';
import { audio } from '../audio/AudioManager';

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
  private root: HTMLDivElement;
  private header!: HTMLDivElement;
  private streakEl!: HTMLDivElement;
  private streakNum!: HTMLSpanElement;
  private progressTrack!: HTMLDivElement;
  private progressFill!: HTMLDivElement;
  private hpEl!: HTMLDivElement;
  private hpHearts: HTMLSpanElement[] = [];
  private muteBtn!: HTMLButtonElement;
  private chipEl?: HTMLDivElement;
  private chipText!: HTMLSpanElement;
  private mascotHalo!: HTMLDivElement;
  private card!: HTMLDivElement;
  private sentenceEl!: HTMLDivElement;
  private timerEl!: HTMLDivElement;
  private timerNum!: HTMLSpanElement;
  private changeLink!: HTMLButtonElement;
  private unsubAudio?: () => void;
  private opts: GameHUDOptions;

  constructor(opts: GameHUDOptions) {
    this.opts = opts;
    this.root = document.createElement('div');
    this.root.id = 'wordwar-hud';
    applyStyle(this.root, {
      position: 'fixed',
      inset: '0',
      pointerEvents: 'none',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      zIndex: '9',
      fontFamily:
        '"Nunito", "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      color: '#3c3c3c',
    });

    this.buildHeader();
    this.buildChip();
    this.buildMascotHalo();
    this.buildSentenceCard();
    this.buildChangeLink();

    document.body.appendChild(this.root);

    this.unsubAudio = audio.subscribe(() => this.refreshMute());
    this.refreshMute();
  }

  destroy(): void {
    this.unsubAudio?.();
    this.root.remove();
  }

  // ─── Build ────────────────────────────────────────────────────────────────

  private buildHeader(): void {
    this.header = document.createElement('div');
    applyStyle(this.header, {
      pointerEvents: 'auto',
      width: 'min(420px, calc(100vw - 24px))',
      marginTop: 'max(12px, env(safe-area-inset-top))',
      padding: '10px 12px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
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
      // Light shine on top half
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
    // Lazy: rebuild on first render() to honor hpMax. Start with a single heart icon + count.
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

    // Mute btn (right of HP)
    this.muteBtn = document.createElement('button');
    this.muteBtn.type = 'button';
    this.muteBtn.setAttribute('aria-label', 'Toggle mute');
    applyStyle(this.muteBtn, {
      pointerEvents: 'auto',
      width: '34px',
      height: '34px',
      borderRadius: '10px',
      background: '#ffffff',
      border: '2px solid #e5e5e5',
      borderBottom: '3px solid #d4d4d4',
      cursor: 'pointer',
      padding: '0',
      fontSize: '16px',
      lineHeight: '1',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      touchAction: 'manipulation',
      WebkitTapHighlightColor: 'transparent',
      fontFamily: 'inherit',
    });
    this.muteBtn.addEventListener('click', (e) => {
      e.preventDefault();
      audio.ensureContext();
      audio.toggleAudioMuted();
    });
    this.header.appendChild(this.muteBtn);

    this.root.appendChild(this.header);
  }

  private buildChip(): void {
    if (!this.opts.scenarioLabel) return;
    this.chipEl = document.createElement('div');
    applyStyle(this.chipEl, {
      pointerEvents: 'none',
      marginTop: '4px',
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
    });
    this.chipText = document.createElement('span');
    this.chipText.textContent = this.opts.scenarioLabel;
    this.chipEl.appendChild(this.chipText);
    this.root.appendChild(this.chipEl);
  }

  private buildMascotHalo(): void {
    // Light circular tint behind the Mascot SVG. Sits at fixed Y; mascot
    // floats above on top of it via z-index.
    this.mascotHalo = document.createElement('div');
    applyStyle(this.mascotHalo, {
      pointerEvents: 'none',
      marginTop: '14px',
      width: '180px',
      height: '180px',
      borderRadius: '50%',
      background: this.opts.tint || '#e0f5d0',
      // Sits behind the Mascot DOM (mascot z=8, hud z=9 but halo is empty).
      // We render the halo above to provide the colored circle; mascot uses
      // its own fixed positioning and floats above via its z-index trick
      // — keep this halo at a sentinel so it visually sits where mascot is.
      flex: '0 0 auto',
    });
    this.root.appendChild(this.mascotHalo);
  }

  private buildSentenceCard(): void {
    this.card = document.createElement('div');
    applyStyle(this.card, {
      pointerEvents: 'none',
      width: 'min(420px, calc(100vw - 24px))',
      marginTop: '18px',
      background: '#ffffff',
      borderRadius: '16px',
      border: '2px solid #e5e5e5',
      padding: '20px 18px 16px 18px',
      boxShadow: '0 4px 10px rgba(0,0,0,0.06)',
      position: 'relative',
      minHeight: '110px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
    });

    this.sentenceEl = document.createElement('div');
    applyStyle(this.sentenceEl, {
      fontSize: '22px',
      fontWeight: '700',
      lineHeight: '1.45',
      color: '#3c3c3c',
      textAlign: 'center',
      flex: '1 1 auto',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'opacity 220ms ease-out, transform 220ms ease-out',
    });
    this.card.appendChild(this.sentenceEl);

    // Timer (bottom-right corner of card)
    this.timerEl = document.createElement('div');
    applyStyle(this.timerEl, {
      position: 'absolute',
      top: '-14px',
      right: '14px',
      width: '40px',
      height: '40px',
      borderRadius: '50%',
      background: '#ffffff',
      border: '3px solid #e5e5e5',
      borderBottom: '5px solid #d4d4d4',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'inherit',
      fontWeight: '800',
      fontSize: '16px',
      color: '#3c3c3c',
      pointerEvents: 'none',
      transition: 'color 200ms ease, border-color 200ms ease',
    });
    this.timerNum = document.createElement('span');
    this.timerNum.textContent = '15';
    this.timerEl.appendChild(this.timerNum);
    this.card.appendChild(this.timerEl);

    this.root.appendChild(this.card);
  }

  private buildChangeLink(): void {
    this.changeLink = document.createElement('button');
    this.changeLink.type = 'button';
    this.changeLink.textContent = '← change';
    applyStyle(this.changeLink, {
      pointerEvents: 'auto',
      marginTop: '10px',
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
    });
    this.changeLink.addEventListener('click', (e) => {
      e.preventDefault();
      this.opts.onChange();
    });
    this.root.appendChild(this.changeLink);
  }

  private refreshMute(): void {
    const muted = audio.audioMuted;
    this.muteBtn.textContent = muted ? '\u{1F507}' : '\u{1F50A}';
    this.muteBtn.style.color = muted ? '#ff4b4b' : '#777777';
  }

  // ─── State update ─────────────────────────────────────────────────────────

  /** Render full state (per-round). */
  render(state: GameHUDState): void {
    // Header HP — number style: a single big red heart + count to avoid
    // drift between hpMax sizes; visually consistent with Duolingo.
    this.hpHearts[1].textContent = String(Math.max(0, state.hp));

    // Streak: hide when < 2 (consistent with v0.3 behaviour)
    if (state.streak >= 2) {
      this.streakEl.style.opacity = '1';
      this.streakNum.textContent = String(state.streak);
    } else {
      this.streakEl.style.opacity = '0.35';
      this.streakNum.textContent = '0';
    }

    // Progress: ratio = (currentRound - 1) / total (so first question
    // shows empty bar). Clamp to [0, 1].
    const r = Math.max(
      0,
      Math.min(1, (state.currentRound - 1) / Math.max(1, state.totalRounds))
    );
    this.progressFill.style.width = `${Math.round(r * 100)}%`;

    // Chip
    if (this.chipEl && state.scenarioLabel) {
      this.chipText.textContent = state.scenarioLabel;
      this.chipEl.style.display = 'inline-flex';
    } else if (this.chipEl) {
      this.chipEl.style.display = 'none';
    }

    // Sentence
    this.sentenceEl.innerHTML = renderSentence(state.sentence);

    // Timer numeric
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

  /** Tiny pulse on the sentence card on round-in. */
  animateSentenceIn(): void {
    this.sentenceEl.style.opacity = '0';
    this.sentenceEl.style.transform = 'translateY(-6px)';
    // Trigger reflow then animate.
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
