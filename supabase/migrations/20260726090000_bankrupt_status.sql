-- Poker Chip Manager — status 'bankrupt' dla gracza, który skończył rozdanie
-- z zerem żetonów. Wykluczony z rozdawania (brak D/SB/BB, nie gra) dopóki
-- ktoś nie przekaże mu żetonów (patrz transfer-chips) — wtedy wraca do
-- 'active', ale realnie bierze udział dopiero w NASTĘPNEJ rozdawanej ręce
-- (rozdawanie dzieje się tylko na starcie ręki, więc zmiana statusu w
-- trakcie trwającej ręki nie wciąga go do niej z automatu).
alter table public.players drop constraint if exists players_status_check;
alter table public.players add constraint players_status_check
  check (status in ('active', 'folded', 'all_in', 'bankrupt'));
