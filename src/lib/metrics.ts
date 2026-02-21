// Spieltag — Metrics Engine (Phase 1, Step 1)
// Pure functions. No React. No Supabase calls.

import type { Player, ValueSignal } from './types';

/**
 * Calculate rolling yield for a player.
 * Rolling Yield = last_5_points / price
 * Guard: if price === 0, return 0 (data integrity issue).
 */
export function calculateRollingYield(player: Pick<Player, 'last_5_points' | 'price'>): number {
  if (player.price === 0) {
    console.warn('Data integrity warning: player price is 0');
    return 0;
  }
  return player.last_5_points / player.price;
}

/**
 * Get value signal based on player yield vs benchmark yield.
 * Asymmetric band:
 *   UNDERVALUED: playerYield > benchmarkYield * 1.20
 *   OVERVALUED:  playerYield < benchmarkYield * 0.75
 *   FAIR:        everything between
 */
export function getValueSignal(playerYield: number, benchmarkYield: number): ValueSignal {
  if (playerYield > benchmarkYield * 1.20) return 'UNDERVALUED';
  if (playerYield < benchmarkYield * 0.75) return 'OVERVALUED';
  return 'FAIR';
}
