# Poker Chip Manager

Pomocnik do zarządzania żetonami przy grze w pokera na żywo (PWA). Karty są
fizyczne — aplikacja odpowiada wyłącznie za stan żetonów, kolejność graczy,
pulę i przebieg licytacji.

## Stack

- Frontend: React + Vite + TypeScript
- Stylowanie: Tailwind CSS v4
- Backend: Supabase (Postgres + Edge Functions + Realtime)
- PWA: `vite-plugin-pwa` (manifest + service worker, instalacja przez Safari
  "Dodaj do ekranu głównego")

## Struktura projektu

```
src/
  game-logic/   silnik gry — czyste funkcje, bez zależności od React/Supabase
  layouts/      MainLayout (z dolnym paskiem nawigacji) i TableLayout (rozgrywka, bez paska)
  components/   komponenty UI (nav/, ui/) — proste, generyczne, gotowe do restylowania
  pages/        ekrany, pogrupowane per funkcja (tables/, game/, history/, settings/)
  hooks/        hooki do Supabase (realtime, zapytania)
  lib/          klient Supabase
  types/        typy odzwierciedlające schemat bazy danych
  routes/       konfiguracja routingu
supabase/
  migrations/   schemat SQL + polityki RLS
```

## Setup lokalny

1. `npm install`
2. Utwórz projekt w [Supabase](https://supabase.com), uruchom
   `supabase/migrations/0001_init.sql` w SQL Editor.
3. Skopiuj `.env.example` do `.env` i uzupełnij `VITE_SUPABASE_URL` /
   `VITE_SUPABASE_ANON_KEY` z ustawień projektu (Project Settings → API).
4. `npm run dev`

## Skrypty

- `npm run dev` — serwer deweloperski
- `npm run build` — build produkcyjny (`dist/`), generuje też manifest PWA i service worker
- `npm run preview` — podgląd builda produkcyjnego
- `npm run lint` — oxlint

## Plan faz

Projekt budowany fazami (Faza 0 — setup, Faza 1 — tworzenie stolika, Faza 2
— lobby, Faza 3 — silnik gry, Faza 4 — rozstrzyganie rund, Faza 5 — transfer
żetonów + historia, Faza 6 — polish, Faza 7 — deploy). Każda faza kończy się
możliwością przetestowania przed przejściem dalej.
