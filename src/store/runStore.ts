import { create } from 'zustand';
import {
  loadSentences,
  pickByLevel,
  type ClozeLevel,
  type ClozeQuestion,
} from '../data/sentences';
import {
  loadScenarios,
  questionsForScenario,
  toClozeQuestion,
  type ScenarioId,
  type ScenarioQuestion,
} from '../data/scenarios';

/**
 * runStore — cloze run state.
 *
 * v0.3 added scenario mode on top of free practice. v0.5 unifies the free
 * practice pool:
 *   - mode === 'free'      → 10 random A2 questions drawn from the UNION
 *                            of sentences.json (80) + scenarios.json (50)
 *                            = 130 questions. Scenario tag is dropped at
 *                            the surface so they show as plain A2 cloze.
 *   - mode === 'scenario'  → 10 fixed-order questions from one scenario in
 *                            scenarios.json
 *
 * loadContent() boots BOTH JSON files eagerly so free mode can sample
 * across them without round-trip latency. Same scoring + HP + reveal flow
 * either way.
 */

export type RunMode = 'free' | 'scenario';

export interface PlayResult {
  correct: boolean;
  pointsGained: number;
  streak: number;
  selectedIndex: number;
  correctIndex: number;
  explanationZh: string;
}

export interface HistoryEntry {
  question: ClozeQuestion;
  selectedIndex: number | null; // null = timeout
  correct: boolean;
}

export interface RunState {
  // Content — free practice pool
  questions: ClozeQuestion[] | null;
  // Content — scenario pool (all scenarios, filtered at run-start)
  scenarioQuestions: ScenarioQuestion[] | null;

  pool: ClozeQuestion[]; // remaining queue for the current run
  round: ClozeQuestion | null;

  // Score / lives
  score: number;
  hp: number;
  streak: number;
  bestStreak: number;
  history: HistoryEntry[];

  lastResult: PlayResult | null;
  answered: boolean;

  /** ms timestamp (Date.now) at run start — used by EndScene for total time. */
  runStartedAt: number;

  // Mode + level
  mode: RunMode;
  scenario: ScenarioId | null;
  level: ClozeLevel;

  // Loading
  loading: boolean;
  error: string | null;

  // Actions
  loadContent: () => Promise<void>;
  /** @deprecated kept for compatibility — alias for loadContent */
  loadSentences: () => Promise<void>;
  /** @deprecated kept for compatibility — alias for loadContent */
  loadScenarios: () => Promise<void>;
  setLevel: (level: ClozeLevel) => void;
  setMode: (mode: RunMode) => void;
  setScenario: (scenario: ScenarioId | null) => void;
  startRound: () => void;
  answer: (selectedIndex: number) => PlayResult;
  timeoutRound: () => PlayResult;
  reset: () => void;
}

const STARTING_HP = 3;
const POINTS_BASE = 10;
const STREAK_BONUS_STEP = 2;
const STREAK_BONUS_CAP = 10;
const QUESTIONS_PER_RUN = 10;

const LS_LEVEL = 'wordwar.level';

function readLevel(): ClozeLevel {
  if (typeof localStorage === 'undefined') return 'A2';
  try {
    const v = localStorage.getItem(LS_LEVEL);
    if (
      v === 'A1' ||
      v === 'A2' ||
      v === 'B1' ||
      v === 'B2' ||
      v === 'C1' ||
      v === 'C2'
    ) {
      return v;
    }
  } catch {
    // ignore
  }
  return 'A2';
}

function writeLevel(level: ClozeLevel): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(LS_LEVEL, level);
  } catch {
    // ignore
  }
}

