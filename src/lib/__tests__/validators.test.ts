import { describe, it, expect } from 'vitest';
import {
  validateSquadComposition,
  validateClubLimit,
  validateTransfersRemaining,
} from '@/lib/validators';

describe('validateSquadComposition', () => {
  it('passes with correct composition: 2 GK, 5 DEF, 5 MID, 3 FWD', () => {
    const squad = [
      ...Array(2).fill({ position: 'GK' as const }),
      ...Array(5).fill({ position: 'DEF' as const }),
      ...Array(5).fill({ position: 'MID' as const }),
      ...Array(3).fill({ position: 'FWD' as const }),
    ];
    const result = validateSquadComposition(squad);
    expect(result.blocked).toBe(false);
  });

  it('blocks when DEF count is wrong', () => {
    const squad = [
      ...Array(2).fill({ position: 'GK' as const }),
      ...Array(4).fill({ position: 'DEF' as const }),
      ...Array(5).fill({ position: 'MID' as const }),
      ...Array(3).fill({ position: 'FWD' as const }),
    ];
    const result = validateSquadComposition(squad);
    expect(result.blocked).toBe(true);
    expect(result.reason).toContain('DEF');
  });
});

describe('validateClubLimit', () => {
  const makePlayer = (id: string, team: string) => ({ id, team });

  it('allows transfer when club count is under 3', () => {
    const squad = [
      makePlayer('1', 'Bayern'),
      makePlayer('2', 'Bayern'),
      makePlayer('3', 'Dortmund'),
    ];
    const incoming = makePlayer('4', 'Bayern');
    const result = validateClubLimit(incoming, squad);
    expect(result.blocked).toBe(false);
  });

  it('blocks transfer when club count would exceed 3', () => {
    const squad = [
      makePlayer('1', 'Bayern'),
      makePlayer('2', 'Bayern'),
      makePlayer('3', 'Bayern'),
      makePlayer('4', 'Dortmund'),
    ];
    const incoming = makePlayer('5', 'Bayern');
    const result = validateClubLimit(incoming, squad);
    expect(result.blocked).toBe(true);
    expect(result.reason).toContain('Bayern');
  });

  it('allows same-club swap (3 Leverkusen, swap one for another Leverkusen)', () => {
    const squad = [
      makePlayer('1', 'Leverkusen'),
      makePlayer('2', 'Leverkusen'),
      makePlayer('3', 'Leverkusen'),
      makePlayer('4', 'Dortmund'),
    ];
    const outgoing = makePlayer('1', 'Leverkusen');
    const incoming = makePlayer('5', 'Leverkusen');
    const result = validateClubLimit(incoming, squad, outgoing);
    // After removing outgoing: 2 Leverkusen. Incoming makes 3. Allowed.
    expect(result.blocked).toBe(false);
  });

  it('blocks same-club swap that would still exceed 3 (4 in squad somehow)', () => {
    const squad = [
      makePlayer('1', 'Leverkusen'),
      makePlayer('2', 'Leverkusen'),
      makePlayer('3', 'Leverkusen'),
      makePlayer('4', 'Leverkusen'),
      makePlayer('5', 'Dortmund'),
    ];
    const outgoing = makePlayer('1', 'Leverkusen');
    const incoming = makePlayer('6', 'Leverkusen');
    // After removing outgoing: 3 Leverkusen. Incoming would make 4. Blocked.
    const result = validateClubLimit(incoming, squad, outgoing);
    expect(result.blocked).toBe(true);
  });
});

describe('validateTransfersRemaining', () => {
  it('returns 5 remaining when 0 used', () => {
    const result = validateTransfersRemaining(0, false);
    expect(result.blocked).toBe(false);
    expect(result.remaining).toBe(5);
  });

  it('returns 0 remaining and blocked when 5 used', () => {
    const result = validateTransfersRemaining(5, false);
    expect(result.blocked).toBe(true);
    expect(result.remaining).toBe(0);
    expect(result.reason).toContain('Transfer Limit Reached');
  });

  it('returns Infinity during break period', () => {
    const result = validateTransfersRemaining(5, true);
    expect(result.blocked).toBe(false);
    expect(result.remaining).toBe(Infinity);
  });

  it('returns correct remaining for partial usage', () => {
    const result = validateTransfersRemaining(3, false);
    expect(result.blocked).toBe(false);
    expect(result.remaining).toBe(2);
  });
});
