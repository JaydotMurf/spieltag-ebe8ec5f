
-- Spieltag Database Schema v1.7
-- 9 tables in dependency order

-- 1. Position enum type
CREATE TYPE public.player_position AS ENUM ('GK', 'DEF', 'MID', 'FWD');

-- 2. Players table (read-only for authenticated users, populated by n8n)
CREATE TABLE public.players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  position public.player_position NOT NULL,
  team TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  season_points INTEGER NOT NULL DEFAULT 0,
  last_5_points INTEGER NOT NULL DEFAULT 0,
  rolling_yield DECIMAL(10,4) NOT NULL DEFAULT 0,
  api_player_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Squads table
CREATE TABLE public.squads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  budget_remaining DECIMAL(10,2) NOT NULL DEFAULT 100.0,
  matchday INTEGER NOT NULL DEFAULT 1,
  leverage_def_active BOOLEAN NOT NULL DEFAULT false,
  leverage_mid_active BOOLEAN NOT NULL DEFAULT false,
  leverage_fwd_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- One squad per user
CREATE UNIQUE INDEX idx_squads_user_id ON public.squads(user_id);

-- 4. Squad players (junction table)
CREATE TABLE public.squad_players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  squad_id UUID NOT NULL REFERENCES public.squads(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  is_star BOOLEAN NOT NULL DEFAULT false,
  is_in_top11 BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(squad_id, player_id)
);

-- 5. Matchday stats
CREATE TABLE public.matchday_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  matchday INTEGER NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  UNIQUE(player_id, matchday)
);

-- 6. Price history
CREATE TABLE public.price_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  matchday INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  UNIQUE(player_id, matchday)
);

-- INDEX on (player_id, matchday) for query performance
CREATE INDEX idx_price_history_player_matchday ON public.price_history(player_id, matchday);

-- 7. Transfer log
CREATE TABLE public.transfer_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  squad_id UUID NOT NULL REFERENCES public.squads(id) ON DELETE CASCADE,
  matchday INTEGER NOT NULL,
  player_out_id UUID NOT NULL REFERENCES public.players(id),
  player_in_id UUID NOT NULL REFERENCES public.players(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 8. Benchmark snapshot
CREATE TABLE public.benchmark_snapshot (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  matchday INTEGER NOT NULL,
  position public.player_position NOT NULL,
  median_yield DECIMAL(10,4) NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(matchday, position)
);

-- 9. Matchday config
CREATE TABLE public.matchday_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  matchday INTEGER NOT NULL UNIQUE,
  deadline TIMESTAMP WITH TIME ZONE,
  is_break_period BOOLEAN NOT NULL DEFAULT false,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  last_ingested_at TIMESTAMP WITH TIME ZONE
);

-- ===== ROW LEVEL SECURITY =====

-- Players: read-only for authenticated users
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read players"
  ON public.players FOR SELECT
  TO authenticated
  USING (true);

-- Squads: scoped to auth.uid()
ALTER TABLE public.squads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own squads"
  ON public.squads FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own squads"
  ON public.squads FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own squads"
  ON public.squads FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Squad players: scoped via squad_id -> squads.user_id
-- Use security definer function to avoid recursion
CREATE OR REPLACE FUNCTION public.owns_squad(p_squad_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.squads
    WHERE id = p_squad_id AND user_id = auth.uid()
  );
$$;

ALTER TABLE public.squad_players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own squad players"
  ON public.squad_players FOR SELECT
  TO authenticated
  USING (public.owns_squad(squad_id));
CREATE POLICY "Users can insert own squad players"
  ON public.squad_players FOR INSERT
  TO authenticated
  WITH CHECK (public.owns_squad(squad_id));
CREATE POLICY "Users can update own squad players"
  ON public.squad_players FOR UPDATE
  TO authenticated
  USING (public.owns_squad(squad_id));
CREATE POLICY "Users can delete own squad players"
  ON public.squad_players FOR DELETE
  TO authenticated
  USING (public.owns_squad(squad_id));

-- Transfer log: scoped via squad_id
ALTER TABLE public.transfer_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own transfer logs"
  ON public.transfer_log FOR SELECT
  TO authenticated
  USING (public.owns_squad(squad_id));
CREATE POLICY "Users can insert own transfer logs"
  ON public.transfer_log FOR INSERT
  TO authenticated
  WITH CHECK (public.owns_squad(squad_id));

-- Matchday stats: read-only for authenticated
ALTER TABLE public.matchday_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read matchday stats"
  ON public.matchday_stats FOR SELECT
  TO authenticated
  USING (true);

-- Price history: read-only for authenticated
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read price history"
  ON public.price_history FOR SELECT
  TO authenticated
  USING (true);

-- Benchmark snapshot: read-only for authenticated
ALTER TABLE public.benchmark_snapshot ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read benchmark snapshots"
  ON public.benchmark_snapshot FOR SELECT
  TO authenticated
  USING (true);

-- Matchday config: read-only for authenticated
ALTER TABLE public.matchday_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read matchday config"
  ON public.matchday_config FOR SELECT
  TO authenticated
  USING (true);
