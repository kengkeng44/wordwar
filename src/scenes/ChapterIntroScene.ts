import Phaser from 'phaser';
import { useRunStore } from '../store/runStore';
import {
  CHAPTER_META,
  readSrsQueue,
  type ChapterId,
} from '../data/storyKitten';
import { applyStyle } from '../ui/domUtil';
import { getMascotSvg } from '../ui/mascots';
import { speak, stopSpeaking } from '../audio/tts';

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
    // v1.8.7: kill leftover nav so chapter intro is immersive too.
    document.getElementById('pickup-bottom-nav')?.remove();
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

    // v1.8.6: Duolingo Stories style — narration split sentence-by-
    // sentence. Each sentence gets its own row with a 🔊 icon on the
    // left + dashed underline below. Tap any 🔊 to replay that line.
    // Auto-play the first sentence on mount.
    const narrationWrap = document.createElement('div');
    applyStyle(narrationWrap, {
      background: '#ffffff',
      border: `2px solid ${COLOR_BORDER}`,
      borderBottom: `4px solid ${COLOR_BORDER_DARK}`,
      borderRadius: '16px',
      padding: '14px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
    });

    // Split narration: respect explicit newlines first, then split each
    // chunk on sentence boundaries. Keep punctuation attached.
    const sentences: string[] = [];
    meta.narration.split(/\n+/).forEach((chunk) => {
      const trimmed = chunk.trim();
      if (!trimmed) return;
      const parts = trimmed.match(/[^.!?…]+[.!?…]+|\S+/g);
      if (parts) {
        parts.forEach(p => { const s = p.trim(); if (s) sentences.push(s); });
      } else {
        sentences.push(trimmed);
      }
    });

    sentences.forEach((sentence, idx) => {
      const row = document.createElement('div');
      applyStyle(row, {
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
        paddingBottom: '8px',
        borderBottom: `1.5px dashed ${COLOR_BORDER}`,
      });

      const speaker = document.createElement('button');
      speaker.type = 'button';
      speaker.setAttribute('aria-label', `Listen to sentence ${idx + 1}`);
      // v1.8.8: smaller icon-only style closer to Duolingo Stories.
      // Was 34×34 chunky button; now 24×24 minimal icon.
      speaker.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" fill="#3d8aae" aria-hidden="true"><path d="M11 5L6 9H2v6h4l5 4V5zm4.5 7c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>';
      applyStyle(speaker, {
        flex: '0 0 auto',
        width: '28px',
        height: '28px',
        borderRadius: '50%',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        padding: '0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'inherit',
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent',
        marginTop: '2px',
      });
      speaker.addEventListener('click', (e) => {
        e.preventDefault();
        speak(sentence);
      });
      row.appendChild(speaker);

      const text = document.createElement('div');
      text.textContent = sentence;
      applyStyle(text, {
        flex: '1 1 auto',
        fontSize: '15px',
        lineHeight: '1.55',
        color: COLOR_TEXT_DARK,
        fontWeight: '700',
        paddingTop: '6px',
      });
      row.appendChild(text);

      narrationWrap.appendChild(row);
    });
    content.appendChild(narrationWrap);

    // Auto-play the first sentence after mount (works on iOS because
    // the previous user gesture — sheet button — already unlocked TTS).
    if (sentences.length > 0) {
      window.setTimeout(() => speak(sentences[0]), 400);
    }

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
      stopSpeaking();
      this.root?.remove();
      this.root = undefined;
      this.scene.start('PlayScene');
    });
    content.appendChild(cta);

    root.appendChild(content);
    document.body.appendChild(root);
  }
}
