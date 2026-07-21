-- Poker Chip Manager — kropki postępu rozdania (Preflop/Flop/Turn/River) w UI.
--
-- Gdy runda kończy się fold-outem (wszyscy poza jednym spasowali), silnik
-- przeskakuje od razu na current_round='showdown' z DOWOLNEJ ulicy — sam
-- current_round wtedy nie mówi już, na której ulicy licytacja faktycznie się
-- zamknęła. `showdown_from_round` zapamiętuje tę ostatnią ulicę, żeby UI
-- mogło podświetlić właściwą kropkę na żółto (koniec licytacji, czeka na
-- dealera), a nie zawsze zakładać river.
alter table public.tables
  add column if not exists showdown_from_round text
    check (showdown_from_round in ('preflop', 'flop', 'turn', 'river'));
