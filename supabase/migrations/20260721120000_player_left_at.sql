-- Poker Chip Manager — opuszczanie stołu / usuwanie graczy przez hosta
--
-- Nigdy nie kasujemy wiersza `players` (usunęłoby to jego historię w
-- actions_log przez `on delete cascade` i zwolniło jego `position` do
-- ponownego użycia) — zamiast tego trwały marker `left_at`. Gracz z
-- left_at ustawionym jest traktowany jak "nieobecny" wszędzie: nie liczy
-- się do limitu miejsc, nie jest dealowany w nowe ręce, znika z widoków.

alter table public.players
  add column if not exists left_at timestamptz;

create index if not exists players_table_id_left_at_idx
  on public.players (table_id) where left_at is null;

-- Limit miejsc ma liczyć tylko obecnych graczy, inaczej stół "zapchany"
-- przez kogoś kto wyszedł nigdy nie zwolni miejsca dla nowego gracza.
drop policy if exists "players_insert_lobby_only" on public.players;
create policy "players_insert_lobby_only" on public.players
  for insert with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.tables t
      where t.id = table_id
        and t.status = 'lobby'
        and (select count(*) from public.players p
             where p.table_id = t.id and p.left_at is null) < t.max_players
    )
  );
