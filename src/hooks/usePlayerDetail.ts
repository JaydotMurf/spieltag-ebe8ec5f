import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

export interface PlayerDetailData {
  priceHistory: { matchday: number; price: number }[];
  matchdayStats: { matchday: number; points: number }[];
  loading: boolean;
}

export function usePlayerDetail(playerId: string | null): PlayerDetailData {
  const [priceHistory, setPriceHistory] = useState<{ matchday: number; price: number }[]>([]);
  const [matchdayStats, setMatchdayStats] = useState<{ matchday: number; points: number }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!playerId) {
      setPriceHistory([]);
      setMatchdayStats([]);
      return;
    }

    async function fetch() {
      setLoading(true);

      const [priceRes, statsRes] = await Promise.all([
        supabase
          .from('price_history')
          .select('matchday, price')
          .eq('player_id', playerId!)
          .order('matchday', { ascending: true })
          .limit(10),
        supabase
          .from('matchday_stats')
          .select('matchday, points')
          .eq('player_id', playerId!)
          .order('matchday', { ascending: false })
          .limit(5),
      ]);

      setPriceHistory(priceRes.data ?? []);
      setMatchdayStats((statsRes.data ?? []).sort((a, b) => a.matchday - b.matchday));
      setLoading(false);
    }

    fetch();
  }, [playerId]);

  return { priceHistory, matchdayStats, loading };
}
