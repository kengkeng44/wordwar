import Phaser from 'phaser';
import { useRunStore, RUN_CONFIG } from '../store/runStore';
import { sfxEndFanfare, sfxScoreTick } from '../audio/sfx';
import { audio } from '../audio/AudioManager';
import {
  SCENARIO_META,
  markScenarioCompleted,
  writeBestScore,
  readBestScore,
} from '../data/scenarios';
import { applyStyle } from '../ui/domUtil';

interface Rank {
  title: string;
  color: string;
}

function rankFor(score: number): Rank {
  // Duolingo-flavored: green for high tiers, blue for mid-high,
  // yellow for mid, gray for low.
  if (score >= 90) return { title: 'Wordsmith Master', color: '#58cc02' };
  if (score >= 60) return { title: 'Skilled Wordsmith', color: '#1cb0f6' };
  if (score >= 30) return { title: 'Apprentice', color: '#ffc800' };
  return { title: 'Novice', color: '#777777' };
}

/**
 * EndScene — Duolingo-styled run summary.
 *
 * v0.4: All text is DOM (crisp at any DPR). Phaser only paints the
 * background color; the entire summary card is a fixed-position DOM
 * overlay with the same lifecycle as MenuScene/ModeMenu.
 */
export class EndScene extends Phaser.Scene {
  private overlay?: HTMLDivElement;

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

    // ─── Scenario achievement persistence ────────────────────────────────
    let achievementText = '';
    let newBest = false;
    if (state.mode === 'scenario' && state.scenario) {
      if (completedRun && !dead) {
        markScenarioCompleted(state.scenario);
        achievementText = SCENARIO_META[state.scenario].achievement;
      }
      newBest = writeBestScore(state.scenario, state.score);
    }

    this.mountOverlay({
      dead,
      rank,
      score: state.score,
      correct,
      wrong,
      bestStreak: state.bestStreak,
      achievementText,
      newBest,
      bestScore:
        state.mode === 'scenario' && state.scenario
          ? readBestScore(state.scenario)
          : 0,
      isScenario: state.mode === 'scenario',
      scenarioId: state.scenario,
    });

