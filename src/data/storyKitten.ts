import { z } from 'zod';
import { ClozeQuestionSchema, type ClozeQuestion } from './sentences';

// Production v1.0: chapters unlock progressively (Ch1 free, rest via earned progression).
// Set true during dev to test all chapters without playing through.
const DEV_UNLOCK_ALL = false;

/**
 * StoryQuestion — A2 cloze tied to a chapter of the "小貓回家路" story.
 * Each chapter has exactly 6 questions in fixed order (questionInChapter 1..6).
 *
 * Stored in /public/story-kitten.json. Validated with zod on load.
 */
export const ChapterIdSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
  z.literal(7),
  z.literal(8),
]);

export type ChapterId = z.infer<typeof ChapterIdSchema>;

/**
 * v1.8.0: question type system for varied listening/reading exercises.
 *
 *   - listen-mc           Hear full sentence, pick the word that was spoken in the blank position
 *   - listen-emoji        Hear sentence, pick the emoji that matches the feeling/situation
 *   - listen-comprehension Hear sentence, answer a Who/What question about it
 *   - read-mc-with-audio  Read sentence with blank, audio button optional, pick word
 *
 * All four use 4-choice multiple-choice UI. Differences are framing,
 * spoken vs. visible sentence, and whether a comprehension prompt is shown.
 */
export const QuestionTypeSchema = z.enum([
  'listen-mc',
  'listen-emoji',
  'listen-comprehension',
  'read-mc-with-audio',
  'tap-tiles',
  'tap-pairs',
  'type-what-you-hear',
]);
export type QuestionType = z.infer<typeof QuestionTypeSchema>;

export const StoryQuestionSchema = ClozeQuestionSchema.extend({
  chapter: ChapterIdSchema,
  questionInChapter: z.number().int().min(1).max(8),
  storyBeat: z.string().optional(),
  /** v1.8.0: optional. Defaults to 'listen-mc' if absent (legacy data). */
  type: QuestionTypeSchema.optional(),
  /** v1.8.0: comprehension prompt shown above the options.
   *  e.g. "What is the kitten feeling?" or "Choose the emoji that matches."
   *  Absent for plain listen-mc / read-mc-with-audio. */
  question: z.string().optional(),
});

export const StoryQuestionsSchema = z.array(StoryQuestionSchema);

export type StoryQuestion = z.infer<typeof StoryQuestionSchema>;

let cached: StoryQuestion[] | null = null;

export async function loadStoryQuestions(): Promise<StoryQuestion[]> {
  if (cached) return cached;
  const res = await fetch('/story-kitten.json');
  if (!res.ok) {
    throw new Error(`Failed to fetch story-kitten.json: ${res.status}`);
  }
  const raw = await res.json();
  const parsed = StoryQuestionsSchema.parse(raw);
  cached = parsed;
  return parsed;
}

export function questionsForChapter(
  all: StoryQuestion[],
  chapter: ChapterId
): StoryQuestion[] {
  return all
    .filter((q) => q.chapter === chapter)
    .sort((a, b) => a.questionInChapter - b.questionInChapter);
}

export function toClozeQuestion(q: StoryQuestion): ClozeQuestion {
  return {
    id: q.id,
    level: q.level,
    sentence: q.sentence,
    options: q.options,
    correctIndex: q.correctIndex,
    explanationZh: q.explanationZh,
    tags: q.tags,
    type: q.type,
    question: q.question,
    // v1.8.3: also carry tap-tiles / tap-pairs payload through.
    tiles: (q as unknown as { tiles?: string[] }).tiles,
    correctOrder: (q as unknown as { correctOrder?: number[] }).correctOrder,
    pairs: (q as unknown as { pairs?: { left: string; right: string }[] }).pairs,
  };
}

// ─── Chapter metadata: title, theme, kitten state, NPC mascot ───────────────

export interface ChapterMeta {
  id: ChapterId;
  emoji: string;
  titleZh: string;
  titleEn: string;
  /** Intro narration shown on ChapterIntroScene. */
  narration: string;
  /** Outro narration shown on ChapterEndScene. */
  outro: string;
  /** Mascot id for the kitten state shown during this chapter. */
  kittenMascotId: string;
  /** Mascot id for the chapter NPC (umbrella grandma, baker, ...). */
  npcMascotId: string;
  /** Soft halo tint behind mascot. */
  tint: string;
  /** Accent color for chapter card / chip. */
  accent: string;
}

