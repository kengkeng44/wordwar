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

import { applyStyle, attachPressFeedback } from './domUtil';
import { createSpeakerButton } from './SpeakerButton';
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
import { stopSpeaking } from '../audio/tts';
import { preloadHints, wireSentenceHints } from './WordHint';
import { readXp, levelForXp, levelProgress } from '../data/xp';
import { readStreak } from '../data/streak';
import { readCoins } from '../data/coins';
import { applyCatName } from '../data/catName';
import { applyDogName } from '../data/dogName';
import { loadChapterLessons } from '../data/lessons';
import { readCompletedLessons, isLessonUnlocked } from '../store/runStore';

export interface StoryMapHandlers {
  onPlayChapter: (chapter: ChapterId) => void;
  /** v1.9.15: HUD icon taps need to switch tabs via the parent scene. */
  onSwitchTab?: (tab: 'home' | 'tasks' | 'profile' | 'alerts') => void;
}

const COLOR_BG = '#f1ebe1'; // v1.9.53: ~5% darker cream (was #fef8ed)
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
// v1.9.50: Ch1 expanded 6→8 questions (grandma bedtime story framework).
// 8 Ch1 main nodes + 2 Ch2 lock teasers below.
const NODE_PATH: Array<{ dx: number; top: number }> = [
  { dx: 10,  top: 16 },    // node 0 — slight right of center
  { dx: 30,  top: 116 },   // node 1 — drift right
  { dx: 38,  top: 214 },   // node 2 — right peak
  { dx: 16,  top: 312 },   // node 3 — start curving back
  { dx: -20, top: 410 },   // node 4 — cross center, into left
  { dx: -38, top: 506 },   // node 5 — left peak
  { dx: -18, top: 604 },   // node 6 — curve back
  { dx: 14,  top: 700 },   // node 7 — near center (Ch1 last)
  { dx: 30,  top: 798 },   // node 8 — Ch2 lock teaser
  { dx: 38,  top: 896 },   // node 9 — Ch2 lock teaser
];
// (ROW_HEIGHT removed v1.8.0 — irregular path replaces it)

// v2.0 — 24-button winding path per chapter (Duolingo-nested model).
// Y values approximate a sinuous curve descending from banner to chapter
// end. X alternates with mild jitter to avoid straight-line monotony.
// Polish in Phase D (Plan 9) once Ch1 content lands and visual density
// is testable.
// v2.0.B.84: extended 24 → 25 nodes per Ch1-Ch8 unified spec.
// L1-L3 outer prologue / L4-L18 main story (15) / L19-L22 aesop sides (4) /
// L23 outer outro / L24 番外 bonus / L25 review tap-pairs.
const NODE_PATH_V2: Array<{ dx: number; top: number }> = [
  // Outer prologue (3)
  { dx: 10,  top: 16  },
  { dx: 30,  top: 100 },
  { dx: -20, top: 184 },
  // Main story (15)
  { dx: 18,  top: 268 },
  { dx: 38,  top: 352 },
  { dx: 24,  top: 436 },
  { dx: -10, top: 520 },
  { dx: -34, top: 604 },
  { dx: -18, top: 688 },
  { dx: 16,  top: 772 },
  { dx: 36,  top: 856 },
  { dx: 20,  top: 940 },
  { dx: -12, top: 1024 },
  { dx: -32, top: 1108 },
  { dx: -16, top: 1192 },
  { dx: 14,  top: 1276 },
  { dx: 34,  top: 1360 },
  { dx: 18,  top: 1444 },
  // Aesop sides (4)
  { dx: -10, top: 1528 },
  { dx: -30, top: 1612 },
  { dx: -14, top: 1696 },
  { dx: 16,  top: 1780 },
  // Outer outro (1)
  { dx: 30,  top: 1864 },
  // 番外 bonus (1) — slightly offset to mark special
  { dx: 0,   top: 1948 },
  // Review tap-pairs (1)
  { dx: 8,   top: 2032 },
];

