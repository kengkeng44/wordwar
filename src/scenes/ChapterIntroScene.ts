import Phaser from 'phaser';
import { useRunStore } from '../store/runStore';
import {
  CHAPTER_META,
  readSrsQueue,
  type ChapterId,
} from '../data/storyKitten';
import { applyStyle, attachPressFeedback } from '../ui/domUtil';
import { getMascotSvg } from '../ui/mascots';
import { stopSpeaking, speak, warmUpChapterAudio } from '../audio/tts';
import { preloadHints, wireSentenceHints } from '../ui/WordHint';
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
  // v2.0.B.46: track narration concat audio so scene SHUTDOWN can pause it.
  // Without this, the Audio element keeps playing in browser background
  // after user enters a lesson — Mochi's voice doesn't disappear.
  private narrationAudio?: HTMLAudioElement;

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
      // v2.0.B.46: pause narration so Mochi's voice doesn't bleed into lesson scene
      if (this.narrationAudio) {
        try {
          this.narrationAudio.pause();
          this.narrationAudio.currentTime = 0;
          this.narrationAudio.src = '';
        } catch {
          // ignore
        }
        this.narrationAudio = undefined;
      }
      stopSpeaking();
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
    // v2.0.B.43: chapter-aware hero. Ch1 = Mochi alone narrating her own
    // origin story (4th-wall break). Ch2-8 = grandma reading bedtime story
    // to Mochi (奶奶說 inner story 的構圖). Both in Duolingo flat icon style.
    heroImg.src = chapter === 1
      ? '/mascots/scene-mochi-talking.webp'
      : '/mascots/scene-grandma-storytime.webp';
    heroImg.alt = '';
    applyStyle(heroImg, {
      width: '60%',
      maxWidth: '220px',
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
    // v2.0.B.53: removed outer white box/border per user feedback (frameless).
    // Each row now uses Mochi avatar on left instead of generic speaker icon.
    applyStyle(narrationWrap, {
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      padding: '4px 0',
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
        alignItems: 'center',
        gap: '12px',
        cursor: 'pointer',
        padding: '6px 4px',
        borderRadius: '12px',
        transition: 'background 120ms ease',
      });

      // v2.0.B.73: background-image avatar (head crop via background-size +
      // background-position — cleaner than img + transform tricks).
      // scene-mochi-talking.webp's head sits at ~y=25% of source image;
      // background-size: 180% + position: center 18% frames head + ears.
      const avatar = document.createElement('button');
      avatar.type = 'button';
      avatar.setAttribute('aria-label', `Mochi 唸第 ${idx + 1} 句 · Listen to sentence ${idx + 1}`);
      applyStyle(avatar, {
        flex: '0 0 auto',
        width: '34px',
        height: '34px',
        background: '#fef8ed url(/mascots/scene-mochi-talking.webp) no-repeat center 22% / 165%',
        border: 'none',
        borderRadius: '50%',
        cursor: 'pointer',
        padding: '0',
        display: 'block',
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent',
        transition: 'transform 120ms ease',
      });
      // pulse on the FIRST avatar only — hints "tap me to start"
      if (idx === 0) avatar.classList.add('pickup-speaker-pulse');

      const text = document.createElement('div');
      text.className = 'pickup-narration-line';
      applyStyle(text, {
        flex: '1 1 auto',
        fontSize: '15px',
        lineHeight: '1.7',
        color: COLOR_TEXT_DARK,
        fontWeight: '700',
        userSelect: 'none',
      });

      // Per-word underscore blanks → tap avatar/row to reveal + speak.
      const tokens = sentence.split(/(\s+)/);
      const realHtml = tokens.map(tok => {
        if (/^\s+$/.test(tok) || tok === '') return tok;
        return `<span class="word">${tok}</span>`;
      }).join('');
      const blankHtml = tokens.map(tok => {
        if (/^\s+$/.test(tok) || tok === '') return tok;
        return `<span style="color:${COLOR_BORDER_DARK};letter-spacing:1px;">${'_'.repeat(Math.min(Math.max(tok.length, 2), 6))}</span>`;
      }).join('');
      text.innerHTML = blankHtml;
      let revealed = false;
      const reveal = () => {
        if (revealed) return;
        revealed = true;
        text.innerHTML = realHtml;
        wireSentenceHints(text);
      };

      const trigger = () => { reveal(); speak(sentence); };
      avatar.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); trigger(); });
      row.addEventListener('click', trigger);

      row.appendChild(avatar);
      row.appendChild(text);
      narrationWrap.appendChild(row);
    });
    // v2.0.B.55: removed standalone paw "play full narration" button per
    // user feedback ("這頁的按鈕刪掉 改成next"). Each sentence row now has
    // its own Mochi avatar (B.53) for per-line audio playback. The concat
    // narration MP3 is no longer wired — narrationAudio kept as undefined
    // (SHUTDOWN cleanup still safe via existing null-check).
    applyStyle(narrationWrap, { display: 'block' });
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

    // CTA — v2.0.B.55: bilingual Next button per memory rule.
    const cta = document.createElement('button');
    cta.type = 'button';
    cta.textContent = '下一步 · Next →';
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
      // v2.0.B.78: warm-up in background + 1.2s max wait. B.76 blocked
      // indefinitely waiting for Howler load events that never fired in
      // some iOS Safari conditions → "載入中" stuck forever. Now: kick
      // warm-up async, race with 1.2s timeout, proceed regardless.
      stopSpeaking();
      const origText = cta.textContent;
      cta.textContent = '載入中… · Loading…';
      (cta as HTMLButtonElement).disabled = true;
      const timeout = new Promise<void>(r => setTimeout(r, 1200));
      void Promise.race([warmUpChapterAudio(chapter), timeout]).finally(() => {
        cta.textContent = origText;
        (cta as HTMLButtonElement).disabled = false;
        this.root?.remove();
        this.root = undefined;
        this.scene.start('PlayScene');
      });
    });
    // v2.0.B.56: Next CTA placed right under the hero image (above narration),
    // per user feedback "那個next 是要放在圖下面". Narration sentences become
    // optional context that scrolls below — user can skip straight to lesson.
    content.insertBefore(cta, narrationWrap);

    root.appendChild(content);
    document.body.appendChild(root);
  }
}