export const CHAPTER_META: Record<ChapterId, ChapterMeta> = {
  1: {
    id: 1,
    emoji: '',
    titleZh: '我們的第一天',
    titleEn: 'The First Story',
    narration:
      "I am 糰糰. I live with Grandma and my friend 花花.\n\nThe daughter lives far away. Every night, Grandma tells us a story.\n\nTonight, she tells me about the day we first met…",
    outro:
      "花花 is asleep. I lick my paw and curl up next to him.\n\nGoodnight, Grandma. Goodnight, 花花.",
    kittenMascotId: 'kittenCh1',
    npcMascotId: 'npcGrandma',
    // v1.8.0: shifted from cool blue (#6e88a8) to warm peach to align with
    // Pickup's amber brand. Still distinct from Ch2 amber (#e7a44a).
    tint: '#fce5d6',
    accent: '#d68a52',
  },
  2: {
    id: 2,
    emoji: '',
    titleZh: '街頭智者',
    titleEn: 'The Street Sage',
    narration:
      "The kitten curls up behind a bakery. A warm, sweet smell drifts out the back door.\n\nThe door swings open. A baker in a white apron steps out, a piece of bread in his hand…",
    outro:
      "The kitten eats her fill and rubs against his ankles. From today on, she's not just a stray.",
    kittenMascotId: 'kittenCh2',
    npcMascotId: 'npcBaker',
    tint: '#fce8c2',
    accent: '#e7a44a',
  },
  3: {
    id: 3,
    emoji: '',
    titleZh: '麵包店的選擇',
    titleEn: "The Baker's Choice",
    narration:
      "By the park bench, a little girl with a ponytail watches the kitten from afar. A small bag of cat treats is cupped in her hands.\n\n\"Hi. I'm Meimei,\" she whispers…",
    outro:
      "Meimei comes every day. Slowly, the kitten lets her hand close in. The world is gentler than she thought.",
    kittenMascotId: 'kittenCh3',
    npcMascotId: 'npcMeimei',
    tint: '#fde2e8',
    accent: '#e7659c',
  },
  4: {
    id: 4,
    emoji: '',
    titleZh: '小女孩的秘密',
    titleEn: "The Girl's Secret",
    narration:
      "At a street corner, an old one-eyed dog named Brutus pads up. He looks rough, but he steps between the kitten and a snarling bigger dog and drives it off.\n\nLow and steady, he says: \"Come with me. I'll teach you…\"",
    outro:
      "Brutus and the kitten cross the streets together. So the streets can hold family too.",
    kittenMascotId: 'kittenCh4',
    npcMascotId: 'npcBrutus',
    tint: '#d8dfd0',
    accent: '#6e7d5a',
  },
  5: {
    id: 5,
    emoji: '',
    titleZh: '永遠的家',
    titleEn: 'A Forever Home',
    narration:
      "Meimei brings her parents to the park. Her mother kneels down, gently strokes the kitten's head.\n\n\"Will you come home with us?\"",
    // ── False ending. Kitten is in the home, surrounded by love, but realizes
    // she was CHOSEN, not that she CHOSE. Slips out into the snow. The arc
    // continues into Ch6-8.
    outro:
      "Inside the house: warm lamps, warm food, and arms that hold her. Mom smiles. Meimei cries. Dad nudges the heater one notch higher.\n\nThat night, the kitten curls up by the window. Outside, snow begins to fall — slow, soft, one flake at a time.\n\n\"They chose me,\" she thinks, watching her blurred reflection. \"But did I choose this home?\"\n\nThe window isn't latched tight. She slips through it, soft paws sinking into snow.\n\n\"I need to know — if I come back one day, that it's because I want to. Not because I have nowhere else to go.\"",
    kittenMascotId: 'kittenCh5',
    npcMascotId: 'npcFamily',
    tint: '#fef0d0',
    accent: '#e7a44a',
  },
  6: {
    id: 6,
    emoji: '',
    titleZh: '寒冬考驗',
    titleEn: "Winter's Trial",
    narration:
      "She slips through the unlatched window. Her pawprints, one by one, are slowly buried by fresh snow.\n\nThe wind bites. The world is quiet enough to hear her own breath. She walks and walks, and slips into a dream — and out of that dream walks a familiar shape: Old Black, the street's old mentor, a friend long gone.\n\n\"Kid,\" he says, looking at her, \"you finally made a choice for yourself. The choosing itself — that's growing up.\"",
    outro:
      "She stands up in the snow. Pawprint by pawprint, deep and sure, she keeps moving forward.\n\nShe's no longer just the kitten being taken care of. She chose to live. She chose to walk on. In this moment, she grew up.",
    // NOTE: kittenCh6 + ghost-mentor (Old Black) SVG not yet drawn — reusing kittenCh4
    // (standing/forward pose) + npcBrutus (the old dog mentor fits the ghost mentor vibe) as
    // visual stand-ins. Replace with dedicated mascots in a follow-up.
    kittenMascotId: 'kittenCh4',
    npcMascotId: 'npcBrutus',
    tint: '#dfe7ee',
    accent: '#6a7d8f',
  },
  7: {
    id: 7,
    emoji: '',
    titleZh: '神社的相遇',
    titleEn: 'The Shrine Encounter',
    narration:
      "The snow keeps falling, until she walks up the stone steps of a small mountain shrine.\n\nStrangely, the moment her paw touches the stone, the snow stops. Moonlight slips through a crack in the clouds, falling soft on the vermilion gate.\n\nBeside the incense bowl sits a presence she can't quite see — like mist, like light, like a very, very old cat.\n\n\"No one walks into your story by accident,\" it says, quietly. \"Every person you meet is a stone on the path home.\"",
    outro:
      "She sits at the shrine through the night. For the first time, she knows where she belongs —\n\nnot under one roof, but with a certain group of people.",
    // NOTE: kittenCh7 + shrine spirit SVG not yet drawn — reusing kittenCh5 (mature
    // posture) + npcGrandma (gentle mystical vibe-adjacent) as visual stand-ins.
    // Replace with dedicated mascots in a follow-up.
    kittenMascotId: 'kittenCh5',
    npcMascotId: 'npcGrandma',
    tint: '#e8e0ee',
    accent: '#8a6ea8',
  },
  8: {
    id: 8,
    emoji: '',
    titleZh: '選擇了家人',
    titleEn: 'Choosing Family',
    narration:
      "Just before dawn, Meimei finds her in the snow.\n\nMeimei's eyes are red — from the night that unlatched window swung open in Chapter 5, she and her parents searched for days. She lifts the calico into her arms, no scolding, just holding her, holding her.\n\nA warm bath. Soft towels. Tiny dried fish stewed until they fall apart. And then the small soft bed. She sleeps — really sleeps this time, safer than safe.",
    // ── The REAL real ending (v0.9.2). Same warm family, but in the night she
    // hears Brutus's bark and realises her people are also out there. She doesn't
    // reject Meimei — she chooses BOTH. Walks back to the street family not as
    // victim, but as the one they look to.
    outro:
      "She wakes in the middle of the night.\n\nFar, far away, the wind carries a familiar bark — Brutus, still out there, tiredness in his voice.\n\nShe remembers what the shrine spirit said: \"Every person you meet is a stone on the path home.\" Brutus, the umbrella grandma, the baker — they were her family too. Not only the people inside this window.\n\nShe sits a long time at the edge of Meimei's bed. Then softly drops to the floor, leaving a trail of prints across fresh snow that lead to Meimei's door.\n\nMeimei doesn't wake. But in her sleep, she reaches out a hand — as if she already knew — and gently, lets go.\n\nThe calico slips through the unlatched window once more.\n\nThis time, not running away. Going to find her people.\n\nShe finds Brutus at the corner, limping, surrounded by a shivering kitten and two or three old friends of the street. Brutus lifts his head; light glints in his one good eye.\n\n\"I knew you'd come back.\"\n\nShe doesn't answer. She just walks into the middle of them and gently presses her head against the shivering kitten.\n\nIn that moment she understands —\nShe had a home. Now, she chose her family.\n\nThe snow starts again. But this time she's no longer the kitten the wind pushes around.\nShe is the one they circle around. The center.",
    // NOTE: kittenCh8 (mature, composed leader cat + street family group composition) SVG not yet drawn —
    // reusing kittenCh5 (mature posture) + npcBrutus (street family stand-in)
    // as visual stand-ins. v0.9.2 ending pivot calls for new "calico + street family
    // group composition" mascot art — main Claude will dispatch follow-up.
    kittenMascotId: 'kittenCh5',
    npcMascotId: 'npcBrutus',
    tint: '#dfe7ee',
    accent: '#6a7d8f',
  },
};

