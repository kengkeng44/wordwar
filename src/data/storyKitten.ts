import { z } from 'zod';
import { ClozeQuestionSchema, type ClozeQuestion } from './sentences';

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
]);

export type ChapterId = z.infer<typeof ChapterIdSchema>;

export const StoryQuestionSchema = ClozeQuestionSchema.extend({
  chapter: ChapterIdSchema,
  questionInChapter: z.number().int().min(1).max(6),
  storyBeat: z.string().optional(),
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
    emoji: '🌧️',
    titleZh: '流落街頭',
    titleEn: 'Lost on the Streets',
    narration:
      '小貓在巷子裡醒來,雨下得好大,身上的毛都濕了。肚子餓,身體冷,牠不知道家在哪裡。\n\n這時,一個撐著藍傘的阿嬤走了過來……',
    outro: '阿嬤把傘遮在小貓身上,雨聲變遠了。小貓第一次覺得,世界沒有那麼可怕。',
    kittenMascotId: 'kittenCh1',
    npcMascotId: 'npcGrandma',
    tint: '#e6e9f0',
    accent: '#6e88a8',
  },
  2: {
    id: 2,
    emoji: '🥐',
    titleZh: '麵包店午後',
    titleEn: 'Bakery Afternoon',
    narration:
      '小貓躲在一家麵包店的後門。一股甜甜的香味從裡面飄出來。\n\n門開了,圍著白圍裙的老闆走出來,手上拿著一塊麵包……',
    outro: '小貓吃飽了,在老闆的腳邊磨蹭。從今天起,牠不再只是流浪的小貓。',
    kittenMascotId: 'kittenCh2',
    npcMascotId: 'npcBaker',
    tint: '#fce8c2',
    accent: '#e7a44a',
  },
  3: {
    id: 3,
    emoji: '🏞️',
    titleZh: '公園的小妹妹',
    titleEn: 'Park Girl',
    narration:
      '公園的長椅旁,一個綁馬尾的小女孩遠遠看著小貓。她手裡拿著一小包貓零食。\n\n「你好,我叫美美。」她輕輕地說……',
    outro: '美美天天來,慢慢地,小貓敢讓她摸了。世界比想像中還要溫柔。',
    kittenMascotId: 'kittenCh3',
    npcMascotId: 'npcMeimei',
    tint: '#fde2e8',
    accent: '#e7659c',
  },
  4: {
    id: 4,
    emoji: '🐕',
    titleZh: '流浪狗大哥',
    titleEn: 'Stray Dog Big Brother',
    narration:
      '夜晚的街角,一隻獨眼的老狗布魯托走了過來。他看起來凶,卻擋在小貓前面,趕走了想欺負牠的大狗。\n\n他低聲地說:「跟我走吧,我教你……」',
    outro: '布魯托和小貓一起穿過街道。原來街頭也可以有家人。',
    kittenMascotId: 'kittenCh4',
    npcMascotId: 'npcBrutus',
    tint: '#d8dfd0',
    accent: '#6e7d5a',
  },
  5: {
    id: 5,
    emoji: '🏠',
    titleZh: '永遠的家',
    titleEn: 'Forever Home',
    narration:
      '美美帶著爸媽來到公園。媽媽蹲下來,輕輕摸著小貓的頭。\n\n「我們帶你回家好嗎?」',
    outro: '小貓躺在自己的小床上,屋子裡有燈、有飯、有愛牠的人。\n\n「歡迎回家。你永遠是我們的家人。」',
    kittenMascotId: 'kittenCh5',
    npcMascotId: 'npcFamily',
    tint: '#fef0d0',
    accent: '#e7a44a',
  },
};

export const CHAPTERS_IN_ORDER: ChapterId[] = [1, 2, 3, 4, 5];

// ─── Chapter progress persistence ────────────────────────────────────────────

const LS_CHAPTER_PROGRESS = 'wordwar.story.chapterProgress';
const LS_SRS_QUEUE = 'wordwar.srs.kitten';

export interface ChapterProgress {
  /** Highest chapter the player has completed (0..5). 0 = none. */
  highestCompleted: number;
}

export function readChapterProgress(): ChapterProgress {
  if (typeof localStorage === 'undefined') return { highestCompleted: 0 };
  try {
    const v = localStorage.getItem(LS_CHAPTER_PROGRESS);
    if (!v) return { highestCompleted: 0 };
    const parsed = JSON.parse(v);
    const n = Number(parsed.highestCompleted);
    if (Number.isFinite(n) && n >= 0 && n <= 5) {
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
