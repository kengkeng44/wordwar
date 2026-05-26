import { create } from 'zustand';
import {
  loadSentences,
  pickByLevel,
  filterByDifficulty,
  type ClozeLevel,
  type ClozeQuestion,
  type Difficulty,
} from '../data/sentences';
import {
  loadScenarios,
  questionsForScenario,
  toClozeQuestion as scenarioToCloze,
  type ScenarioId,
  type ScenarioQuestion,
} from '../data/scenarios';
import {
  loadStoryQuestions,
  questionsForChapter,
  toClozeQuestion as storyToCloze,
  srsReviewBatch,
  addToSrs,
  removeFromSrs,
  markChapterCompleted,
  type ChapterId,
  type StoryQuestion,
} from '../data/storyKitten';

/**
 * runStore — cloze run state.
 *
 * v0.8 adds story mode (mode === 'story'):
 *   - Player picks a chapter (1..5) via setChapter(c).
 *   - startRound() loads up to 3 SRS review questions (from previous wrong
 *     answers) plus the 6 chapter questions in order — so the player drills
 *     past mistakes before facing new content.
 *   - HP is disabled in story mode. wrongs count but do not cost HP.
 *   - answer() in story mode: a wrong answer marks the round NOT advanced;
 *     the same round stays current with `answered` true. The UI is
 *     expected to call `retryRound()` after the player taps the correct
 *     option, which clears `answered` and waits for the second answer.
 *     Force-correct flow.
 *
 * Other modes ('free', 'scenario') behave exactly as v0.7.
 */

export type RunMode = 'free' | 'scenario' | 'story';

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
  // Content — story pool (v0.8)
  storyQuestions: StoryQuestion[] | null;

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
  /** v0.8: in story mode, set to true after a WRONG answer to indicate
   * the player must retry the same round. Cleared by retryRound(). */
  awaitingRetry: boolean;

  /** ms timestamp (Date.now) at run start — used by EndScene for total time. */
  runStartedAt: number;

  // Mode + level
  mode: RunMode;
  scenario: ScenarioId | null;
  /** v0.8: active story chapter (1..5). null when not in story mode. */
  chapter: ChapterId | null;
  level: ClozeLevel;
  /** v0.11: player-selected difficulty tier. Persisted to localStorage.
   * Applied to ALL modes (free / scenario / story) — filters the pool
   * down to questions tagged with this tier, with graceful fallback. */
  difficulty: Difficulty;

  /** v0.8: count of NEW (non-SRS) story questions in the current run.
   * Used by PlayScene to know when the chapter is complete (vs review). */
  storyNewQuestionCount: number;
  /** v0.8: total story questions in the current run (SRS + new). */
  storyTotalQuestionCount: number;

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
  /** v0.11 — persists to localStorage + sets state so next run uses it. */
  setDifficulty: (difficulty: Difficulty) => void;
  setMode: (mode: RunMode) => void;
  setScenario: (scenario: ScenarioId | null) => void;
  setChapter: (chapter: ChapterId | null) => void;
  startRound: () => void;
  answer: (selectedIndex: number) => PlayResult;
  /** v0.8 story mode: clear `answered` + `awaitingRetry` so the same
   * round can accept a second (force-correct) answer. */
  retryRound: () => void;
  timeoutRound: () => PlayResult;
  /** v0.8 story mode: called once a chapter's 6 NEW questions have been
   * answered correctly. Persists completion. */
  completeChapter: () => void;
  reset: () => void;
}

const STARTING_HP = 3;
const POINTS_BASE = 10;
const STREAK_BONUS_STEP = 2;
const STREAK_BONUS_CAP = 10;
const QUESTIONS_PER_RUN = 10;
const STORY_QUESTIONS_PER_CHAPTER = 6;
const SRS_REVIEW_LIMIT = 3;

const LS_LEVEL = 'wordwar.level';
const LS_DIFFICULTY = 'pickup.difficulty';

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

function readDifficulty(): Difficulty {
  if (typeof localStorage === 'undefined') return 'medium';
  try {
    const v = localStorage.getItem(LS_DIFFICULTY);
    if (v === 'easy' || v === 'medium' || v === 'hard') return v;
  } catch {
    // ignore
  }
  return 'medium';
}

function writeDifficulty(d: Difficulty): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(LS_DIFFICULTY, d);
  } catch {
    // ignore
  }
}

