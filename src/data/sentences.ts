import { z } from 'zod';

/**
 * Cloze (fill-in-the-blank) question schema.
 *
 * sentences.json is an array of these. The blank is rendered as ___ in
 * the source string; the UI replaces it with a visual gap.
 */
export const ClozeLevelSchema = z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);

/**
 * Player-facing difficulty tier (v0.11). Coarse 3-bucket grouping that
 * maps to mainstream exam vocab pools:
 *   easy   — A1-A2 (TOEIC ~600, Cambridge KET)
 *   medium — A2-B1 (TOEIC 700-800, IELTS 5.5, Cambridge PET)  [default]
 *   hard   — B1-B2 (TOEIC 850+, IELTS 6.5+, FCE, 學測)
 * We deliberately cap at B2 — no C1+ content (would push outside
 * mainstream exam pool the user is preparing for).
 */
export const DifficultySchema = z.enum(['easy', 'medium', 'hard']);
export type Difficulty = z.infer<typeof DifficultySchema>;

export const ClozeQuestionSchema = z.object({
  id: z.string(),
  level: ClozeLevelSchema,
  /** v0.11 — optional during migration; falls back to 'medium' if absent. */
  difficulty: DifficultySchema.optional(),
  sentence: z.string(),
  options: z.tuple([z.string(), z.string(), z.string(), z.string()]),
  correctIndex: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
  explanationZh: z.string(),
  tags: z.array(z.string()).optional(),
});

export const ClozeQuestionsSchema = z.array(ClozeQuestionSchema);

export type ClozeLevel = z.infer<typeof ClozeLevelSchema>;
export type ClozeQuestion = z.infer<typeof ClozeQuestionSchema>;

/** Difficulty of a question — defaults to 'medium' if not tagged. */
export function difficultyOf(q: ClozeQuestion): Difficulty {
  return q.difficulty ?? 'medium';
}

/**
 * Filter cloze pool by difficulty with a graceful fallback. If the
 * requested tier has zero questions, walks outward to adjacent tiers
 * (easy↔medium↔hard) rather than failing — the player never sees an
 * empty round.
 *
 * Returns a NEW array (not a mutation of input).
 */
export function filterByDifficulty<T extends ClozeQuestion>(
  pool: T[],
  difficulty: Difficulty
): T[] {
  const exact = pool.filter((q) => difficultyOf(q) === difficulty);
  if (exact.length > 0) return exact;

  // Fallback chain — adjacent tiers first, then the remaining one.
  const fallback: Difficulty[] =
    difficulty === 'easy'
      ? ['medium', 'hard']
      : difficulty === 'hard'
        ? ['medium', 'easy']
        : ['easy', 'hard']; // medium → either side
  for (const tier of fallback) {
    const next = pool.filter((q) => difficultyOf(q) === tier);
    if (next.length > 0) return next;
  }
  return pool; // last resort: everything
}

let cached: ClozeQuestion[] | null = null;

/**
 * Loads + validates /sentences.json. Caches result.
 */
export async function loadSentences(): Promise<ClozeQuestion[]> {
  if (cached) return cached;
  const res = await fetch('/sentences.json');
  if (!res.ok) {
    throw new Error(`Failed to fetch sentences.json: ${res.status}`);
  }
  const raw = await res.json();
  const parsed = ClozeQuestionsSchema.parse(raw);
  cached = parsed;
  return parsed;
}

/** Filter by level, then shuffle a copy. */
export function pickByLevel(
  all: ClozeQuestion[],
  level: ClozeLevel,
  limit?: number
): ClozeQuestion[] {
  const filtered = all.filter((q) => q.level === level);
  const shuffled = shuffle(filtered);
  return typeof limit === 'number' ? shuffled.slice(0, limit) : shuffled;
}

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