// v1.6.0: scope narrowed to Ch1 while we rebuild each chapter with
// first-person POV scenes + Ken Burns animation. Ch2-8 content lives
// in branch `backup/v1.5.1-eight-chapters` and will be reintroduced
// chapter-by-chapter as POV scenes get produced. CHAPTER_META and
// ChapterIdSchema still cover 1-8 so the type system can accept future
// data without a schema migration.
export const CHAPTERS_IN_ORDER: ChapterId[] = [1];

// ─── Chapter progress persistence ────────────────────────────────────────────

const LS_CHAPTER_PROGRESS = 'wordwar.story.chapterProgress';
const LS_SRS_QUEUE = 'wordwar.srs.kitten';

export interface ChapterProgress {
  /** Highest chapter the player has completed (0..8). 0 = none. */
  highestCompleted: number;
}

export function readChapterProgress(): ChapterProgress {
  if (typeof localStorage === 'undefined') return { highestCompleted: 0 };
  try {
    const v = localStorage.getItem(LS_CHAPTER_PROGRESS);
    if (!v) return { highestCompleted: 0 };
    const parsed = JSON.parse(v);
    const n = Number(parsed.highestCompleted);
    if (Number.isFinite(n) && n >= 0 && n <= 8) {
      return { highestCompleted: Math.floor(n) };
    }
  } catch {
    // ignore
  }
  return { highestCompleted: 0 };
}

