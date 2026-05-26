import Phaser from 'phaser';
import { useRunStore } from '../store/runStore';
import {
  CHAPTER_META,
  readSrsQueue,
  type ChapterId,
} from '../data/storyKitten';
import { applyStyle } from '../ui/domUtil';
import { getMascotSvg } from '../ui/mascots';

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
 * ChapterIntroScene — narration card + 開始本章 button (v0.8).
 *
 * Reads chapter from the store. Shows a NPC + kitten "scene" illustration
 * row, then the narration text, then the green CTA. If SRS items are
 * queued and this isn't Ch1 first attempt, surfaces a small notice
 * about review questions.
 */
export class ChapterIntroScene extends Phaser.Scene {
  private root?: HTMLDivElement;

  constructor() {
    super({ key: 'ChapterIntroScene' });
  }

  create(): void {
    this.cameras.main.setBackgroundColor(COLOR_CREAM);
    const { chapter } = useRunStore.getState();
    if (!chapter) {
      this.scene.start('StoryModeScene');
      return;
    }
    this.mountOverlay(chapter);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.root?.remove();
      this.root = undefined;
    });
  }

  private mountOverlay(chapter: ChapterId): void {
    const meta = CHAPTER_META[chapter];
    const srsCount = chapter > 1 ? Math.min(3, readSrsQueue().length) : 0;

    const root = document.createElement('div');
    root.id = 'pickup-chapter-intro';
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
      gap: '14px',
    });

    // Back row
    const headerRow = document.createElement('div');
    applyStyle(headerRow, {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      marginBottom: '4px',
    });
    const back = document.createElement('button');
    back.type = 'button';
    back.textContent = '←';
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
      this.scene.start('StoryModeScene');
    });
    headerRow.appendChild(back);

    const chapterTitle = document.createElement('div');
    chapterTitle.textContent = `Chapter ${chapter}`;
    applyStyle(chapterTitle, {
      fontSize: '14px',
      fontWeight: '800',
      flex: '1 1 auto',
      textAlign: 'center',
      marginRight: '52px',
      color: COLOR_AMBER_DARK,
      letterSpacing: '2px',
    });
    headerRow.appendChild(chapterTitle);
    content.appendChild(headerRow);

    // Big title
    const title = document.createElement('div');
    title.textContent = meta.titleEn;
    applyStyle(title, {
      fontSize: '28px',
      fontWeight: '900',
      textAlign: 'center',
      color: COLOR_TEXT_DARK,
      letterSpacing: '-0.5px',
    });
    content.appendChild(title);

    // Scene illustration row — kitten state + NPC, side by side on a card.
    const sceneCard = document.createElement('div');
    applyStyle(sceneCard, {
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'center',
      gap: '10px',
      background: meta.tint,
      border: `2px dashed ${meta.accent}`,
      borderRadius: '20px',
      padding: '14px 12px',
      minHeight: '160px',
    });
    const kittenSlot = document.createElement('div');
    applyStyle(kittenSlot, {
      width: '120px',
      height: '140px',
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'center',
    });
    kittenSlot.innerHTML = getMascotSvg(meta.kittenMascotId);
    const kSvg = kittenSlot.querySelector('svg');
    if (kSvg) {
      kSvg.setAttribute('width', '120');
      kSvg.setAttribute('height', '140');
    }
    sceneCard.appendChild(kittenSlot);

    const npcSlot = document.createElement('div');
    applyStyle(npcSlot, {
      width: '120px',
      height: '140px',
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'center',
    });
    npcSlot.innerHTML = getMascotSvg(meta.npcMascotId);
    const nSvg = npcSlot.querySelector('svg');
    if (nSvg) {
      nSvg.setAttribute('width', '120');
      nSvg.setAttribute('height', '140');
    }
    sceneCard.appendChild(npcSlot);
    content.appendChild(sceneCard);

    // Narration card
    const narration = document.createElement('div');
    applyStyle(narration, {
      background: '#ffffff',
      border: `2px solid ${COLOR_BORDER}`,
      borderBottom: `4px solid ${COLOR_BORDER_DARK}`,
      borderRadius: '16px',
      padding: '16px 18px',
      fontSize: '15px',
      lineHeight: '1.7',
      color: COLOR_TEXT_DARK,
      fontWeight: '600',
      whiteSpace: 'pre-wrap',
    });
    narration.textContent = meta.narration;
    content.appendChild(narration);

    // SRS notice (optional)
    if (srsCount > 0) {
      const srsNote = document.createElement('div');
      srsNote.textContent = `Quick review first: ${srsCount} question${srsCount > 1 ? 's' : ''} you missed before`;
      applyStyle(srsNote, {
        background: '#fff4d4',
        border: `2px solid ${COLOR_AMBER}`,
        borderRadius: '12px',
        padding: '8px 12px',
        fontSize: '12px',
        fontWeight: '700',
        color: COLOR_AMBER_DARK,
        textAlign: 'center',
      });
      content.appendChild(srsNote);
    }

    // CTA
    const cta = document.createElement('button');
    cta.type = 'button';
    cta.textContent = 'Begin chapter →';
    applyStyle(cta, {
      marginTop: '4px',
      minHeight: '56px',
      padding: '16px 28px',
      background: COLOR_GREEN,
      color: '#ffffff',
      border: 'none',
      borderBottom: `5px solid ${COLOR_GREEN_DARK}`,
      borderRadius: '16px',
      fontFamily: 'inherit',
      fontSize: '18px',
      fontWeight: '900',
      letterSpacing: '1.2px',
      cursor: 'pointer',
      touchAction: 'manipulation',
      WebkitTapHighlightColor: 'transparent',
      transition: 'transform 100ms cubic-bezier(0.2, 0.8, 0.4, 1), box-shadow 200ms ease-out',
      boxShadow: '0 4px 12px rgba(88, 204, 2, 0.25)',
    });
    cta.classList.add('pickup-pulse');
    cta.addEventListener('pointerdown', () => {
      cta.style.transform = 'translateY(2px)';
      cta.style.borderBottomWidth = '3px';
    });
    const release = () => {
      cta.style.transform = '';
      cta.style.borderBottomWidth = '5px';
    };
    cta.addEventListener('pointerup', release);
    cta.addEventListener('pointerleave', release);
    cta.addEventListener('pointercancel', release);
    cta.addEventListener('click', (e) => {
      e.preventDefault();
      this.root?.remove();
      this.root = undefined;
      this.scene.start('PlayScene');
    });
    content.appendChild(cta);

    root.appendChild(content);
    document.body.appendChild(root);
  }
}
