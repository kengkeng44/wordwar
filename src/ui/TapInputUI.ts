/**
 * TapInputUI — v1.8.4 redesigned to match Duolingo's actual exercise UI.
 *
 *   mountTapTiles : "Tap what you hear"
 *     - Big circular speaker icon at top (not a CTA button)
 *     - "Tap what you hear" subtitle
 *     - Dashed-underline answer slot row
 *     - Word bank as tiles
 *     - Bottom CHECK button (grey → green when ready, never auto-submits)
 *
 *   mountTapPairs : "Tap the pairs"
 *     - 2 columns of tiles (4 rows, 8 tiles total)
 *     - Selected tile gets a blue border + glow
 *     - Match → fade green, Mismatch → flash red 0.6s
 *     - No CHECK button — completes automatically on all-matched
 */

import { createSpeakerButton } from './SpeakerButton';

const COLOR_BORDER = '#e6dec9';
const COLOR_BORDER_DARK = '#cbbf9c';
const COLOR_TEXT_DARK = '#3c2a1c';
const COLOR_TEXT_MUTED = '#7a6850';
const COLOR_BLUE = '#3d8aae';
const COLOR_BLUE_DARK = '#2c6986';
const COLOR_BLUE_LIGHT = '#dfeff6';
const COLOR_SUCCESS = '#7d9a4f';
const COLOR_SUCCESS_DARK = '#5e7a36';
const COLOR_ERROR = '#c84a3a';
const COLOR_GREY_BTN = '#dbd2bd';
const COLOR_GREY_BTN_DARK = '#b8ad94';

export interface TapHandle {
  destroy(): void;
}

// ─── Tap what you hear ─────────────────────────────────────────────────