export const useRunStore = create<RunState>((set, get) => ({
  questions: null,
  scenarioQuestions: null,
  storyQuestions: null,
  pool: [],
  round: null,
  score: 0,
  hp: STARTING_HP,
  streak: 0,
  bestStreak: 0,
  history: [],
  lastResult: null,
  answered: false,
  awaitingRetry: false,
  runStartedAt: 0,
  mode: 'free',
  scenario: null,
  chapter: null,
  level: readLevel(),
  difficulty: readDifficulty(),
  storyNewQuestionCount: 0,
  storyTotalQuestionCount: 0,
  loading: false,
  error: null,

  /**
   * Load all three content sources eagerly: sentences (free), scenarios,
   * story. Story file is small (~6KB) so loading it on top is negligible.
   * Idempotent — short-circuits if all three are already cached.
   */
  loadContent: async () => {
    if (get().loading) return;
    if (get().questions && get().scenarioQuestions && get().storyQuestions)
      return;
    set({ loading: true, error: null });
    try {
      const [sentences, scenarios, story] = await Promise.all([
        get().questions ? Promise.resolve(get().questions!) : loadSentences(),
        get().scenarioQuestions
          ? Promise.resolve(get().scenarioQuestions!)
          : loadScenarios(),
        get().storyQuestions
          ? Promise.resolve(get().storyQuestions!)
          : loadStoryQuestions(),
      ]);
      set({
        questions: sentences,
        scenarioQuestions: scenarios,
        storyQuestions: story,
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

  setDifficulty: (difficulty: Difficulty) => {
    writeDifficulty(difficulty);
    set({ difficulty });
  },

  setMode: (mode: RunMode) => {
    set({ mode });
  },

  setScenario: (scenario: ScenarioId | null) => {
    set({ scenario });
  },

  setChapter: (chapter: ChapterId | null) => {
    set({ chapter });
  },

  startRound: () => {
    const {
      questions,
      scenarioQuestions,
      storyQuestions,
      level,
      difficulty,
      pool,
      mode,
      scenario,
      chapter,
    } = get();

    let nextPool = pool;
    if (nextPool.length === 0) {
      if (mode === 'story' && chapter && storyQuestions) {
        // Story mode: up to 3 SRS reviews (excluding current chapter's
        // questions) + the chapter's NEW questions (filtered by difficulty,
        // ordered) — force-correct flow means each entry stays in the
        // queue once.
        //
        // v0.11 — chapter questions are filtered by difficulty BEFORE
        // becoming the chapter pool. If filter empties the pool we fall
        // back to the chapter's full set via filterByDifficulty.
        const chapterIds = new Set(
          questionsForChapter(storyQuestions, chapter).map((q) => q.id)
        );
        const srsRaw = srsReviewBatch(storyQuestions, SRS_REVIEW_LIMIT + 6);
        const srs = srsRaw
          .filter((q) => !chapterIds.has(q.id))
          .slice(0, SRS_REVIEW_LIMIT);
        const allChapterQs = questionsForChapter(storyQuestions, chapter);
        const newQs = filterByDifficulty(allChapterQs, difficulty);
        const ordered = [...srs, ...newQs];
        nextPool = ordered.map(storyToCloze);
        set({
          storyNewQuestionCount: newQs.length,
          storyTotalQuestionCount: ordered.length,
        });
      } else if (mode === 'scenario' && scenario && scenarioQuestions) {
        // Scenario mode: fixed order, filtered by difficulty.
        // v0.11 — if filter empties this scenario at the requested tier,
        // filterByDifficulty falls back to adjacent tiers so the player
        // always sees questions.
        const all = questionsForScenario(scenarioQuestions, scenario);
        nextPool = filterByDifficulty(all, difficulty).map(scenarioToCloze);
      } else {
        // Free practice (v0.5): unified pool = sentences.json ∪ scenarios.json.
        // v0.11: apply difficulty filter BEFORE level filter / shuffle.
        const base = questions ?? [];
        const scenarioCloze = (scenarioQuestions ?? []).map(scenarioToCloze);
        const unified = base.concat(scenarioCloze);
        const tierFiltered = filterByDifficulty(unified, difficulty);
        nextPool = pickByLevel(tierFiltered, level, QUESTIONS_PER_RUN);
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
      awaitingRetry: false,
    });
  },

  answer: (selectedIndex: number): PlayResult => {
    const {
      round,
      score,
      hp,
      history,
      streak,
      bestStreak,
      answered,
      mode,
    } = get();
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
    const isStory = mode === 'story';

    // In story mode, streak only increments on FIRST-try correct, not on
    // retry-correct. We detect "this is a retry" by checking if the
    // history already has an entry for this same round id (failed earlier).
    const isRetryCorrect =
      isStory &&
      correct &&
      history.some((h) => h.question.id === round.id && !h.correct);

    const newStreak = correct && !isRetryCorrect ? streak + 1 : isStory && correct ? streak : 0;
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

    // SRS tracking in story mode:
    //   - wrong   → add to SRS queue
    //   - correct → remove from SRS queue (review nailed)
    if (isStory) {
      if (correct) removeFromSrs(round.id);
      else addToSrs(round.id);
    }

    set({
      history: [...history, entry],
      score: score + pointsGained,
      // HP only ticks down outside story mode.
      hp: isStory ? hp : correct ? hp : Math.max(0, hp - 1),
      streak: newStreak,
      bestStreak: Math.max(bestStreak, newStreak),
      answered: true,
      // In story mode, a wrong answer leaves the player awaiting a retry.
      awaitingRetry: isStory && !correct,
      lastResult: result,
    });
    return result;
  },

  retryRound: () => {
    set({ answered: false, awaitingRetry: false, lastResult: null });
  },

  timeoutRound: (): PlayResult => {
    const { round, hp, history, answered, mode } = get();
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
    const isStory = mode === 'story';
    if (isStory) addToSrs(round.id);
    set({
      history: [...history, entry],
      hp: isStory ? hp : Math.max(0, hp - 1),
      streak: 0,
      answered: true,
      awaitingRetry: isStory,
      lastResult: result,
    });
    return result;
  },

  completeChapter: () => {
    const { chapter } = get();
    if (chapter) markChapterCompleted(chapter);
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
      awaitingRetry: false,
      runStartedAt: Date.now(),
      storyNewQuestionCount: 0,
      storyTotalQuestionCount: 0,
    });
  },
}));

export const RUN_CONFIG = {
  QUESTIONS_PER_RUN,
  STARTING_HP,
  STORY_QUESTIONS_PER_CHAPTER,
  SRS_REVIEW_LIMIT,
};