export function markChapterCompleted(chapter: ChapterId): void {
  if (typeof localStorage === 'undefined') return;
  const prev = readChapterProgress();
  const next: ChapterProgress = {
    highestCompleted: Math.max(prev.highestCompleted, chapter),
  };
  try {
    localStorage.setItem(LS_CHAPTER_PROGRESS, JSON.stringify(next));
  } catch {
    // ignore
  }
}

export function resetStoryProgress(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(LS_CHAPTER_PROGRESS);
    localStorage.removeItem(LS_SRS_QUEUE);
  } catch {
    // ignore
  }
}

export function isChapterUnlocked(chapter: ChapterId): boolean {
  if (DEV_UNLOCK_ALL) return true;
  if (chapter === 1) return true;
  const { highestCompleted } = readChapterProgress();
  return highestCompleted >= chapter - 1;
}

export function isChapterCompleted(chapter: ChapterId): boolean {
  const { highestCompleted } = readChapterProgress();
  return highestCompleted >= chapter;
}

// ─── SRS queue (simple — array of question IDs answered wrong) ──────────────

export function readSrsQueue(): string[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const v = localStorage.getItem(LS_SRS_QUEUE);
    if (!v) return [];
    const parsed = JSON.parse(v);
    if (Array.isArray(parsed)) {
      return parsed.filter((x): x is string => typeof x === 'string');
    }
  } catch {
    // ignore
  }
  return [];
}

export function writeSrsQueue(ids: string[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    // Dedup, keep order.
    const seen = new Set<string>();
    const out: string[] = [];
    for (const id of ids) {
      if (!seen.has(id)) {
        seen.add(id);
        out.push(id);
      }
    }
    localStorage.setItem(LS_SRS_QUEUE, JSON.stringify(out));
  } catch {
    // ignore
  }
}

export function addToSrs(questionId: string): void {
  const existing = readSrsQueue();
  if (existing.includes(questionId)) return;
  writeSrsQueue([...existing, questionId]);
}

export function removeFromSrs(questionId: string): void {
  const existing = readSrsQueue();
  writeSrsQueue(existing.filter((id) => id !== questionId));
}

export function srsReviewBatch(
  all: StoryQuestion[],
  limit = 3
): StoryQuestion[] {
  const ids = readSrsQueue();
  if (ids.length === 0) return [];
  const byId = new Map(all.map((q) => [q.id, q] as const));
  const out: StoryQuestion[] = [];
  for (const id of ids) {
    const q = byId.get(id);
    if (q) out.push(q);
    if (out.length >= limit) break;
  }
  return out;
}
