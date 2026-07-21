-- Poker Chip Manager — host może zresetować bieżące rozdanie (żetony
-- wracają do graczy, nowa ręka startuje od razu przy tym samym dealerze).
-- Rejestrujemy to w actions_log, żeby było widać w historii dlaczego stan
-- żetonów "cofnął się" — tak jak każda inna zmiana stanu gry.
alter table public.actions_log drop constraint if exists actions_log_action_type_check;
alter table public.actions_log add constraint actions_log_action_type_check
  check (action_type in ('check', 'call', 'raise', 'fold', 'blind', 'transfer', 'round_win', 'reset_hand'));
