import Phaser from 'phaser';
import {
  CHAPTER_META,
  CHAPTERS_IN_ORDER,
  isChapterUnlocked,
  isChapterCompleted,
  readChapterProgress,
  resetStoryProgress,
  type ChapterId,
} from '../data/storyKitten';
import { useRunStore } from '../store/runStore';
import { audio } from '../audio/AudioManager';
import { applyStyle } from '../ui/domUtil';
import { getMascotSvg } from '../ui/mascots';

const COLOR_AMBER = '#e7a44a';
const COLOR_AMBER_DARK = '#b07a2a';
const COLOR_CREAM = '#fef8ed';
const COLOR_BORDER = '#e8d8b8';
const COLOR_BORDER_DARK = '#d4c098';
const COLOR_TEXT_DARK = '#3c2a1c';
const COLOR_TEXT_MUTED = '#7a6850';
const COLOR_LOCKED = '#bba892';

/**
 * StoryModeScene — chapter select grid (v0.8).
 *
 * Shows 5 chapter cards. Locked chapters render with a lock icon and
 * desaturated style. Tapping an unlocked chapter starts ChapterIntroScene
 * with that chapter id loaded into the run store.
 */
export class StoryModeScene extends Phaser.Scene {
  private root?: HTMLDivElement;

  constructor() {
    super({ key: 'StoryModeScene' });
  }

