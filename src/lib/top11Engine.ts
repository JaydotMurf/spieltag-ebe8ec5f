// Spieltag — Top 11 Engine (Phase 1, Step 3)
// Pure function. No React. No Supabase calls.

import type {
  FormationDef,
  PlayerWithMatchdayPoints,
  SquadByPosition,
  StarDesignations,
  LeverageToggles,
  LeverageStatus,
  LeverageSector,
  Top11Result,
} from './types';

const FORMATIONS: FormationDef[] = [
  { name: '4-4-2', def: 4, mid: 4, fwd: 2 },
  { name: '4-3-3', def: 4, mid: 3, fwd: 3 },
  { name: '3-5-2', def: 3, mid: 5, fwd: 2 },
  { name: '3-4-3', def: 3, mid: 4, fwd: 3 },
  { name: '4-5-1', def: 4, mid: 5, fwd: 1 },
  { name: '5-3-2', def: 5, mid: 3, fwd: 2 },
];

/**
 * Select top N players sorted by primary (matchday_points) descending,
 * tiebreaker by secondary (rolling_yield) descending.
 */
export function selectTop(
  players: PlayerWithMatchdayPoints[],
  n: number
): PlayerWithMatchdayPoints[] {
  return [...players]
    .sort(
      (a, b) =>
        b.matchday_points - a.matchday_points ||
        b.rolling_yield - a.rolling_yield
    )
    .slice(0, n);
}

/**
 * Get DEF count from formation name string like "4-4-2".
 */
function formationDefCount(formationName: string): number {
  return parseInt(formationName.split('-')[0], 10);
}

/**
 * Check leverage status for each active sector.
 * Returns array of LeverageStatus objects — one per active sector.
 */
function checkLeverage(
  xi: PlayerWithMatchdayPoints[],
  starDesignations: StarDesignations,
  leverageToggles: LeverageToggles,
  squad: SquadByPosition
): LeverageStatus[] {
  const sectors: LeverageSector[] = ['DEF', 'MID', 'FWD'];
  const statuses: LeverageStatus[] = [];

  for (const sector of sectors) {
    if (!leverageToggles[sector]) continue;

    const starPlayerId = starDesignations[sector];
    if (!starPlayerId) continue; // no star designated, leverage ignored silently

    const starInXI = xi.some((p) => p.id === starPlayerId);

    // Find the star player name from the squad
    const allSectorPlayers = squad[sector];
    const starPlayer = allSectorPlayers.find((p) => p.id === starPlayerId);
    const playerName = starPlayer?.name ?? 'Unknown';

    statuses.push({
      sector,
      playerName,
      playerId: starPlayerId,
      wasted: !starInXI,
    });
  }

  return statuses;
}

/**
 * Calculate total points for an XI, applying star multiplier where applicable.
 * Star multiplier: if leverage toggle is active AND designated star is in XI → points × 1.5 for that ONE player.
 */
function calcTotal(
  xi: PlayerWithMatchdayPoints[],
  starDesignations: StarDesignations,
  leverageToggles: LeverageToggles
): number {
  let total = 0;
  const sectors: LeverageSector[] = ['DEF', 'MID', 'FWD'];

  for (const player of xi) {
    let points = player.matchday_points;

    // Check if this player is a star with active leverage
    if (player.position !== 'GK') {
      const sector = player.position as LeverageSector;
      if (
        leverageToggles[sector] &&
        starDesignations[sector] === player.id
      ) {
        points = points * 1.5;
      }
    }

    total += points;
  }

  return total;
}

/**
 * Compute the optimal Top 11 from a squad.
 * Evaluates all 6 legal formations.
 * Selects highest total points. Tiebreaker: prefer more DEF.
 *
 * @param squad - Players grouped by position
 * @param starDesignations - Player IDs designated as stars per sector
 * @param leverageToggles - On/off toggle per sector
 * @returns Top11Result with formation, XI, bench, totalPoints, leverageStatus
 */
export function computeTop11(
  squad: SquadByPosition,
  starDesignations: StarDesignations,
  leverageToggles: LeverageToggles
): Top11Result {
  const allPlayers = [
    ...squad.GK,
    ...squad.DEF,
    ...squad.MID,
    ...squad.FWD,
  ];

  const results = FORMATIONS.map((f) => {
    const gk = selectTop(squad.GK, 1);
    const def = selectTop(squad.DEF, f.def);
    const mid = selectTop(squad.MID, f.mid);
    const fwd = selectTop(squad.FWD, f.fwd);
    const xi = [...gk, ...def, ...mid, ...fwd];
    const totalPoints = calcTotal(xi, starDesignations, leverageToggles);
    const leverageStatus = checkLeverage(xi, starDesignations, leverageToggles, squad);

    // Bench = all players not in XI
    const xiIds = new Set(xi.map((p) => p.id));
    const bench = allPlayers.filter((p) => !xiIds.has(p.id));

    return {
      formation: f.name,
      xi,
      bench,
      totalPoints,
      leverageStatus,
    };
  });

  // Sort: highest totalPoints first, tiebreak by DEF count descending
  results.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    return formationDefCount(b.formation) - formationDefCount(a.formation);
  });

  return results[0];
}
