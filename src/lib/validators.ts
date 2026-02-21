// Spieltag — Squad Rules Validator (Phase 1, Step 2)
// Pure functions except validateTransfersRemaining which takes a count argument.

import type { Player, Position, ValidationResult, TransferValidationResult } from './types';

const REQUIRED_COMPOSITION: Record<Position, number> = {
  GK: 2,
  DEF: 5,
  MID: 5,
  FWD: 3,
};

/**
 * Validate squad has exactly 2 GK, 5 DEF, 5 MID, 3 FWD = 15 players.
 */
export function validateSquadComposition(
  squadPlayers: Pick<Player, 'position'>[]
): ValidationResult {
  const counts: Record<string, number> = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
  for (const p of squadPlayers) {
    counts[p.position] = (counts[p.position] || 0) + 1;
  }

  for (const [pos, required] of Object.entries(REQUIRED_COMPOSITION)) {
    const actual = counts[pos] || 0;
    if (actual !== required) {
      return {
        blocked: true,
        reason: `Invalid squad composition: ${pos} requires ${required}, found ${actual}.`,
      };
    }
  }

  return { blocked: false, reason: '' };
}

/**
 * Validate club limit: max 3 players per club in the squad of 15.
 * CRITICAL: Remove outgoing player from squad BEFORE evaluating incoming player's club count.
 * If no outgoing player (initial squad build), count without removal.
 */
export function validateClubLimit(
  incomingPlayer: Pick<Player, 'id' | 'team'>,
  currentSquad: Pick<Player, 'id' | 'team'>[],
  outgoingPlayer?: Pick<Player, 'id' | 'team'>
): ValidationResult {
  const squadAfterRemoval = outgoingPlayer
    ? currentSquad.filter((p) => p.id !== outgoingPlayer.id)
    : currentSquad;

  const clubCount = squadAfterRemoval.filter(
    (p) => p.team === incomingPlayer.team
  ).length;

  if (clubCount >= 3) {
    return {
      blocked: true,
      reason: `Rule Breach: Max 3 players per club (${incomingPlayer.team}).`,
    };
  }

  return { blocked: false, reason: '' };
}

/**
 * Validate transfers remaining for a matchday.
 * transfersUsed is the count of TransferLog rows for this squad+matchday
 * (queried from Supabase BEFORE calling this function — never from local state).
 */
export function validateTransfersRemaining(
  transfersUsed: number,
  isBreakPeriod: boolean
): TransferValidationResult {
  if (isBreakPeriod) {
    return { blocked: false, reason: '', remaining: Infinity };
  }

  const remaining = Math.max(0, 5 - transfersUsed);

  if (remaining === 0) {
    return {
      blocked: true,
      reason: 'Transfer Limit Reached. 0 transfers remaining this matchday.',
      remaining: 0,
    };
  }

  return { blocked: false, reason: '', remaining };
}
