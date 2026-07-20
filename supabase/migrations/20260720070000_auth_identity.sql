-- Poker Chip Manager — konta i logowanie jako gość (Supabase Auth)
--
-- Wcześniej "kim jestem przy tym stole" trzymało się wyłącznie w localStorage
-- przeglądarki — jeśli ktoś testował wielu graczy z osobnych kart TEJ SAMEJ
-- przeglądarki (współdzielony localStorage), tożsamości się nadpisywały.
-- `user_id` (prawdziwa sesja Supabase Auth — pełne konto albo gość anonimowy)
-- jest teraz źródłem prawdy o tym, kim jest gracz i do jakich stołów należy.

alter table public.players
  add column if not exists user_id uuid references auth.users (id) on delete cascade;

create index if not exists players_user_id_idx on public.players (user_id);

-- Odczyt wymaga teraz zalogowania (pełne konto albo gość) — apka i tak
-- blokuje dostęp ekranem logowania przed wejściem gdziekolwiek dalej.
drop policy if exists "tables_select_all" on public.tables;
create policy "tables_select_all" on public.tables
  for select using (auth.uid() is not null);

drop policy if exists "players_select_all" on public.players;
create policy "players_select_all" on public.players
  for select using (auth.uid() is not null);

drop policy if exists "actions_log_select_all" on public.actions_log;
create policy "actions_log_select_all" on public.actions_log
  for select using (auth.uid() is not null);

-- Stół może utworzyć tylko zalogowany (w tym gość).
drop policy if exists "tables_insert_all" on public.tables;
create policy "tables_insert_all" on public.tables
  for insert with check (auth.uid() is not null);

-- Dołączyć można tylko jako siebie samego (user_id = auth.uid()), tylko do
-- stolika w lobby i tylko dopóki jest wolne miejsce.
drop policy if exists "players_insert_lobby_only" on public.players;
create policy "players_insert_lobby_only" on public.players
  for insert with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.tables t
      where t.id = table_id
        and t.status = 'lobby'
        and (select count(*) from public.players p where p.table_id = t.id) < t.max_players
    )
  );
