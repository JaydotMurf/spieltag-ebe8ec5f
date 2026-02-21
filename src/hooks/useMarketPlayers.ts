import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import type { Position } from '@/lib/types';

export type MarketPlayer = Tables<'players'>;

export function useMarketPlayers() {
  const [allPlayers, setAllPlayers] = useState<MarketPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [positionFilter, setPositionFilter] = useState<Position | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function fetch() {
      setLoading(true);
      const { data } = await supabase
        .from('players')
        .select('*')
        .order('rolling_yield', { ascending: false });
      setAllPlayers(data ?? []);
      setLoading(false);
    }
    fetch();
  }, []);

  const filtered = useMemo(() => {
    let list = allPlayers;
    if (positionFilter !== 'ALL') {
      list = list.filter(p => p.position === positionFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) || p.team.toLowerCase().includes(q)
      );
    }
    return list;
  }, [allPlayers, positionFilter, searchQuery]);

  return { players: filtered, loading, positionFilter, setPositionFilter, searchQuery, setSearchQuery };
}
