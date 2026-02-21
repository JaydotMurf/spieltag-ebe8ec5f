import { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSquadDataContext } from '@/components/AppShell';
import { computeTop11 } from '@/lib/top11Engine';
import { calculateRollingYield } from '@/lib/metrics';
import { validateClubLimit } from '@/lib/validators';
import type { Tables } from '@/integrations/supabase/types';
import type {
  SquadByPosition,
  PlayerWithMatchdayPoints,
  StarDesignations,
  LeverageToggles,
  Top11Result,
} from '@/lib/types';

type SimPlayer = Tables<'players'> & {
  squad_player_id: string;
  is_star: boolean;
  is_in_top11: boolean;
};

export default function SandboxPage() {
  const { squad, players: livePlayers, benchmarkSnapshots, currentMatchday } = useSquadDataContext();

  // ALL sandbox state is React-only — NEVER writes to Supabase (Architecture Rule 2)
  const [simulatedSquad, setSimulatedSquad] = useState<SimPlayer[]>([]);
  const [simulatedTransferCount, setSimulatedTransferCount] = useState(0);
  const [openPickerPlayerId, setOpenPickerPlayerId] = useState<string | null>(null);

  // Initialize simulated squad from live squad
  useEffect(() => {
    setSimulatedSquad([...livePlayers]);
    setSimulatedTransferCount(0);
  }, [livePlayers]);

  // Baseline yield (from live squad)
  const baselineYield = useMemo(() => {
    if (livePlayers.length === 0) return 0;
    return livePlayers.reduce((sum, p) => sum + Number(p.rolling_yield), 0) / livePlayers.length;
  }, [livePlayers]);

  // Simulated yield
  const simulatedYield = useMemo(() => {
    if (simulatedSquad.length === 0) return 0;
    return simulatedSquad.reduce((sum, p) => sum + Number(p.rolling_yield), 0) / simulatedSquad.length;
  }, [simulatedSquad]);

  const yieldDelta = simulatedYield - baselineYield;

  // Compute projected Top 11 from simulated squad
  const projectedTop11 = useMemo((): Top11Result | null => {
    if (simulatedSquad.length === 0 || !squad) return null;

    const squadByPosition: SquadByPosition = { GK: [], DEF: [], MID: [], FWD: [] };
    for (const p of simulatedSquad) {
      const pwp: PlayerWithMatchdayPoints = {
        id: p.id,
        name: p.name,
        position: p.position,
        team: p.team,
        price: p.price,
        season_points: p.season_points,
        last_5_points: p.last_5_points,
        rolling_yield: p.rolling_yield,
        api_player_id: p.api_player_id ?? '',
        matchday_points: p.last_5_points, // Use last_5 as proxy for projection
      };
      squadByPosition[p.position].push(pwp);
    }

    const starDesignations: StarDesignations = {};
    for (const p of simulatedSquad) {
      if (p.is_star && p.position !== 'GK') {
        starDesignations[p.position as 'DEF' | 'MID' | 'FWD'] = p.id;
      }
    }

    const leverageToggles: LeverageToggles = {
      DEF: squad.leverage_def_active,
      MID: squad.leverage_mid_active,
      FWD: squad.leverage_fwd_active,
    };

    return computeTop11(squadByPosition, starDesignations, leverageToggles);
  }, [simulatedSquad, squad]);

  // Budget margin
  const budgetMargin = useMemo(() => {
    if (!squad) return 0;
    const liveTotal = livePlayers.reduce((sum, p) => sum + Number(p.price), 0);
    const simTotal = simulatedSquad.reduce((sum, p) => sum + Number(p.price), 0);
    return squad.budget_remaining + liveTotal - simTotal;
  }, [squad, livePlayers, simulatedSquad]);

  const handleReset = () => {
    setSimulatedSquad([...livePlayers]);
    setSimulatedTransferCount(0);
    setOpenPickerPlayerId(null);
  };

  const handleSimConfirm = (outgoing: SimPlayer, incoming: Tables<'players'>) => {
    // Replace outgoing with incoming in simulated squad
    setSimulatedSquad(prev =>
      prev.map(p => p.id === outgoing.id
        ? { ...incoming, squad_player_id: '', is_star: false, is_in_top11: false }
        : p
      )
    );
    setSimulatedTransferCount(prev => prev + 1);
    setOpenPickerPlayerId(null);
  };

  const groupedPlayers = {
    GK: simulatedSquad.filter(p => p.position === 'GK'),
    DEF: simulatedSquad.filter(p => p.position === 'DEF'),
    MID: simulatedSquad.filter(p => p.position === 'MID'),
    FWD: simulatedSquad.filter(p => p.position === 'FWD'),
  };

  const simLimitReached = simulatedTransferCount >= 5;

  if (simulatedSquad.length === 0) {
    return (
      <div className="flex items-center justify-center py-sp-16 px-sp-12 max-sm:px-sp-4">
        <span className="body-secondary text-muted-foreground">
          Build your squad first to use the Sandbox.
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-56px-44px)]">
      {/* Simulation mode label */}
      <div className="flex h-7 items-center justify-center border-b border-border bg-surface shrink-0">
        <span className="badge-text text-muted-foreground">SIMULATION MODE</span>
      </div>

      <div className="flex flex-1 min-h-0 max-sm:flex-col max-md:flex-col">
        {/* Left panel — Simulation Builder (50%) */}
        <div className="w-1/2 max-sm:w-full max-md:w-full overflow-y-auto border-r border-border">
          {/* Header */}
          <div className="flex items-center justify-between px-sp-4 py-sp-3 border-b border-border">
            <span className="section-header text-foreground">Simulations: {simulatedTransferCount}/5</span>
            <button
              onClick={handleReset}
              className="text-muted-foreground text-[14px] hover:text-foreground hover:bg-surface px-sp-3 h-9 rounded transition-colors duration-150
                focus:outline-2 focus:outline-offset-2 focus:outline-foreground"
            >
              Reset
            </button>
          </div>

          {simLimitReached && (
            <div className="px-sp-4 py-sp-3 bg-signal-red-surface">
              <span className="text-[12px] text-signal-red">Simulation limit reached (5/5). Reset to continue.</span>
            </div>
          )}

          {/* Position groups */}
          {(['GK', 'DEF', 'MID', 'FWD'] as const).map(pos => (
            <div key={pos} className="mb-sp-4">
              <div className="px-sp-4 py-sp-2">
                <span className="section-header text-foreground">{pos}</span>
              </div>
              {groupedPlayers[pos].map((player, idx) => (
                <div key={player.id}>
                  <div className={`
                    flex h-12 items-center gap-sp-2 border-b border-border px-sp-4
                    ${idx % 2 === 1 ? 'bg-surface' : 'bg-background'}
                  `}>
                    <div className="flex flex-1 min-w-0 items-baseline gap-sp-1">
                      <span className="body-primary text-foreground truncate">{player.name}</span>
                      <span className="body-secondary shrink-0">{player.team}</span>
                    </div>
                    <span className="stat-value text-foreground w-14 text-right shrink-0">
                      {Number(player.rolling_yield).toFixed(2)}
                    </span>
                    <button
                      onClick={() => setOpenPickerPlayerId(openPickerPlayerId === player.id ? null : player.id)}
                      disabled={simLimitReached}
                      className="ml-sp-2 shrink-0 rounded border border-border bg-background px-sp-3 h-9
                        text-[14px] text-foreground transition-colors duration-150
                        hover:bg-surface hover:border-muted-foreground
                        focus:outline-2 focus:outline-offset-2 focus:outline-foreground
                        disabled:text-muted-foreground disabled:cursor-not-allowed disabled:hover:bg-background
                        max-sm:text-[12px] max-sm:px-sp-2"
                    >
                      Simulate Out
                    </button>
                  </div>

                  {/* Inline picker */}
                  {openPickerPlayerId === player.id && (
                    <SimulationPicker
                      outgoing={player}
                      simulatedSquad={simulatedSquad}
                      livePlayers={livePlayers}
                      onConfirm={(incoming) => handleSimConfirm(player, incoming)}
                      onClose={() => setOpenPickerPlayerId(null)}
                    />
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Right panel — Projected Output (50%) */}
        <div className="w-1/2 max-sm:w-full max-md:w-full overflow-y-auto p-sp-6">
          {/* Yield Impact — dominant metric */}
          <div className="flex flex-col items-center mb-sp-6">
            <span className={`text-[40px] leading-[56px] font-bold tabular-nums ${yieldDelta >= 0 ? 'text-signal-green' : 'text-signal-red'}`}>
              {yieldDelta >= 0 ? '+' : ''}{yieldDelta.toFixed(2)}
            </span>
            <span className="kpi-label mt-sp-1">YIELD IMPACT vs CURRENT SQUAD</span>
          </div>

          <div className="border-t border-border mb-sp-6" />

          {/* Projected Top 11 */}
          {projectedTop11 && (
            <>
              <div className="flex items-center justify-between mb-sp-3">
                <span className="section-header text-foreground">PROJECTED TOP 11</span>
                <span className="body-secondary">{projectedTop11.formation}</span>
              </div>
              <div className="mb-sp-2">
                <span className="kpi-value text-foreground">{projectedTop11.totalPoints}</span>
                <span className="kpi-label block">PROJECTED PTS</span>
              </div>

              {projectedTop11.xi.map(p => (
                <div key={p.id} className="flex h-10 items-center gap-sp-2 border-b border-border">
                  <span className="body-primary text-foreground flex-1 truncate">{p.name}</span>
                  <span className="stat-value text-foreground">{p.matchday_points}</span>
                </div>
              ))}
            </>
          )}

          <div className="border-t border-border my-sp-4" />

          {/* Budget Margin */}
          <div className="flex flex-col">
            <span className="kpi-label">BUDGET MARGIN</span>
            <span className={`stat-value mt-sp-1 ${budgetMargin < 0 ? 'text-signal-red' : 'text-foreground'}`}>
              €{budgetMargin.toFixed(1)}M remaining
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Simulation Picker (inline drawer) ---

interface SimulationPickerProps {
  outgoing: SimPlayer;
  simulatedSquad: SimPlayer[];
  livePlayers: SimPlayer[];
  onConfirm: (incoming: Tables<'players'>) => void;
  onClose: () => void;
}

function SimulationPicker({ outgoing, simulatedSquad, livePlayers, onConfirm, onClose }: SimulationPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Tables<'players'>[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<Tables<'players'> | null>(null);

  useEffect(() => {
    const input = document.getElementById('sim-search');
    input?.focus();
  }, []);

  useEffect(() => {
    async function search() {
      if (searchQuery.length < 1) {
        setSearchResults([]);
        return;
      }

      const simIds = simulatedSquad.map(p => p.id);
      const { data } = await supabase
        .from('players')
        .select('*')
        .eq('position', outgoing.position)
        .or(`name.ilike.%${searchQuery}%,team.ilike.%${searchQuery}%`)
        .not('id', 'in', `(${simIds.join(',')})`)
        .order('rolling_yield', { ascending: false })
        .limit(6);

      setSearchResults(data ?? []);
    }
    search();
  }, [searchQuery, outgoing.position, simulatedSquad]);

  // Club limit check (advisory, not blocking)
  const clubWarning = useMemo(() => {
    if (!selectedPlayer) return null;
    const result = validateClubLimit(
      { id: selectedPlayer.id, team: selectedPlayer.team },
      simulatedSquad.map(p => ({ id: p.id, team: p.team })),
      { id: outgoing.id, team: outgoing.team }
    );
    return result.blocked ? 'Note: This transfer would breach the 3-player club limit in your live squad.' : null;
  }, [selectedPlayer, simulatedSquad, outgoing]);

  const yieldChange = selectedPlayer
    ? (Number(selectedPlayer.rolling_yield) - Number(outgoing.rolling_yield))
    : 0;

  return (
    <div className="border border-border bg-background p-sp-4">
      <div className="flex items-center justify-between mb-sp-3">
        <span className="body-primary font-bold text-foreground">Simulate Out: {outgoing.name}</span>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors duration-150">
          <X size={16} />
        </button>
      </div>

      <div className="relative mb-sp-3">
        <Search size={16} className="absolute left-sp-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          id="sim-search"
          type="text"
          placeholder="Search replacement…"
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setSelectedPlayer(null); }}
          className="h-10 w-full rounded border border-border bg-background pl-10 pr-sp-3 text-[14px] text-foreground placeholder:text-muted-foreground
            focus:border-foreground focus:outline-none
            hover:bg-surface hover:border-muted-foreground transition-colors duration-150"
        />
      </div>

      <div className="max-h-72 overflow-y-auto">
        {searchResults.map(player => {
          const isSelected = selectedPlayer?.id === player.id;
          return (
            <div
              key={player.id}
              onClick={() => setSelectedPlayer(player)}
              className={`
                flex h-12 cursor-pointer items-center gap-sp-2 border-b border-border px-sp-4
                transition-colors duration-150 hover:bg-surface
                ${isSelected ? 'border-l-2 border-l-foreground bg-surface' : ''}
              `}
            >
              <span className="body-primary text-foreground flex-1 truncate">{player.name}</span>
              <span className="body-secondary shrink-0">{player.team}</span>
              <span className="stat-value text-foreground w-16 text-right">€{Number(player.price).toFixed(1)}M</span>
              <span className="stat-value text-foreground w-14 text-right">{Number(player.rolling_yield).toFixed(2)}</span>
            </div>
          );
        })}
      </div>

      {selectedPlayer && (
        <div className="mt-sp-3">
          <span className={`body-secondary ${yieldChange >= 0 ? 'text-signal-green' : 'text-signal-red'}`}>
            Yield Change: {yieldChange >= 0 ? '+' : ''}{yieldChange.toFixed(2)}
          </span>
        </div>
      )}

      {clubWarning && (
        <div className="mt-sp-2">
          <span className="text-[12px] text-signal-red">{clubWarning}</span>
        </div>
      )}

      <button
        onClick={() => selectedPlayer && onConfirm(selectedPlayer)}
        disabled={!selectedPlayer}
        className="mt-sp-3 h-9 w-full rounded bg-foreground px-sp-4 text-[14px] font-semibold text-primary-foreground
          transition-colors duration-150 hover:bg-[#374151]
          focus:outline-2 focus:outline-offset-2 focus:outline-foreground
          disabled:bg-border disabled:text-muted-foreground disabled:cursor-not-allowed"
      >
        Confirm Simulation
      </button>
    </div>
  );
}
