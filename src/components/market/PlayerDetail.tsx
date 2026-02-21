import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import type { MarketPlayer } from '@/hooks/useMarketPlayers';
import type { PlayerDetailData } from '@/hooks/usePlayerDetail';
import { calculateRollingYield, getValueSignal } from '@/lib/metrics';

interface PlayerDetailProps {
  player: MarketPlayer;
  detail: PlayerDetailData;
  benchmarkYield: number;
}

export function PlayerDetail({ player, detail, benchmarkYield }: PlayerDetailProps) {
  const yield_ = calculateRollingYield({ last_5_points: player.last_5_points, price: Number(player.price) });
  const signal = getValueSignal(yield_, benchmarkYield);

  // Price chart color: green if net positive, red if negative
  const priceColor = useMemo(() => {
    if (detail.priceHistory.length < 2) return '#15803D';
    const first = detail.priceHistory[0].price;
    const last = detail.priceHistory[detail.priceHistory.length - 1].price;
    return last >= first ? '#15803D' : '#D3010C';
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
    return `Last 5: ${totalLast5} pts | Rolling Yield: ${yield_.toFixed(2)}`;
  }, [detail.matchdayStats, yield_]);

  const signalColor = signal === 'UNDERVALUED'
    ? 'text-signal-green bg-signal-green-surface'
    : signal === 'OVERVALUED'
      ? 'text-signal-red bg-signal-red-surface'
      : 'text-muted-foreground bg-surface';

  // Axis tick formatter: show only first & last
  const makeTickFormatter = (data: { matchday: number }[]) => {
    if (data.length === 0) return () => '';
    const first = data[0].matchday;
    const last = data[data.length - 1].matchday;
    return (val: number) => (val === first || val === last) ? `MD${val}` : '';
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto p-sp-6">
      {/* Header */}
      <div className="mb-sp-6">
        <h2 className="page-header text-foreground">{player.name}</h2>
        <div className="flex items-center gap-sp-3 mt-sp-1">
          <span className="body-secondary">{player.team}</span>
          <span className="body-secondary">·</span>
          <span className="body-secondary">{player.position}</span>
          <span className={`badge-text px-sp-2 py-0.5 rounded ${signalColor}`}>
            {signal}
          </span>
        </div>
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-4 gap-sp-4 mb-sp-6 border border-border rounded p-sp-4">
        <StatCell label="PRICE" value={`€${Number(player.price).toFixed(1)}M`} />
        <StatCell label="SEASON PTS" value={String(player.season_points)} />
        <StatCell label="LAST 5 PTS" value={String(player.last_5_points)} />
        <StatCell label="YIELD" value={yield_.toFixed(2)} />
      </div>

      {/* Price Trend Chart */}
      <div className="mb-sp-6">
        <span className="section-header text-foreground mb-sp-2 block">Price Trend</span>
        {detail.priceHistory.length > 0 ? (
          <>
            <div className="h-[120px] w-full">
              <ResponsiveContainer width="100%" height={120}>
                <LineChart data={detail.priceHistory}>
                  <XAxis
                    dataKey="matchday"
                    tick={{ fontSize: 11, fill: 'hsl(218, 11%, 65%)' }}
                    tickFormatter={makeTickFormatter(detail.priceHistory)}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis hide />
                  <Line
                    type="monotone"
                    dataKey="price"
                    stroke={priceColor}
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            {priceSummary && (
              <span className="body-secondary mt-sp-2 block">{priceSummary}</span>
            )}
          </>
        ) : (
          <span className="body-secondary">No price data available.</span>
        )}
      </div>

      {/* Performance Trend Chart */}
      <div className="mb-sp-6">
        <span className="section-header text-foreground mb-sp-2 block">Performance Trend</span>
        {detail.matchdayStats.length > 0 ? (
          <>
            <div className="h-[120px] w-full">
              <ResponsiveContainer width="100%" height={120}>
                <LineChart data={detail.matchdayStats}>
                  <XAxis
                    dataKey="matchday"
                    tick={{ fontSize: 11, fill: 'hsl(218, 11%, 65%)' }}
                    tickFormatter={makeTickFormatter(detail.matchdayStats)}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis hide />
                  <Line
                    type="monotone"
                    dataKey="points"
                    stroke="#111111"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            {perfSummary && (
              <span className="body-secondary mt-sp-2 block">{perfSummary}</span>
            )}
          </>
        ) : (
          <span className="body-secondary">No performance data available.</span>
        )}
      </div>
    </div>
  );
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="kpi-label">{label}</span>
      <span className="stat-value text-foreground">{value}</span>
    </div>
  );
}
