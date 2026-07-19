/**
 * Bez kont/rejestracji nie ma jeszcze pojęcia "moje stoły w historii" na
 * poziomie użytkownika — historia zdarzeń konkretnego stołu jest dostępna
 * z jego wnętrza (Lobby/Game → menu w lewym górnym rogu → Historia), patrz
 * src/pages/game/HistoryPage.tsx. Ta zakładka wróci do życia jako
 * zarchiwizowane stoły użytkownika, gdy dojdzie system kont.
 */
export function HistoryPlaceholderPage() {
  return (
    <div className="p-4">
      <h1 className="text-base font-semibold text-fg">Historia</h1>
      <p className="mt-2 text-sm text-fg-muted">
        Historię zdarzeń danego stołu znajdziesz wewnątrz stołu — otwórz menu w lewym górnym rogu ekranu gry.
      </p>
      <p className="mt-2 text-sm text-fg-muted">
        Historia stołów przypisana do Twojego konta pojawi się tutaj po dodaniu rejestracji.
      </p>
    </div>
  )
}
