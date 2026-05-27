/**
 * StoryMapView — v1.7.3 Duolingo-style learning map.
 *
 * Vertical scrollable column with zig-zag positioned node buttons. The
 * calico cat sits on the "current" (next-to-do) node and slides with a
 * smooth CSS transition when the current node changes (i.e. after the
 * player completes a question and returns to the map).
 *
 * v1.7.3 scope:
 *   - Ch1 only (per current data; Ch2-8 are on backup/v1.5.1-eight-chapters).
 *   - 6 nodes for Ch1's 6 questions.
 *   - 2 "Coming soon" placeholder nodes hinting Ch2+ existence.
 *   - Click an unlocked node → fires `onPlayChapter(1)`; the caller
 *     wires that to the existing ChapterIntroScene flow. (We don't yet
 *     support per-question jump-in — q-level granularity would need
 *     PlayScene + runStore work.)
 *
 * Why coffee-brown buttons (per user): warm, story-tinted, distinct from
 * Duolingo green so we own our own aesthetic.
 */

import { applyStyle } from './domUtil';
import {
  readChapterProgress,
  isChapterUnlocked,
  isChapterCompleted,
  CHAPTER_META,
  loadStoryQuestions,
  questionsForChapter,
  type ChapterId,
  type StoryQuestion,
} from '../data/storyKitten';
import { speak, stopSpeaking } from '../audio/tts';
import { preloadHints, wireSentenceHints } from './WordHint';
import { readXp, levelForXp } from '../data/xp';
import { readStreak } from '../data/streak';
import { readCoins } from '../data/coins';
import { useRunStore } from '../store/runStore';

export interface StoryMapHandlers {
  onPlayChapter: (chapter: ChapterId) => void;
  /** v1.9.15: HUD icon taps need to switch tabs via the parent scene. */
  onSwitchTab?: (tab: 'home' | 'tasks' | 'profile' | 'alerts') => void;
}

const COLOR_BG = '#fef8ed';
const COLOR_NODE = '#a47148';        // coffee brown
const COLOR_NODE_DARK = '#7a5b3a';   // shadow side
const COLOR_NODE_DONE = '#7d9a4f';   // muted green for completed
const COLOR_NODE_DONE_DARK = '#5e7a36';
const COLOR_NODE_LOCKED = '#c4b89c'; // dim taupe
const COLOR_NODE_LOCKED_DARK = '#a89c80';
const COLOR_TEXT_DARK = '#3c2a1c';
const COLOR_TEXT_MUTED = '#7a6850';

// v1.7.9: nodes are now flattened ovals (Duolingo "tilted coin" look)
// rather than circles. Width > height for the isometric foreshortening.
const NODE_SIZE = 82;   // width
const NODE_HEIGHT = 64; // visual height — gives the 5:4 ratio
const CONTAINER_W = 320;

// v1.8.1: redesigned path — "many nodes on same side before turning"
// per Duolingo reference (user 2026-05-27). No more strict left-right
// zig-zag. Flow: right cluster → drift center → left cluster → back
// center. Path reads like a meandering river.
// v1.8.2: opened vertical spacing from ~84px to ~100px between nodes
// (more breathing room, less cramped).
const NODE_PATH: Array<{ dx: number; top: number }> = [
  { dx: 10,  top: 16 },    // node 0 — slight right of center
  { dx: 30,  top: 116 },   // node 1 — drift right
  { dx: 38,  top: 214 },   // node 2 — right peak
  { dx: 16,  top: 312 },   // node 3 — start curving back
  { dx: -20, top: 410 },   // node 4 — cross center, into left
  { dx: -38, top: 506 },   // node 5 — left peak
  { dx: -18, top: 618 },   // node 6 — Ch2 lock, curve back
  { dx: 14,  top: 716 },   // node 7 — Ch2 lock, near center
];
// (ROW_HEIGHT removed v1.8.0 — irregular path replaces it)

// Ch1 narrative beats — short label per question, used as tooltip / aria.
const CH1_BEAT_LABELS = [
  'Rainy start',
  'Wet and cold',
  'Hungry alley',
  'A big shadow',
  'A kind face',
  'Sheltered',
];

const LS_LAST_CAT_NODE = 'pickup.map.cat-node';

