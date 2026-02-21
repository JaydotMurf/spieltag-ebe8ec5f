import { Search, X } from 'lucide-react';
import type { MarketPlayer } from '@/hooks/useMarketPlayers';
import type { Position } from '@/lib/types';

const POSITIONS: (Position | 'ALL')[] = ['ALL', 'GK', 'DEF', 'MID', 'FWD'];

interface PlayerListProps {
  players: MarketPlayer[];
  loading: boolean;
  positionFilter: Position | 'ALL';
  onPositionChange: (pos: Position | 'ALL') => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedPlayerId: string | null;
  onSelectPlayer: (id: string) => void;
}

export function PlayerList({
  players,
  loading,
  positionFilter,
  onPositionChange,
  searchQuery,
  onSearchChange,
  selectedPlayerId,
  onSelectPlayer,
}: PlayerListProps) {
  return (
    <div className="flex h-full flex-col border-r border-border">
      {/* Position filter pills */}
      <div className="flex items-center gap-sp-2 border-b border-border px-sp-4 py-sp-3">
        {POSITIONS.map(pos => {
          const isActive = positionFilter === pos;
          return (
            <button
              key={pos}
              onClick={() => onPositionChange(pos)}
              className={`
                h-7 rounded px-sp-3 badge-text transition-colors duration-150
                focus:outline-2 focus:outline-offset-0 focus:outline-foreground
                ${isActive
                  ? 'bg-foreground text-primary-foreground'
                  : 'bg-surface text-muted-foreground hover:text-foreground hover:bg-border'
                }
              `}
            >
              {pos}
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative border-b border-border px-sp-4 py-sp-3">
        <Search size={16} className="absolute left-7 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          autoFocus
          type="text"
          placeholder="Search player or club…"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-10 w-full rounded border border-border bg-background pl-10 pr-sp-8 text-[14px] text-foreground placeholder:text-muted-foreground
            focus:border-foreground focus:outline-none
            hover:bg-surface hover:border-muted-foreground transition-colors duration-150"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-7 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Column headers */}
      <div className="flex items-center gap-sp-2 border-b border-border px-sp-4 py-sp-2">
        <span className="body-secondary flex-1">Player</span>
        <span className="body-secondary w-20 text-right">Price</span>
        <span className="body-secondary w-16 text-right">Yield</span>
      </div>

      {/* Player list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-sp-16">
            <span className="body-secondary">Loading players…</span>
          </div>
        ) : players.length === 0 ? (
          <div className="flex items-center justify-center py-sp-16">
            <span className="body-secondary">No players found.</span>
          </div>
        ) : (
          players.map(player => {
            const isSelected = selectedPlayerId === player.id;
            return (
              <div
                key={player.id}
                onClick={() => onSelectPlayer(player.id)}
                className={`
                  flex h-12 cursor-pointer items-center gap-sp-2 border-b border-border px-sp-4
                  transition-colors duration-150 hover:bg-surface
                  ${isSelected ? 'border-l-2 border-l-foreground bg-surface' : ''}
                `}
              >
                <div className="flex flex-1 flex-col min-w-0">
                  <span className="body-primary text-foreground truncate">{player.name}</span>
                  <span className="text-[11px] text-muted-foreground">{player.team} · {player.position}</span>
                </div>
                <span className="stat-value text-foreground w-20 text-right shrink-0">€{Number(player.price).toFixed(1)}M</span>
                <span className="stat-value text-foreground w-16 text-right shrink-0">{Number(player.rolling_yield).toFixed(2)}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
