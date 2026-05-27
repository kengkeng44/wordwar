/**
 * Coins — v1.9.16 persistent currency.
 * +1 coin per correct answer (separate from XP).
 * Used as HUD readout + future shop currency placeholder.
 */
const LS_COINS = 'pickup.coins.total';

export function readCoins(): number {
  if (typeof localStorage === 'undefined') return 0;
  try {
    const v = localStorage.getItem(LS_COINS);
    const n = v == null ? 0 : Number(v);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  } catch {
    return 0;
  }
}

export function addCoins(delta: number): number {
  const current = readCoins();
  const next = Math.max(0, current + Math.round(delta));
  try {
    localStorage.setItem(LS_COINS, String(next));
  } catch {
    // ignore
  }
  return next;
}

export function resetCoins(): void {
  try {
    localStorage.removeItem(LS_COINS);
  } catch {
    // ignore
  }
}
