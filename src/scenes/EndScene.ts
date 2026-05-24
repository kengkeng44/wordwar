import Phaser from 'phaser';
import { useRunStore, RUN_CONFIG } from '../store/runStore';
import { sfxEndFanfare, sfxScoreTick } from '../audio/sfx';
import { audio } from '../audio/AudioManager';
import {
  SCENARIO_META,
  FREE_PRACTICE_META,
  markScenarioCompleted,
  writeBestScore,
  readBestScore,
} from '../data/scenarios';
import { EndOverlay } from '../ui/EndOverlay';
import { Confetti } from '../ui/Confetti';
import { Mascot } from '../ui/Mascot';

interface Rank {
  title: string;
  color: string;
}

function rankFor(score: number): Rank {
  if (score >= 90) return { title: 'Wordsmith Master', color: '#58cc02' };
  if (score >= 60) return { title: 'Skilled Wordsmith', color: '#1cb0f6' };
  if (score >= 30) return { title: 'Apprentice', color: '#ffc800' };
  return { title: 'Novice', color: '#777777' };
}

/**
 * EndScene — Duolingo lesson-complete celebration (v0.5).
 *
 * Phaser only paints the background; EndOverlay (DOM) is the page.
 * Mascot (existing component) is reused at 1.8× via setExtraScale, and
 * Confetti fires once on entry if score > previous best.
 */
export class EndScene extends Phaser.Scene {
  private overlay?: EndOverlay;
  private mascot?: Mascot;
  private confetti?: Confetti;

  constructor() {
    super({ key: 'EndScene' });
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#ffffff');

    const state = useRunStore.getState();
    const correct = state.history.filter((h) => h.correct).length;
    const wrong = state.history.length - correct;
    const dead = state.hp <= 0;
    const completedRun = state.history.length >= RUN_CONFIG.QUESTIONS_PER_RUN;
    const rank = rankFor(state.score);

    // ─── Scenario achievement + best-score persistence ─────────────────────
    let achievementText = '';
    let newBest = false;
    let bestScore = 0;
    if (state.mode === 'scenario' && state.scenario) {
      if (completedRun && !dead) {
        markScenarioCompleted(state.scenario);
        achievementText = SCENARIO_META[state.scenario].achievement;
      }
      newBest = writeBestScore(state.scenario, state.score);
      bestScore = readBestScore(state.scenario);
    }

    // Total run time (s). runStartedAt set by reset() → PlayScene bootstrap.
    const totalTimeSeconds =
      state.runStartedAt > 0
        ? Math.max(0, Math.round((Date.now() - state.runStartedAt) / 1000))
        : 0;

    // Mascot picks the scenario mascot in scenario mode, owl otherwise.
    const meta =
      state.mode === 'scenario' && state.scenario
        ? SCENARIO_META[state.scenario]
        : FREE_PRACTICE_META;

    // Mount mascot first (DOM-positioned, fixed) — the overlay reserves a
    // mascot-spacer block to make room for it.
    this.mascot = new Mascot();
    this.mascot.setMascot(meta.mascotId);
    this.mascot.setScenarioStripVisible(false);
    this.mascot.setAnim('happy');
    // Scale the mascot up 1.8× via the shared CSS variable, then restart
    // the happy loop periodically so it keeps celebrating.
    this.mascot.setExtraScale(1.8);
    // Re-pulse happy every 2.4s while EndScene is mounted.
    const happyTimer = window.setInterval(() => {
      this.mascot?.setAnim('happy');
    }, 2400);

    // Mount overlay
    this.overlay = new EndOverlay({
      dead,
      score: state.score,
      rankTitle: rank.title,
      rankColor: rank.color,
      correct,
      wrong,
      totalAnswered: state.history.length,
      bestStreak: state.bestStreak,
      totalTimeSeconds,
      achievementText,
      newBest,
      bestScore,
      isScenario: state.mode === 'scenario',
      scenarioId: state.scenario,
      onPlayAgain: () => {
        audio.vibrate(15);
        useRunStore.getState().reset();
        this.scene.start('PlayScene');
      },
      onChangeMode: () => {
        useRunStore.getState().reset();
        this.scene.start('MenuScene');
      },
    });

    // Confetti — only fires when player set a new best score AND didn't die.
    if (newBest && !dead && state.score > 0) {
      this.confetti = new Confetti();
      this.confetti.burst();
    }

    if (dead) audio.vibrate([120, 80, 120, 80, 200]);

    // Score count-up animation, driving the XP tile inside the overlay.
    const scoreEl = this.overlay.scoreElement();
    const counter = { v: 0 };
    let lastTickAt = -1;
    this.tweens.add({
      targets: counter,
      v: state.score,
      duration: 900,
      delay: 200, // let banner + mascot settle first
      ease: 'Quad.easeOut',
      onUpdate: () => {
        const v = Math.round(counter.v);
        scoreEl.textContent = String(v);
        if (v !== lastTickAt && v % 3 === 0 && v > 0) {
          lastTickAt = v;
          sfxScoreTick();
        }
      },
      onComplete: () => {
        scoreEl.textContent = String(state.score);
        if (state.score > 0 && !dead) sfxEndFanfare();
      },
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.clearInterval(happyTimer);
      this.overlay?.destroy();
      this.overlay = undefined;
      this.mascot?.destroy();
      this.mascot = undefined;
      this.confetti?.destroy();
      this.confetti = undefined;
    });
  }
}
