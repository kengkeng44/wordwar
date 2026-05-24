import Phaser from 'phaser';
import { useRunStore, RUN_CONFIG } from '../store/runStore';
import { audio } from '../audio/AudioManager';
import { startBgm } from '../audio/bgm';
import {
  sfxCorrect,
  sfxWrong,
  sfxTimerTick,
  sfxRoundTransition,
  sfxHpLoss,
} from '../audio/sfx';
import { ClozeUI } from '../ui/ClozeUI';
import { Mascot } from '../ui/Mascot';
import { GameHUD } from '../ui/GameHUD';
import { SCENARIO_META, FREE_PRACTICE_META } from '../data/scenarios';
import { PHASER_WIDTH, PHASER_HEIGHT } from '../main';

const ROUND_TIME_MS = 15_000;
const HP_MAX = 3;
const ADVANCE_CORRECT_MS = 4_000;
const ADVANCE_WRONG_MS = 8_000;
const ADVANCE_TIMEOUT_MS = 8_000;
const TIMER_LOW_THRESHOLD_MS = 5_000;

/**
 * PlayScene (v0.4 — Duolingo aesthetic + DOM-only text).
 *
 * Architecture: the Phaser canvas is now a thin backdrop layer. It draws
 * only solid background color and the screen-flash overlay rectangle.
 * Camera shake stays in Phaser. EVERY piece of text in the play view —
 * header (streak / progress / HP), scenario chip, sentence body, timer
 * numeric, mute button, change-mode link, answer buttons, reveal panel —
 * lives in DOM via GameHUD / ClozeUI / Mascot. This fixes the high-DPR
 * blur (Phaser bitmap text was being upscaled without re-rasterisation).
 */
export class PlayScene extends Phaser.Scene {
  private flashOverlay!: Phaser.GameObjects.Rectangle;

  private hud?: GameHUD;
  private clozeUI?: ClozeUI;
  private mascot?: Mascot;

  private roundEndsAt = 0;
  private timerEvent?: Phaser.Time.TimerEvent;
  private timerExpired = false;
  private lastTickSecond = -1;
  private warningPlaying = false;
  private advanceTimer?: Phaser.Time.TimerEvent;
  private locked = false;

  // Loading state DOM element (only shown until content loads / on retry).
  private loadingEl?: HTMLDivElement;
  private retryEl?: HTMLButtonElement;

  constructor() {
    super({ key: 'PlayScene' });
  }

