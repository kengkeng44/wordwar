import Phaser from 'phaser';
import { useRunStore } from '../store/runStore';
import {
  CHAPTERS_IN_ORDER,
  CHAPTER_META,
  resetStoryProgress,
} from '../data/storyKitten';
import { applyStyle } from '../ui/domUtil';
import { getMascotSvg } from '../ui/mascots';
import { Confetti } from '../ui/Confetti';
import { sfxEndFanfare } from '../audio/sfx';

const COLOR_AMBER = '#e7a44a';
const COLOR_AMBER_DARK = '#b07a2a';
const COLOR_CREAM = '#fef8ed';
const COLOR_GREEN = '#58cc02';
const COLOR_GREEN_DARK = '#58a700';
const COLOR_BORDER = '#e8d8b8';
const COLOR_BORDER_DARK = '#d4c098';
const COLOR_TEXT_DARK = '#3c2a1c';
const COLOR_TEXT_MUTED = '#7a6850';

/**
 * StoryEndingScene — full ending cinematic shown after Ch5 (v0.8).
 *
 * Big "故事完結" banner, all 5 kitten states in a row showing the arc,
 * full ending paragraph, replay + back-to-menu CTAs. Confetti on entry.
 */
export class StoryEndingScene extends Phaser.Scene {
  private root?: HTMLDivElement;
  private confetti?: Confetti;

  constructor() {
    super({ key: 'StoryEndingScene' });
  }

