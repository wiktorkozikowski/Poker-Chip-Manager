import { useParams } from 'react-router-dom'
import { Users, Crown } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { useTableWithPlayers } from '../../hooks/useTableWithPlayers'
import { useLocalTables } from '../../hooks/useLocalTables'

/**
 * Uwaga: brak szkicu graficznego dla tego ekranu — stylizacja utrzymana w
 * spójności z resztą dark theme, do doprecyzowania gdy pojawi się mockup.
 *
 * Konwencja: gracz na position 0 to host (twórca stołu) — nie ma osobnej
 * kolumny is_host w bazie, position 0 jest zawsze przypisywana hostowi przy
 * tworzeniu stołu (patrz useCreateTable) i nie zmienia się przy rotacji
 * dealera (to osobne pole is_dealer).
 */
export function LobbyPage() {
  const { tableId } = useParams()
  const { table, players, loading, error } = useTableWithPlayers(tableId)
  const { getEntry } = useLocalTables()

  const myEntry = tableId ? getEntry(tableId) : undefined
  const isHost = players.find((p) => p.position === 0)?.id === myEntry?.playerId

  if (loading) {
    return <p className="p-4 text-center text-sm text-fg-muted">Wczytywanie...</p>
  }

  if (error || !table) {
    return <p className="p-4 text-center text-sm text-brand-red">{error ?? 'Nie znaleziono stołu.'}</p>
  }

  return (
    <div className="p-4">
      <header className="mb-6 text-center">
        <p className="text-xs tracking-widest text-fg-muted">STÓŁ</p>
        <h1 className="text-xl font-bold text-brand-green">#{table.join_code}</h1>
        <p className="mt-1 text-xs text-fg-muted">
          Blindy {table.small_blind}/{table.big_blind} · Start {table.starting_chips} żetonów
        </p>
      </header>

      <Card className="mb-6 flex flex-col divide-y divide-border p-0">
        {players.map((player) => (
          <div key={player.id} className="flex items-center gap-2 px-4 py-3">
            <Users size={16} className="text-fg-muted" />
            <span className="text-sm text-fg">{player.name}</span>
            {player.position === 0 && <Crown size={14} className="text-brand-yellow" />}
          </div>
        ))}
        {Array.from({ length: table.max_players - players.length }).map((_, i) => (
          <div key={`empty-${i}`} className="px-4 py-3 text-sm text-fg-muted">
            Wolne miejsce
          </div>
        ))}
      </Card>

      {/* onClick (ustawienie dealera/blindów przez Edge Function) trafi tu w Fazie 2. */}
      <Button color="primary" tone="solid" fullWidth disabled>
        START GRY
      </Button>
      <p className="mt-2 text-center text-xs text-fg-muted">
        {isHost
          ? players.length < 2
            ? 'Potrzeba minimum 2 graczy.'
            : 'Uruchomienie gry — Faza 2.'
          : 'Czeka na start hosta.'}
      </p>
    </div>
  )
}
