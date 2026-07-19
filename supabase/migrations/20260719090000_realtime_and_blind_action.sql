-- Poker Chip Manager — Faza 2 (Lobby realtime + start gry)
-- Uruchom w Supabase SQL Editor / przez GitHub Integration po poprzednich migracjach.

-- Realtime: Lobby ma na żywo pokazywać dołączających graczy i zmianę statusu
-- stołu (lobby -> active) po starcie gry.
alter publication supabase_realtime add table public.players;
alter publication supabase_realtime add table public.tables;

-- 'blind' brakowało w oryginalnym wyliczeniu action_type, a jest potrzebne
-- do zalogowania pobrania small/big blind przy starcie gry (ekran Historia
-- w Fazie 5 pokazuje wpis "Blindy 20/40").
alter table public.actions_log drop constraint if exists actions_log_action_type_check;
alter table public.actions_log add constraint actions_log_action_type_check
  check (action_type in ('check', 'call', 'raise', 'fold', 'blind', 'transfer', 'round_win'));