    if (dead) audio.vibrate([120, 80, 120, 80, 200]);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.overlay?.remove();
      this.overlay = undefined;
    });
  }

  private mountOverlay(opts: {
    dead: boolean;
    rank: Rank;
    score: number;
    correct: number;
    wrong: number;
    bestStreak: number;
    achievementText: string;
    newBest: boolean;
    bestScore: number;
    isScenario: boolean;
    scenarioId: ReturnType<typeof useRunStore.getState>['scenario'];
  }): void {
    const root = document.createElement('div');
    root.id = 'end-overlay';
    applyStyle(root, {
      position: 'fixed',
      inset: '0',
      background: '#ffffff',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start',
      paddingTop: 'max(40px, env(safe-area-inset-top))',
      paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
      overflowY: 'auto',
      zIndex: '20',
      fontFamily:
        '"Nunito", "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      color: '#3c3c3c',
    });

    const content = document.createElement('div');
    applyStyle(content, {
      width: 'min(420px, calc(100vw - 32px))',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'stretch',
      gap: '8px',
    });
    root.appendChild(content);

    // Title
    const title = document.createElement('div');
    title.textContent = opts.dead ? 'Out of HP' : 'Run complete';
    applyStyle(title, {
      fontSize: '28px',
      fontWeight: '800',
      textAlign: 'center',
      color: opts.dead ? '#ff4b4b' : '#3c3c3c',
      marginBottom: '4px',
    });
    content.appendChild(title);

    // Rank
    const rankEl = document.createElement('div');
    rankEl.textContent = opts.rank.title;
    applyStyle(rankEl, {
      fontSize: '17px',
      fontWeight: '700',
      textAlign: 'center',
      color: opts.rank.color,
      marginBottom: '28px',
    });
    content.appendChild(rankEl);

    // Big animated score
    const scoreEl = document.createElement('div');
    scoreEl.textContent = '0';
    applyStyle(scoreEl, {
      fontSize: '72px',
      fontWeight: '900',
      textAlign: 'center',
      color: '#58cc02',
      lineHeight: '1',
      letterSpacing: '-1px',
      marginBottom: '4px',
    });
    content.appendChild(scoreEl);

    // Subtitle stats
    const stats = document.createElement('div');
    stats.textContent = `Correct ${opts.correct} · Wrong ${opts.wrong} · Best streak ${opts.bestStreak}`;
    applyStyle(stats, {
      fontSize: '13px',
      fontWeight: '600',
      textAlign: 'center',
      color: '#777777',
      marginBottom: '24px',
      fontFamily:
        'ui-monospace, "SFMono-Regular", Consolas, "Liberation Mono", monospace',
    });
    content.appendChild(stats);

    // Scenario achievement card
    if (opts.isScenario && opts.scenarioId) {
      const meta = SCENARIO_META[opts.scenarioId];
      const card = document.createElement('div');
      applyStyle(card, {
        padding: '14px 16px',
        marginBottom: '20px',
        borderRadius: '16px',
        background: meta.tint,
        border: `2px solid ${meta.accent}`,
        boxShadow: '0 4px 10px rgba(0,0,0,0.06)',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        alignItems: 'center',
      });

      const head = document.createElement('div');
      head.textContent = `${meta.emoji} ${meta.labelZh}`;
      applyStyle(head, {
        fontSize: '16px',
        fontWeight: '800',
        color: meta.accent,
      });
      card.appendChild(head);

      if (opts.achievementText) {
        const ach = document.createElement('div');
        ach.textContent = opts.achievementText;
        applyStyle(ach, {
          fontSize: '14px',
          fontWeight: '700',
          color: '#3c3c3c',
          textAlign: 'center',
        });
        card.appendChild(ach);
      }

      const best = document.createElement('div');
      best.textContent = opts.newBest
        ? `🏆 新紀錄 · Best ${opts.bestScore}`
        : `Best ${opts.bestScore}`;
      applyStyle(best, {
        fontSize: '12px',
        fontWeight: opts.newBest ? '800' : '600',
        color: opts.newBest ? '#ffc800' : '#777777',
        fontFamily:
          'ui-monospace, "SFMono-Regular", Consolas, "Liberation Mono", monospace',
      });
      card.appendChild(best);

      content.appendChild(card);
    }

    // CTA: Play again (Duolingo 3D green button)
    const playAgain = this.makeCtaButton('Play again', '#58cc02', '#58a700');
    playAgain.addEventListener('click', (e) => {
      e.preventDefault();
      audio.vibrate(15);
      useRunStore.getState().reset();
      this.scene.start('PlayScene');
    });
    content.appendChild(playAgain);

    // Secondary: back to menu (text link)
    const back = document.createElement('button');
    back.type = 'button';
    back.textContent = 'Back to menu';
    applyStyle(back, {
      marginTop: '12px',
      padding: '10px 16px',
      background: 'transparent',
      border: 'none',
      color: '#777777',
      fontSize: '14px',
      fontWeight: '700',
      cursor: 'pointer',
      fontFamily: 'inherit',
      touchAction: 'manipulation',
      WebkitTapHighlightColor: 'transparent',
    });
    back.addEventListener('click', (e) => {
      e.preventDefault();
      useRunStore.getState().reset();
      this.scene.start('MenuScene');
    });
    content.appendChild(back);

    // Footer
    const footer = document.createElement('div');
    footer.textContent = 'v0.4.0';
    applyStyle(footer, {
      marginTop: '24px',
      fontSize: '11px',
      color: '#a8a2b3',
      textAlign: 'center',
      fontFamily:
        'ui-monospace, "SFMono-Regular", Consolas, "Liberation Mono", monospace',
    });
    content.appendChild(footer);

    document.body.appendChild(root);
    this.overlay = root;

    // Score count-up animation (DOM-tween via Phaser tween — tweens an
    // object, applies textContent on update).
    const counter = { v: 0 };
    let lastTickAt = -1;
    this.tweens.add({
      targets: counter,
      v: opts.score,
      duration: 900,
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
        scoreEl.textContent = String(opts.score);
        if (opts.score > 0 && !opts.dead) sfxEndFanfare();
      },
    });
  }

  private makeCtaButton(
    text: string,
    bg: string,
    bgDark: string
  ): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = text.toUpperCase();
    applyStyle(btn, {
      width: '100%',
      padding: '16px 18px',
      borderRadius: '14px',
      border: 'none',
      borderBottom: `4px solid ${bgDark}`,
      background: bg,
      color: '#ffffff',
      fontSize: '17px',
      fontWeight: '800',
      letterSpacing: '0.8px',
      cursor: 'pointer',
      fontFamily: 'inherit',
      touchAction: 'manipulation',
      WebkitTapHighlightColor: 'transparent',
      transition: 'transform 80ms ease-out',
    });
    btn.addEventListener('pointerdown', () => {
      btn.style.transform = 'translateY(2px)';
      btn.style.borderBottomWidth = '2px';
    });
    const release = () => {
      btn.style.transform = '';
      btn.style.borderBottomWidth = '4px';
    };
    btn.addEventListener('pointerup', release);
    btn.addEventListener('pointerleave', release);
    btn.addEventListener('pointercancel', release);
    return btn;
  }
}
