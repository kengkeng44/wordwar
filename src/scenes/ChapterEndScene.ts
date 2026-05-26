import Phaser from 'phaser';
import { useRunStore } from '../store/runStore';
import {
  CHAPTER_META,
  type ChapterId,
} from '../data/storyKitten';
import { applyStyle } from '../ui/domUtil';
import { getMascotSvg } from '../ui/mascots';
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
 * ChapterEndScene — kitten state transition + 下一章 (v0.8).
 *
 * Shows a crossfade from the just-completed chapter's kitten state to
 * the next chapter's kitten state — visualizing the kitten's emotional
 * arc. After the final chapter it routes to StoryEndingScene instead.
 */
export class ChapterEndScene extends Phaser.Scene {
  private root?: HTMLDivElement;

  constructor() {
    super({ key: 'ChapterEndScene' });
  }

  create(): void {
    this.cameras.main.setBackgroundColor(COLOR_CREAM);
    const { chapter } = useRunStore.getState();
    if (!chapter) {
      this.scene.start('StoryModeScene');
      return;
    }

    // Persist chapter completion now (idempotent).
    useRunStore.getState().completeChapter();

    if (chapter >= 8) {
      // Final chapter — route to the dedicated ending scene.
      this.scene.start('StoryEndingScene');
      return;
    }

    this.mountOverlay(chapter);
    sfxEndFanfare();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.root?.remove();
      this.root = undefined;
    });
  }

  private mountOverlay(chapter: ChapterId): void {
    const meta = CHAPTER_META[chapter];
    const nextId = (chapter + 1) as ChapterId;
    const nextMeta = CHAPTER_META[nextId];

    const root = document.createElement('div');
    root.id = 'pickup-chapter-end';
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
      gap: '16px',
    });

    // Chapter complete banner
    const banner = document.createElement('div');
    banner.textContent = `Chapter ${chapter} · Complete!`;
    applyStyle(banner, {
      textAlign: 'center',
      fontSize: '14px',
      fontWeight: '900',
      letterSpacing: '3px',
      color: COLOR_AMBER_DARK,
      textTransform: 'uppercase',
      animation: 'pickup-banner-pop 480ms cubic-bezier(0.34, 1.56, 0.64, 1)',
    });
    content.appendChild(banner);

    const title = document.createElement('div');
    title.textContent = meta.titleEn;
    applyStyle(title, {
      fontSize: '26px',
      fontWeight: '900',
      textAlign: 'center',
      color: COLOR_TEXT_DARK,
    });
    content.appendChild(title);

    // Kitten state-change animation row
    const animRow = document.createElement('div');
    applyStyle(animRow, {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '10px',
      background: meta.tint,
      borderRadius: '20px',
      padding: '18px 12px',
      minHeight: '180px',
      position: 'relative',
      overflow: 'hidden',
    });

    const oldKitten = document.createElement('div');
    applyStyle(oldKitten, {
      width: '120px',
      height: '140px',
      transition: 'opacity 800ms ease-in-out, transform 800ms ease-in-out',
    });
    oldKitten.innerHTML = getMascotSvg(meta.kittenMascotId);
    const oSvg = oldKitten.querySelector('svg');
    if (oSvg) {
      oSvg.setAttribute('width', '120');
      oSvg.setAttribute('height', '140');
    }
    animRow.appendChild(oldKitten);

    const arrow = document.createElement('div');
    arrow.textContent = '→';
    applyStyle(arrow, {
      fontSize: '36px',
      fontWeight: '900',
      color: COLOR_AMBER,
      opacity: '0',
      transition: 'opacity 500ms ease-out 400ms',
    });
    animRow.appendChild(arrow);

    const newKitten = document.createElement('div');
    applyStyle(newKitten, {
      width: '120px',
      height: '140px',
      opacity: '0',
      transform: 'scale(0.8)',
      transition: 'opacity 800ms ease-out 600ms, transform 800ms cubic-bezier(0.34, 1.56, 0.64, 1) 600ms',
    });
    newKitten.innerHTML = getMascotSvg(nextMeta.kittenMascotId);
    const nSvg = newKitten.querySelector('svg');
    if (nSvg) {
      nSvg.setAttribute('width', '120');
      nSvg.setAttribute('height', '140');
    }
    animRow.appendChild(newKitten);
    content.appendChild(animRow);

    // Play animation on next frame
    window.requestAnimationFrame(() => {
      window.setTimeout(() => {
        oldKitten.style.opacity = '0.4';
        oldKitten.style.transform = 'translateX(-10px) scale(0.9)';
        arrow.style.opacity = '1';
        newKitten.style.opacity = '1';
        newKitten.style.transform = 'scale(1)';
      }, 200);
    });

    // Outro narration
    const outro = document.createElement('div');
    applyStyle(outro, {
      background: '#ffffff',
      border: `2px solid ${COLOR_BORDER}`,
      borderBottom: `4px solid ${COLOR_BORDER_DARK}`,
      borderRadius: '16px',
      padding: '14px 16px',
      fontSize: '14px',
      lineHeight: '1.7',
      color: COLOR_TEXT_DARK,
      fontWeight: '600',
      whiteSpace: 'pre-wrap',
    });
    outro.textContent = meta.outro;
    content.appendChild(outro);

    // Run stats
    const state = useRunStore.getState();
    const correct = state.history.filter((h) => h.correct).length;
    const total = state.history.length;
    const stats = document.createElement('div');
    stats.textContent = `Correct ${correct}/${total} · +${state.score} XP`;
    applyStyle(stats, {
      textAlign: 'center',
      fontSize: '13px',
      fontWeight: '800',
      color: COLOR_TEXT_MUTED,
    });
    content.appendChild(stats);

    // Next chapter CTA
    const cta = document.createElement('button');
    cta.type = 'button';
    cta.textContent = `Next chapter → ${nextMeta.titleEn}`;
    applyStyle(cta, {
      marginTop: '4px',
      minHeight: '56px',
      padding: '16px 24px',
      background: COLOR_GREEN,
      color: '#ffffff',
      border: 'none',
      borderBottom: `5px solid ${COLOR_GREEN_DARK}`,
      borderRadius: '16px',
      fontFamily: 'inherit',
      fontSize: '16px',
      fontWeight: '900',
      letterSpacing: '0.5px',
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
      const store = useRunStore.getState();
      store.setChapter(nextId);
      store.reset();
      this.root?.remove();
      this.root = undefined;
      this.scene.start('ChapterIntroScene');
    });
    content.appendChild(cta);

    // Back-to-chapter-select link
    const backLink = document.createElement('button');
    backLink.type = 'button';
    backLink.textContent = '← Back to chapters';
    applyStyle(backLink, {
      marginTop: '6px',
      background: 'transparent',
      border: 'none',
      color: COLOR_TEXT_MUTED,
      fontFamily: 'inherit',
      fontSize: '13px',
      fontWeight: '700',
      cursor: 'pointer',
      touchAction: 'manipulation',
      WebkitTapHighlightColor: 'transparent',
      textAlign: 'center',
    });
    backLink.addEventListener('click', (e) => {
      e.preventDefault();
      this.root?.remove();
      this.root = undefined;
      this.scene.start('StoryModeScene');
    });
    content.appendChild(backLink);

    root.appendChild(content);
    document.body.appendChild(root);
  }
}
