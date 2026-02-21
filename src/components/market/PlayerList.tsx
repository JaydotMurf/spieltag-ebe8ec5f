import { Search, X } from 'lucide-react';
import { getValueSignal } from '@/lib/metrics';
import type { MarketPlayer } from '@/hooks/useMarketPlayers';
import type { Position } from '@/lib/types';
import { useSquadDataContext } from '@/components/AppShell';

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

function ValueBadge({ signal }: { signal: ReturnType<typeof getValueSignal> }) {
  if (signal === 'UNDERVALUED') {
    return (
      <span className="inline-flex items-center gap-sp-2">
        <span className="h-2 w-2 rounded-full bg-signal-green shrink-0" />
        <span className="badge-text text-signal-green">Undervalued</span>
      </span>
    );
  }
  if (signal === 'OVERVALUED') {
    return (
      <span className="inline-flex items-center gap-sp-2">
        <span className="h-2 w-2 rounded-full bg-signal-red shrink-0" />
        <span className="badge-text text-signal-red">Overvalued</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-sp-2">
      <span className="h-2 w-2 rounded-full bg-muted-foreground shrink-0" />
      <span className="badge-text text-muted-foreground">Fair</span>
    </span>
  );
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
  const { benchmarkSnapshots } = useSquadDataContext();

  const getBenchmark = (pos: string) => {
    const snap = benchmarkSnapshots.find(b => b.position === pos);
    return snap ? Number(snap.median_yield) : 0;
  };

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
                  : 'bg-background text-muted-foreground border border-border hover:border-muted-foreground'
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

      {/* Player list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-sp-16">
            <span className="body-secondary">Loading players…</span>
          </div>
        ) : players.length === 0 ? (
          <div className="flex items-center justify-center py-sp-16">
            <span className="body-secondary">No players match your search.</span>
          </div>
        ) : (
          players.map((player, idx) => {
            const isSelected = selectedPlayerId === player.id;
            const benchmark = getBenchmark(player.position);
            const signal = player.position !== 'GK'
              ? getValueSignal(Number(player.rolling_yield), benchmark)
              : null;

            return (
              <div
                key={player.id}
                onClick={() => onSelectPlayer(player.id)}
                className={`
                  flex h-12 cursor-pointer items-center gap-sp-5 border-b border-border px-sp-4
                  transition-colors duration-150 hover:bg-surface
                  ${isSelected ? 'border-l-2 border-l-foreground bg-surface' : ''}
                  ${!isSelected && idx % 2 === 1 ? 'bg-surface' : ''}
                `}
              >
                {/* Name + Club */}
                <div className="flex flex-1 min-w-0 items-baseline gap-sp-1">
                  <span className="body-primary text-foreground truncate">{player.name}</span>
                  <span className="body-secondary shrink-0">{player.team}</span>
                </div>

                {/* Price */}
                <span className="stat-value text-foreground w-16 text-right shrink-0">€{Number(player.price).toFixed(1)}M</span>

                {/* Rolling yield */}
                <span className="stat-value text-foreground w-12 text-right shrink-0">{Number(player.rolling_yield).toFixed(2)}</span>

                {/* Value signal badge */}
                <div className="w-24 text-right shrink-0 max-sm:hidden">
                  {signal && <ValueBadge signal={signal} />}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
