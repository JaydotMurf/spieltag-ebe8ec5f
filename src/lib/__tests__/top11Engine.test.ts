import { describe, it, expect } from 'vitest';
import { computeTop11, selectTop } from '@/lib/top11Engine';
import type { PlayerWithMatchdayPoints, SquadByPosition } from '@/lib/types';

// Helper to create a test player
function makePlayer(
  id: string,
  name: string,
  position: 'GK' | 'DEF' | 'MID' | 'FWD',
  team: string,
  matchday_points: number,
  rolling_yield: number = 1.0
): PlayerWithMatchdayPoints {
  return {
    id,
    name,
    position,
    team,
    price: 10,
    season_points: 50,
    last_5_points: 20,
    rolling_yield,
    api_player_id: `api_${id}`,
    matchday_points,
  };
}

function buildTestSquad(): SquadByPosition {
  return {
    GK: [
      makePlayer('gk1', 'Neuer', 'GK', 'Bayern', 8, 1.2),
      makePlayer('gk2', 'Trapp', 'GK', 'Frankfurt', 5, 0.9),
    ],
    DEF: [
      makePlayer('def1', 'Tah', 'DEF', 'Leverkusen', 10, 1.5),
      makePlayer('def2', 'Hummels', 'DEF', 'Dortmund', 8, 1.3),
      makePlayer('def3', 'Upamecano', 'DEF', 'Bayern', 7, 1.1),
      makePlayer('def4', 'Ndicka', 'DEF', 'Frankfurt', 6, 1.0),
      makePlayer('def5', 'Schlotterbeck', 'DEF', 'Dortmund', 4, 0.8),
    ],
    MID: [
      makePlayer('mid1', 'Wirtz', 'MID', 'Leverkusen', 12, 1.9),
      makePlayer('mid2', 'Musiala', 'MID', 'Bayern', 11, 1.8),
      makePlayer('mid3', 'Kimmich', 'MID', 'Bayern', 9, 1.4),
      makePlayer('mid4', 'Brandt', 'MID', 'Dortmund', 7, 1.2),
      makePlayer('mid5', 'Sabitzer', 'MID', 'Dortmund', 5, 0.7),
    ],
    FWD: [
      makePlayer('fwd1', 'Kane', 'FWD', 'Bayern', 15, 2.0),
      makePlayer('fwd2', 'Fullkrug', 'FWD', 'Dortmund', 9, 1.3),
      makePlayer('fwd3', 'Schick', 'FWD', 'Leverkusen', 6, 1.0),
    ],
  };
}

describe('selectTop', () => {
  it('selects top N players by matchday_points, tiebreak by rolling_yield', () => {
    const players = [
      makePlayer('a', 'A', 'DEF', 'X', 10, 1.0),
      makePlayer('b', 'B', 'DEF', 'X', 10, 1.5),
      makePlayer('c', 'C', 'DEF', 'X', 8, 2.0),
    ];
    const result = selectTop(players, 2);
    expect(result).toHaveLength(2);
    // Both have 10 points — B wins tiebreak with higher yield
    expect(result[0].id).toBe('b');
    expect(result[1].id).toBe('a');
  });
});

