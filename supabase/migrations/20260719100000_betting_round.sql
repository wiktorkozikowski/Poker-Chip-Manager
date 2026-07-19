-- Poker Chip Manager — Faza 3 (silnik gry: kolejność akcji, ulice licytacji)
--
-- `current_round` śledzi, na której z 4 ulic licytacji jesteśmy w bieżącym
-- rozdaniu (karty są fizyczne — appka nie wie co jest na stole, ale musi
-- wiedzieć czy resetować stawki i skąd zaczyna się kolejna kolejka akcji).
-- 'showdown' = licytacja rivera zamknięta (albo wszyscy poza jednym spasowali)
-- — rozdanie czeka na rozstrzygnięcie przez dealera (Faza 4).
alter table public.tables
  add column if not exists current_round text not null default 'preflop'
    check (current_round in ('preflop', 'flop', 'turn', 'river', 'showdown'));

-- Ile jeszcze aktywnych graczy musi zareagować, zanim runda licytacji się
-- zamknie. Samo last_raiser_position nie wystarcza do poprawnego wykrycia
-- końca rundy, gdy podbicie pada od gracza w środku kolejki (np. 3+ graczy) —
-- trzeba jawnie liczyć, bo inaczej albo runda zamyka się za wcześnie (ostatni
-- gracz z kolejki po podbiciu nigdy nie dostaje szansy zareagować), albo za
-- późno (wymaga fikcyjnego "powrotu" akcji do podbijającego).
alter table public.tables
  add column if not exists players_to_act int not null default 0;
