-- Poker Chip Manager — Faza 1 (tworzenie stolika + dołączanie kodem)
-- Uruchom w Supabase SQL Editor po 0001_init.sql.
--
-- Dwa uzupełnienia względem pierwotnego modelu danych:
--   1. `tables.max_players` / `tables.starting_chips` — potrzebne, żeby
--      wiedzieć ile żetonów przydzielić graczowi dołączającemu PO utworzeniu
--      stołu (host podaje tę wartość raz, przy tworzeniu) oraz ile miejsc ma
--      stolik (do wyświetlenia "5/8" i zablokowania dołączania po komplecie).
--   2. Polityki INSERT dla `tables`/`players` — tworzenie stołu i dołączanie
--      kodem to zwykłe zapisy z frontendu (nie wymagają walidacji przez Edge
--      Function), więc RLS musi je dopuszczać. Zapis chip_total PO starcie
--      gry nadal idzie wyłącznie przez Edge Functions — nie ma tu polityk
--      UPDATE, więc bez service_role nikt nie zmieni stanu gry.

alter table public.tables
  add column if not exists max_players int not null default 8 check (max_players between 2 and 10),
  add column if not exists starting_chips int not null default 1000 check (starting_chips > 0);

drop policy if exists "tables_insert_all" on public.tables;
create policy "tables_insert_all" on public.tables
  for insert with check (true);

-- Dołączyć można tylko do stolika w lobby i tylko dopóki jest wolne miejsce.
drop policy if exists "players_insert_lobby_only" on public.players;
create policy "players_insert_lobby_only" on public.players
  for insert with check (
    exists (
      select 1 from public.tables t
      where t.id = table_id
        and t.status = 'lobby'
        and (select count(*) from public.players p where p.table_id = t.id) < t.max_players
    )
  );
