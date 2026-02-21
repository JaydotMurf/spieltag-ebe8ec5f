import { useSquadDataContext } from '@/components/AppShell';
import { PositionGroup } from '@/components/holdings/PositionGroup';
import { OutputXIPanel } from '@/components/holdings/OutputXIPanel';
import { supabase } from '@/integrations/supabase/client';

export default function HoldingsPage() {
  const {
    squad,
    players,
    top11Result,
    benchmarkSnapshots,
    isLocked,
    loading,
    refetch,
  } = useSquadDataContext();

  const groupedPlayers = {
    GK: players.filter(p => p.position === 'GK'),
    DEF: players.filter(p => p.position === 'DEF'),
    MID: players.filter(p => p.position === 'MID'),
    FWD: players.filter(p => p.position === 'FWD'),
  };

  const getBenchmark = (pos: 'GK' | 'DEF' | 'MID' | 'FWD') => {
    return benchmarkSnapshots.find(b => b.position === pos)?.median_yield ?? 0;
  };

  // Get wasted leverage player names from top11Result
  const getWastedLeveragePlayer = (sector: 'DEF' | 'MID' | 'FWD') => {
    if (!top11Result) return undefined;
    const status = top11Result.leverageStatus.find(
      s => s.sector === sector && s.wasted
    );
    return status?.playerName;
  };

  const handleToggleLeverage = async (sector: 'DEF' | 'MID' | 'FWD') => {
    if (!squad || isLocked) return;

    const field = `leverage_${sector.toLowerCase()}_active` as
      'leverage_def_active' | 'leverage_mid_active' | 'leverage_fwd_active';

    const currentValue = squad[field];

    await supabase
      .from('squads')
      .update({ [field]: !currentValue })
      .eq('id', squad.id);

    refetch();
  };

  if (loading) {
    return (
      <div className="flex h-full px-sp-12 py-sp-6 gap-sp-8 max-sm:px-sp-4 max-sm:flex-col">
        <div className="flex-[65] space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-48 skeleton-shimmer rounded-sm" />
          ))}
        </div>
        <div className="flex-[35]">
          <div className="h-96 skeleton-shimmer rounded-sm" />
        </div>
      </div>
    );
  }

  const hasPlayers = players.length > 0;

  return (
    <div className="flex px-sp-12 py-sp-6 gap-sp-8 max-sm:px-sp-4 max-sm:flex-col max-md:flex-col">
      {/* Left: Holdings list — 65% */}
      <div className="flex-[65] min-w-0">
        {!hasPlayers ? (
          <div className="flex items-center justify-center py-sp-16">
            <span className="body-secondary text-muted-foreground">
              Your squad is empty. Go to Market to add players.
            </span>
          </div>
        ) : (
          (['GK', 'DEF', 'MID', 'FWD'] as const).map(pos => (
            <PositionGroup
              key={pos}
              position={pos}
              players={groupedPlayers[pos]}
              leverageActive={
                pos === 'GK'
                  ? false
                  : squad?.[`leverage_${pos.toLowerCase()}_active` as keyof typeof squad] as boolean ?? false
              }
              onToggleLeverage={pos !== 'GK' ? () => handleToggleLeverage(pos as 'DEF' | 'MID' | 'FWD') : undefined}
              wastedLeveragePlayer={pos !== 'GK' ? getWastedLeveragePlayer(pos as 'DEF' | 'MID' | 'FWD') : undefined}
              benchmarkYield={getBenchmark(pos)}
              isLocked={isLocked}
            />
          ))
        )}
      </div>

      {/* Right: Output XI — 35% */}
      <div className="flex-[35] sticky top-28 self-start max-md:static">
        <OutputXIPanel result={top11Result} loading={loading} />
      </div>
    </div>
  );
}
