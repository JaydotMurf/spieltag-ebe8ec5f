import { useState, useMemo } from 'react';
import { useMarketPlayers } from '@/hooks/useMarketPlayers';
import { usePlayerDetail } from '@/hooks/usePlayerDetail';
import { useSquadDataContext } from '@/components/AppShell';
import { PlayerList } from '@/components/market/PlayerList';
import { PlayerDetail } from '@/components/market/PlayerDetail';

export default function MarketPage() {
  const { players, loading, positionFilter, setPositionFilter, searchQuery, setSearchQuery } = useMarketPlayers();
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const detail = usePlayerDetail(selectedPlayerId);
  const { benchmarkSnapshots } = useSquadDataContext();

  const selectedPlayer = useMemo(
    () => players.find(p => p.id === selectedPlayerId) ?? null,
    [players, selectedPlayerId]
  );

  const benchmarkYield = useMemo(() => {
    if (!selectedPlayer) return 0;
    const snap = benchmarkSnapshots.find(b => b.position === selectedPlayer.position);
    return snap ? Number(snap.median_yield) : 0;
  }, [selectedPlayer, benchmarkSnapshots]);

  return (
    <div className="flex h-[calc(100vh-56px-44px)] max-sm:flex-col gap-sp-8 max-sm:gap-0">
      {/* Left panel — 40% */}
      <div className="w-[40%] max-sm:w-full max-sm:h-[50%] shrink-0">
        <PlayerList
          players={players}
          loading={loading}
          positionFilter={positionFilter}
          onPositionChange={setPositionFilter}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedPlayerId={selectedPlayerId}
          onSelectPlayer={setSelectedPlayerId}
        />
      </div>

      {/* Right panel — 60%, sticky */}
      <div className="flex-1 max-sm:h-[50%]">
        {selectedPlayer ? (
          <PlayerDetail
            player={selectedPlayer}
            detail={detail}
            benchmarkYield={benchmarkYield}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="body-secondary">Select a player to view details.</span>
          </div>
        )}
      </div>
    </div>
  );
}
