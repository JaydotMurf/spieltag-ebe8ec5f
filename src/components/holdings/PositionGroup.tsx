import { Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSquadDataContext } from '@/components/AppShell';
import { getValueSignal } from '@/lib/metrics';
import type { Tables } from '@/integrations/supabase/types';
import { useState } from 'react';
import { TransferDrawer } from './TransferDrawer';

type PlayerRow = Tables<'players'> & {
  squad_player_id: string;
  is_star: boolean;
  is_in_top11: boolean;
};

interface PositionGroupProps {
  position: 'GK' | 'DEF' | 'MID' | 'FWD';
  players: PlayerRow[];
  leverageActive: boolean;
  onToggleLeverage?: () => void;
  wastedLeveragePlayer?: string;
  benchmarkYield: number;
  isLocked: boolean;
}

function ValueBadge({ signal }: { signal: ReturnType<typeof getValueSignal> }) {
  if (signal === 'UNDERVALUED') {
    return (
      <span className="inline-flex items-center gap-sp-2">
        <span className="h-2 w-2 rounded-full bg-signal-green" />
        <span className="badge-text text-signal-green">Undervalued</span>
      </span>
    );
  }
  if (signal === 'OVERVALUED') {
    return (
      <span className="inline-flex items-center gap-sp-2">
        <span className="h-2 w-2 rounded-full bg-signal-red" />
        <span className="badge-text text-signal-red">Overvalued</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-sp-2">
      <span className="h-2 w-2 rounded-full bg-muted-foreground" />
      <span className="badge-text text-muted-foreground">Fair</span>
    </span>
  );
}

export function PositionGroup({
  position,
  players,
  leverageActive,
  onToggleLeverage,
  wastedLeveragePlayer,
  benchmarkYield,
  isLocked,
}: PositionGroupProps) {
  const { refetch } = useSquadDataContext();
  const [openDrawerPlayerId, setOpenDrawerPlayerId] = useState<string | null>(null);
  const showLeverage = position !== 'GK';

  const handleStarClick = async (player: PlayerRow) => {
    if (isLocked || position === 'GK') return;

    // If already star, remove designation
    const newStarValue = !player.is_star;

    // Clear all stars in this position group
    for (const p of players) {
      if (p.is_star) {
        await supabase
          .from('squad_players')
          .update({ is_star: false })
          .eq('id', p.squad_player_id);
      }
    }

    // Set new star if toggling on
    if (newStarValue) {
      await supabase
        .from('squad_players')
        .update({ is_star: true })
        .eq('id', player.squad_player_id);
    }

    refetch();
  };

  return (
    <div className="mb-sp-8">
      {/* Position group header */}
      <div className="flex items-center justify-between px-sp-4 py-sp-3">
        <span className="section-header text-foreground">{position}</span>
        {showLeverage && (
          <div className="flex items-center gap-sp-2">
            <span className={`badge-text ${leverageActive ? 'text-foreground font-bold' : 'text-muted-foreground'}`}>
              LEVERAGE
            </span>
            <button
              onClick={onToggleLeverage}
              disabled={isLocked}
              className={`
                relative h-[18px] w-8 rounded-full transition-colors duration-150
                focus:outline-2 focus:outline-offset-2 focus:outline-foreground
                ${isLocked ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
                ${leverageActive ? 'bg-foreground hover:bg-[#374151]' : 'bg-border hover:bg-[#D1D5DB]'}
              `}
              aria-label={`Toggle ${position} leverage`}
            >
              <span
                className={`
                  absolute top-0.5 h-3.5 w-3.5 rounded-full bg-background transition-transform duration-150
                  ${leverageActive ? 'translate-x-[14px]' : 'translate-x-0.5'}
                `}
              />
            </button>
          </div>
        )}
      </div>

      {/* Wasted leverage warning */}
      {wastedLeveragePlayer && (
        <div className="px-sp-4 py-sp-1">
          <span className="badge-text text-signal-red">
            WASTED LEVERAGE — {wastedLeveragePlayer} is not in your Top 11
          </span>
        </div>
      )}

      {/* Player rows */}
      {players.length === 0 ? (
        <div className="px-sp-4 py-sp-4 text-center">
          <span className="body-secondary">No {position} in squad.</span>
        </div>
      ) : (
        players.map((player, idx) => {
          const signal = position !== 'GK'
            ? getValueSignal(player.rolling_yield, benchmarkYield)
            : null;

          return (
            <div key={player.id}>
              <div
                className={`
                  flex h-12 items-center gap-sp-2 border-b border-border px-sp-4
                  transition-colors duration-150 hover:bg-surface
                  ${idx % 2 === 1 ? 'bg-surface' : 'bg-background'}
                `}
              >
                {/* Star icon */}
                {position !== 'GK' ? (
                  <button
                    onClick={() => handleStarClick(player)}
                    disabled={isLocked}
                    className={`
                      shrink-0 transition-colors duration-100
                      focus:outline-2 focus:outline-offset-2 focus:outline-foreground
                      ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}
                    `}
                    aria-label={`Designate ${player.name} as star`}
                  >
                    <Star
                      size={16}
                      className={
                        player.is_star
                          ? 'fill-foreground text-foreground'
                          : 'text-border hover:text-muted-foreground'
                      }
                    />
                  </button>
                ) : (
                  <span className="w-4 shrink-0" />
                )}

                {/* Name + Club */}
                <div className="flex min-w-0 flex-1 items-baseline gap-sp-1">
                  <span className="body-primary text-foreground truncate">{player.name}</span>
                  <span className="body-secondary shrink-0">{player.team}</span>
                </div>

                {/* Stats */}
                <span className="stat-value text-foreground w-16 text-right">€{player.price}M</span>
                <span className="stat-value text-foreground w-12 text-right">{player.last_5_points}</span>
                <span className="stat-value text-foreground w-14 text-right">{player.rolling_yield.toFixed(2)}</span>

                {/* Value signal badge — not for GK */}
                <div className="w-24 text-right max-sm:hidden">
                  {signal && <ValueBadge signal={signal} />}
                </div>

                {/* Transfer Out button */}
                <button
                  onClick={() => setOpenDrawerPlayerId(openDrawerPlayerId === player.id ? null : player.id)}
                  disabled={isLocked}
                  className={`
                    ml-sp-4 shrink-0 rounded border border-border bg-background px-sp-4 h-9
                    text-[14px] text-foreground transition-colors duration-150
                    hover:bg-surface hover:border-muted-foreground
                    focus:outline-2 focus:outline-offset-2 focus:outline-foreground
                    disabled:text-muted-foreground disabled:cursor-not-allowed disabled:hover:bg-background
                    max-sm:hidden
                  `}
                >
                  Transfer Out
                </button>
              </div>

              {/* Transfer drawer */}
              {openDrawerPlayerId === player.id && (
                <TransferDrawer
                  outgoingPlayer={player}
                  onClose={() => setOpenDrawerPlayerId(null)}
                />
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
