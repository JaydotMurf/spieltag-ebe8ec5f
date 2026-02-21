import type { Top11Result } from '@/lib/types';

interface OutputXIPanelProps {
  result: Top11Result | null;
  loading: boolean;
}

export function OutputXIPanel({ result, loading }: OutputXIPanelProps) {
  if (loading) {
    return (
      <div className="border-l border-border bg-background p-sp-4">
        <div className="h-4 w-20 skeleton-shimmer rounded-sm mb-sp-3" />
        <div className="h-8 w-16 skeleton-shimmer rounded-sm mb-sp-6" />
        {Array.from({ length: 11 }).map((_, i) => (
          <div key={i} className="h-10 skeleton-shimmer rounded-sm mb-sp-1" />
        ))}
      </div>
    );
  }

  if (!result) {
    return (
      <div className="border-l border-border bg-background p-sp-4 flex items-center justify-center min-h-[300px]">
        <span className="body-secondary text-muted-foreground">Add players to build your Top 11.</span>
      </div>
    );
  }

  // Group XI by position
  const xiByPosition = {
    GK: result.xi.filter(p => p.position === 'GK'),
    DEF: result.xi.filter(p => p.position === 'DEF'),
    MID: result.xi.filter(p => p.position === 'MID'),
    FWD: result.xi.filter(p => p.position === 'FWD'),
  };

  // Identify stars with active leverage (those with wasted: false in leverageStatus)
  const activeStarIds = new Set(
    result.leverageStatus
      .filter(s => !s.wasted)
      .map(s => s.playerId)
  );

  return (
    <div className="border-l border-border bg-background p-sp-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-sp-2">
        <span className="section-header text-foreground">TOP 11</span>
        <span className="body-secondary text-muted-foreground">{result.formation}</span>
      </div>

      {/* Total points */}
      <div className="mb-sp-6">
        <span className="kpi-value text-foreground">{result.totalPoints}</span>
        <span className="kpi-label block">PTS</span>
      </div>

      {/* XI players */}
      {(['GK', 'DEF', 'MID', 'FWD'] as const).map(pos => (
        <div key={pos}>
          <span className="section-header text-muted-foreground text-[12px]">{pos}</span>
          {xiByPosition[pos].map(player => (
            <div key={player.id} className="flex h-10 items-center gap-sp-2 border-b border-border">
              <div className="flex min-w-0 flex-1 items-center gap-sp-2">
                <span className="body-primary text-foreground truncate">{player.name}</span>
                <span className="body-secondary shrink-0">{player.team}</span>
                {activeStarIds.has(player.id) && (
                  <span className="shrink-0 rounded bg-foreground px-1.5 py-0.5 text-[11px] font-bold text-primary-foreground">
                    x1.5
                  </span>
                )}
              </div>
              <span className="stat-value text-foreground">{player.matchday_points}</span>
            </div>
          ))}
        </div>
      ))}

      {/* Bench */}
      <div className="mt-sp-4">
        <span className="section-header text-muted-foreground text-[12px]">BENCH</span>
        {result.bench.map(player => (
          <div key={player.id} className="flex h-10 items-center gap-sp-2 border-b border-border opacity-50">
            <div className="flex min-w-0 flex-1 items-baseline gap-sp-1">
              <span className="body-primary text-foreground truncate">{player.name}</span>
              <span className="body-secondary">{player.team}</span>
            </div>
            <span className="stat-value text-foreground">{player.matchday_points}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
