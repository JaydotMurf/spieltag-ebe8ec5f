import type { SquadData } from '@/hooks/useSquadData';

interface KPIBandProps {
  squadData: SquadData;
}

export function KPIBand({ squadData }: KPIBandProps) {
  const { top11Result, players, transfersRemaining, isBreakPeriod, benchmarkSnapshots, loading } = squadData;

  // Calculate squad rolling yield (average of all 15 players)
  const squadYield = players.length > 0
    ? players.reduce((sum, p) => sum + p.rolling_yield, 0) / players.length
    : 0;

  // Get benchmark yield (average across positions)
  const benchmarkYield = benchmarkSnapshots.length > 0
    ? benchmarkSnapshots.reduce((sum, b) => sum + b.median_yield, 0) / benchmarkSnapshots.length
    : 0;

  // Yield vs Benchmark (% delta)
  const yieldDelta = benchmarkYield > 0
    ? ((squadYield - benchmarkYield) / benchmarkYield) * 100
    : 0;

  const totalPoints = top11Result?.totalPoints ?? 0;

  if (loading) {
    return (
      <div className="sticky top-0 z-50 flex h-14 w-full items-center border-b border-border bg-background px-sp-12 max-sm:px-sp-4">
        <div className="grid w-full grid-cols-4 max-sm:grid-cols-2 max-sm:grid-rows-2 max-sm:h-24 gap-sp-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center justify-center">
              <div className="h-3 w-16 skeleton-shimmer rounded-sm" />
              <div className="mt-1 h-6 w-12 skeleton-shimmer rounded-sm" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="sticky top-0 z-50 flex h-14 w-full items-center border-b border-border bg-background px-sp-12 max-sm:px-sp-4 max-sm:h-24">
      <div className="grid w-full grid-cols-4 max-sm:grid-cols-2 max-sm:grid-rows-2 gap-sp-4">
        {/* Top 11 Points */}
        <div className="flex flex-col items-center justify-center">
          <span className="kpi-label">TOP 11 PTS</span>
          <span className="kpi-value text-foreground">{totalPoints}</span>
        </div>

        {/* Rolling Yield */}
        <div className="flex flex-col items-center justify-center">
          <span className="kpi-label">ROLLING YIELD</span>
          <span className="kpi-value text-foreground">{squadYield.toFixed(2)}</span>
        </div>

        {/* Yield vs Benchmark */}
        <div className="flex flex-col items-center justify-center">
          <span className="kpi-label">VS BENCHMARK</span>
          <span className={`kpi-value ${yieldDelta > 0 ? 'text-signal-green' : yieldDelta < 0 ? 'text-signal-red' : 'text-muted-foreground'}`}>
            {yieldDelta > 0 ? '+' : ''}{yieldDelta.toFixed(1)}%
          </span>
        </div>

        {/* Transfers Remaining */}
        <div className="flex flex-col items-center justify-center">
          <span className="kpi-label">TRANSFERS</span>
          <span className={`kpi-value ${transfersRemaining === 0 ? 'text-signal-red' : isBreakPeriod ? 'text-muted-foreground' : 'text-foreground'}`}>
            {isBreakPeriod ? '∞' : `${transfersRemaining}/5`}
          </span>
        </div>
      </div>
    </div>
  );
}
