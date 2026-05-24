import { z } from 'zod';

/**
 * Vocab JSON shape:
 *   { "word": { "pos": "n|v|a|r", "syn": [...], "ant": [...] }, ... }
 */
export const VocabEntrySchema = z.object({
  pos: z.enum(['n', 'v', 'a', 'r']),
  syn: z.array(z.string()),
  ant: z.array(z.string()),
});

export const VocabSchema = z.record(z.string(), VocabEntrySchema);

export type VocabEntry = z.infer<typeof VocabEntrySchema>;
export type Vocab = z.infer<typeof VocabSchema>;
export type POS = VocabEntry['pos'];

let cached: Vocab | null = null;

/**
 * Loads + validates /vocab.json. Caches result.
 */
export async function loadVocab(): Promise<Vocab> {
  if (cached) return cached;
  const res = await fetch('/vocab.json');
  if (!res.ok) {
    throw new Error(`Failed to fetch vocab.json: ${res.status}`);
  }
  const raw = await res.json();
  const parsed = VocabSchema.parse(raw);
  cached = parsed;
  return parsed;
}

/**
 * Symmetric synonym check.
 * Returns true if either word lists the other as a synonym.
 */
export function isSynonym(played: string, target: string, vocab: Vocab): boolean {
  if (played === target) return false;
  const targetEntry = vocab[target];
  const playedEntry = vocab[played];
  if (targetEntry && targetEntry.syn.includes(played)) return true;
  if (playedEntry && playedEntry.syn.includes(target)) return true;
  return false;
}

/**
 * Symmetric antonym check.
 */
export function isAntonym(played: string, target: string, vocab: Vocab): boolean {
  if (played === target) return false;
  const targetEntry = vocab[target];
  const playedEntry = vocab[played];
  if (targetEntry && targetEntry.ant.includes(played)) return true;
  if (playedEntry && playedEntry.ant.includes(target)) return true;
  return false;
}

/**
 * Both words exist in the vocab and share the same POS.
 * Same-word pairs return false (a card matching itself shouldn't count).
 */
export function samePOS(played: string, target: string, vocab: Vocab): boolean {
  if (played === target) return false;
  const t = vocab[target];
  const p = vocab[played];
  if (!t || !p) return false;
  return t.pos === p.pos;
}
