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
import { CHAPTER_META } from '../data/storyKitten';

const ROUND_TIME_MS = 15_000;
const HP_MAX = 3;
const ADVANCE_CORRECT_MS = 4_000;
const ADVANCE_WRONG_MS = 8_000;
const ADVANCE_TIMEOUT_MS = 8_000;
const STORY_ADVANCE_CORRECT_MS = 1_400; // story: brief celebrate then auto-advance (v0.10 +200ms for breathing)
const ROUND_TRANSITION_BREATHING_MS = 250; // v0.10 — Duolingo pacing pause between rounds
const TIMER_LOW_THRESHOLD_MS = 5_000;

/**
 * PlayScene (v0.6 — flex-column DOM layout).
 *
 * v0.6 architecture: the Phaser canvas is hidden via CSS. The scene
 * still runs (timers + tweens drive round progression + count-ups) but
 * renders no visible pixels. GameHUD owns the flex-column layout
 * inside #app and exposes slots that Mascot + ClozeUI mount into.
 * Camera shake + screen flash run as CSS animations driven by GameHUD.
 */
export class PlayScene extends Phaser.Scene {
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
    // Phaser canvas is hidden via CSS — no Phaser-side rendering needed.
    this.cameras.main.setBackgroundColor('#ffffff');

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
    const { mode, scenario, chapter } = useRunStore.getState();
    if (mode === 'story' && chapter) {
      const ch = CHAPTER_META[chapter];
      return {
        accent: ch.accent,
        tint: ch.tint,
        mascotId: ch.kittenMascotId,
        emoji: ch.emoji,
        labelZh: ch.titleZh,
        labelEn: ch.titleEn,
      };
    }
    if (mode === 'scenario' && scenario) {
      return SCENARIO_META[scenario];
    }
    return FREE_PRACTICE_META;
  }

  private isStoryMode(): boolean {
    return useRunStore.getState().mode === 'story';
  }

  // ─── Bootstrap & loading ────────────────────────────────────────────────────

  private async bootstrap(): Promise<void> {
    const store = useRunStore.getState();
    try {
      // v0.5: load BOTH sentences + scenarios eagerly. Free mode needs
      // both files (unified 130-question pool); scenario mode obviously
      // needs scenarios.json; loading the smaller sentences.json on top
      // for scenario mode is negligible.
      await store.loadContent();
    } catch {
      // setError already happened inside the loader
    }
    const after = useRunStore.getState();
    const ready =
      after.mode === 'scenario'
        ? !!after.scenarioQuestions
        : !!after.questions && !!after.scenarioQuestions;
    if (after.error || !ready) {
      this.showLoadFailure(after.error ?? 'unknown');
      return;
    }

    this.hideLoadingDom();
    store.reset();

    const meta = this.activeMeta();
    const state = useRunStore.getState();
    const isStory = state.mode === 'story';
    const isScenario = state.mode === 'scenario';
    const chipLabel = isStory
      ? `Chapter ${state.chapter} · ${meta.labelEn}`
      : isScenario
        ? meta.labelEn
        : '';

    // Story mode: total rounds = SRS + 6 chapter questions. Computed in
    // startRound; if not yet set we approximate with 6 for now.
    const totalRounds = isStory
      ? Math.max(state.storyTotalQuestionCount, RUN_CONFIG.STORY_QUESTIONS_PER_CHAPTER)
      : RUN_CONFIG.QUESTIONS_PER_RUN;

    // Mount DOM overlays.
    this.hud = new GameHUD({
      accent: meta.accent,
      tint: this.lightTintFor(meta.tint),
      totalRounds,
      scenarioLabel: chipLabel,
      emoji: meta.emoji,
      hideHp: isStory,
      onChange: () => {
        this.cleanupOverlay();
        this.stopTimer();
        if (isStory) {
          this.scene.start('StoryModeScene');
        } else {
          this.scene.start('MenuScene');
        }
      },
    });

    this.clozeUI = new ClozeUI(
      {
        onAnswer: (idx) => this.handleAnswer(idx),
        onContinue: () => this.handleContinue(),
        onForceCorrect: (idx) => this.handleForceCorrect(idx),
      },
      {
        accent: meta.accent,
        buttonsSlot: this.hud.buttonsSlot(),
        revealSlot: this.hud.revealSlot(),
        forceCorrectMode: isStory,
      }
    );
    this.mascot = new Mascot({ parent: this.hud.mascotSlot() });
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
    this.loadingEl.id = 'pickup-loading';
    Object.assign(this.loadingEl.style, {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      fontFamily:
        '"Noto Sans TC", "Nunito", system-ui, -apple-system, sans-serif',
      fontSize: '17px',
      fontWeight: '700',
      color: 'var(--pickup-text-muted)',
      zIndex: '11',
      pointerEvents: 'none',
      textAlign: 'center',
      animation: 'pickup-pulse 1.6s ease-in-out infinite',
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
      this.loadingEl.style.animation = '';
      this.loadingEl.innerHTML = `Loading failed, try again?<br><span style="font-weight:600;color:var(--pickup-error);font-size:13px;">${escapeHtml(reason)}</span>`;
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
      minHeight: '52px',
      padding: '14px 36px',
      background: 'var(--pickup-success)',
      color: '#ffffff',
      border: 'none',
      borderBottom: '4px solid var(--pickup-success-dark)',
      borderRadius: '14px',
      fontSize: '17px',
      fontWeight: '900',
      cursor: 'pointer',
      fontFamily:
        '"Noto Sans TC", "Nunito", system-ui, -apple-system, sans-serif',
      letterSpacing: '0.5px',
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
    const isStory = this.isStoryMode();

    const rounds = store.history.length;
    const target = isStory
      ? Math.max(store.storyTotalQuestionCount, RUN_CONFIG.STORY_QUESTIONS_PER_CHAPTER)
      : RUN_CONFIG.QUESTIONS_PER_RUN;
    if (rounds >= target && target > 0) {
      this.toEnd();
      return;
    }
    if (!isStory && store.hp <= 0) {
      this.toEnd();
      return;
    }

    store.startRound();
    const after = useRunStore.getState();
    if (!after.round) {
      this.toEnd();
      return;
    }

    // After first startRound in story mode the total may now be known.
    if (isStory && this.hud) {
      this.hud.setTotalRounds(after.storyTotalQuestionCount);
    }

    this.clozeUI?.resetForRound();
    this.mascot?.setAnim('idle');
    this.timerExpired = false;
    this.lastTickSecond = -1;
    this.renderHud();
    this.hud?.animateSentenceIn();
    // Story mode: no timer (force-correct flow makes the timeout pressure
    // counterproductive and stressful).
    if (!isStory) {
      this.startTimer();
    } else {
      this.hud?.hideTimer();
    }

    if (rounds > 0) {
      sfxRoundTransition();
    }
  }

  private toEnd(): void {
    const isStory = this.isStoryMode();
    this.cleanupOverlay();
    if (isStory) {
      this.scene.start('ChapterEndScene');
    } else {
      this.scene.start('EndScene');
    }
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
    const isStory = state.mode === 'story';
    const isScenario = state.mode === 'scenario';
    const total = isStory
      ? Math.max(state.storyTotalQuestionCount, RUN_CONFIG.STORY_QUESTIONS_PER_CHAPTER)
      : RUN_CONFIG.QUESTIONS_PER_RUN;
    const qNum = Math.min(state.history.length + 1, total);

    const remaining = Math.max(0, this.roundEndsAt - this.time.now);
    const seconds = Math.ceil((remaining || ROUND_TIME_MS) / 1000);
    const low = remaining > 0 && remaining <= TIMER_LOW_THRESHOLD_MS;

    const chipLabel = isStory && state.chapter
      ? `Chapter ${state.chapter} · ${meta.labelEn}`
      : isScenario
        ? meta.labelEn
        : '';

    this.hud.render({
      hp: state.hp,
      hpMax: HP_MAX,
      streak: state.streak,
      currentRound: qNum,
      totalRounds: total,
      scenarioLabel: chipLabel,
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
    const isStory = this.isStoryMode();
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
      this.hud?.flash('#58cc02', 0.15);
      sfxCorrect();
      audio.vibrate(30);
      if (result.streak > prevStreak && result.streak >= 2) {
        this.hud?.pulseStreak();
      }
      // Story: short auto-advance after celebratory beat (1.2s).
      // Free/scenario: longer dwell on the explanation panel.
      this.scheduleAdvance(isStory ? STORY_ADVANCE_CORRECT_MS : ADVANCE_CORRECT_MS);
    } else {
      this.mascot?.setAnim('sad');
      this.hud?.flash('#ff4b4b', 0.13);
      this.hud?.shake();
      sfxWrong();
      if (!isStory) {
        // Outside story mode, wrong → HP loss FX + auto-advance.
        this.hud?.shakeHp();
        sfxHpLoss();
        audio.vibrate([50, 30, 50]);
        this.scheduleAdvance(ADVANCE_WRONG_MS);
      } else {
        // Story mode: NO HP, NO auto-advance. Player must tap the
        // correct option (handled via ClozeUI's force-correct retry).
        audio.vibrate(30);
      }
    }

    this.renderHud();
  }

  private handleForceCorrect(_idx: number): void {
    // Story mode only — fired when the player taps the correct answer
    // after first answering wrong. Clear store retry-flag, update UI,
    // celebrate, then schedule advance.
    const store = useRunStore.getState();
    if (!store.awaitingRetry) return;
    store.retryRound();
    this.clozeUI?.acknowledgeForceCorrect();
    this.mascot?.setAnim('happy');
    this.hud?.flash('#58cc02', 0.15);
    sfxCorrect();
    audio.vibrate(30);
    this.scheduleAdvance(STORY_ADVANCE_CORRECT_MS);
  }

  private handleContinue(): void {
    // In story mode, the Continue button is disabled while awaiting a
    // forced retry — but we double-check the state to be safe.
    const store = useRunStore.getState();
    if (store.awaitingRetry) return;
    if (!this.locked && !this.timerExpired) return;
    this.cancelAdvanceTimer();
    // v0.10 — Duolingo pacing: brief breathing pause before the next
    // question paints. Avoids the jarring instant-cut feel.
    this.advanceTimer = this.time.delayedCall(
      ROUND_TRANSITION_BREATHING_MS,
      () => this.nextRound()
    );
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
    if (this.isStoryMode()) return; // timer is hidden in story mode
    this.locked = true;
    this.stopTimer();
    const result = useRunStore.getState().timeoutRound();
    this.clozeUI?.revealTimeout(result.correctIndex, result.explanationZh);
    this.mascot?.setAnim('sad');
    this.hud?.shakeHp();
    this.hud?.flash('#ff4b4b', 0.13);
    this.hud?.shake();
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
