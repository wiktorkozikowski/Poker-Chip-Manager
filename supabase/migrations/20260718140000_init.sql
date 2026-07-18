-- Poker Chip Manager — schemat początkowy (Faza 0)
-- Uruchom w Supabase SQL Editor lub przez `supabase db push`.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- tables
-- ---------------------------------------------------------------------------
create table if not exists public.tables (
  id                     uuid primary key default gen_random_uuid(),
  join_code              text not null unique,
  status                 text not null default 'lobby'
                           check (status in ('lobby', 'active', 'finished')),
  small_blind            int not null check (small_blind > 0),
  big_blind              int not null check (big_blind > 0),
  pot                    int not null default 0 check (pot >= 0),
  current_bet            int not null default 0 check (current_bet >= 0),
  dealer_position        int not null default 0,
  current_turn_position  int not null default 0,
  last_raiser_position   int,
  created_at             timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- players
-- ---------------------------------------------------------------------------
create table if not exists public.players (
  id                  uuid primary key default gen_random_uuid(),
  table_id            uuid not null references public.tables (id) on delete cascade,
  name                text not null,
  chip_total          int not null default 0 check (chip_total >= 0),
  position            int not null,
  status              text not null default 'active'
                        check (status in ('active', 'folded', 'all_in')),
  current_round_bet   int not null default 0 check (current_round_bet >= 0),
  is_dealer           boolean not null default false,
  is_small_blind      boolean not null default false,
  is_big_blind        boolean not null default false,
  unique (table_id, position)
);

-- ---------------------------------------------------------------------------
-- actions_log
-- ---------------------------------------------------------------------------
create table if not exists public.actions_log (
  id                 uuid primary key default gen_random_uuid(),
  table_id           uuid not null references public.tables (id) on delete cascade,
  player_id          uuid not null references public.players (id) on delete cascade,
  action_type        text not null
                        check (action_type in ('check', 'call', 'raise', 'fold', 'transfer', 'round_win')),
  amount             int,
  target_player_id   uuid references public.players (id) on delete set null,
  created_at         timestamptz not null default now()
);

create index if not exists actions_log_table_id_idx on public.actions_log (table_id, created_at);
create index if not exists players_table_id_idx on public.players (table_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
--
-- Nie ma logowania/kont — dostęp do stolika jest bramkowany kodem dołączenia
-- (join_code), znanym tylko graczom, którzy do niego dołączyli. Odczyt tabel
-- players/actions_log jest dozwolony każdemu, kto zna table_id (co wymaga
-- wcześniejszego odczytania joina po join_code). Zapis chip_total i innych
-- pól stanu gry odbywa się WYŁĄCZNIE przez Edge Functions używające
-- service_role key, które omijają RLS — klient nigdy nie modyfikuje stanu
-- gry bezpośrednio.
-- ---------------------------------------------------------------------------

alter table public.tables enable row level security;
alter table public.players enable row level security;
alter table public.actions_log enable row level security;

-- tables: odczyt publiczny (wymagany do wyszukania stolika po join_code przy
-- dołączaniu); zapis tylko przez Edge Functions (service_role, który omija RLS).
-- `drop policy if exists` przed `create policy` czyni migrację bezpieczną do
-- wielokrotnego uruchomienia — Postgres nie ma `create policy if not exists`.
drop policy if exists "tables_select_all" on public.tables;
create policy "tables_select_all" on public.tables
  for select using (true);

-- players: odczyt publiczny w ramach stolika.
drop policy if exists "players_select_all" on public.players;
create policy "players_select_all" on public.players
  for select using (true);

-- actions_log: odczyt publiczny w ramach stolika (ekran Historia).
drop policy if exists "actions_log_select_all" on public.actions_log;
create policy "actions_log_select_all" on public.actions_log
  for select using (true);

-- Brak polityk insert/update/delete dla klienta anonimowego = domyślna odmowa.
-- Wszystkie zapisy (chip_total, pot, kolejność akcji, actions_log) idą przez
-- Edge Functions z kluczem service_role.