export function mountTapTiles(opts: {
  slot: HTMLElement;
  tiles: string[];
  correctOrder: number[];
  prompt?: string;
  onSpeak: () => void;
  onComplete: (correct: boolean) => void;
}): TapHandle {
  const { slot, tiles, correctOrder, prompt = 'Tap what you hear' } = opts;
  const slotsNeeded = correctOrder.length;

  const root = document.createElement('div');
  root.className = 'pickup-tap-tiles';
  Object.assign(root.style, {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    padding: '4px',
    fontFamily: 'inherit',
  });

  // Big circular speaker icon (Duolingo style — not a button shape, a circle)
  const speakerWrap = document.createElement('div');
  Object.assign(speakerWrap.style, {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
  });
  // v1.9.34 audit-2 F1: migrate from 🔊 emoji 72px button to shared SpeakerButton.
  const speaker = createSpeakerButton({
    text: '',
    size: 'lg',
    variant: 'primary',
    pulse: true,
    ariaLabel: 'Replay audio',
    onClick: opts.onSpeak,
  });
  speakerWrap.appendChild(speaker);

  const promptEl = document.createElement('div');
  promptEl.textContent = prompt;
  Object.assign(promptEl.style, {
    fontSize: '13px',
    fontWeight: '800',
    color: COLOR_TEXT_MUTED,
    letterSpacing: '1.2px',
    textTransform: 'uppercase',
  });
  speakerWrap.appendChild(promptEl);
  root.appendChild(speakerWrap);

  // Answer row — dashed underline like Duolingo
  const answerRow = document.createElement('div');
  Object.assign(answerRow.style, {
    minHeight: '52px',
    padding: '8px 4px 12px',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    justifyContent: 'center',
    alignItems: 'flex-end',
    borderBottom: `2px dashed ${COLOR_BORDER_DARK}`,
  });
  root.appendChild(answerRow);

  // Tile bank
  const bank = document.createElement('div');
  Object.assign(bank.style, {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    justifyContent: 'center',
    paddingTop: '8px',
    paddingBottom: '4px',
    minHeight: '52px',
  });
  root.appendChild(bank);

  // CHECK button (grey until answer ready, green when ready)
  const check = document.createElement('button');
  check.type = 'button';
  check.textContent = 'CHECK';
  Object.assign(check.style, {
    marginTop: '6px',
    padding: '14px 0',
    background: COLOR_GREY_BTN,
    color: '#fff',
    border: 'none',
    borderBottom: `4px solid ${COLOR_GREY_BTN_DARK}`,
    borderRadius: '14px',
    fontSize: '15px',
    fontWeight: '900',
    letterSpacing: '1.5px',
    cursor: 'not-allowed',
    fontFamily: 'inherit',
    width: '100%',
    transition: 'background 160ms ease, border-color 160ms ease, transform 80ms ease',
  });
  root.appendChild(check);

  const tileButtons: HTMLButtonElement[] = [];
  const selectedOrder: number[] = [];

  const tileRest = (): Partial<CSSStyleDeclaration> => ({
    padding: '11px 16px',
    background: '#ffffff',
    color: COLOR_TEXT_DARK,
    border: `2px solid ${COLOR_BORDER}`,
    borderBottom: `4px solid ${COLOR_BORDER_DARK}`,
    borderRadius: '12px',
    fontSize: '15px',
    fontWeight: '800',
    cursor: 'pointer',
    fontFamily: 'inherit',
    touchAction: 'manipulation',
    minHeight: '42px',
    transition: 'background 120ms ease, opacity 120ms ease',
    opacity: '1',
  });
  const tileUsed = (): Partial<CSSStyleDeclaration> => ({
    ...tileRest(),
    background: '#f3eddc',
    color: '#bba892',
    borderBottom: `2px solid ${COLOR_BORDER}`,
    cursor: 'default',
    opacity: '0.45',
  });

  const setCheckReady = (ready: boolean) => {
    if (ready) {
      Object.assign(check.style, {
        background: COLOR_SUCCESS,
        borderBottom: `4px solid ${COLOR_SUCCESS_DARK}`,
        cursor: 'pointer',
      });
    } else {
      Object.assign(check.style, {
        background: COLOR_GREY_BTN,
        borderBottom: `4px solid ${COLOR_GREY_BTN_DARK}`,
        cursor: 'not-allowed',
      });
    }
  };

  const renderAnswer = () => {
    answerRow.innerHTML = '';
    selectedOrder.forEach((tIdx, i) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.textContent = tiles[tIdx];
      Object.assign(chip.style, tileRest(), {
        background: '#ffffff',
        color: COLOR_TEXT_DARK,
      });
      chip.addEventListener('click', (e) => {
        e.preventDefault();
        selectedOrder.splice(i, 1);
        Object.assign(tileButtons[tIdx].style, tileRest());
        renderAnswer();
      });
      answerRow.appendChild(chip);
    });
    setCheckReady(selectedOrder.length === slotsNeeded);
  };

  tiles.forEach((word, idx) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = word;
    Object.assign(btn.style, tileRest());
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (selectedOrder.includes(idx)) return;
      if (selectedOrder.length >= slotsNeeded) return;
      selectedOrder.push(idx);
      Object.assign(btn.style, tileUsed());
      renderAnswer();
    });
    tileButtons.push(btn);
    bank.appendChild(btn);
  });

  check.addEventListener('click', (e) => {
    e.preventDefault();
    if (selectedOrder.length !== slotsNeeded) return;
    const correct = selectedOrder.every((v, idx) => v === correctOrder[idx]);
    if (correct) {
      answerRow.style.background = 'rgba(125,154,79,0.14)';
      Object.assign(check.style, {
        background: COLOR_SUCCESS,
        borderBottom: `4px solid ${COLOR_SUCCESS_DARK}`,
      });
      window.setTimeout(() => opts.onComplete(true), 480);
    } else {
      // v1.9.27 audit #6: blind-retry parity with ClozeUI 4-MC. Flash red
      // briefly, then unlock CHECK without wiping the arrangement so user
      // can rearrange chips (click a placed chip to remove it) and resubmit.
      // Prior behaviour reset everything, costing the user their context.
      answerRow.style.background = 'rgba(200,74,58,0.14)';
      Object.assign(check.style, {
        background: COLOR_ERROR,
        borderBottom: `4px solid #7a2a20`,
        cursor: 'not-allowed',
      });
      window.setTimeout(() => {
        answerRow.style.background = 'transparent';
        setCheckReady(selectedOrder.length === slotsNeeded);
      }, 750);
    }
  });

  renderAnswer();
  slot.appendChild(root);
  return { destroy: () => root.remove() };
}

// ─── Type what you hear ───────────────────────────────────────────────

