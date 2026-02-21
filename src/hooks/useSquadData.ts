import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { computeTop11 } from '@/lib/top11Engine';
import { calculateRollingYield, getValueSignal } from '@/lib/metrics';
import type { Tables } from '@/integrations/supabase/types';
import type {
  SquadByPosition,
  PlayerWithMatchdayPoints,
  StarDesignations,
  LeverageToggles,
  Top11Result,
  ValueSignal,
} from '@/lib/types';

export interface SquadData {
  squad: Tables<'squads'> | null;
  players: (Tables<'players'> & { squad_player_id: string; is_star: boolean; is_in_top11: boolean })[];
  top11Result: Top11Result | null;
  transfersRemaining: number;
  isBreakPeriod: boolean;
  isLocked: boolean;
  benchmarkSnapshots: Tables<'benchmark_snapshot'>[];
  loading: boolean;
  currentMatchday: number;
  refetch: () => void;
}

export function useSquadData(): SquadData {
  const { user } = useAuth();
  const [squad, setSquad] = useState<Tables<'squads'> | null>(null);
  const [players, setPlayers] = useState<SquadData['players']>([]);
  const [top11Result, setTop11Result] = useState<Top11Result | null>(null);
  const [transfersRemaining, setTransfersRemaining] = useState(5);
  const [isBreakPeriod, setIsBreakPeriod] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [benchmarkSnapshots, setBenchmarkSnapshots] = useState<Tables<'benchmark_snapshot'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMatchday, setCurrentMatchday] = useState(1);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Fetch squad
      let { data: squadData } = await supabase
        .from('squads')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      // Create squad if doesn't exist
      if (!squadData) {
        const { data: newSquad } = await supabase
          .from('squads')
          .insert({ user_id: user.id })
          .select()
          .single();
        squadData = newSquad;
      }

      if (!squadData) {
        setLoading(false);
        return;
      }

      setSquad(squadData);

      // Fetch matchday config
      const { data: configData } = await supabase
        .from('matchday_config')
        .select('*')
        .order('matchday', { ascending: false })
        .limit(1)
        .maybeSingle();

      const matchday = configData?.matchday ?? squadData.matchday;
      setCurrentMatchday(matchday);
      setIsBreakPeriod(configData?.is_break_period ?? false);
      setIsLocked(configData?.is_locked ?? false);

      // Fetch squad players with player data
      const { data: squadPlayersData } = await supabase
        .from('squad_players')
        .select('id, player_id, is_star, is_in_top11, players(*)')
        .eq('squad_id', squadData.id);

      // Fetch matchday stats for current matchday
      const playerIds = (squadPlayersData ?? []).map(sp => sp.player_id);
      let matchdayStatsMap: Record<string, number> = {};

      if (playerIds.length > 0) {
        const { data: statsData } = await supabase
          .from('matchday_stats')
          .select('player_id, points')
          .eq('matchday', matchday)
          .in('player_id', playerIds);

        matchdayStatsMap = (statsData ?? []).reduce((acc, s) => {
          acc[s.player_id] = s.points;
          return acc;
        }, {} as Record<string, number>);
      }

      // Fetch transfer count from TransferLog — NEVER from local state
      const { count: transferCount } = await supabase
        .from('transfer_log')
        .select('*', { count: 'exact', head: true })
        .eq('squad_id', squadData.id)
        .eq('matchday', matchday);

      if (configData?.is_break_period) {
        setTransfersRemaining(Infinity);
      } else {
        setTransfersRemaining(Math.max(0, 5 - (transferCount ?? 0)));
      }

      // Fetch benchmarks — try current matchday, fall back to latest available
      let { data: benchmarks } = await supabase
        .from('benchmark_snapshot')
        .select('*')
        .eq('matchday', matchday);

      if (!benchmarks || benchmarks.length === 0) {
        const { data: latestBenchmarks } = await supabase
          .from('benchmark_snapshot')
          .select('*')
          .order('matchday', { ascending: false })
          .limit(4);
        benchmarks = latestBenchmarks;
      }

      setBenchmarkSnapshots(benchmarks ?? []);

      // Build player array
      const enrichedPlayers = (squadPlayersData ?? []).map(sp => {
        const player = sp.players as unknown as Tables<'players'>;
        return {
          ...player,
          squad_player_id: sp.id,
          is_star: sp.is_star,
          is_in_top11: sp.is_in_top11,
        };
      });

      setPlayers(enrichedPlayers);

      // Compute Top 11
      if (enrichedPlayers.length > 0) {
        const squadByPosition: SquadByPosition = {
          GK: [], DEF: [], MID: [], FWD: [],
        };

        for (const p of enrichedPlayers) {
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
            matchday_points: matchdayStatsMap[p.id] ?? 0,
          };
          squadByPosition[p.position].push(pwp);
        }

        const starDesignations: StarDesignations = {};
        for (const p of enrichedPlayers) {
          if (p.is_star && p.position !== 'GK') {
            starDesignations[p.position as 'DEF' | 'MID' | 'FWD'] = p.id;
          }
        }

        const leverageToggles: LeverageToggles = {
          DEF: squadData.leverage_def_active,
          MID: squadData.leverage_mid_active,
          FWD: squadData.leverage_fwd_active,
        };

        const result = computeTop11(squadByPosition, starDesignations, leverageToggles);
        setTop11Result(result);
      }
    } catch (error) {
      console.error('Error fetching squad data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    squad,
    players,
    top11Result,
    transfersRemaining,
    isBreakPeriod,
    isLocked,
    benchmarkSnapshots,
    loading,
    currentMatchday,
    refetch: fetchData,
  };
}
