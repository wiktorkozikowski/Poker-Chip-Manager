-- Poker Chip Manager — pokazywanie wybranej akcji przy graczu (check/call/
-- raise/fold), obok istniejących odznak D/SB/BB. Resetuje się przy nowym
-- podbiciu (poza foldem, który jest trwały do końca ręki) i przy nowej ulicy.
alter table public.players
  add column if not exists last_action text
    check (last_action in ('check', 'call', 'raise', 'fold'));
