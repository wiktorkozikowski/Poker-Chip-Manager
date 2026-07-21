-- Poker Chip Manager — limit aktywnych stołów na gracza
--
-- Gracz (user_id) może jednocześnie należeć maksymalnie do 4 stołów, które
-- nie są 'finished' (czyli jest w nich obecny — left_at is null). Dotyczy
-- zarówno tworzenia nowego stołu (host wstawia siebie jako gracza position 0),
-- jak i dołączania do istniejącego — obie ścieżki insertują wiersz do
-- `players`, więc jeden warunek w tej samej polityce pokrywa oba przypadki.
-- max_players <= 10 już jest wymuszone przez istniejący check constraint
-- (20260718150000_lobby_writes.sql) — klient po prostu przestaje pytać o tę
-- wartość i zawsze wysyła 10.
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
    and (
      select count(*) from public.players p
      join public.tables t2 on t2.id = p.table_id
      where p.user_id = auth.uid()
        and p.left_at is null
        and t2.status <> 'finished'
    ) < 4
  );
