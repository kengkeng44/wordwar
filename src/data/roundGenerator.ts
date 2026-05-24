import type { Vocab } from './vocab';
import { isAntonym, isSynonym, samePOS } from './vocab';

export type RoundType = 'syn' | 'ant' | 'pos';

export interface Round {
  target: string;
  type: RoundType;
  hand: string[];
  correctAnswers: string[];
}

export interface GenerateRoundOpts {
  type?: RoundType;
  seed?: number;
  handSize?: number;
}

/**
 * mulberry32 — small deterministic PRNG seeded by uint32.
 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomSeed(): number {
  // Math.random gives ~52 bits; squeeze to uint32 for the PRNG.
  return (Math.random() * 0xffffffff) >>> 0;
}

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function shuffleInPlace<T>(rng: () => number, arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Find all words in vocab that are a "correct" answer for (target, type).
 * Used both to validate target eligibility and to seed the hand.
 */
function findCorrectAnswers(
  target: string,
  type: RoundType,
  vocab: Vocab,
  vocabKeys: string[]
): string[] {
  const matcher =
    type === 'syn' ? isSynonym : type === 'ant' ? isAntonym : samePOS;
  const out: string[] = [];
  for (const w of vocabKeys) {
    if (w === target) continue;
    if (matcher(w, target, vocab)) out.push(w);
  }
  return out;
}

/**
 * Generate a deterministic round.
 *
 * Selection logic:
 *   - if opts.type provided, use it (but for 'ant', skip targets without antonyms)
 *   - otherwise weighted-random (60% syn, 25% pos, 15% ant); guarantee
 *     the chosen target supports the chosen type
 *
 * Hand: 5 cards (configurable via opts.handSize), containing 1-3 correct
 * answers + filler distractors that fail the round predicate.
 */
export function generateRound(vocab: Vocab, opts: GenerateRoundOpts = {}): Round {
  const handSize = opts.handSize ?? 5;
  const rng = mulberry32(opts.seed ?? randomSeed());
  const vocabKeys = Object.keys(vocab);
  if (vocabKeys.length < handSize + 1) {
    throw new Error('Vocab too small to generate a round.');
  }

  // Decide round type. If forced, honor it (but we still need a valid target).
  // Weighted random: syn 60%, pos 25%, ant 15%.
  function rollType(): RoundType {
    const r = rng();
    if (r < 0.6) return 'syn';
    if (r < 0.85) return 'pos';
    return 'ant';
  }

  // Pick target + type pair that has at least one valid answer.
  // Try up to N times before falling back to brute scan.
  let target = '';
  let type: RoundType = 'syn';
  let correctAll: string[] = [];

  const forcedType = opts.type;
  const MAX_TRIES = 50;
  for (let attempt = 0; attempt < MAX_TRIES; attempt++) {
    target = pick(rng, vocabKeys);
    type = forcedType ?? rollType();

    // Cheap pre-filter for ant rounds: target must own at least 1 antonym entry.
    if (type === 'ant') {
      const entry = vocab[target];
      if (!entry || entry.ant.length === 0) continue;
    }
    correctAll = findCorrectAnswers(target, type, vocab, vocabKeys);
    if (correctAll.length >= 1) break;
  }

  if (correctAll.length === 0) {
    // Fallback: scan for any target with at least one valid answer for the
    // current type. (Should be extremely rare with 1361 words.)
    for (const t of vocabKeys) {
      if (type === 'ant') {
        const e = vocab[t];
        if (!e || e.ant.length === 0) continue;
      }
      const found = findCorrectAnswers(t, type, vocab, vocabKeys);
      if (found.length >= 1) {
        target = t;
        correctAll = found;
        break;
      }
    }
  }

  // Choose how many correct answers go into the hand (1-3, bounded by what's
  // available and handSize - 1 distractor minimum).
  const maxCorrectInHand = Math.min(3, correctAll.length, handSize - 1);
  const minCorrectInHand = 1;
  const correctCount =
    minCorrectInHand +
    Math.floor(rng() * (maxCorrectInHand - minCorrectInHand + 1));

  const shuffledCorrect = shuffleInPlace(rng, [...correctAll]);
  const handCorrect = shuffledCorrect.slice(0, correctCount);
  const handCorrectSet = new Set(handCorrect);

  // Fill with distractors: random vocab words that are NOT correct answers
  // and NOT the target.
  const distractors: string[] = [];
  const distractorsNeeded = handSize - handCorrect.length;
  const correctSet = new Set(correctAll);
  const seen = new Set<string>([target, ...handCorrect]);
  let safety = 0;
  while (distractors.length < distractorsNeeded && safety < 1000) {
    safety++;
    const cand = pick(rng, vocabKeys);
    if (seen.has(cand)) continue;
    if (correctSet.has(cand)) continue;
    seen.add(cand);
    distractors.push(cand);
  }

  const hand = shuffleInPlace(rng, [...handCorrect, ...distractors]);

  return {
    target,
    type,
    hand,
    correctAnswers: Array.from(handCorrectSet),
  };
}

export function roundTypeLabel(type: RoundType): string {
  switch (type) {
    case 'syn':
      return 'Find the synonym';
    case 'ant':
      return 'Find the antonym';
    case 'pos':
      return 'Same part of speech';
  }
}
