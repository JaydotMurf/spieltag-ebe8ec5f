import { Outlet } from 'react-router-dom';
import { KPIBand } from './KPIBand';
import { TabBar } from './TabBar';
import { useSquadData } from '@/hooks/useSquadData';
import { createContext, useContext } from 'react';
import type { SquadData } from '@/hooks/useSquadData';

const SquadDataContext = createContext<SquadData | null>(null);

export function useSquadDataContext(): SquadData {
  const ctx = useContext(SquadDataContext);
  if (!ctx) throw new Error('useSquadDataContext must be used within AppShell');
  return ctx;
}

export function AppShell() {
  const squadData = useSquadData();

  return (
    <SquadDataContext.Provider value={squadData}>
      <div className="flex min-h-screen flex-col bg-background">
        <KPIBand squadData={squadData} />
        {squadData.isLocked && (
          <div className="flex h-8 items-center justify-center border-b border-border bg-surface">
            <span className="body-secondary">Matchday in Progress — Transfers Locked</span>
          </div>
        )}
        <TabBar />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </SquadDataContext.Provider>
  );
}
