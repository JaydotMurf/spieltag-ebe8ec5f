import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import type { MarketPlayer } from '@/hooks/useMarketPlayers';
import type { PlayerDetailData } from '@/hooks/usePlayerDetail';
import { calculateRollingYield, getValueSignal } from '@/lib/metrics';
import { useSquadDataContext } from '@/components/AppShell';
import { supabase } from '@/integrations/supabase/client';
import { validateClubLimit } from '@/lib/validators';
import { useState } from 'react';

interface PlayerDetailProps {
  player: MarketPlayer;
  detail: PlayerDetailData;
  benchmarkYield: number;
}

export function PlayerDetail({ player, detail, benchmarkYield }: PlayerDetailProps) {
  const { squad, players, transfersRemaining, isLocked, currentMatchday, refetch } = useSquadDataContext();
  const [transferring, setTransferring] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);

  const yield_ = calculateRollingYield({ last_5_points: player.last_5_points, price: Number(player.price) });
  const signal = getValueSignal(yield_, benchmarkYield);

  const isInSquad = players.some(p => p.id === player.id);
  const squadFull = players.length >= 15;
  const budgetInsufficient = squad ? Number(player.price) > squad.budget_remaining : false;
  const positionFull = (() => {
    if (!squadFull) {
      const posCount = players.filter(p => p.position === player.position).length;
      const max: Record<string, number> = { GK: 2, DEF: 5, MID: 5, FWD: 3 };
      return posCount >= (max[player.position] ?? 0);
    }
    return false;
  })();

  // Transfer In button state
  const canTransferIn = !isInSquad && !isLocked && !budgetInsufficient && !positionFull;
  const buttonLabel = isInSquad
    ? 'Already in Squad'
    : budgetInsufficient
      ? 'Insufficient budget'
      : positionFull
        ? `${player.position} slots full`
        : 'Transfer In';

  const handleTransferIn = async () => {
    if (!squad || !canTransferIn) return;
    setTransferError(null);
    setTransferring(true);

    try {
      // During squad build (<15 players), skip transfer log but enforce composition + club limit + budget
      const clubResult = validateClubLimit(
        { id: player.id, team: player.team },
        players.map(p => ({ id: p.id, team: p.team }))
      );
      if (clubResult.blocked) {
        setTransferError(clubResult.reason);
        setTransferring(false);
        return;
      }

      // Add to squad
      await supabase.from('squad_players').insert({
        squad_id: squad.id,
        player_id: player.id,
      });

      // Deduct budget
      await supabase.from('squads').update({
        budget_remaining: squad.budget_remaining - Number(player.price),
      }).eq('id', squad.id);

      refetch();
    } catch {
      setTransferError('Transfer failed. Try again.');
    } finally {
      setTransferring(false);
    }
  };

  // Price chart color: green if net positive, red if negative, black if flat
  const priceColor = useMemo(() => {
    if (detail.priceHistory.length < 2) return '#111111';
    const first = detail.priceHistory[0].price;
    const last = detail.priceHistory[detail.priceHistory.length - 1].price;
    if (last > first) return '#15803D';
    if (last < first) return '#D3010C';
    return '#111111';
  }, [detail.priceHistory]);

  // Price summary
  const priceSummary = useMemo(() => {
    if (detail.priceHistory.length === 0) return null;
    const first = Number(detail.priceHistory[0].price);
    const last = Number(detail.priceHistory[detail.priceHistory.length - 1].price);
    const diff = last - first;
    const sign = diff >= 0 ? '+' : '';
    return `Price: €${last.toFixed(1)}M (${sign}${diff.toFixed(1)}M over ${detail.priceHistory.length} matchdays)`;
  }, [detail.priceHistory]);

  // Performance summary
  const perfSummary = useMemo(() => {
    if (detail.matchdayStats.length === 0) return null;
    const totalLast5 = detail.matchdayStats.reduce((sum, s) => sum + s.points, 0);
    return `Last ${detail.matchdayStats.length}: ${totalLast5} pts | Rolling Yield: ${yield_.toFixed(2)}`;
  }, [detail.matchdayStats, yield_]);

  // Value signal badge
  const signalBadge = signal === 'UNDERVALUED' ? (
    <span className="inline-flex items-center gap-sp-2">
      <span className="h-2 w-2 rounded-full bg-signal-green" />
      <span className="badge-text text-signal-green">Undervalued</span>
    </span>
  ) : signal === 'OVERVALUED' ? (
    <span className="inline-flex items-center gap-sp-2">
      <span className="h-2 w-2 rounded-full bg-signal-red" />
      <span className="badge-text text-signal-red">Overvalued</span>
    </span>
  ) : (
    <span className="inline-flex items-center gap-sp-2">
      <span className="h-2 w-2 rounded-full bg-muted-foreground" />
      <span className="badge-text text-muted-foreground">Fair</span>
    </span>
  );

  // XAxis ticks: only first and last matchday
  const priceTicks = detail.priceHistory.length > 0
    ? [detail.priceHistory[0].matchday, detail.priceHistory[detail.priceHistory.length - 1].matchday]
    : [];
  const perfTicks = detail.matchdayStats.length > 0
    ? [detail.matchdayStats[0].matchday, detail.matchdayStats[detail.matchdayStats.length - 1].matchday]
    : [];

  return (
    <div className="flex h-full flex-col">
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-sp-6">
        {/* Header */}
        <div className="mb-sp-6">
          <h2 className="page-header text-foreground">{player.name}</h2>
          <div className="flex items-center gap-sp-3 mt-sp-1">
            <span className="body-secondary">{player.team}</span>
            <span className="rounded bg-surface px-sp-3 py-1 text-[14px] text-foreground">{player.position}</span>
          </div>
        </div>

        {/* Stat grid — 2 col × 3 row */}
        <div className="grid grid-cols-2 gap-x-sp-8 gap-y-sp-4 mb-sp-6">
          <StatCell label="PRICE" value={`€${Number(player.price).toFixed(1)}M`} />
          <StatCell label="SEASON PTS" value={String(player.season_points)} />
          <StatCell label="LAST 5 PTS" value={String(player.last_5_points)} />
          <StatCell label="ROLLING YIELD" value={yield_.toFixed(2)} />
          <StatCell label="BENCHMARK YIELD" value={benchmarkYield.toFixed(2)} />
          <div className="flex flex-col">
            <span className="kpi-label">VALUE SIGNAL</span>
            <div className="mt-sp-1">{signalBadge}</div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-border mb-sp-6" />

        {/* Price Trend Chart */}
        <div className="mb-sp-4">
          <span className="kpi-label block mb-sp-2">PRICE TREND</span>
          {detail.priceHistory.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={120}>
                <LineChart data={detail.priceHistory} margin={{ left: 8 }}>
                  <XAxis
                    dataKey="matchday"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    ticks={priceTicks}
                    tickFormatter={(val: number) => `MD${val}`}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    width={32}
                    domain={['auto', 'auto']}
                  />
                  <Line
                    type="monotone"
                    dataKey="price"
                    stroke={priceColor}
                    strokeWidth={1.5}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
              {priceSummary && (
                <span className="body-secondary mt-sp-2 block">{priceSummary}</span>
              )}
            </>
          ) : (
            <span className="body-secondary">No price data available.</span>
          )}
        </div>

        {/* 16px gap between charts */}
        <div className="h-sp-4" />

        {/* Performance Trend Chart */}
        <div className="mb-sp-6">
          <span className="kpi-label block mb-sp-2">PERFORMANCE TREND</span>
          {detail.matchdayStats.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={120}>
                <LineChart data={detail.matchdayStats} margin={{ left: 8 }}>
                  <XAxis
                    dataKey="matchday"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    ticks={perfTicks}
                    tickFormatter={(val: number) => `MD${val}`}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    width={32}
                    domain={['auto', 'auto']}
                  />
                  <Line
                    type="monotone"
                    dataKey="points"
                    stroke="#111111"
                    strokeWidth={1.5}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
              {perfSummary && (
                <span className="body-secondary mt-sp-2 block">{perfSummary}</span>
              )}
            </>
          ) : (
            <span className="body-secondary">No performance data available.</span>
          )}
        </div>
      </div>

      {/* Fixed footer — Transfer In button */}
      <div className="shrink-0 border-t border-border p-sp-6">
        {transferError && (
          <span className="text-[12px] text-signal-red mb-sp-2 block">{transferError}</span>
        )}
        <button
          onClick={handleTransferIn}
          disabled={!canTransferIn || transferring}
          className="h-9 w-full rounded bg-foreground px-sp-4 text-[14px] font-semibold text-primary-foreground
            transition-colors duration-150 hover:bg-[#374151]
            focus:outline-2 focus:outline-offset-2 focus:outline-foreground
            disabled:bg-border disabled:text-muted-foreground disabled:cursor-not-allowed"
        >
          {transferring ? 'Processing…' : buttonLabel}
        </button>
      </div>
    </div>
  );
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="kpi-label">{label}</span>
      <span className="stat-value text-foreground mt-sp-1">{value}</span>
    </div>
  );
}