export function mountTypeWhatYouHear(opts: {
  slot: HTMLElement;
  correctAnswer: string;        // expected word (case-insensitive)
  prompt?: string;
  onSpeak: () => void;
  onComplete: (correct: boolean) => void;
}): TapHandle {
  const { slot, correctAnswer, prompt = 'Type what you hear' } = opts;

  const root = document.createElement('div');
  root.className = 'pickup-type-what-you-hear';
  Object.assign(root.style, {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    padding: '4px',
    fontFamily: 'inherit',
  });

  // v2.0.B.54: removed central 72px speaker. Sentence card above now shows
  // sentence-with-blank + small 🔊 prefix — replay handled there. Avoids
  // double speaker visual that confused users (which one's the main listen?).

  const promptEl = document.createElement('div');
  promptEl.textContent = prompt;
  Object.assign(promptEl.style, {
    alignSelf: 'center',
    fontSize: '13px',
    fontWeight: '800',
    color: COLOR_TEXT_MUTED,
    letterSpacing: '1.2px',
    textTransform: 'uppercase',
  });
  root.appendChild(promptEl);

  // Text input — Duolingo-style large, centered
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Type here…';
  input.autocapitalize = 'none';
  input.autocomplete = 'off';
  input.spellcheck = false;
  Object.assign(input.style, {
    width: '100%',
    padding: '14px 16px',
    background: '#ffffff',
    color: COLOR_TEXT_DARK,
    border: `2px solid ${COLOR_BORDER}`,
    borderBottom: `4px solid ${COLOR_BORDER_DARK}`,
    borderRadius: '14px',
    fontSize: '17px',
    fontWeight: '700',
    fontFamily: 'inherit',
    outline: 'none',
    textAlign: 'center',
    boxSizing: 'border-box',
  });
  input.addEventListener('focus', () => {
    input.style.borderColor = COLOR_BLUE;
    input.style.borderBottomColor = COLOR_BLUE_DARK;
  });
  input.addEventListener('blur', () => {
    input.style.borderColor = COLOR_BORDER;
    input.style.borderBottomColor = COLOR_BORDER_DARK;
  });
  root.appendChild(input);

  // CHECK button
  const check = document.createElement('button');
  check.type = 'button';
  check.textContent = 'CHECK';
  Object.assign(check.style, {
    marginTop: '6px',
    padding: '14px 0',
    background: COLOR_GREY_BTN,
    color: '#fff',
    border: 'none',
    borderBottom: `4px solid ${COLOR_GREY_BTN_DARK}`,
    borderRadius: '14px',
    fontSize: '15px',
    fontWeight: '900',
    letterSpacing: '1.5px',
    cursor: 'not-allowed',
    fontFamily: 'inherit',
    width: '100%',
    transition: 'background 160ms ease, border-color 160ms ease',
  });
  root.appendChild(check);

  const setReady = (ready: boolean) => {
    if (ready) {
      Object.assign(check.style, {
        background: COLOR_SUCCESS,
        borderBottom: `4px solid ${COLOR_SUCCESS_DARK}`,
        cursor: 'pointer',
      });
    } else {
      Object.assign(check.style, {
        background: COLOR_GREY_BTN,
        borderBottom: `4px solid ${COLOR_GREY_BTN_DARK}`,
        cursor: 'not-allowed',
      });
    }
  };

  input.addEventListener('input', () => setReady(input.value.trim().length > 0));

  const submit = () => {
    const v = input.value.trim().toLowerCase();
    if (!v) return;
    const correct = v === correctAnswer.trim().toLowerCase();
    if (correct) {
      Object.assign(input.style, {
        borderColor: COLOR_SUCCESS,
        borderBottomColor: COLOR_SUCCESS_DARK,
        background: 'rgba(125,154,79,0.10)',
      });
      Object.assign(check.style, {
        background: COLOR_SUCCESS,
        borderBottom: `4px solid ${COLOR_SUCCESS_DARK}`,
      });
      window.setTimeout(() => opts.onComplete(true), 460);
    } else {
      // v1.9.27 audit #6: blind-retry parity. Flash red briefly, then
      // restore input visual state WITHOUT clearing the text — user can
      // edit and resubmit. Prior version wiped the input, costing context.
      Object.assign(input.style, {
        borderColor: COLOR_ERROR,
        borderBottomColor: '#7a2a20',
        background: 'rgba(200,74,58,0.10)',
      });
      Object.assign(check.style, {
        background: COLOR_ERROR,
        borderBottom: `4px solid #7a2a20`,
      });
      window.setTimeout(() => {
        Object.assign(input.style, {
          borderColor: COLOR_BORDER,
          borderBottomColor: COLOR_BORDER_DARK,
          background: '#ffffff',
        });
        setReady(input.value.trim().length > 0);
        input.focus();
      }, 750);
    }
  };
  check.addEventListener('click', (e) => { e.preventDefault(); submit(); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); submit(); }
  });

  slot.appendChild(root);
  // Focus the input after mount so keyboard pops up immediately
  window.setTimeout(() => input.focus(), 100);
  return { destroy: () => root.remove() };
}

// ─── Tap the pairs ─────────────────────────────────────────────────────

