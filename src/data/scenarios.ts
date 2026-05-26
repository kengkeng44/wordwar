import { z } from 'zod';
import { ClozeQuestionSchema, type ClozeQuestion } from './sentences';

/**
 * ScenarioQuestion — A2 cloze question pinned to a real-world setting
 * (restaurant, airport, hospital, office, hotel). Each scenario has
 * exactly 10 questions in fixed order (scenarioOrder 0..9).
 *
 * Stored in /public/scenarios.json. Validated with zod on load.
 */
export const ScenarioIdSchema = z.enum([
  'restaurant',
  'airport',
  'hospital',
  'office',
  'hotel',
]);

export type ScenarioId = z.infer<typeof ScenarioIdSchema>;

// Extend the existing ClozeQuestion shape with the scenario tag.
export const ScenarioQuestionSchema = ClozeQuestionSchema.extend({
  scenario: ScenarioIdSchema,
  scenarioOrder: z.number().int().min(0).max(9),
});

export const ScenarioQuestionsSchema = z.array(ScenarioQuestionSchema);

export type ScenarioQuestion = z.infer<typeof ScenarioQuestionSchema>;

let cached: ScenarioQuestion[] | null = null;

export async function loadScenarios(): Promise<ScenarioQuestion[]> {
  if (cached) return cached;
  const res = await fetch('/scenarios.json');
  if (!res.ok) {
    throw new Error(`Failed to fetch scenarios.json: ${res.status}`);
  }
  const raw = await res.json();
  const parsed = ScenarioQuestionsSchema.parse(raw);
  cached = parsed;
  return parsed;
}

/**
 * Returns the 10 questions for a scenario in scenarioOrder ascending.
 * If the JSON is missing questions or out of order we still produce a
 * valid sequence by sorting — defensive in case a content edit leaves
 * the file slightly disordered.
 */
export function questionsForScenario(
  all: ScenarioQuestion[],
  id: ScenarioId
): ScenarioQuestion[] {
  return all
    .filter((q) => q.scenario === id)
    .sort((a, b) => a.scenarioOrder - b.scenarioOrder);
}

/**
 * A ScenarioQuestion is structurally a ClozeQuestion + 2 extra fields.
 * Use this when passing into store / UI code that expects ClozeQuestion.
 */
export function toClozeQuestion(q: ScenarioQuestion): ClozeQuestion {
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

// ─── Scenario metadata: display, accent color, NPC, palette ─────────────────

export interface ScenarioMeta {
  id: ScenarioId;
  emoji: string;
  labelZh: string;
  labelEn: string;
  /** Hex accent (button highlight, focused tint). Lighter = bg tint. */
  accent: string;
  /** Soft background tint behind mascot / sentence card. */
  tint: string;
  /** Mascot id matching MASCOTS lookup. */
  mascotId: string;
  /** Achievement copy shown on EndScene when scenario complete. */
  achievement: string;
}

export const SCENARIO_META: Record<ScenarioId, ScenarioMeta> = {
  restaurant: {
    id: 'restaurant',
    emoji: '',
    labelZh: '餐廳',
    labelEn: 'Restaurant',
    accent: '#f08a3e',
    tint: '#fff1e0',
    mascotId: 'waiter',
    achievement: 'You handled the restaurant conversation',
  },
  airport: {
    id: 'airport',
    emoji: '',
    labelZh: '機場',
    labelEn: 'Airport',
    accent: '#4aa8d8',
    tint: '#e6f3fb',
    mascotId: 'flightAttendant',
    achievement: 'You navigated the airport',
  },
  hospital: {
    id: 'hospital',
    emoji: '',
    labelZh: '醫院',
    labelEn: 'Hospital',
    accent: '#3aa89b',
    tint: '#e1f3f1',
    mascotId: 'doctor',
    achievement: 'You handled the hospital visit',
  },
  office: {
    id: 'office',
    emoji: '',
    labelZh: '辦公室',
    labelEn: 'Office',
    accent: '#6a6dd3',
    tint: '#ebebfb',
    mascotId: 'coworker',
    achievement: 'You held your own at the office',
  },
  hotel: {
    id: 'hotel',
    emoji: '',
    labelZh: '飯店',
    labelEn: 'Hotel',
    accent: '#cba24a',
    tint: '#f8f0d8',
    mascotId: 'receptionist',
    achievement: 'You handled the hotel check-in',
  },
};

export const SCENARIOS_IN_ORDER: ScenarioId[] = [
  'restaurant',
  'airport',
  'hospital',
  'office',
  'hotel',
];

// Free-practice default accent / mascot (no scenario).
// Halo tint switched from cream (#fdfaf2) to Duolingo light green (#e0f5d0)
// in v0.5 so the default free-practice halo reads as "Duolingo" rather than
// the legacy cream background.
export const FREE_PRACTICE_META = {
  accent: '#ff7a59',
  tint: '#e0f5d0',
  mascotId: 'owl',
  emoji: '',
  labelZh: 'Free Practice',
  labelEn: 'Free Practice',
};

// ─── Best-score persistence per scenario ────────────────────────────────────

const LS_BEST_SCORE_PREFIX = 'wordwar.scenarioBest.';
const LS_SCENARIO_COMPLETED_PREFIX = 'wordwar.scenarioCompleted.';

export function readBestScore(id: ScenarioId): number {
  if (typeof localStorage === 'undefined') return 0;
  try {
    const v = localStorage.getItem(LS_BEST_SCORE_PREFIX + id);
    const n = v ? parseInt(v, 10) : 0;
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

export function writeBestScore(id: ScenarioId, score: number): boolean {
  if (typeof localStorage === 'undefined') return false;
  const prev = readBestScore(id);
  if (score <= prev) return false;
  try {
    localStorage.setItem(LS_BEST_SCORE_PREFIX + id, String(score));
    return true;
  } catch {
    return false;
  }
}

export function markScenarioCompleted(id: ScenarioId): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(LS_SCENARIO_COMPLETED_PREFIX + id, '1');
  } catch {
    // ignore
  }
}

export function isScenarioCompleted(id: ScenarioId): boolean {
  if (typeof localStorage === 'undefined') return false;
  try {
    return localStorage.getItem(LS_SCENARIO_COMPLETED_PREFIX + id) === '1';
  } catch {
    return false;
  }
}