// v2.0 feature flag — when true Ch1 renders via lesson-driven V2 path.
// Flip to false to fall back to legacy 8-node + 2-teaser NODE_PATH.
const V2_ENABLED = true;

// Ch1 narrative beats — short label per question, used as tooltip / aria.
// v1.9.50: 8 beats for grandma-v4 framework (prologue + tale + goodnight + review).
const CH1_BEAT_LABELS = [
  'I am {catName}',
  'Meet {dogName}',
  'Tonight a story',
  'Rainy night cat',
  'The umbrella',
  'Took her home',
  'Goodnight',
  'Four words',
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

// v1.9.43: lighten a hex by mixing toward white. Used to create the Duo-style
// banner top highlight band ("光") — a flat lighter color block stacked on
// top of the main body, NOT a gradient.
function lighten(hex: string, amount = 0.22): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const m = (c: number) => Math.round(c + (255 - c) * amount);
  return `rgb(${m(r)}, ${m(g)}, ${m(b)})`;
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

    // v2.0.B.62: removed first-time welcome pill ("從第一顆節點開始 · Tap to
    // begin") per user feedback — map UI is self-explanatory, the welcome
    // pulse on the unlocked node already cues "tap me".

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

    // v2.0.B.17: Hana on her own — placed at a different button-curve
    // center on the map (lower-mid section, right side of layout). Fixed
    // decorative anchor (does NOT follow player progress like grandma).
    const shiba = document.createElement('div');
    applyStyle(shiba, {
      position: 'absolute',
      // User-drawn placement (2026-05-30): right-side curve middle,
      // around node 3-5 vertical (top ~480px), well separated from
      // grandma anchor in upper-left.
      left: `${CONTAINER_W / 2 + 60}px`,
      top: '480px',
      width: '80px',
      height: '90px',
      pointerEvents: 'none',
      zIndex: '4',
    });
    shiba.innerHTML = `
      <div style="
        position:absolute; left:8px; bottom:-2px;
        width:64px; height:9px;
        background:rgba(60,42,28,0.28);
        border-radius:50%;
        z-index:0;
      "></div>
      <img src="/mascots/iso-shiba.webp" alt="" style="
        position:absolute; left:0; bottom:0;
        width:80px; height:auto; display:block;
        z-index:1;
      " />
    `;
    column.appendChild(shiba);

    // Build nodes — Ch1's 8 questions (v1.9.50 grandma-v4)
    const progress = readChapterProgress();
    const ch1Unlocked = isChapterUnlocked(1);
    const ch1Completed = isChapterCompleted(1);
    const currentNodeIdx = this.deriveCurrentNodeIdx(progress.highestCompleted);

    if (V2_ENABLED) {
      // v2.0 — lesson-driven 24-button rendering. Async load gated; render
      // empty path skeleton initially then replace with real lessons once
      // fetched. Acceptable UX trade-off (StoryMapView mount is async-friendly).
      // public/lessons-ch1.json may not exist yet (Task 10 stubs it);
      // catch + log + silent no-op so legacy code path doesn't crash.
      void (async () => {
        try {
          const lessons = await loadChapterLessons(1);
          const completed = readCompletedLessons(1);
          lessons.forEach((lesson) => {
            const i = lesson.lessonInChapter - 1;
            if (i < 0 || i >= NODE_PATH_V2.length) return;
            const pos = NODE_PATH_V2[i];
            const isCompleted = completed.has(lesson.id);
            const isUnlocked = isLessonUnlocked(1, lesson.lessonInChapter, completed.size);
            const label = applyDogName(
              applyCatName(lesson.storyBeat ?? `Lesson ${lesson.lessonInChapter}`)
            );
            const node = this.buildNode({
              idx: i,
              label,
              unlocked: isUnlocked,
              completed: isCompleted,
              chapter: 1,
              positionOverride: pos,
            });
            // v2.0 click — still routes through onPlayChapter (Task 10 will
            // wire LessonScene direct-start once integration lands).
            node.el.addEventListener('click', () => {
              if (!isUnlocked) return;
              this.handlers.onPlayChapter(1);
              // Direct lesson-start (Task 10 e2e):
              // (window as any).pickupGame?.scene.start('LessonScene', { chapter: 1, lessonId: lesson.id });
            });
            column.appendChild(node.el);
            this.nodes.push(node);
          });
        } catch (e) {
          // Fallback: silent fail until Task 10 ships public/lessons-ch1.json.
          // Legacy 8-node path is gated off — V2_ENABLED=false to re-enable.
          console.error('Failed to load Ch1 lessons for V2 map:', e);
        }
      })();
    } else {
      // Legacy v1.9.54 8-node Ch1 + divider + 2 Ch2 teaser path.
      for (let i = 0; i < 8; i++) {
        const beat = applyDogName(applyCatName(CH1_BEAT_LABELS[i]));
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

      // v1.9.54: 2 Ch2 lock-teaser nodes use NODE_PATH[8]/[9] (was 6+i before
      // Ch1 expanded to 8 nodes; that overlapped Ch1's idx 6/7).
      for (let i = 0; i < 2; i++) {
        const node = this.buildNode({
          idx: 8 + i,
          label: 'Locked',
          unlocked: false,
          completed: false,
          chapter: null,
        });
        column.appendChild(node.el);
        this.nodes.push(node);
      }
    }

    // v1.9.54: animate newly-unlocked nodes (across chapter transitions).
    // localStorage stores last seen highestCompleted; on next mount if
    // current > stored, nodes that just transitioned to unlocked get a
    // scale + grayscale-reveal pop.
    try {
      const LS_KEY = 'pickup.map.last-seen-completed';
      const seen = parseInt(localStorage.getItem(LS_KEY) ?? '0', 10);
      const cur = progress.highestCompleted;
      if (cur > seen) {
        // Identify nodes that were locked at `seen` but unlocked now.
        // For Ch1 (cur=1, seen=0): no new unlocks here (Ch1 was always unlocked).
        // For Ch2+ (cur=2, seen=1): the Ch2 teaser nodes would be unlocked.
        for (const n of this.nodes) {
          if (n.unlocked) n.el.classList.add('pickup-map-node-unlock-pop');
        }
        // Persist after animation finishes so it only plays once.
        window.setTimeout(() => {
          try { localStorage.setItem(LS_KEY, String(cur)); } catch { /* ignore */ }
        }, 1200);
      } else if (seen === 0 && cur === 0) {
        // First-ever visit: pop the very first node to teach "tap me".
        const first = this.nodes[0];
        if (first?.unlocked) first.el.classList.add('pickup-map-node-unlock-pop');
        window.setTimeout(() => {
          try { localStorage.setItem(LS_KEY, '0'); } catch { /* ignore */ }
        }, 1200);
      }
    } catch {
      // ignore localStorage failures
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
    // v1.9.25: Crown decoupled from Difficulty (audit #3).
    // Tier now reflects LEVEL (Duolingo's original skill-mastery semantic):
    //   L1-2 → Silver, L3-4 → Gold, L5+ → Diamond
    // Difficulty stays in Profile picker as single source of truth.
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

    const tierForLevel = (lv: number): { stroke: string; label: string; filter: string } => {
      if (lv >= 5) return { stroke: '#3a9eaa', label: `L${lv}`, filter: 'hue-rotate(155deg) saturate(0.75)' };
      if (lv >= 3) return { stroke: '#c79410', label: `L${lv}`, filter: 'none' };
      return { stroke: '#7a8794', label: `L${lv}`, filter: 'saturate(0.12) brightness(0.95)' };
    };
    const t = tierForLevel(level);
    // v1.9.17: user-generated PNG icons (rembg + WebP), 24px square.
    // Crown recolored per tier via CSS filter.
    const iconImg = (src: string, filter = 'none') =>
      `<img src="/mascots/${src}" alt="" aria-hidden="true" width="24" height="24" style="display:block;filter:${filter};" />`;
    const flagSvg   = iconImg('flag-en.webp');
    const crownSvg  = iconImg('crown-gold.webp', t.filter);
    const coinSvg   = iconImg('coin-gold.webp');
    // v1.9.41: Duo-flat icon-flame.webp replaces the prior inline SVG.
    const energySvg = '<img src="/mascots/icon-flame.webp" alt="" aria-hidden="true" width="26" height="26" style="display:block;" />';

    const item = (innerHtml: string, value: string, onClick: () => void, valueColor: string, ariaLabel: string, progress?: number) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.setAttribute('aria-label', ariaLabel);
      // v1.9.37 audit-2 F3: optional mini progress bar (4px) below the
      // icon row — used by Crown slot to show XP fraction toward next level.
      const progressHtml = typeof progress === 'number'
        ? `<span style="display:block;width:38px;height:3px;background:rgba(122,104,80,0.18);border-radius:2px;margin-top:3px;overflow:hidden;">
             <span style="display:block;width:${Math.round(progress * 100)}%;height:100%;background:${valueColor};border-radius:2px;transition:width 400ms cubic-bezier(0.2,0.8,0.4,1);"></span>
           </span>`
        : '';
      btn.innerHTML = `
        <span style="display:flex;flex-direction:column;align-items:center;gap:0;">
          <span style="display:flex;align-items:center;gap:4px;">
            ${innerHtml}
            ${value ? `<span style="font-size:15px;font-weight:900;color:${valueColor};line-height:1;">${value}</span>` : ''}
          </span>
          ${progressHtml}
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
      attachPressFeedback(btn, 1);
      btn.addEventListener('click', (e) => { e.preventDefault(); onClick(); });
      return btn;
    };

    // v1.9.35 audit-2 F6: first-time user (xp=0) sees coin/streak slots
    // without the cold "0" digit — just the icon. Less stark, warmer
    // onboarding aligned with Pickup brand.
    // v1.9.37 audit-2 F3: Crown slot shows XP fraction to next level.
    const firstTime = xp === 0;
    const lvlProg = levelProgress(xp);
    wrap.appendChild(item(flagSvg, '', () => this.handlers.onSwitchTab?.('profile'), '#3c2a1c', 'Language: English'));
    wrap.appendChild(item(crownSvg, t.label, () => this.handlers.onSwitchTab?.('profile'), t.stroke, `Crown level ${level}, ${Math.round(lvlProg.fraction * 100)}% to L${level + 1}`, lvlProg.fraction));
    wrap.appendChild(item(coinSvg, firstTime ? '' : String(coins), () => this.handlers.onSwitchTab?.('profile'), '#c79410', `Coins ${coins}`));
    wrap.appendChild(item(energySvg, firstTime ? '' : String(streak), () => this.handlers.onSwitchTab?.('tasks'), '#ff7a3a', `Streak ${streak} day${streak === 1 ? '' : 's'}`));
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
      // v1.9.43 Duo-style banner: composite shadow = top 8px lighter
      // highlight layer (matches Duo screenshot stratification) + 3D depth.
      boxShadow: `inset 0 8px 0 ${lighten(meta.accent, 0.18)}, 0 4px 0 ${darken(meta.accent, 0.32)}`,
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
    });
    // Cat paw-pad SVG — decorative brand icon replacing the old restart
    // button. Restart still available via Profile tab → Danger Zone.
    card.innerHTML = `
      <div style="flex:1;">
        <div style="font-size:11px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;opacity:0.85;">
          Section 1 · 第 1 章
        </div>
        <div style="font-size:17px;font-weight:900;line-height:1.2;margin-top:2px;">
          ${meta.titleZh}
        </div>
        <div style="font-size:12px;font-weight:700;line-height:1.2;margin-top:2px;opacity:0.85;font-style:italic;">
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
        <img src="/mascots/node-paw.webp" alt="" aria-hidden="true" width="24" height="24" style="display:block;filter:brightness(0) invert(1);" />
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
      <div style="font-size:22px;font-weight:900;color:#3c2a1c;text-align:center;margin-top:4px;display:flex;align-items:center;justify-content:center;gap:8px;">
        <img src="/mascots/icon-paw.webp" alt="" aria-hidden="true" width="28" height="28" style="display:inline-block;" />
        Key Sentences
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
      // Speak this sentence (use full sentence with answer filled).
      // v2.0: options/correctIndex are optional on StoryQuestion now
      // (tap-tiles / tap-pairs don't carry them) — fall back to the
      // raw sentence for those types.
      const correctWord =
        q.options && q.correctIndex !== undefined
          ? (q.options[q.correctIndex] ?? '')
          : '';
      const audioText = q.sentence.replace(/_{2,}/g, correctWord);
      // v1.9.25 audit #5: shared SpeakerButton component.
      const speakerBtn = createSpeakerButton({
        text: audioText,
        size: 'sm',
        ariaLabel: 'Listen',
      });
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
    /** v2.0 — when set, overrides NODE_PATH[idx] lookup. Used by V2 path
     * (NODE_PATH_V2) which has 24 nodes vs legacy 10. */
    positionOverride?: { dx: number; top: number };
  }): NodeRef {
    const row = document.createElement('button');
    row.type = 'button';
    row.disabled = !opts.unlocked;
    row.setAttribute('aria-label', `${opts.label}${opts.unlocked ? '' : ' (locked)'}`);
    row.dataset.nodeIdx = String(opts.idx);

    // v1.8.0: irregular hand-tuned position
    // v2.0: positionOverride wins (V2 path uses NODE_PATH_V2's 24 slots).
    const slot =
      opts.positionOverride ??
      (NODE_PATH[opts.idx] ?? NODE_PATH[NODE_PATH.length - 1]);
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

    // v1.9.33 audit #12: static styles live on .pickup-map-node class;
    // only position + gradient + shadow + cursor + opacity stay inline.
    // Cuts 18→6 inline style writes per node × 8 nodes = 96 saves.
    row.className = 'pickup-map-node';
    applyStyle(row, {
      left: `${leftPx}px`,
      top: `${slot.top}px`,
      // v1.9.46 Duo flat (audit-3 #2): replace radial-gradient gloss with
      // composite solid color-block: top highlight band + 3D depth.
      background: baseColor,
      // v1.9.47 audit-3 #4: interactive tier = 10px (locked scale).
      boxShadow: `inset 0 8px 0 ${lighten(baseColor, 0.20)}, 0 10px 0 ${shadowColor}`,
      cursor: opts.unlocked ? 'pointer' : 'not-allowed',
      opacity: opts.unlocked ? '1' : '0.7',
    });

    // v1.9.54: all nodes use the paw icon (no more book/headphones cycle).
    //   completed → paw with gold star sticker overlay (TBD: keep star for now)
    //   unlocked  → coloured paw
    //   locked    → greyed paw (filter grayscale + dimmed)
    if (opts.completed) {
      row.innerHTML = `<img src="/mascots/node-star.webp" alt="" aria-hidden="true" width="36" height="36" style="display:block;" />`;
    } else if (opts.unlocked) {
      row.innerHTML = `<img src="/mascots/node-paw.webp" alt="" aria-hidden="true" width="36" height="36" style="display:block;" />`;
    } else {
      // v1.9.54: locked = greyed paw (no separate lock icon). When the node
      // transitions to unlocked, .pickup-map-node-unlock-pop class animates
      // the grayscale away while scale-popping.
      row.innerHTML = `<img class="pickup-node-icon" src="/mascots/node-paw.webp" alt="" aria-hidden="true" width="36" height="36" style="display:block;filter:grayscale(1);opacity:0.65;" />`;
    }

    if (opts.unlocked) {
      // v1.7.11: real press-down feedback — node visibly depresses,
      // 3D depth shrinks, cast shadow tightens. Released = back to rest.
      // v1.9.47 audit-3 #4: 10px rest / 3px press (interactive tier).
      const restShadow = `inset 0 8px 0 ${lighten(baseColor, 0.20)}, 0 10px 0 ${shadowColor}`;
      const pressShadow = `inset 0 8px 0 ${lighten(baseColor, 0.20)}, 0 3px 0 ${shadowColor}`;
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
      top: `${NODE_PATH[7].top + NODE_HEIGHT + 26}px`,
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
    // v1.9.45 Duo flat: solid ellipse floor shadows (color block, zero blur)
    // re-ground the mascots after v1.9.44 stripped the drop-shadow halos.
    cat.innerHTML = `
      <div style="
        position:absolute; left:6px; bottom:-2px;
        width:78px; height:10px;
        background:rgba(60,42,28,0.30);
        border-radius:50%;
        z-index:0;
      "></div>
      <img src="/mascots/iso-grandma.webp" alt="" style="
        position:absolute; left:0; bottom:0;
        width:88px; height:auto; display:block;
        z-index:2;
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
    // v1.9.39 audit-2 F9: when chapter is fully completed return -1 so
    // the pulse class is skipped — previously returned 5, putting the
    // "tap me next" pulse on an already-green completed node.
    if (highestCompleted >= 1) return -1;
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
    // v1.9.20 (B path): "vertically avoid dense node area".
    //   - Find the vertical band with LEAST horizontal node coverage on
    //     the desired side, place character there.
    //   - For Ch1: middle (y≈200-400) is dense with right-side nodes,
    //     upper region (y≈80-180) only has node 1 → cleanest.
    //   - Mean dx still picks side; vertical centered in the sparse band.
    const containerW = 122;
    void nodeLeft; void rowTop; void slot;
    const visible = NODE_PATH.slice(0, 8);
    const meanDx = visible.reduce((s, n) => s + n.dx, 0) / visible.length;

    // Calculate, per node, whether it overlaps the desired character side.
    // Then find a vertical Y window where the overlapping nodes are minimum.
    const charSide: 'L' | 'R' = meanDx >= 0 ? 'L' : 'R';
    // Score each candidate catY by counting node-bands it would intersect
    // on the chosen side (less = better).
    const candidates = [60, 100, 130, 180, 220, 380, 440, 500];
    let bestCatY = 130;
    let bestScore = Number.POSITIVE_INFINITY;
    for (const cy of candidates) {
      const top = cy;
      const bot = cy + 110; // character height
      let overlapCount = 0;
      let minHorizontalGap = Number.POSITIVE_INFINITY;
      for (const n of visible) {
        const nTop = n.top, nBot = n.top + NODE_HEIGHT;
        const yOverlap = !(bot < nTop || top > nBot);
        if (!yOverlap) continue;
        overlapCount++;
        const nLeft = CONTAINER_W / 2 - NODE_SIZE / 2 + n.dx;
        const nRight = nLeft + NODE_SIZE;
        const gap = charSide === 'L'
          ? nLeft - containerW          // distance from char's right (assuming char glued left)
          : (CONTAINER_W - nRight);     // distance from char's left (char glued right)
        minHorizontalGap = Math.min(minHorizontalGap, gap);
      }
      // Lower score = fewer overlaps + larger min gap
      const score = overlapCount * 100 - minHorizontalGap;
      if (score < bestScore) {
        bestScore = score;
        bestCatY = cy;
      }
    }
    const EDGE_MARGIN = 14;
    const catX = charSide === 'L' ? EDGE_MARGIN : CONTAINER_W - containerW - EDGE_MARGIN;
    const catY = bestCatY;

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
