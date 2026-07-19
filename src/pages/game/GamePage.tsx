import { useParams, useNavigate } from 'react-router-dom'
import { Menu, Users } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { useTableWithPlayers } from '../../hooks/useTableWithPlayers'
import { useLocalTables } from '../../hooks/useLocalTables'
import { usePlayerAction } from '../../hooks/usePlayerAction'
import type { BettingRound } from '../../types/database'

const ROUND_LABEL: Record<BettingRound, string> = {
  preflop: 'Preflop',
  flop: 'Flop',
  turn: 'Turn',
  river: 'River',
  showdown: 'Zakończone',
}

export function GamePage() {
  const { tableId } = useParams()
  const navigate = useNavigate()
  const { table, players, loading, error } = useTableWithPlayers(tableId)
  const { getEntry } = useLocalTables()
  const { sendAction, loading: acting, error: actionError } = usePlayerAction()

  const myEntry = tableId ? getEntry(tableId) : undefined
  const myPlayer = players.find((p) => p.id === myEntry?.playerId)

  if (loading) {
    return <p className="p-4 text-center text-sm text-fg-muted">Wczytywanie...</p>
  }
  if (error || !table) {
    return <p className="p-4 text-center text-sm text-brand-red">{error ?? 'Nie znaleziono stołu.'}</p>
  }

  const isShowdown = table.current_round === 'showdown'
  const isMyTurn = !isShowdown && myPlayer?.status === 'active' && myPlayer.position === table.current_turn_position
  const toCall = myPlayer ? table.current_bet - myPlayer.current_round_bet : 0
  const currentPlayerName = players.find((p) => p.position === table.current_turn_position)?.name

  async function handleAction(action: 'check' | 'call' | 'fold') {
    if (!tableId || !myPlayer) return
    await sendAction(tableId, myPlayer.id, action)
  }

  return (
    <div className="flex min-h-svh flex-col p-4">
      <header className="mb-6 flex items-center justify-between">
        <Menu size={22} className="text-fg" />
        <span className="text-sm font-semibold text-brand-green">STÓŁ #{table.join_code}</span>
        <span className="flex items-center gap-1 text-xs text-fg-muted">
          <Users size={14} />
          {players.length}
        </span>
      </header>

      <div className="mb-6 text-center">
        <p className="text-xs tracking-widest text-fg-muted">POT</p>
        <p className="text-4xl font-bold text-fg">{table.pot.toLocaleString('pl-PL')}</p>
        <p className="mt-1 text-xs text-fg-muted">Runda: {ROUND_LABEL[table.current_round]}</p>
      </div>

      <Card className="mb-6 flex flex-col gap-3 divide-y divide-border p-0">
        {players.map((player) => {
          const isCurrentTurn = !isShowdown && player.position === table.current_turn_position
          return (
            <div
              key={player.id}
              className={`flex items-center justify-between px-4 py-3 first:rounded-t-2xl last:rounded-b-2xl ${
                isCurrentTurn ? 'border border-brand-green bg-brand-green/10' : ''
              } ${player.status === 'folded' ? 'opacity-40' : ''}`}
            >
              <div className="flex items-center gap-2">
                {isCurrentTurn && <span className="h-2 w-2 rounded-full bg-brand-green" />}
                <span className="text-sm text-fg">{player.name}</span>
                {player.is_dealer && <Badge color="green">D</Badge>}
                {player.position === 0 && <Badge color="blue">H</Badge>}
                {player.status === 'all_in' && <Badge color="yellow">ALL-IN</Badge>}
              </div>
              <span className={`text-sm font-semibold ${isCurrentTurn ? 'text-brand-green' : 'text-fg'}`}>
                {player.chip_total.toLocaleString('pl-PL')}
              </span>
            </div>
          )
        })}
      </Card>

      <Card className="mb-4 text-center">
        {isShowdown ? (
          <p className="text-sm text-fg">
            Rozdanie zakończone — rozstrzygnięcie puli trafi tu w Fazie 4.
          </p>
        ) : isMyTurn ? (
          <>
            <p className="text-sm text-fg">Twoja kolej</p>
            <p className="mt-1 text-sm font-semibold text-brand-yellow">
              {toCall > 0 ? `Call ${toCall}` : 'Check dostępny'}
            </p>
          </>
        ) : (
          <p className="text-sm text-fg-muted">Kolej: {currentPlayerName ?? '—'}</p>
        )}
        {actionError && <p className="mt-2 text-sm text-brand-red">{actionError}</p>}
      </Card>

      <div className="mt-auto grid grid-cols-4 gap-2">
        <Button color="neutral" disabled={!isMyTurn || toCall > 0 || acting} onClick={() => handleAction('check')}>
          CHECK
        </Button>
        <Button color="primary" disabled={!isMyTurn || toCall <= 0 || acting} onClick={() => handleAction('call')}>
          {toCall > 0 ? `CALL ${toCall}` : 'CALL'}
        </Button>
        <Button
          color="warning"
          tone="outline"
          disabled={!isMyTurn || acting}
          onClick={() => navigate(`/tables/${tableId}/game/raise`)}
        >
          RAISE
        </Button>
        <Button color="danger" tone="outline" disabled={!isMyTurn || acting} onClick={() => handleAction('fold')}>
          FOLD
        </Button>
      </div>
    </div>
  )
}