/**
 * v1.7.10: derive a darker shade of a hex color for matching-family
 * shadows. amount=0.35 means 35% darker. Replaces hard-coded
 * COLOR_NODE_DARK on the banner so the banner depth-shadow matches the
 * banner's body color family, not coffee brown.
 */
function darken(hex: string, amount = 0.35): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.round(r * (1 - amount))}, ${Math.round(g * (1 - amount))}, ${Math.round(b * (1 - amount))})`;
}

interface NodeRef {
  idx: number;          // 0..N
  el: HTMLButtonElement;
  unlocked: boolean;
  completed: boolean;
  isCurrent: boolean;
}

export class StoryMapView {
  private root: HTMLDivElement;
  private scrollArea: HTMLDivElement;
  private nodes: NodeRef[] = [];
  private cat: HTMLDivElement;
  private handlers: StoryMapHandlers;

  constructor(handlers: StoryMapHandlers) {
    this.handlers = handlers;
    this.root = document.createElement('div');
    this.root.id = 'pickup-story-map';
    applyStyle(this.root, {
      position: 'fixed',
      inset: '0',
      background: COLOR_BG,
      zIndex: '20',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: '"Nunito", "Noto Sans TC", system-ui, sans-serif',
      color: COLOR_TEXT_DARK,
    });

    // v1.9.1: Top HUD bar (Duolingo style — gamification at-a-glance)
    const hudBar = this.buildHudBar();
    this.root.appendChild(hudBar);

    // Header — section banner (Duolingo-style filled card at top)
    const header = this.buildHeader();
    this.root.appendChild(header);

    // Scroll area — contains the zig-zag map + leaves room for bottom nav
    this.scrollArea = document.createElement('div');
    applyStyle(this.scrollArea, {
      flex: '1 1 auto',
      overflowY: 'auto',
      overflowX: 'hidden',
      // v1.7.10: extra top padding so the banner's depth shadow plus
      // any drift can't reach the first node / cat position.
      paddingTop: '34px',
      paddingBottom: '110px', // leave space for BottomNav
      position: 'relative',
      WebkitOverflowScrolling: 'touch',
    });

    // Inner column where nodes live (centered)
    const column = document.createElement('div');
    applyStyle(column, {
      width: `${CONTAINER_W}px`,
      margin: '0 auto',
      position: 'relative',
    });

    // Cat sprite — absolute-positioned inside the column. Sits ABOVE
    // the current node, breathing/swaying when idle, transitions
    // smoothly when its transform changes (i.e. when the current
    // node moves after a question is completed).
    this.cat = this.buildCat();
    column.appendChild(this.cat);

    // Build nodes — Ch1's 6 questions
    const progress = readChapterProgress();
    const ch1Unlocked = isChapterUnlocked(1);
    const ch1Completed = isChapterCompleted(1);
    const currentNodeIdx = this.deriveCurrentNodeIdx(progress.highestCompleted);
    for (let i = 0; i < 6; i++) {
      const beat = CH1_BEAT_LABELS[i];
      const node = this.buildNode({
        idx: i,
        label: beat,
        unlocked: ch1Unlocked,
        completed: ch1Completed,
        chapter: 1,
      });
      // v1.7.12: mark the user's current node so CSS pulse animation
      // can highlight where they are (replaces the visual role the cat
      // sprite used to play).
      if (i === currentNodeIdx) {
        node.el.classList.add('pickup-map-node-current');
      }
      column.appendChild(node.el);
      this.nodes.push(node);
    }

    // Sub-section divider hint — "Chapter 2 coming"
    column.appendChild(this.buildDivider('Chapter 2 — coming soon'));

    // 2 locked placeholder nodes — visual continuity, hints "more is coming"
    for (let i = 0; i < 2; i++) {
      const node = this.buildNode({
        idx: 6 + i,
        label: 'Locked',
        unlocked: false,
        completed: false,
        chapter: null,
      });
      column.appendChild(node.el);
      this.nodes.push(node);
    }

    this.scrollArea.appendChild(column);
    this.root.appendChild(this.scrollArea);
    document.body.appendChild(this.root);

    // Position cat on the current node. Done in rAF so layout is settled.
    const currentIdx = this.deriveCurrentNodeIdx(progress.highestCompleted);
    requestAnimationFrame(() => this.positionCat(currentIdx, /* animate */ false));

    // If we re-entered the map after progress advanced, animate from
    // the last-seen position to the new one. This is the "cat jumps to
    // next node" effect the user asked for.
    const lastIdx = this.readLastCatIdx();
    if (lastIdx !== null && lastIdx !== currentIdx) {
      // Snap to last position, then schedule a transition to current.
      requestAnimationFrame(() => {
        this.positionCat(lastIdx, /* animate */ false);
        // Two frames later, animate to current — gives the browser a
        // chance to commit the snap before the transition kicks in.
        requestAnimationFrame(() =>
          requestAnimationFrame(() => this.positionCat(currentIdx, /* animate */ true))
        );
      });
    }
    this.writeLastCatIdx(currentIdx);

    // Scroll the current node into view if it would otherwise be off-screen.
    requestAnimationFrame(() => {
      const target = this.nodes[currentIdx]?.el;
      if (target) {
        const rect = target.getBoundingClientRect();
        if (rect.top < 80 || rect.bottom > window.innerHeight - 130) {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    });
  }

  destroy(): void {
    this.closeKeySentences();
    this.root.remove();
  }

  // ───────────────────────────────────────────────────────────────────

  private buildHudBar(): HTMLElement {
    // v1.9.15: Duolingo-style HUD — Flag / Tier crown / Gems / Energy.
    // Text labels removed; icons + values only. Each slot is a button
    // routing to the appropriate tab. Crown tier scales with level
    // (silver L1-2, gold L3-4, diamond L5+).
    const wrap = document.createElement('div');
    applyStyle(wrap, {
      padding: 'max(14px, env(safe-area-inset-top)) 14px 0',
      flex: '0 0 auto',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: '4px',
      fontFamily: 'inherit',
      marginBottom: '8px',
    });
    const xp = readXp();
    const level = levelForXp(xp);
    const streak = readStreak();
    const coins = readCoins();
    const difficulty = useRunStore.getState().difficulty;
    void xp; void level;  // kept around for future Crown-level mode

    // v1.9.16: Crown tier reflects DIFFICULTY setting per user request:
    //   easy → Silver, medium → Gold, hard → Diamond
    const tierForDifficulty = (d: 'easy' | 'medium' | 'hard'): { fill: string; stroke: string; label: string } => {
      if (d === 'hard') return { fill: '#7ad8e0', stroke: '#3a9eaa', label: 'Diamond' };
      if (d === 'medium') return { fill: '#f0c33a', stroke: '#c79410', label: 'Gold' };
      return { fill: '#c9d2da', stroke: '#7a8794', label: 'Silver' };
    };
    const t = tierForDifficulty(difficulty);
    const crownSvg = `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path d="M3 10l3 3 6-7 6 7 3-3v9H3z" fill="${t.fill}" stroke="${t.stroke}" stroke-width="1.4" stroke-linejoin="round"/>
      <circle cx="6" cy="9" r="1.4" fill="${t.stroke}"/>
      <circle cx="12" cy="5" r="1.4" fill="${t.stroke}"/>
      <circle cx="18" cy="9" r="1.4" fill="${t.stroke}"/>
    </svg>`;

    // v1.9.16: Gold COIN SVG (separate currency from XP)
    const coinSvg = `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <circle cx="12" cy="12" r="9.5" fill="#f0c33a" stroke="#c79410" stroke-width="1.3"/>
      <circle cx="12" cy="12" r="6.5" fill="none" stroke="#c79410" stroke-width="1" stroke-dasharray="1.5 1.5" opacity="0.6"/>
      <text x="12" y="16" text-anchor="middle" font-family="Nunito, sans-serif" font-weight="900" font-size="10" fill="#c79410">¢</text>
      <ellipse cx="9" cy="9" rx="2.5" ry="1.2" fill="#ffffff" opacity="0.45" transform="rotate(-25 9 9)"/>
    </svg>`;

    // Lightning energy SVG (using streak count as the energy "fuel")
    const energySvg = `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path d="M13 2L4 14h6l-2 8 9-12h-6l2-8z" fill="#ff9600" stroke="#c4760b" stroke-width="1.3" stroke-linejoin="round"/>
    </svg>`;

    // Flag (decorative, English course indicator) — UK flag stylized
    const flagSvg = `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <rect x="2" y="5" width="20" height="14" rx="2" fill="#1d4dba"/>
      <path d="M2 5l20 14M22 5L2 19" stroke="#ffffff" stroke-width="2"/>
      <path d="M12 5v14M2 12h20" stroke="#ffffff" stroke-width="3.5"/>
      <path d="M12 5v14M2 12h20" stroke="#cf142b" stroke-width="2"/>
    </svg>`;

    const item = (innerHtml: string, value: string, onClick: () => void, valueColor: string) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.innerHTML = `
        <span style="display:flex;align-items:center;gap:4px;">
          ${innerHtml}
          ${value ? `<span style="font-size:15px;font-weight:900;color:${valueColor};line-height:1;">${value}</span>` : ''}
        </span>
      `;
      Object.assign(btn.style, {
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        padding: '8px 6px',
        borderRadius: '10px',
        fontFamily: 'inherit',
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent',
        display: 'flex',
        alignItems: 'center',
        transition: 'background 120ms ease, transform 80ms ease',
      } as Partial<CSSStyleDeclaration> as Record<string, string>);
      btn.addEventListener('pointerdown', () => { btn.style.transform = 'translateY(1px)'; });
      btn.addEventListener('pointerup', () => { btn.style.transform = ''; });
      btn.addEventListener('pointerleave', () => { btn.style.transform = ''; });
      btn.addEventListener('click', (e) => { e.preventDefault(); onClick(); });
      return btn;
    };

    // v1.9.16 4-slot HUD: Flag(language) / Crown(difficulty) / Coin / Energy
    wrap.appendChild(item(flagSvg, '', () => this.handlers.onSwitchTab?.('profile'), '#3c2a1c'));
    wrap.appendChild(item(crownSvg, t.label, () => this.handlers.onSwitchTab?.('profile'), t.stroke));
    wrap.appendChild(item(coinSvg, String(coins), () => this.handlers.onSwitchTab?.('profile'), '#c79410'));
    wrap.appendChild(item(energySvg, String(streak), () => this.handlers.onSwitchTab?.('alerts'), '#c4760b'));
    return wrap;
  }

  private buildHeader(): HTMLElement {
    const meta = CHAPTER_META[1];
    const wrap = document.createElement('div');
    applyStyle(wrap, {
      padding: 'max(16px, env(safe-area-inset-top)) 14px 0 14px',
      flex: '0 0 auto',
    });

    const card = document.createElement('div');
    applyStyle(card, {
      background: meta.accent,
      borderRadius: '14px',
      padding: '12px 16px',
      color: '#ffffff',
      // v1.7.10:
      //  - 3D depth color now derived from meta.accent (same color
      //    family as banner body, not unrelated coffee brown)
      //  - Cast "ground" shadow removed because it was bleeding into
      //    the scroll area below and visually overlapping the first
      //    node + cat. Banner only has its solid 3D depth now.
      boxShadow: `0 4px 0 ${darken(meta.accent, 0.32)}`,
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
    });
    // Cat paw-pad SVG — decorative brand icon replacing the old restart
    // button. Restart still available via Profile tab → Danger Zone.
    card.innerHTML = `
      <div style="flex:1;">
        <div style="font-size:11px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;opacity:0.85;">
          Section 1
        </div>
        <div style="font-size:17px;font-weight:900;line-height:1.2;margin-top:2px;">
          ${meta.titleEn}
        </div>
      </div>
      <button type="button" aria-label="Chapter key sentences" class="pickup-banner-paw" style="
        width: 38px; height: 38px; border-radius: 11px;
        background: rgba(255,255,255,0.22);
        display: flex; align-items: center; justify-content: center;
        flex: 0 0 auto; border: none; cursor: pointer;
        padding: 0; font-family: inherit;
        touch-action: manipulation; -webkit-tap-highlight-color: transparent;
        transition: transform 80ms ease-out, background 160ms ease;
      ">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="#ffffff" aria-hidden="true">
          <ellipse cx="12" cy="16" rx="5.6" ry="4.6"/>
          <ellipse cx="6" cy="10" rx="2.2" ry="2.6" transform="rotate(-25 6 10)"/>
          <ellipse cx="9.7" cy="6.6" rx="2.1" ry="2.6"/>
          <ellipse cx="14.3" cy="6.6" rx="2.1" ry="2.6"/>
          <ellipse cx="18" cy="10" rx="2.2" ry="2.6" transform="rotate(25 18 10)"/>
        </svg>
      </button>
    `;
    const paw = card.querySelector('.pickup-banner-paw') as HTMLButtonElement | null;
    if (paw) {
      paw.addEventListener('mousedown', () => { paw.style.transform = 'translateY(2px)'; });
      paw.addEventListener('mouseup', () => { paw.style.transform = ''; });
      paw.addEventListener('mouseleave', () => { paw.style.transform = ''; });
      paw.addEventListener('touchstart', () => { paw.style.transform = 'translateY(2px)'; }, { passive: true });
      paw.addEventListener('touchend', () => { paw.style.transform = ''; });
      paw.addEventListener('click', (e) => { e.preventDefault(); this.openKeySentences(1); });
    }
    wrap.appendChild(card);
    return wrap;
  }

  // ─────────────────────────────────────────────────────────────────
  // v1.9.11: Key Sentences overlay — tap the paw on section banner
  // to open a Duolingo-Stories-style summary of the chapter's core
  // sentences. Each sentence has 🔊 + EN with dashed-underline words
  // + ZH translation (from storyBeat). Close X at top-left.
  // ─────────────────────────────────────────────────────────────────
  private keySheet?: HTMLDivElement;

  private async openKeySentences(chapter: ChapterId): Promise<void> {
    if (this.keySheet) return;
    const meta = CHAPTER_META[chapter];
    let questions: StoryQuestion[] = [];
    try {
      const all = await loadStoryQuestions();
      questions = questionsForChapter(all, chapter);
    } catch {
      // ignore — empty list still renders a graceful "no data" state
    }
    preloadHints();

    const sheet = document.createElement('div');
    sheet.id = 'pickup-key-sentences';
    applyStyle(sheet, {
      position: 'fixed',
      inset: '0',
      background: '#fef8ed',
      zIndex: '80',
      paddingTop: 'max(28px, env(safe-area-inset-top))',
      paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
      overflowY: 'auto',
      fontFamily: '"Nunito", "Noto Sans TC", system-ui, sans-serif',
      color: '#3c2a1c',
      opacity: '0',
      transition: 'opacity 240ms ease-out',
    });

    const content = document.createElement('div');
    applyStyle(content, {
      width: 'min(420px, calc(100vw - 32px))',
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
    });

    // Close X at top
    const closeRow = document.createElement('div');
    applyStyle(closeRow, { display: 'flex', alignItems: 'center' });
    const close = document.createElement('button');
    close.type = 'button';
    close.setAttribute('aria-label', 'Close');
    close.innerHTML = '×';
    applyStyle(close, {
      width: '36px', height: '36px', borderRadius: '50%',
      background: '#fffbf2',
      border: '2px solid #ead9bb',
      borderBottom: '3px solid #d4c098',
      color: '#7a6850', fontSize: '22px', fontWeight: '900',
      lineHeight: '1', cursor: 'pointer', padding: '0',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'inherit', touchAction: 'manipulation',
      WebkitTapHighlightColor: 'transparent',
    });
    close.addEventListener('click', (e) => { e.preventDefault(); this.closeKeySentences(); });
    closeRow.appendChild(close);
    content.appendChild(closeRow);

    // Title
    const titleWrap = document.createElement('div');
    titleWrap.innerHTML = `
      <div style="font-size:12px;font-weight:800;letter-spacing:1.5px;color:#7a6850;text-transform:uppercase;text-align:center;">
        ${meta.titleEn}
      </div>
      <div style="font-size:22px;font-weight:900;color:#3c2a1c;text-align:center;margin-top:4px;">
        🐾 Key Sentences
      </div>
    `;
    content.appendChild(titleWrap);

    // Section header
    const head = document.createElement('div');
    head.textContent = '重點語句';
    applyStyle(head, {
      fontSize: '14px',
      fontWeight: '900',
      color: '#3d8aae',
      marginTop: '6px',
    });
    content.appendChild(head);

    // Sentence bubbles (Duolingo Stories style)
    const list = document.createElement('div');
    applyStyle(list, { display: 'flex', flexDirection: 'column', gap: '12px' });
    questions.forEach((q) => {
      const bubble = document.createElement('div');
      applyStyle(bubble, {
        background: '#ffffff',
        border: '2px solid #ead9bb',
        borderRadius: '14px',
        padding: '12px 14px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
      });
      // Speak this sentence (use full sentence with answer filled)
      const correctWord = q.options[q.correctIndex] ?? '';
      const audioText = q.sentence.replace(/_{2,}/g, correctWord);
      const speakerBtn = document.createElement('button');
      speakerBtn.type = 'button';
      speakerBtn.setAttribute('aria-label', 'Listen');
      speakerBtn.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" fill="#3d8aae" aria-hidden="true"><path d="M11 5L6 9H2v6h4l5 4V5zm4.5 7c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>';
      applyStyle(speakerBtn, {
        flex: '0 0 auto', width: '28px', height: '28px',
        background: 'transparent', border: 'none',
        cursor: 'pointer', padding: '0',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'inherit',
        touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent',
        marginTop: '2px',
      });
      speakerBtn.addEventListener('click', (e) => { e.preventDefault(); speak(audioText); });
      bubble.appendChild(speakerBtn);

      const txtWrap = document.createElement('div');
      txtWrap.style.flex = '1 1 auto';
      // EN sentence with dashed-underline words
      const enLine = document.createElement('div');
      enLine.className = 'pickup-narration-line';
      enLine.innerHTML = audioText.split(/(\s+)/).map(tok => {
        if (/^\s+$/.test(tok) || tok === '') return tok;
        return `<span class="word">${tok}</span>`;
      }).join('');
      applyStyle(enLine, {
        fontSize: '15px',
        fontWeight: '700',
        color: '#3c2a1c',
        lineHeight: '1.5',
      });
      txtWrap.appendChild(enLine);

      // ZH translation (from storyBeat)
      if (q.storyBeat) {
        const zhLine = document.createElement('div');
        zhLine.textContent = q.storyBeat;
        applyStyle(zhLine, {
          fontSize: '13px',
          fontWeight: '600',
          color: '#a8927a',
          marginTop: '4px',
          lineHeight: '1.45',
        });
        txtWrap.appendChild(zhLine);
      }
      bubble.appendChild(txtWrap);
      list.appendChild(bubble);
    });
    content.appendChild(list);

    sheet.appendChild(content);
    document.body.appendChild(sheet);
    wireSentenceHints(sheet);
    requestAnimationFrame(() => { sheet.style.opacity = '1'; });
    this.keySheet = sheet;
  }

  private closeKeySentences(): void {
    if (!this.keySheet) return;
    stopSpeaking();
    const s = this.keySheet;
    s.style.opacity = '0';
    window.setTimeout(() => s.remove(), 220);
    this.keySheet = undefined;
  }

  private buildNode(opts: {
    idx: number;
    label: string;
    unlocked: boolean;
    completed: boolean;
    chapter: ChapterId | null;
  }): NodeRef {
    const row = document.createElement('button');
    row.type = 'button';
    row.disabled = !opts.unlocked;
    row.setAttribute('aria-label', `${opts.label}${opts.unlocked ? '' : ' (locked)'}`);
    row.dataset.nodeIdx = String(opts.idx);

    // v1.8.0: irregular hand-tuned position
    const slot = NODE_PATH[opts.idx] ?? NODE_PATH[NODE_PATH.length - 1];
    const leftPx = CONTAINER_W / 2 - NODE_SIZE / 2 + slot.dx;

    const baseColor = opts.completed
      ? COLOR_NODE_DONE
      : opts.unlocked
        ? COLOR_NODE
        : COLOR_NODE_LOCKED;
    const shadowColor = opts.completed
      ? COLOR_NODE_DONE_DARK
      : opts.unlocked
        ? COLOR_NODE_DARK
        : COLOR_NODE_LOCKED_DARK;

    applyStyle(row, {
      position: 'absolute',
      left: `${leftPx}px`,
      top: `${slot.top}px`,
      width: `${NODE_SIZE}px`,
      height: `${NODE_HEIGHT}px`,
      borderRadius: '50%', // ellipse since W != H
      border: 'none',
      // v1.7.8: soft white gloss highlight at upper-left over base color
      background: `radial-gradient(ellipse at 30% 22%, rgba(255, 255, 255, 0.42) 0%, rgba(255, 255, 255, 0) 55%), ${baseColor}`,
      // v1.7.9: thicker 3D depth (11px vs 5px) — Duolingo's tilted coin look
      boxShadow: `0 11px 0 ${shadowColor}, 0 20px 14px -4px rgba(60, 42, 28, 0.32)`,
      color: '#ffffff',
      fontSize: '26px',
      fontWeight: '900',
      fontFamily: 'inherit',
      cursor: opts.unlocked ? 'pointer' : 'not-allowed',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'transform 100ms ease-out',
      touchAction: 'manipulation',
      WebkitTapHighlightColor: 'transparent',
      opacity: opts.unlocked ? '1' : '0.7',
    });

    // v1.7.9: icon system —
    //   completed → ★ emoji (golden star feel)
    //   unlocked  → white paw-pad SVG (brand fingerprint)
    //   locked    → 🔒 emoji
    if (opts.completed) {
      row.textContent = '★';
    } else if (opts.unlocked) {
      row.innerHTML = `<svg viewBox="0 0 24 24" width="34" height="34" fill="#ffffff" aria-hidden="true" style="display:block;">
        <ellipse cx="12" cy="16" rx="5.6" ry="4.6"/>
        <ellipse cx="6" cy="10" rx="2.2" ry="2.6" transform="rotate(-25 6 10)"/>
        <ellipse cx="9.7" cy="6.6" rx="2.1" ry="2.6"/>
        <ellipse cx="14.3" cy="6.6" rx="2.1" ry="2.6"/>
        <ellipse cx="18" cy="10" rx="2.2" ry="2.6" transform="rotate(25 18 10)"/>
      </svg>`;
    } else {
      row.textContent = '🔒';
    }

    if (opts.unlocked) {
      // v1.7.11: real press-down feedback — node visibly depresses,
      // 3D depth shrinks, cast shadow tightens. Released = back to rest.
      const restShadow = `0 11px 0 ${shadowColor}, 0 20px 14px -3px rgba(60, 42, 28, 0.32)`;
      const pressShadow = `0 3px 0 ${shadowColor}, 0 8px 6px -2px rgba(60, 42, 28, 0.22)`;
      const press = () => {
        row.style.transform = 'translateY(8px)';
        row.style.boxShadow = pressShadow;
      };
      const release = () => {
        row.style.transform = '';
        row.style.boxShadow = restShadow;
      };
      row.addEventListener('mousedown', press);
      row.addEventListener('mouseup', release);
      row.addEventListener('mouseleave', release);
      row.addEventListener('touchstart', press, { passive: true });
      row.addEventListener('touchend', release);
      row.addEventListener('touchcancel', release);
      row.addEventListener('click', (e) => {
        e.preventDefault();
        if (opts.chapter !== null) {
          this.handlers.onPlayChapter(opts.chapter);
        }
      });
    }

    return {
      idx: opts.idx,
      el: row,
      unlocked: opts.unlocked,
      completed: opts.completed,
      isCurrent: false,
    };
  }

  private buildDivider(text: string): HTMLElement {
    const div = document.createElement('div');
    applyStyle(div, {
      position: 'absolute',
      left: '0',
      right: '0',
      top: `${NODE_PATH[5].top + NODE_HEIGHT + 26}px`,
      textAlign: 'center',
      fontSize: '11px',
      fontWeight: '800',
      letterSpacing: '1.5px',
      textTransform: 'uppercase',
      color: COLOR_TEXT_MUTED,
      padding: '14px 0',
    });
    div.textContent = text;
    return div;
  }

  private buildCat(): HTMLDivElement {
    const cat = document.createElement('div');
    cat.className = 'pickup-map-cat';
    applyStyle(cat, {
      position: 'absolute',
      // v1.8.2: even tighter — shiba overlaps grandma ~35px (was 20).
      // Container shrunk further.
      width: '122px',
      height: '110px',
      pointerEvents: 'none',
      zIndex: '5',
      transition: 'transform 700ms cubic-bezier(0.4, -0.3, 0.55, 1.5)',
      transformOrigin: '50% 100%',
      willChange: 'transform',
    });
    // v1.7.15: grandma (main, 96px) + shiba (smaller sidekick, 62px)
    // Both isometric chibi WebP (user-generated via ChatGPT, processed
    // through rembg + Pillow WebP — see tools/process_grandma.py and
    // tools/process_shiba.py).
    cat.innerHTML = `
      <img src="/mascots/iso-grandma.webp" alt="" style="
        position:absolute; left:0; bottom:0;
        width:88px; height:auto; display:block;
        z-index:2;
        filter: drop-shadow(0 5px 6px rgba(60, 42, 28, 0.20));
      " />
      <img src="/mascots/iso-shiba.webp" alt="" style="
        position:absolute; left:58px; bottom:-3px;
        width:62px; height:auto; display:block;
        z-index:1;
        filter: drop-shadow(0 5px 6px rgba(60, 42, 28, 0.18));
      " />
    `;
    return cat;
  }

  /**
   * Pick which node the cat should "stand on" given chapter progress.
   * For v1.7.3 (Ch1 only): if Ch1 not yet completed → cat at q1 (node 0).
   * If Ch1 completed → cat parks at q6 (node 5) showing the journey
   * is done. Once Ch2 unlocks, it'll move to node 6.
   */
  private deriveCurrentNodeIdx(highestCompleted: number): number {
    if (highestCompleted >= 1) {
      // Ch1 done — cat parks at last Ch1 node (will hop to ch2 placeholder later)
      return 5;
    }
    return 0;
  }

  /**
   * Position the cat above the target node. When `animate` is true the
   * existing CSS transition handles the smooth slide; when false we
   * temporarily kill the transition so the cat snaps without an arc.
   */
  private positionCat(nodeIdx: number, animate: boolean): void {
    const node = this.nodes[nodeIdx];
    if (!node) return;

    // Translate-to coordinates: place cat top-left such that its bottom
    // overlaps the node center. Cat is 88x110, node is 76x76, node top
    // is at row*ROW_HEIGHT + 16.
    // v1.8.0: derive from irregular NODE_PATH instead of fixed zig-zag
    const slot = NODE_PATH[nodeIdx] ?? NODE_PATH[0];
    const rowTop = slot.top;
    const nodeLeft = CONTAINER_W / 2 - NODE_SIZE / 2 + slot.dx;
    // v1.8.7: back to Duolingo standard — character BESIDE current node.
    // User said "標準就是要跟多鄰國一樣" (standard = match Duolingo).
    // Duolingo Lin sits next to the current lesson node, partially
    // overlapping the tile. Mirror side based on local curve flow.
    const containerW = 122;
    const prevSlot = NODE_PATH[Math.max(0, nodeIdx - 1)] ?? slot;
    const nextSlot = NODE_PATH[Math.min(NODE_PATH.length - 1, nodeIdx + 1)] ?? slot;
    const flowDir = nextSlot.dx - prevSlot.dx;
    const catX = flowDir >= 0
      ? nodeLeft + NODE_SIZE - 40   // curve flowing right → character on RIGHT of node
      : nodeLeft - containerW + 40; // curve flowing left → character on LEFT of node
    const catY = rowTop - 36;       // partially overlap top of node

    if (!animate) {
      this.cat.style.transition = 'none';
      this.cat.style.transform = `translate(${catX}px, ${catY}px)`;
      // Force layout flush then restore transition
      void this.cat.offsetHeight;
      this.cat.style.transition = '';
    } else {
      this.cat.style.transform = `translate(${catX}px, ${catY}px)`;
    }
  }

  private readLastCatIdx(): number | null {
    try {
      const v = localStorage.getItem(LS_LAST_CAT_NODE);
      if (!v) return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    } catch {
      return null;
    }
  }
  private writeLastCatIdx(idx: number): void {
    try {
      localStorage.setItem(LS_LAST_CAT_NODE, String(idx));
    } catch { /* ignore */ }
  }
}