describe('computeTop11', () => {
  it('returns a valid result with 11 in XI and 4 on bench', () => {
    const squad = buildTestSquad();
    const result = computeTop11(
      squad,
      {},
      { DEF: false, MID: false, FWD: false }
    );

    expect(result.xi).toHaveLength(11);
    expect(result.bench).toHaveLength(4);
    expect(result.formation).toBeDefined();
    expect(result.totalPoints).toBeGreaterThan(0);
  });

  it('applies 1.5x multiplier when star is in XI with active leverage', () => {
    const squad = buildTestSquad();
    // Wirtz (mid1) with 12 points — should be in XI
    const withoutLeverage = computeTop11(
      squad,
      { MID: 'mid1' },
      { DEF: false, MID: false, FWD: false }
    );
    const withLeverage = computeTop11(
      squad,
      { MID: 'mid1' },
      { DEF: false, MID: true, FWD: false }
    );
    // With leverage, Wirtz's 12 points → 18 points (+6)
    expect(withLeverage.totalPoints).toBe(withoutLeverage.totalPoints + 6);
  });

  it('flags WASTED LEVERAGE when star is not in XI', () => {
    const squad = buildTestSquad();
    // Schlotterbeck (def5) has 4 points — lowest DEF, will be on bench in 3-DEF and 4-DEF formations
    // The winning formation uses the top DEFs, so def5 should be on the bench
    const result = computeTop11(
      squad,
      { DEF: 'def5' },
      { DEF: true, MID: false, FWD: false }
    );

    // Verify def5 is actually on the bench
    const def5InXI = result.xi.some((p) => p.id === 'def5');
    // If def5 is in XI (5-3-2), we need to use a different approach
    if (def5InXI) {
      // 5-3-2 includes all 5 DEF — use Schick (fwd3, 6 pts) who will be on bench in 4-5-1
      const result2 = computeTop11(
        squad,
        { FWD: 'fwd3' },
        { DEF: false, MID: false, FWD: true }
      );
      const fwdStatus = result2.leverageStatus.find((s) => s.sector === 'FWD');
      expect(fwdStatus).toBeDefined();
      expect(fwdStatus!.wasted).toBe(true);
      expect(fwdStatus!.playerName).toBe('Schick');
    } else {
      const defStatus = result.leverageStatus.find((s) => s.sector === 'DEF');
      expect(defStatus).toBeDefined();
      expect(defStatus!.wasted).toBe(true);
      expect(defStatus!.playerName).toBe('Schlotterbeck');
    }
  });

  it('does not flag WASTED LEVERAGE when no star is designated', () => {
    const squad = buildTestSquad();
    const result = computeTop11(
      squad,
      {},
      { DEF: false, MID: true, FWD: false }
    );
    // No star designated for MID — leverage ignored silently
    const midStatus = result.leverageStatus.find((s) => s.sector === 'MID');
    expect(midStatus).toBeUndefined();
  });

  it('tiebreaks formations by preferring more DEF', () => {
    // Create a squad where two formations produce equal points
    const squad: SquadByPosition = {
      GK: [
        makePlayer('gk1', 'GK1', 'GK', 'A', 5),
        makePlayer('gk2', 'GK2', 'GK', 'B', 3),
      ],
      DEF: [
        makePlayer('d1', 'D1', 'DEF', 'A', 10),
        makePlayer('d2', 'D2', 'DEF', 'B', 10),
        makePlayer('d3', 'D3', 'DEF', 'C', 10),
        makePlayer('d4', 'D4', 'DEF', 'D', 10),
        makePlayer('d5', 'D5', 'DEF', 'E', 10),
      ],
      MID: [
        makePlayer('m1', 'M1', 'MID', 'A', 10),
        makePlayer('m2', 'M2', 'MID', 'B', 10),
        makePlayer('m3', 'M3', 'MID', 'C', 10),
        makePlayer('m4', 'M4', 'MID', 'D', 10),
        makePlayer('m5', 'M5', 'MID', 'E', 10),
      ],
      FWD: [
        makePlayer('f1', 'F1', 'FWD', 'A', 10),
        makePlayer('f2', 'F2', 'FWD', 'B', 10),
        makePlayer('f3', 'F3', 'FWD', 'C', 10),
      ],
    };
    // All outfield players have 10 points. All formations produce 105 total.
    // Tiebreaker: prefer more DEF → 5-3-2 wins.
    const result = computeTop11(
      squad,
      {},
      { DEF: false, MID: false, FWD: false }
    );
    expect(result.formation).toBe('5-3-2');
  });

  it('always selects the best GK (higher points, tiebreak by yield)', () => {
    const squad = buildTestSquad();
    const result = computeTop11(
      squad,
      {},
      { DEF: false, MID: false, FWD: false }
    );
    const gkInXI = result.xi.filter((p) => p.position === 'GK');
    expect(gkInXI).toHaveLength(1);
    expect(gkInXI[0].id).toBe('gk1'); // Neuer has 8 pts vs Trapp's 5
  });
});