  create(): void {
    this.cameras.main.setBackgroundColor(COLOR_CREAM);
    this.mountOverlay();

    this.confetti = new Confetti();
    this.confetti.burst();
    sfxEndFanfare();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.root?.remove();
      this.root = undefined;
      this.confetti?.destroy();
      this.confetti = undefined;
    });
  }

  private mountOverlay(): void {
    const root = document.createElement('div');
    root.id = 'wordwar-story-ending';
    applyStyle(root, {
      position: 'fixed',
      inset: '0',
      background: COLOR_CREAM,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      paddingTop: 'max(28px, env(safe-area-inset-top))',
      paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
      overflowY: 'auto',
      zIndex: '20',
      fontFamily:
        '"Nunito", "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      color: COLOR_TEXT_DARK,
    });
    this.root = root;

    const content = document.createElement('div');
    applyStyle(content, {
      width: 'min(440px, calc(100vw - 32px))',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'stretch',
      gap: '14px',
    });

    // Top banner
    const banner = document.createElement('div');
    banner.textContent = '故事 · 完結';
    applyStyle(banner, {
      textAlign: 'center',
      fontSize: '14px',
      fontWeight: '900',
      letterSpacing: '6px',
      color: COLOR_AMBER_DARK,
      textTransform: 'uppercase',
      animation: 'wordwar-banner-pop 480ms cubic-bezier(0.34, 1.56, 0.64, 1)',
    });
    content.appendChild(banner);

    const title = document.createElement('div');
    title.textContent = '🐈 小貓回家路';
    applyStyle(title, {
      fontSize: '32px',
      fontWeight: '900',
      textAlign: 'center',
      color: COLOR_TEXT_DARK,
      letterSpacing: '-0.5px',
    });
    content.appendChild(title);

    // Kitten arc row — 5 mini states
    const arcRow = document.createElement('div');
    applyStyle(arcRow, {
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: '4px',
      background: '#fef0d0',
      border: `2px solid ${COLOR_AMBER}`,
      borderRadius: '16px',
      padding: '12px 8px',
    });
    for (const id of CHAPTERS_IN_ORDER) {
      const cell = document.createElement('div');
      applyStyle(cell, {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '2px',
        flex: '1 1 0',
        opacity: '0',
        transform: 'translateY(8px)',
        transition: `opacity 500ms ease-out ${id * 220}ms, transform 500ms ease-out ${id * 220}ms`,
      });
      const m = CHAPTER_META[id];
      const svgBox = document.createElement('div');
      applyStyle(svgBox, {
        width: '64px',
        height: '74px',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      });
      svgBox.innerHTML = getMascotSvg(m.kittenMascotId);
      const svg = svgBox.querySelector('svg');
      if (svg) {
        svg.setAttribute('width', '60');
        svg.setAttribute('height', '70');
      }
      cell.appendChild(svgBox);
      const label = document.createElement('div');
      label.textContent = `${m.emoji}`;
      applyStyle(label, { fontSize: '14px' });
      cell.appendChild(label);
      arcRow.appendChild(cell);
      window.requestAnimationFrame(() => {
        window.setTimeout(() => {
          cell.style.opacity = '1';
          cell.style.transform = 'translateY(0)';
        }, 50);
      });
    }
    content.appendChild(arcRow);

    // Ending paragraph
    const ending = document.createElement('div');
    applyStyle(ending, {
      background: '#ffffff',
      border: `2px solid ${COLOR_BORDER}`,
      borderBottom: `4px solid ${COLOR_BORDER_DARK}`,
      borderRadius: '16px',
      padding: '16px 18px',
      fontSize: '15px',
      lineHeight: '1.75',
      color: COLOR_TEXT_DARK,
      fontWeight: '600',
      whiteSpace: 'pre-wrap',
    });
    ending.textContent =
      '從濕冷的巷子,到撐傘的阿嬤,從麵包店的香味,到公園的小妹妹;\n' +
      '從街頭的布魯托大哥,到溫暖的小床——\n\n' +
      '小貓終於找到了永遠的家。\n\n' +
      '你陪牠走完了這條路。謝謝你 ❤';
    content.appendChild(ending);

    // Stats line
    const ch = useRunStore.getState();
    const stats = document.createElement('div');
    stats.textContent = `總 XP · ${ch.score}`;
    applyStyle(stats, {
      textAlign: 'center',
      fontSize: '13px',
      fontWeight: '800',
      color: COLOR_AMBER_DARK,
    });
    content.appendChild(stats);

    // Replay CTA
    const replay = document.createElement('button');
    replay.type = 'button';
    replay.textContent = '重新體驗故事';
    applyStyle(replay, {
      marginTop: '4px',
      padding: '15px 24px',
      background: COLOR_GREEN,
      color: '#ffffff',
      border: 'none',
      borderBottom: `5px solid ${COLOR_GREEN_DARK}`,
      borderRadius: '16px',
      fontFamily: 'inherit',
      fontSize: '17px',
      fontWeight: '900',
      letterSpacing: '0.5px',
      cursor: 'pointer',
      touchAction: 'manipulation',
      WebkitTapHighlightColor: 'transparent',
      transition: 'transform 80ms ease-out',
      boxShadow: '0 4px 12px rgba(88, 204, 2, 0.25)',
    });
    replay.addEventListener('click', (e) => {
      e.preventDefault();
      if (typeof window !== 'undefined' && window.confirm) {
        if (!window.confirm('確定重新開始嗎?所有章節進度會清除。')) return;
      }
      resetStoryProgress();
      this.root?.remove();
      this.root = undefined;
      this.scene.start('StoryModeScene');
    });
    content.appendChild(replay);

    // Back to menu
    const menuLink = document.createElement('button');
    menuLink.type = 'button';
    menuLink.textContent = '← 回主選單';
    applyStyle(menuLink, {
      marginTop: '6px',
      background: 'transparent',
      border: 'none',
      color: COLOR_TEXT_MUTED,
      fontFamily: 'inherit',
      fontSize: '13px',
      fontWeight: '700',
      cursor: 'pointer',
      textAlign: 'center',
      touchAction: 'manipulation',
      WebkitTapHighlightColor: 'transparent',
    });
    menuLink.addEventListener('click', (e) => {
      e.preventDefault();
      this.root?.remove();
      this.root = undefined;
      this.scene.start('MenuScene');
    });
    content.appendChild(menuLink);

    root.appendChild(content);
    document.body.appendChild(root);
  }
}
