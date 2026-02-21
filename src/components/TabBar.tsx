import { useLocation, useNavigate } from 'react-router-dom';

const TABS = [
  { label: 'HOLDINGS', path: '/holdings' },
  { label: 'MARKET', path: '/market' },
  { label: 'SANDBOX', path: '/sandbox' },
] as const;

export function TabBar() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="flex h-11 w-full items-center border-b border-border bg-background px-sp-12 max-sm:px-0">
      {TABS.map((tab) => {
        const isActive = location.pathname === tab.path;
        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            className={`
              relative h-full px-sp-6 section-header uppercase transition-colors duration-150
              focus:outline-2 focus:outline-offset-0 focus:outline-foreground
              max-sm:flex-1 max-sm:px-sp-3
              ${isActive
                ? 'text-foreground font-bold'
                : 'text-muted-foreground hover:text-foreground hover:bg-surface'
              }
            `}
          >
            {tab.label}
            {isActive && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground" />
            )}
          </button>
        );
      })}
    </div>
  );
}