  create(): void {
    this.cameras.main.setBackgroundColor(COLOR_CREAM);
    this.mountOverlay();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.root?.remove();
      this.root = undefined;
    });
  }

  private mountOverlay(): void {
    const root = document.createElement('div');
    root.id = 'wordwar-story-mode';
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
      width: 'min(420px, calc(100vw - 32px))',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'stretch',
      gap: '12px',
    });

    // Header row: back + title
    const headerRow = document.createElement('div');
    applyStyle(headerRow, {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      marginBottom: '8px',
    });
    const back = document.createElement('button');
    back.type = 'button';
    back.textContent = '←';
    back.setAttribute('aria-label', 'Back');
    applyStyle(back, {
      background: '#ffffff',
      border: `2px solid ${COLOR_BORDER}`,
      borderBottom: `4px solid ${COLOR_BORDER_DARK}`,
      borderRadius: '12px',
      padding: '8px 14px',
      fontSize: '18px',
      fontWeight: '800',
      color: COLOR_TEXT_MUTED,
      cursor: 'pointer',
      fontFamily: 'inherit',
      touchAction: 'manipulation',
      WebkitTapHighlightColor: 'transparent',
      lineHeight: '1',
    });
    back.addEventListener('click', (e) => {
      e.preventDefault();
      this.scene.start('MenuScene');
    });
    headerRow.appendChild(back);

    const title = document.createElement('div');
    title.textContent = '🐈 小貓回家路';
    applyStyle(title, {
      fontSize: '22px',
      fontWeight: '900',
      flex: '1 1 auto',
      textAlign: 'center',
      marginRight: '52px',
      color: COLOR_AMBER_DARK,
    });
    headerRow.appendChild(title);
    content.appendChild(headerRow);

    const sub = document.createElement('div');
    sub.textContent = '5 章節 · 每章 6 題 · 答錯不扣血,改答對即可';
    applyStyle(sub, {
      fontSize: '12px',
      fontWeight: '700',
      color: COLOR_TEXT_MUTED,
      textAlign: 'center',
      marginBottom: '14px',
    });
    content.appendChild(sub);

    const progress = readChapterProgress();
    for (const id of CHAPTERS_IN_ORDER) {
      content.appendChild(
        this.makeChapterCard(id, progress.highestCompleted)
      );
    }

    // Restart link
    if (progress.highestCompleted > 0) {
      const restart = document.createElement('button');
      restart.type = 'button';
      restart.textContent = '重新開始故事 ↺';
      applyStyle(restart, {
        marginTop: '10px',
        background: 'transparent',
        border: 'none',
        color: COLOR_TEXT_MUTED,
        fontFamily: 'inherit',
        fontSize: '12px',
        fontWeight: '700',
        cursor: 'pointer',
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent',
      });
      restart.addEventListener('click', (e) => {
        e.preventDefault();
        if (typeof window !== 'undefined' && window.confirm) {
          if (!window.confirm('確定重新開始嗎?所有章節進度會清除。')) return;
        }
        resetStoryProgress();
        this.root?.remove();
        this.root = undefined;
        this.scene.restart();
      });
      content.appendChild(restart);
    }

    root.appendChild(content);
    document.body.appendChild(root);
  }

  private makeChapterCard(id: ChapterId, highestCompleted: number): HTMLElement {
    const meta = CHAPTER_META[id];
    const unlocked = isChapterUnlocked(id);
    const completed = isChapterCompleted(id);
    const inProgress = unlocked && !completed && highestCompleted === id - 1;

    const card = document.createElement('button');
    card.type = 'button';
    card.disabled = !unlocked;
    applyStyle(card, {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '14px 16px',
      borderRadius: '18px',
      border: `2px solid ${unlocked ? COLOR_BORDER : '#e0d4be'}`,
      borderBottom: `4px solid ${unlocked ? COLOR_BORDER_DARK : '#cdbfa8'}`,
      background: unlocked ? '#ffffff' : '#f0e6d2',
      color: unlocked ? COLOR_TEXT_DARK : COLOR_LOCKED,
      cursor: unlocked ? 'pointer' : 'not-allowed',
      textAlign: 'left',
      fontFamily: 'inherit',
      touchAction: 'manipulation',
      WebkitTapHighlightColor: 'transparent',
      transition: 'transform 80ms ease-out',
      opacity: unlocked ? '1' : '0.7',
    });

    // Mascot circle
    const mascotBox = document.createElement('div');
    applyStyle(mascotBox, {
      width: '64px',
      height: '64px',
      borderRadius: '50%',
      background: unlocked ? meta.tint : '#e8dcc8',
      border: `2px solid ${unlocked ? meta.accent : '#bba892'}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flex: '0 0 auto',
      overflow: 'hidden',
    });
    if (unlocked) {
      mascotBox.innerHTML = getMascotSvg(meta.kittenMascotId);
      const svg = mascotBox.querySelector('svg');
      if (svg) {
        svg.setAttribute('width', '60');
        svg.setAttribute('height', '60');
      }
    } else {
      mascotBox.textContent = '🔒';
      mascotBox.style.fontSize = '24px';
    }
    card.appendChild(mascotBox);

    const text = document.createElement('div');
    applyStyle(text, {
      display: 'flex',
      flexDirection: 'column',
      gap: '3px',
      flex: '1 1 auto',
    });
    const titleEl = document.createElement('div');
    titleEl.textContent = `${meta.emoji} 第 ${id} 章 · ${meta.titleZh}`;
    applyStyle(titleEl, { fontSize: '16px', fontWeight: '800' });
    text.appendChild(titleEl);

    const subEl = document.createElement('div');
    let subText = meta.titleEn;
    if (completed) subText = `✓ 已完成 · ${meta.titleEn}`;
    else if (inProgress) subText = `▶ 進行中 · ${meta.titleEn}`;
    else if (!unlocked) subText = `未解鎖 · 完成第 ${id - 1} 章後開啟`;
    subEl.textContent = subText;
    applyStyle(subEl, {
      fontSize: '12px',
      fontWeight: '700',
      color: completed
        ? '#5a8a3a'
        : unlocked
        ? COLOR_AMBER_DARK
        : COLOR_LOCKED,
    });
    text.appendChild(subEl);
    card.appendChild(text);

    const arrow = document.createElement('div');
    arrow.textContent = unlocked ? '→' : '🔒';
    applyStyle(arrow, {
      fontSize: unlocked ? '22px' : '16px',
      fontWeight: '800',
      color: unlocked ? COLOR_AMBER : COLOR_LOCKED,
    });
    card.appendChild(arrow);

    if (unlocked) {
      card.addEventListener('pointerdown', () => {
        card.style.transform = 'translateY(2px)';
        card.style.borderBottomWidth = '2px';
      });
      const release = () => {
        card.style.transform = '';
        card.style.borderBottomWidth = '4px';
      };
      card.addEventListener('pointerup', release);
      card.addEventListener('pointerleave', release);
      card.addEventListener('pointercancel', release);
      card.addEventListener('click', (e) => {
        e.preventDefault();
        audio.ensureContext();
        const store = useRunStore.getState();
        store.setMode('story');
        store.setScenario(null);
        store.setChapter(id);
        store.setLevel('A2');
        this.root?.remove();
        this.root = undefined;
        this.scene.start('ChapterIntroScene');
      });
    }
    return card;
  }
}