export const useRunStore = create<RunState>((set, get) => ({
  questions: null,
  scenarioQuestions: null,
  pool: [],
  round: null,
  score: 0,
  hp: STARTING_HP,
  streak: 0,
  bestStreak: 0,
  history: [],
  lastResult: null,
  answered: false,
  runStartedAt: 0,
  mode: 'free',
  scenario: null,
  level: readLevel(),
  loading: false,
  error: null,

  /**
   * Load BOTH sentences.json (free pool) and scenarios.json (scenario pool)
   * eagerly. Either-or loading is gone in v0.5 because free mode samples
   * across both files (130-question unified pool). Idempotent — short-
   * circuits if both are already cached.
   */
  loadContent: async () => {
    if (get().loading) return;
    if (get().questions && get().scenarioQuestions) return;
    set({ loading: true, error: null });
    try {
      const [sentences, scenarios] = await Promise.all([
        get().questions ? Promise.resolve(get().questions!) : loadSentences(),
        get().scenarioQuestions
          ? Promise.resolve(get().scenarioQuestions!)
          : loadScenarios(),
      ]);
      set({
        questions: sentences,
        scenarioQuestions: scenarios,
        loading: false,
      });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  },

  // Back-compat aliases — both kick off the unified loadContent flow.
  loadSentences: async () => {
    await get().loadContent();
  },
  loadScenarios: async () => {
    await get().loadContent();
  },

  setLevel: (level: ClozeLevel) => {
    writeLevel(level);
    set({ level });
  },

  setMode: (mode: RunMode) => {
    set({ mode });
  },

  setScenario: (scenario: ScenarioId | null) => {
    set({ scenario });
  },

  startRound: () => {
    const { questions, scenarioQuestions, level, pool, mode, scenario } = get();

    let nextPool = pool;
    if (nextPool.length === 0) {
      if (mode === 'scenario' && scenario && scenarioQuestions) {
        // Scenario mode: fixed order, 10 questions.
        nextPool = questionsForScenario(scenarioQuestions, scenario).map(
          toClozeQuestion
        );
      } else {
        // Free practice (v0.5): unified pool = sentences.json ∪ scenarios.json.
        // Scenario-tagged questions are stripped down to ClozeQuestion so
        // there's no scenario chip / accent in free mode — just A2 cloze.
        const base = questions ?? [];
        const scenarioCloze = (scenarioQuestions ?? []).map(toClozeQuestion);
        const unified = base.concat(scenarioCloze);
        nextPool = pickByLevel(unified, level, QUESTIONS_PER_RUN);
      }
    }
    if (nextPool.length === 0) {
      set({ round: null });
      return;
    }
    const [next, ...rest] = nextPool;
    set({
      round: next,
      pool: rest,
      lastResult: null,
      answered: false,
    });
  },

  answer: (selectedIndex: number): PlayResult => {
    const { round, score, hp, history, streak, bestStreak, answered } = get();
    if (!round || answered) {
      return {
        correct: false,
        pointsGained: 0,
        streak,
        selectedIndex,
        correctIndex: round?.correctIndex ?? 0,
        explanationZh: round?.explanationZh ?? '',
      };
    }
    const correct = selectedIndex === round.correctIndex;
    const newStreak = correct ? streak + 1 : 0;
    const streakBonus = correct
      ? Math.min(STREAK_BONUS_CAP, Math.max(0, streak) * STREAK_BONUS_STEP)
      : 0;
    const pointsGained = correct ? POINTS_BASE + streakBonus : 0;

    const entry: HistoryEntry = {
      question: round,
      selectedIndex,
      correct,
    };
    const result: PlayResult = {
      correct,
      pointsGained,
      streak: newStreak,
      selectedIndex,
      correctIndex: round.correctIndex,
      explanationZh: round.explanationZh,
    };
    set({
      history: [...history, entry],
      score: score + pointsGained,
      hp: correct ? hp : Math.max(0, hp - 1),
      streak: newStreak,
      bestStreak: Math.max(bestStreak, newStreak),
      answered: true,
      lastResult: result,
    });
    return result;
  },

  timeoutRound: (): PlayResult => {
    const { round, hp, history, answered } = get();
    if (!round || answered) {
      return {
        correct: false,
        pointsGained: 0,
        streak: 0,
        selectedIndex: -1,
        correctIndex: round?.correctIndex ?? 0,
        explanationZh: round?.explanationZh ?? '',
      };
    }
    const entry: HistoryEntry = {
      question: round,
      selectedIndex: null,
      correct: false,
    };
    const result: PlayResult = {
      correct: false,
      pointsGained: 0,
      streak: 0,
      selectedIndex: -1,
      correctIndex: round.correctIndex,
      explanationZh: round.explanationZh,
    };
    set({
      history: [...history, entry],
      hp: Math.max(0, hp - 1),
      streak: 0,
      answered: true,
      lastResult: result,
    });
    return result;
  },

  reset: () => {
    set({
      round: null,
      pool: [],
      score: 0,
      hp: STARTING_HP,
      streak: 0,
      bestStreak: 0,
      history: [],
      lastResult: null,
      answered: false,
      runStartedAt: Date.now(),
    });
  },
}));

export const RUN_CONFIG = {
  QUESTIONS_PER_RUN,
  STARTING_HP,
};
