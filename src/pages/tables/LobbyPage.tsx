import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { Users, Crown, ArrowLeftRight, Menu } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { TableMenu } from '../../components/nav/TableMenu'
import { useTableWithPlayers } from '../../hooks/useTableWithPlayers'
import { useLocalTables } from '../../hooks/useLocalTables'
import { useStartGame } from '../../hooks/useStartGame'

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
  const navigate = useNavigate()
  const { table, players, loading, error } = useTableWithPlayers(tableId)
  const { getEntry } = useLocalTables()
  const { startGame, loading: starting, error: startError } = useStartGame()
  const [menuOpen, setMenuOpen] = useState(false)

  const myEntry = tableId ? getEntry(tableId) : undefined
  const isHost = players.find((p) => p.position === 0)?.id === myEntry?.playerId

  // Realtime: gdy status stołu zmieni się na 'active' (host kliknął start —
  // u siebie albo u kogoś innego), wszyscy gracze trafiają na ekran gry.
  useEffect(() => {
    if (table?.status === 'active' && tableId) {
      navigate(`/tables/${tableId}/game`)
    }
  }, [table?.status, tableId, navigate])

  if (loading) {
    return <p className="p-4 text-center text-sm text-fg-muted">Wczytywanie...</p>
  }

  if (error || !table) {
    return <p className="p-4 text-center text-sm text-brand-red">{error ?? 'Nie znaleziono stołu.'}</p>
  }

  async function handleStart() {
    if (!tableId || !myEntry) return
    await startGame(tableId, myEntry.playerId)
    // Sukces: realtime subskrypcja na `tables` sama zaktualizuje status i
    // przekieruje przez useEffect powyżej — nie trzeba nawigować ręcznie.
  }

  return (
    <div className="p-4">
      <header className="mb-6 text-center">
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => setMenuOpen(true)} aria-label="Menu stołu">
            <Menu size={18} className="text-fg-muted" />
          </button>
          <Link to={`/tables/${tableId}/game/transfer`} aria-label="Przekaż żetony">
            <ArrowLeftRight size={16} className="text-fg-muted" />
          </Link>
        </div>
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

      <Button
        color="primary"
        tone="solid"
        fullWidth
        disabled={!isHost || players.length < 2 || starting}
        onClick={handleStart}
      >
        {starting ? 'STARTOWANIE...' : 'START GRY'}
      </Button>
      <p className="mt-2 text-center text-xs text-fg-muted">
        {isHost ? (players.length < 2 ? 'Potrzeba minimum 2 graczy.' : ' ') : 'Czeka na start hosta.'}
      </p>
      {startError && <p className="mt-2 text-center text-sm text-brand-red">{startError}</p>}

      <TableMenu tableId={table.id} open={menuOpen} onClose={() => setMenuOpen(false)} />
    </div>
  )
}