export function mountTapPairs(opts: {
  slot: HTMLElement;
  pairs: Array<{ left: string; right: string }>;
  prompt?: string;
  onComplete: (correct: boolean) => void;
}): TapHandle {
  const { slot, pairs, prompt = 'Tap the pairs' } = opts;

  const root = document.createElement('div');
  root.className = 'pickup-tap-pairs';
  Object.assign(root.style, {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    padding: '4px',
    fontFamily: 'inherit',
  });

  const promptEl = document.createElement('div');
  promptEl.textContent = prompt;
  Object.assign(promptEl.style, {
    fontSize: '13px',
    fontWeight: '800',
    color: COLOR_TEXT_MUTED,
    letterSpacing: '1.2px',
    textAlign: 'center',
    textTransform: 'uppercase',
  });
  root.appendChild(promptEl);

  type TileData = { pairIdx: number; side: 'L' | 'R'; text: string };
  const lefts: TileData[] = pairs
    .map((p, i): TileData => ({ pairIdx: i, side: 'L', text: p.left }))
    .sort(() => Math.random() - 0.5);
  const rights: TileData[] = pairs
    .map((p, i): TileData => ({ pairIdx: i, side: 'R', text: p.right }))
    .sort(() => Math.random() - 0.5);

  const grid = document.createElement('div');
  Object.assign(grid.style, {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px 14px',
  });
  root.appendChild(grid);

  let selected: { el: HTMLButtonElement; data: TileData } | null = null;
  let mismatches = 0;
  let matched = 0;

  const tileRest = (): Partial<CSSStyleDeclaration> => ({
    padding: '14px 12px',
    background: '#ffffff',
    color: COLOR_TEXT_DARK,
    border: `2px solid ${COLOR_BORDER}`,
    borderBottom: `4px solid ${COLOR_BORDER_DARK}`,
    borderRadius: '14px',
    fontSize: '15px',
    fontWeight: '800',
    cursor: 'pointer',
    fontFamily: 'inherit',
    touchAction: 'manipulation',
    transition: 'background 160ms ease, border-color 160ms ease, transform 120ms ease, opacity 200ms ease',
    opacity: '1',
  });
  const tileSelected = (): Partial<CSSStyleDeclaration> => ({
    ...tileRest(),
    background: COLOR_BLUE_LIGHT,
    color: COLOR_BLUE_DARK,
    borderColor: COLOR_BLUE,
    borderBottomColor: COLOR_BLUE_DARK,
  });
  const tileMatched = (): Partial<CSSStyleDeclaration> => ({
    ...tileRest(),
    background: 'rgba(125,154,79,0.18)',
    color: COLOR_SUCCESS_DARK,
    borderColor: COLOR_SUCCESS,
    borderBottomColor: COLOR_SUCCESS_DARK,
    opacity: '0.5',
    cursor: 'default',
  });
  const tileWrong = (): Partial<CSSStyleDeclaration> => ({
    ...tileRest(),
    background: 'rgba(200,74,58,0.12)',
    color: COLOR_ERROR,
    borderColor: COLOR_ERROR,
  });

  const makeTile = (data: TileData) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = data.text;
    Object.assign(btn.style, tileRest());
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (btn.dataset.matched === '1') return;

      if (!selected) {
        selected = { el: btn, data };
        Object.assign(btn.style, tileSelected());
        return;
      }
      if (selected.el === btn) {
        Object.assign(btn.style, tileRest());
        selected = null;
        return;
      }

      if (selected.data.pairIdx === data.pairIdx && selected.data.side !== data.side) {
        // Match
        [selected.el, btn].forEach(el => {
          el.dataset.matched = '1';
          Object.assign(el.style, tileMatched());
        });
        selected = null;
        matched++;
        if (matched === pairs.length) {
          window.setTimeout(() => opts.onComplete(mismatches < 3), 450);
        }
      } else {
        // Mismatch
        mismatches++;
        Object.assign(selected.el.style, tileWrong());
        Object.assign(btn.style, tileWrong());
        const a = selected.el, b = btn;
        selected = null;
        window.setTimeout(() => {
          if (a.dataset.matched !== '1') Object.assign(a.style, tileRest());
          if (b.dataset.matched !== '1') Object.assign(b.style, tileRest());
        }, 600);
      }
    });
    return btn;
  };

  // Layout: 2 columns, each row pairs lefts[i] + rights[i] (still shuffled)
  for (let i = 0; i < pairs.length; i++) {
    grid.appendChild(makeTile(lefts[i]));
    grid.appendChild(makeTile(rights[i]));
  }

  slot.appendChild(root);
  return { destroy: () => root.remove() };
}
