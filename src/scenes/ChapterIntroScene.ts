import Phaser from 'phaser';
import { useRunStore } from '../store/runStore';
import {
  CHAPTER_META,
  readSrsQueue,
  type ChapterId,
} from '../data/storyKitten';
import { applyStyle, attachPressFeedback } from '../ui/domUtil';
import { getMascotSvg } from '../ui/mascots';
import { speak, stopSpeaking, mp3UrlFor, ensureLookupReady } from '../audio/tts';
import { preloadHints, wireSentenceHints } from '../ui/WordHint';
import { createSpeakerButton } from '../ui/SpeakerButton';
import { applyCatName } from '../data/catName';
import { applyDogName } from '../data/dogName';

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

    // v2.0.B.24: replaced pink card frame + 2 separate mascot slots with
    // a single unified hero scene image (Mochi + Hana sitting at grandma's
    // feet listening to story). Per user feedback: no frame, simple yard
    // background, all 3 characters together in scene.
    const sceneCard = document.createElement('div');
    applyStyle(sceneCard, {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '8px 0 16px',
      minHeight: '180px',
    });
    // v2.0.B.31: inject @keyframes rocking once (idempotent via id check)
    if (!document.getElementById('pickup-rock-keyframes')) {
      const style = document.createElement('style');
      style.id = 'pickup-rock-keyframes';
      style.textContent = `@keyframes pickup-rock-gentle { 0%,100% { transform: rotate(-1.5deg); } 50% { transform: rotate(1.5deg); } }`;
      document.head.appendChild(style);
    }
    const heroImg = document.createElement('img');
    heroImg.src = '/mascots/scene-grandma-storytime.webp';
    heroImg.alt = '';
    applyStyle(heroImg, {
      width: '100%',
      maxWidth: '360px',
      height: 'auto',
      display: 'block',
      animation: 'pickup-rock-gentle 4s ease-in-out infinite',
      transformOrigin: '50% 92%',
    });
    // Fallback: if scene image fails to load (404 during transition), show
    // the legacy kitten + NPC SVGs side-by-side without the pink frame.
    heroImg.onerror = () => {
      sceneCard.innerHTML = '';
      applyStyle(sceneCard, { gap: '10px', alignItems: 'flex-end' });
      const k = document.createElement('div');
      k.innerHTML = getMascotSvg(meta.kittenMascotId);
      sceneCard.appendChild(k);
      const n = document.createElement('div');
      n.innerHTML = getMascotSvg(meta.npcMascotId);
      sceneCard.appendChild(n);
    };
    sceneCard.appendChild(heroImg);
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
    // v1.9.52: inject player's cat name into narration {catName} placeholders.
    applyDogName(applyCatName(meta.narration)).split(/\n+/).forEach((chunk) => {
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

      // v1.9.25 audit #5: use shared SpeakerButton component.
      const speaker = createSpeakerButton({
        text: sentence,
        size: 'sm',
        ariaLabel: `Listen to sentence ${idx + 1}`,
      });
      row.appendChild(speaker);

      const text = document.createElement('div');
      // v1.9.0: wrap each word in <span class="word"> so WordHint can
      // bind tap handlers — Duolingo-style dashed underline + popup
      // translation on tap.
      text.className = 'pickup-narration-line';
      text.innerHTML = sentence.split(/(\s+)/).map(tok => {
        if (/^\s+$/.test(tok) || tok === '') return tok;
        return `<span class="word">${tok}</span>`;
      }).join('');
      applyStyle(text, {
        flex: '1 1 auto',
        fontSize: '15px',
        lineHeight: '1.7',
        color: COLOR_TEXT_DARK,
        fontWeight: '700',
        paddingTop: '6px',
      });
      row.appendChild(text);

      narrationWrap.appendChild(row);
    });
    // v2.0.B.32: "▶ 點我開始故事" button — solves iOS autoplay by being
    // the ACTUAL user-gesture that fires Audio.play() synchronously. Plays
    // narration sentences sequentially via Audio.ended event chaining
    // (allowed within same gesture context).
    applyStyle(narrationWrap, { display: 'none' });
    const startBtn = document.createElement('button');
    startBtn.type = 'button';
    startBtn.textContent = '▶ 點我開始故事';
    applyStyle(startBtn, {
      margin: '8px auto 6px',
      padding: '12px 28px',
      background: COLOR_AMBER,
      border: 'none',
      borderRadius: '24px',
      color: '#fff',
      fontSize: '15px',
      fontWeight: '900',
      cursor: 'pointer',
      display: 'block',
      letterSpacing: '0.5px',
      boxShadow: '0 3px 0 #b07a2a',
    });
    // v2.0.B.33: single Audio element + ended-event chain. iOS Safari
    // allows audio.play() called from inside an 'ended' event handler
    // (same element + recent user gesture). setTimeout-based chains
    // break the gesture link and get NotAllowedError.
    const chainAudio = new Audio();
    let playIdx = 0;
    let chainUrls: string[] = [];
    const playCurrent = () => {
      if (playIdx >= chainUrls.length) {
        startBtn.textContent = '▶ 重新播放';
        playIdx = 0;
        return;
      }
      const url = chainUrls[playIdx];
      startBtn.textContent = `▶ 朗讀中 ${playIdx + 1}/${chainUrls.length}`;
      if (url) {
        chainAudio.src = url;
        void chainAudio.play().catch(() => {
          playIdx += 1;
          playCurrent();
        });
      } else {
        // No MP3 for this sentence — skip
        playIdx += 1;
        playCurrent();
      }
    };
    chainAudio.addEventListener('ended', () => {
      playIdx += 1;
      playCurrent();
    });
    startBtn.onclick = async () => {
      // Ensure lookup populated (fetches /lessons-ch1.json + /story-kitten.json)
      await ensureLookupReady();
      chainUrls = sentences.map((s) => mp3UrlFor(s) ?? '');
      playIdx = 0;
      playCurrent();
    };
    content.appendChild(startBtn);

    const subtitleToggle = document.createElement('button');
    subtitleToggle.type = 'button';
    subtitleToggle.textContent = '▾ 顯示字幕';
    applyStyle(subtitleToggle, {
      margin: '8px auto 12px',
      padding: '10px 22px',
      background: 'transparent',
      border: `2px solid ${COLOR_AMBER}`,
      borderRadius: '24px',
      color: COLOR_AMBER_DARK,
      fontSize: '14px',
      fontWeight: '800',
      cursor: 'pointer',
      display: 'block',
      letterSpacing: '0.5px',
    });
    subtitleToggle.onclick = () => {
      const open = narrationWrap.style.display !== 'none';
      narrationWrap.style.display = open ? 'none' : 'block';
      subtitleToggle.textContent = open ? '▾ 顯示字幕' : '▴ 收起字幕';
    };
    content.appendChild(subtitleToggle);
    content.appendChild(narrationWrap);

    preloadHints();
    wireSentenceHints(narrationWrap);

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
    // v1.9.5: CTA text reflects mode picked at node sheet
    cta.textContent = useRunStore.getState().listeningMode
      ? '🎧 Start Listening →'
      : '📖 Start Reading →';
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
      // v1.9.44 Duo flat: CTA blur halo removed; press-feedback does the 3D.
      boxShadow: 'none',
    });
    cta.classList.add('pickup-pulse');
    attachPressFeedback(cta, { depth: 2, borderBottom: { from: 5, to: 3 } });
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
