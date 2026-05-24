import { create } from 'zustand';
import type { Vocab } from '../data/vocab';
import { isAntonym, isSynonym, loadVocab, samePOS } from '../data/vocab';
import type { Round } from '../data/roundGenerator';
import { generateRound } from '../data/roundGenerator';

export interface PlayResult {
  correct: boolean;
  reason: string;
}

export interface HistoryEntry {
  round: Round;
  played: string;
  correct: boolean;
}

export interface RunState {
  vocab: Vocab | null;
  round: Round | null;
  score: number;
  hp: number;
  history: HistoryEntry[];
  loading: boolean;
  error: string | null;
  loadVocab: () => Promise<void>;
  startRound: () => void;
  playCard: (card: string) => PlayResult;
  reset: () => void;
}

const STARTING_HP = 3;
const POINTS_PER_CORRECT = 10;

export const useRunStore = create<RunState>((set, get) => ({
  vocab: null,
  round: null,
  score: 0,
  hp: STARTING_HP,
  history: [],
  loading: false,
  error: null,

  loadVocab: async () => {
    if (get().vocab || get().loading) return;
    set({ loading: true, error: null });
    try {
      const v = await loadVocab();
      set({ vocab: v, loading: false });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  },

  startRound: () => {
    const { vocab } = get();
    if (!vocab) return;
    const round = generateRound(vocab);
    set({ round });
  },

  playCard: (card: string): PlayResult => {
    const { vocab, round, score, hp, history } = get();
    if (!vocab || !round) {
      return { correct: false, reason: 'No active round' };
    }

    const matcher =
      round.type === 'syn'
        ? isSynonym
        : round.type === 'ant'
        ? isAntonym
        : samePOS;
    const correct = matcher(card, round.target, vocab);

    const entry: HistoryEntry = { round, played: card, correct };
    set({
      history: [...history, entry],
      score: correct ? score + POINTS_PER_CORRECT : score,
      hp: correct ? hp : Math.max(0, hp - 1),
    });

    return {
      correct,
      reason: correct
        ? `${card} is a valid ${labelFor(round.type)} of ${round.target}`
        : `${card} is not a ${labelFor(round.type)} of ${round.target}`,
    };
  },

  reset: () => {
    set({
      round: null,
      score: 0,
      hp: STARTING_HP,
      history: [],
    });
  },
}));

function labelFor(type: Round['type']): string {
  switch (type) {
    case 'syn':
      return 'synonym';
    case 'ant':
      return 'antonym';
    case 'pos':
      return 'same-POS match';
  }
}
