import { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSquadDataContext } from '@/components/AppShell';
import { validateClubLimit } from '@/lib/validators';
import { getValueSignal } from '@/lib/metrics';
import type { Tables } from '@/integrations/supabase/types';

type PlayerRow = Tables<'players'> & {
  squad_player_id: string;
  is_star: boolean;
  is_in_top11: boolean;
};

interface TransferDrawerProps {
  outgoingPlayer: PlayerRow;
  onClose: () => void;
}

export function TransferDrawer({ outgoingPlayer, onClose }: TransferDrawerProps) {
  const { squad, players, transfersRemaining, isLocked, currentMatchday, refetch } = useSquadDataContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Tables<'players'>[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<Tables<'players'> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  // Auto-focus search
  useEffect(() => {
    const input = document.getElementById('transfer-search');
    input?.focus();
  }, []);

  // Search players
  useEffect(() => {
    async function search() {
      if (searchQuery.length < 1) {
        setSearchResults([]);
        return;
      }

      const existingIds = players.map(p => p.id);
      const { data } = await supabase
        .from('players')
        .select('*')
        .eq('position', outgoingPlayer.position)
        .or(`name.ilike.%${searchQuery}%,team.ilike.%${searchQuery}%`)
        .not('id', 'in', `(${existingIds.join(',')})`)
        .limit(6);

      setSearchResults(data ?? []);
    }
    search();
  }, [searchQuery, outgoingPlayer.position, players]);

  const handleConfirm = async () => {
    if (!selectedPlayer || !squad) return;
    setError(null);
    setConfirming(true);

    // Validate transfers remaining
    if (transfersRemaining <= 0) {
      setError('Transfer Limit Reached. 0 transfers remaining this matchday.');
      setConfirming(false);
      return;
    }

    // Validate club limit — remove outgoing first
    const clubResult = validateClubLimit(
      { id: selectedPlayer.id, team: selectedPlayer.team },
      players.map(p => ({ id: p.id, team: p.team })),
      { id: outgoingPlayer.id, team: outgoingPlayer.team }
    );

    if (clubResult.blocked) {
      setError(clubResult.reason);
      setConfirming(false);
      return;
    }

    try {
      // Insert transfer log
      await supabase.from('transfer_log').insert({
        squad_id: squad.id,
        matchday: currentMatchday,
        player_out_id: outgoingPlayer.id,
        player_in_id: selectedPlayer.id,
      });

      // Remove outgoing player from squad
      await supabase
        .from('squad_players')
        .delete()
        .eq('id', outgoingPlayer.squad_player_id);

      // Add incoming player
      await supabase.from('squad_players').insert({
        squad_id: squad.id,
        player_id: selectedPlayer.id,
      });

      refetch();
      onClose();
    } catch (err) {
      setError('Transfer failed. Try again.');
    } finally {
      setConfirming(false);
    }
  };

  const yieldChange = selectedPlayer
    ? (selectedPlayer.rolling_yield - outgoingPlayer.rolling_yield)
    : 0;

  return (
    <div className="border border-border bg-background p-sp-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-sp-3">
        <span className="body-primary font-bold text-foreground">
          Transfer Out: {outgoingPlayer.name}
        </span>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors duration-150">
          <X size={16} />
        </button>
      </div>

      {/* Search input */}
      <div className="relative mb-sp-3">
        <Search size={16} className="absolute left-sp-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          id="transfer-search"
          type="text"
          placeholder="Search replacement player..."
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setSelectedPlayer(null); setError(null); }}
          className="h-10 w-full rounded border border-border bg-background pl-10 pr-sp-3 text-[14px] text-foreground placeholder:text-muted-foreground
            focus:border-foreground focus:outline-none
            hover:bg-surface hover:border-muted-foreground transition-colors duration-150"
        />
        {searchQuery && (
          <button
            onClick={() => { setSearchQuery(''); setSearchResults([]); }}
            className="absolute right-sp-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Results */}
      <div className="max-h-72 overflow-y-auto">
        {searchResults.map(player => {
          const isSelected = selectedPlayer?.id === player.id;
          return (
            <div
              key={player.id}
              onClick={() => { setSelectedPlayer(player); setError(null); }}
              className={`
                flex h-12 cursor-pointer items-center gap-sp-2 border-b border-border px-sp-4
                transition-colors duration-150 hover:bg-surface
                ${isSelected ? 'border-l-2 border-l-foreground bg-surface' : ''}
              `}
            >
              <span className="body-primary text-foreground flex-1 truncate">{player.name}</span>
              <span className="body-secondary shrink-0">{player.team}</span>
              <span className="stat-value text-foreground w-16 text-right">€{player.price}M</span>
              <span className="stat-value text-foreground w-14 text-right">{player.rolling_yield.toFixed(2)}</span>
            </div>
          );
        })}
      </div>

      {/* Yield impact preview */}
      {selectedPlayer && (
        <div className="mt-sp-3">
          <span className={`body-secondary ${yieldChange >= 0 ? 'text-signal-green' : 'text-signal-red'}`}>
            Yield Change: {yieldChange >= 0 ? '+' : ''}{yieldChange.toFixed(2)}
          </span>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mt-sp-3">
          <span className="text-[12px] text-signal-red">{error}</span>
        </div>
      )}

      {/* Confirm button */}
      <button
        onClick={handleConfirm}
        disabled={!selectedPlayer || confirming || isLocked}
        className="mt-sp-3 h-9 w-full rounded bg-foreground px-sp-4 text-[14px] font-semibold text-primary-foreground
          transition-colors duration-150 hover:bg-[#374151]
          focus:outline-2 focus:outline-offset-2 focus:outline-foreground
          disabled:bg-border disabled:text-muted-foreground disabled:cursor-not-allowed"
      >
        {confirming ? 'Processing…' : 'Confirm Transfer'}
      </button>
    </div>
  );
}