  create(): void {
    const W = PHASER_WIDTH;
    const H = PHASER_HEIGHT;
    // Duolingo default background: pure white. Scenario tint shows
    // through the HUD halo / chip, not the body.
    this.cameras.main.setBackgroundColor('#ffffff');

    // Screen-flash overlay (Phaser-side FX layer).
    this.flashOverlay = this.add
      .rectangle(W / 2, H / 2, W, H, 0x58cc02, 0)
      .setDepth(1000);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.cleanupOverlay();
    });

    this.showLoadingDom();
    this.bootstrap();
  }

  // ─── Scenario meta accessors ───────────────────────────────────────────────

  private activeMeta(): {
    accent: string;
    tint: string;
    mascotId: string;
    emoji: string;
    labelZh: string;
    labelEn: string;
  } {
    const { mode, scenario } = useRunStore.getState();
    if (mode === 'scenario' && scenario) {
      return SCENARIO_META[scenario];
    }
    return FREE_PRACTICE_META;
  }

  // ─── Bootstrap & loading ────────────────────────────────────────────────────

  private async bootstrap(): Promise<void> {
    const store = useRunStore.getState();
    try {
      if (store.mode === 'scenario') {
        await store.loadScenarios();
      } else {
        await store.loadSentences();
      }
    } catch {
      // setError already happened inside the loader
    }
    const after = useRunStore.getState();
    const ready =
      after.mode === 'scenario'
        ? !!after.scenarioQuestions
        : !!after.questions;
    if (after.error || !ready) {
      this.showLoadFailure(after.error ?? 'unknown');
      return;
    }

    this.hideLoadingDom();
    store.reset();

    const meta = this.activeMeta();
    const isScenario = useRunStore.getState().mode === 'scenario';
    const scenarioLabel = isScenario
      ? `${meta.emoji} ${meta.labelEn}`
      : '';

    // Mount DOM overlays.
    this.hud = new GameHUD({
      accent: meta.accent,
      tint: this.lightTintFor(meta.tint),
      totalRounds: RUN_CONFIG.QUESTIONS_PER_RUN,
      scenarioLabel,
      emoji: meta.emoji,
      onChange: () => {
        this.cleanupOverlay();
        this.stopTimer();
        this.scene.start('MenuScene');
      },
    });

    this.clozeUI = new ClozeUI(
      {
        onAnswer: (idx) => this.handleAnswer(idx),
        onContinue: () => this.handleContinue(),
      },
      { accent: meta.accent }
    );
    this.mascot = new Mascot();
    this.mascot.setScenarioStripVisible(isScenario);
    this.mascot.setMascot(meta.mascotId);

    this.nextRound();
  }

  /**
   * Scenario tint comes through fairly saturated (e.g. #fff1e0). The HUD
   * halo wants a Duolingo-style soft pastel that still reads as the
   * scenario color. We use the tint as-is — it's already pastel.
   * Returned for future tweaking if needed.
   */
  private lightTintFor(tint: string): string {
    return tint;
  }

  private showLoadingDom(): void {
    if (this.loadingEl) return;
    this.loadingEl = document.createElement('div');
    this.loadingEl.id = 'wordwar-loading';
    Object.assign(this.loadingEl.style, {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      fontFamily:
        '"Nunito", "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      fontSize: '18px',
      fontWeight: '700',
      color: '#777777',
      zIndex: '11',
      pointerEvents: 'none',
      textAlign: 'center',
    } as CSSStyleDeclaration);
    this.loadingEl.textContent = 'Loading…';
    document.body.appendChild(this.loadingEl);
  }

  private hideLoadingDom(): void {
    this.loadingEl?.remove();
    this.loadingEl = undefined;
    this.retryEl?.remove();
    this.retryEl = undefined;
  }

  private showLoadFailure(reason: string): void {
    if (this.loadingEl) {
      this.loadingEl.innerHTML = `Failed to load<br><span style="font-weight:600;color:#ff4b4b;font-size:14px;">${escapeHtml(reason)}</span>`;
    }
    if (this.retryEl) return;
    this.retryEl = document.createElement('button');
    this.retryEl.type = 'button';
    this.retryEl.textContent = 'Retry';
    Object.assign(this.retryEl.style, {
      position: 'fixed',
      top: 'calc(50% + 60px)',
      left: '50%',
      transform: 'translateX(-50%)',
      padding: '14px 36px',
      background: '#58cc02',
      color: '#ffffff',
      border: 'none',
      borderBottom: '4px solid #58a700',
      borderRadius: '14px',
      fontSize: '17px',
      fontWeight: '800',
      cursor: 'pointer',
      fontFamily:
        '"Nunito", "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      letterSpacing: '0.5px',
      textTransform: 'uppercase',
      pointerEvents: 'auto',
      zIndex: '12',
      touchAction: 'manipulation',
    } as CSSStyleDeclaration);
    this.retryEl.addEventListener('click', (e) => {
      e.preventDefault();
      this.retryEl?.remove();
      this.retryEl = undefined;
      if (this.loadingEl) this.loadingEl.textContent = 'Loading…';
      this.bootstrap();
    });
    document.body.appendChild(this.retryEl);
  }

  // ─── Round lifecycle ────────────────────────────────────────────────────────

  private nextRound(): void {
    this.clearTimer();
    this.cancelAdvanceTimer();
    this.locked = false;
    this.stopWarning();

    const store = useRunStore.getState();

    const rounds = store.history.length;
    if (rounds >= RUN_CONFIG.QUESTIONS_PER_RUN || store.hp <= 0) {
      this.toEnd();
      return;
    }

    store.startRound();
    const after = useRunStore.getState();
    if (!after.round) {
      this.toEnd();
      return;
    }

    this.clozeUI?.resetForRound();
    this.mascot?.setAnim('idle');
    this.timerExpired = false;
    this.lastTickSecond = -1;
    this.renderHud();
    this.hud?.animateSentenceIn();
    this.startTimer();

    if (rounds > 0) {
      sfxRoundTransition();
    }
  }

  private toEnd(): void {
    this.cleanupOverlay();
    this.scene.start('EndScene');
  }

  private cleanupOverlay(): void {
    this.hideLoadingDom();
    this.clozeUI?.destroy();
    this.clozeUI = undefined;
    this.mascot?.destroy();
    this.mascot = undefined;
    this.hud?.destroy();
    this.hud = undefined;
    this.stopWarning();
  }

  private maybeStartBgm(): void {
    if (audio.audioMuted) return;
    if (audio.isBgmRunning) return;
    const ctx = audio.ensureContext();
    if (!ctx) return;
    startBgm();
  }

  private renderHud(): void {
    if (!this.hud) return;
    const state = useRunStore.getState();
    const round = state.round;
    if (!round) return;

    const meta = this.activeMeta();
    const isScenario = state.mode === 'scenario';
    const qNum = Math.min(
      state.history.length + 1,
      RUN_CONFIG.QUESTIONS_PER_RUN
    );

    const remaining = Math.max(0, this.roundEndsAt - this.time.now);
    const seconds = Math.ceil((remaining || ROUND_TIME_MS) / 1000);
    const low = remaining > 0 && remaining <= TIMER_LOW_THRESHOLD_MS;

    this.hud.render({
      hp: state.hp,
      hpMax: HP_MAX,
      streak: state.streak,
      currentRound: qNum,
      totalRounds: RUN_CONFIG.QUESTIONS_PER_RUN,
      scenarioLabel: isScenario
        ? `${meta.emoji} ${meta.labelEn} · ${qNum}/${RUN_CONFIG.QUESTIONS_PER_RUN}`
        : '',
      sentence: formatSentence(round.sentence),
      timerSeconds: seconds,
      timerRatio: remaining / ROUND_TIME_MS,
      timerLow: low,
      timerExpired: this.timerExpired,
    });
  }

  // ─── Answer / reveal flow ───────────────────────────────────────────────────

  private handleAnswer(idx: number): void {
    if (this.locked || this.timerExpired) return;
    this.locked = true;
    this.stopTimer();
    this.maybeStartBgm();

    const state = useRunStore.getState();
    if (!state.round) return;
    const prevStreak = state.streak;
    const result = state.answer(idx);

    this.clozeUI?.revealAnswer(
      idx,
      result.correctIndex,
      result.explanationZh,
      result.correct
    );

    if (result.correct) {
      this.mascot?.setAnim('happy');
      this.playScreenFlash(0x58cc02, 0.15);
      sfxCorrect();
      audio.vibrate(30);
      if (result.streak > prevStreak && result.streak >= 2) {
        this.hud?.pulseStreak();
      }
      this.scheduleAdvance(ADVANCE_CORRECT_MS);
    } else {
      this.mascot?.setAnim('sad');
      this.hud?.shakeHp();
      this.playScreenFlash(0xff4b4b, 0.13);
      this.cameras.main.shake(180, 0.004);
      sfxWrong();
      sfxHpLoss();
      audio.vibrate([50, 30, 50]);
      this.scheduleAdvance(ADVANCE_WRONG_MS);
    }

    this.renderHud();
  }

  private handleContinue(): void {
    if (!this.locked && !this.timerExpired) return;
    this.cancelAdvanceTimer();
    this.nextRound();
  }

  private scheduleAdvance(ms: number): void {
    this.cancelAdvanceTimer();
    this.advanceTimer = this.time.delayedCall(ms, () => this.nextRound());
  }

  private cancelAdvanceTimer(): void {
    if (this.advanceTimer) {
      this.advanceTimer.remove(false);
      this.advanceTimer = undefined;
    }
  }

  // ─── Timer ──────────────────────────────────────────────────────────────────

  private startTimer(): void {
    this.roundEndsAt = this.time.now + ROUND_TIME_MS;
    this.timerEvent = this.time.addEvent({
      delay: 100,
      loop: true,
      callback: () => this.tickTimer(),
    });
    this.tickTimer();
  }

  private tickTimer(): void {
    const remaining = Math.max(0, this.roundEndsAt - this.time.now);
    const seconds = Math.ceil(remaining / 1000);
    const low = remaining <= TIMER_LOW_THRESHOLD_MS && remaining > 0;

    this.hud?.updateTimer(seconds, low);

    if (low && !this.warningPlaying && !this.locked) {
      audio.playWarningLayer();
      this.warningPlaying = true;
    }

    if (low && seconds !== this.lastTickSecond) {
      this.lastTickSecond = seconds;
      sfxTimerTick();
      audio.vibrate(20);
    }
    if (!low) this.lastTickSecond = -1;

    if (remaining <= 0 && !this.timerExpired && !this.locked) {
      this.timerExpired = true;
      this.handleTimeout();
    }
  }

  private stopWarning(): void {
    if (this.warningPlaying) {
      audio.stopWarningLayer();
      this.warningPlaying = false;
    }
  }

  private handleTimeout(): void {
    this.locked = true;
    this.stopTimer();
    const result = useRunStore.getState().timeoutRound();
    this.clozeUI?.revealTimeout(result.correctIndex, result.explanationZh);
    this.mascot?.setAnim('sad');
    this.hud?.shakeHp();
    this.playScreenFlash(0xff4b4b, 0.13);
    this.cameras.main.shake(180, 0.004);
    sfxHpLoss();
    audio.vibrate([80, 40, 80]);
    this.renderHud();
    this.scheduleAdvance(ADVANCE_TIMEOUT_MS);
  }

  private stopTimer(): void {
    if (this.timerEvent) {
      this.timerEvent.remove(false);
      this.timerEvent = undefined;
    }
    this.stopWarning();
  }

  private clearTimer(): void {
    this.stopTimer();
    this.hud?.updateTimer(15, false);
  }

  // ─── FX ─────────────────────────────────────────────────────────────────────

  private playScreenFlash(color: number, peakAlpha: number): void {
    this.flashOverlay.setFillStyle(color);
    this.flashOverlay.setAlpha(0);
    this.tweens.add({
      targets: this.flashOverlay,
      alpha: { from: peakAlpha, to: 0 },
      duration: 280,
      ease: 'Quad.easeOut',
    });
  }
}

function formatSentence(raw: string): string {
  return raw.replace(/_{3,}/g, '_____');
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
