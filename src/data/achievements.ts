/**
 * Achievements — v1.9.7.
 *
 * Read-only definitions. Each achievement has an unlock predicate that
 * checks current state (streak / xp / chapter progress). UI calls
 * `evaluateAchievements()` to get { unlocked: [], locked: [] }.
 *
 * No persistence needed — unlock state is derived from existing data.
 */
import { readXp, levelForXp } from './xp';
import { readStreak } from './streak';
import { readChapterProgress } from './storyKitten';

export interface Achievement {
  id: string;
  emoji: string;
  title: string;
  description: string;
  unlocked: boolean;
  progressLabel?: string; // optional "5/7 days" style label
}

interface AchievementDef {
  id: string;
  emoji: string;
  title: string;
  description: string;
  check: (state: AppState) => { unlocked: boolean; progressLabel?: string };
}

interface AppState {
  xp: number;
  level: number;
  streak: number;
  chaptersCompleted: number;
}

const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'first-question',
    emoji: '🐾',
    title: 'First Paw',
    description: 'Earn your first XP',
    check: (s) => ({ unlocked: s.xp >= 1, progressLabel: s.xp >= 1 ? undefined : '0 XP' }),
  },
  {
    id: 'ch1-complete',
    emoji: '☂️',
    title: 'Rainy Night Survived',
    description: 'Complete Chapter 1',
    check: (s) => ({
      unlocked: s.chaptersCompleted >= 1,
      progressLabel: s.chaptersCompleted >= 1 ? undefined : 'Ch1 in progress',
    }),
  },
  {
    id: 'streak-3',
    emoji: '🔥',
    title: 'Three-Day Spark',
    description: 'Hit a 3-day streak',
    check: (s) => ({
      unlocked: s.streak >= 3,
      progressLabel: s.streak >= 3 ? undefined : `${s.streak}/3 days`,
    }),
  },
  {
    id: 'streak-7',
    emoji: '⚡',
    title: 'Weekly Resilience',
    description: 'Hit a 7-day streak',
    check: (s) => ({
      unlocked: s.streak >= 7,
      progressLabel: s.streak >= 7 ? undefined : `${s.streak}/7 days`,
    }),
  },
  {
    id: 'streak-30',
    emoji: '🌟',
    title: 'Monthly Master',
    description: 'Hit a 30-day streak',
    check: (s) => ({
      unlocked: s.streak >= 30,
      progressLabel: s.streak >= 30 ? undefined : `${s.streak}/30 days`,
    }),
  },
  {
    id: 'xp-50',
    emoji: '⭐',
    title: 'Level 2 Hatchling',
    description: 'Reach Level 2 (50 XP)',
    check: (s) => ({
      unlocked: s.level >= 2,
      progressLabel: s.level >= 2 ? undefined : `${s.xp}/50 XP`,
    }),
  },
  {
    id: 'xp-200',
    emoji: '🎯',
    title: 'Level 3 Climb',
    description: 'Reach Level 3 (200 XP)',
    check: (s) => ({
      unlocked: s.level >= 3,
      progressLabel: s.level >= 3 ? undefined : `${s.xp}/200 XP`,
    }),
  },
  {
    id: 'all-chapters',
    emoji: '🏆',
    title: 'Way Home',
    description: 'Complete all 8 chapters',
    check: (s) => ({
      unlocked: s.chaptersCompleted >= 8,
      progressLabel: s.chaptersCompleted >= 8 ? undefined : `${s.chaptersCompleted}/8 chapters`,
    }),
  },
];

export function evaluateAchievements(): Achievement[] {
  const xp = readXp();
  const state: AppState = {
    xp,
    level: levelForXp(xp),
    streak: readStreak(),
    chaptersCompleted: readChapterProgress().highestCompleted,
  };
  return ACHIEVEMENTS.map(def => {
    const { unlocked, progressLabel } = def.check(state);
    return {
      id: def.id,
      emoji: def.emoji,
      title: def.title,
      description: def.description,
      unlocked,
      progressLabel,
    };
  });
}

export function countUnlocked(): { unlocked: number; total: number } {
  const all = evaluateAchievements();
  return { unlocked: all.filter(a => a.unlocked).length, total: all.length };
}
