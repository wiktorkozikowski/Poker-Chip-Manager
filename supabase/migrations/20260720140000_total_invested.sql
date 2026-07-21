-- Poker Chip Manager — ile gracz zainwestował w bieżące rozdanie łącznie
-- (przez wszystkie ulice, w przeciwieństwie do current_round_bet, który
-- resetuje się na każdej nowej ulicy).
alter table public.players
  add column if not exists total_invested int not null default 0;
