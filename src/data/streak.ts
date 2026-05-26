/**
 * Persistent daily streak — v1.9.4.
 *
 * Counts consecutive calendar days the user opened the app and
 * completed at least one round. localStorage keys:
 *   pickup.streak.count    — current streak length
 *   pickup.streak.lastDate — ISO date (YYYY-MM-DD) of last activity
 *
 * Call updateStreak() on:
 *   - app boot (in BootScene)
 *   - any milestone the user "did something today" (round complete, etc.)
 *
 * Logic:
 *   - Today is the same as lastDate → no change (already counted today)
 *   - Today is exactly 1 day after lastDate → increment (streak continues)
 *   - Today is 2+ days after lastDate → reset to 1 (streak broken, start over)
 *   - lastDate empty → first time, set to 1
 */
const LS_COUNT = 'pickup.streak.count';
const LS_LAST = 'pickup.streak.lastDate';

function isoDate(d = new Date()): string {
  // Local date YYYY-MM-DD (not UTC) so the streak respects user timezone
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function daysBetween(a: string, b: string): number {
  const da = new Date(a + 'T00:00:00');
  const db = new Date(b + 'T00:00:00');
  return Math.round((db.getTime() - da.getTime()) / (24 * 60 * 60 * 1000));
}

export function readStreak(): number {
  if (typeof localStorage === 'undefined') return 0;
  try {
    const v = localStorage.getItem(LS_COUNT);
    const n = v == null ? 0 : Number(v);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  } catch {
    return 0;
  }
}

export function readLastDate(): string | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    return localStorage.getItem(LS_LAST);
  } catch {
    return null;
  }
}

/**
 * Idempotent — call as often as you like. Updates count + lastDate only
 * when the calendar day has changed. Returns new streak count.
 */
export function updateStreak(): number {
  if (typeof localStorage === 'undefined') return 0;
  const today = isoDate();
  const last = readLastDate();
  let count = readStreak();
  if (!last) {
    count = 1;
  } else if (last === today) {
    // already counted, no-op
    return count;
  } else {
    const gap = daysBetween(last, today);
    if (gap === 1) count += 1;
    else count = 1; // gap >= 2 means streak broken — start over
  }
  try {
    localStorage.setItem(LS_COUNT, String(count));
    localStorage.setItem(LS_LAST, today);
  } catch {
    // ignore
  }
  return count;
}

export function resetStreak(): void {
  try {
    localStorage.removeItem(LS_COUNT);
    localStorage.removeItem(LS_LAST);
  } catch {
    // ignore
  }
}
