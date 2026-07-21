import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Menu, Users, ArrowLeftRight } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { TableMenu } from '../../components/nav/TableMenu'
import { RoundProgress } from '../../components/game/RoundProgress'
import { useTableWithPlayers } from '../../hooks/useTableWithPlayers'
import { useAuth } from '../../hooks/AuthContext'
import { usePlayerAction } from '../../hooks/usePlayerAction'
import { useResolveRound } from '../../hooks/useResolveRound'
import type { LastAction } from '../../types/database'

const ACTION_LABEL: Record<LastAction, string> = {
  check: 'CHECK',
  call: 'CALL',
  raise: 'RAISE',
  fold: 'FOLD',
}

// Te same kolory co przyciski akcji na dole ekranu (CHECK=neutral,
// CALL=primary, RAISE=warning, FOLD=danger), w stylu odznak D/SB/BB
// (przezroczyste tło + kolorowy tekst, nie pełny jaskrawy przycisk).
const ACTION_BADGE_COLOR: Record<LastAction, string> = {
  check: 'bg-surface-2 text-fg-muted',
  call: 'bg-brand-green/20 text-brand-green',
  raise: 'bg-brand-yellow/20 text-brand-yellow',
  fold: 'bg-brand-red/20 text-brand-red',
}

export function GamePage() {
  const { tableId } = useParams()
  const navigate = useNavigate()
  const { table, players, loading, error, refetch, onlineUserIds } = useTableWithPlayers(tableId)
  const { user } = useAuth()
  const { sendAction, loading: acting, error: actionError } = usePlayerAction()
  const { resolveRound } = useResolveRound()
  const [menuOpen, setMenuOpen] = useState(false)
  const autoResolvedRef = useRef(false)

  const presentPlayers = players.filter((p) => !p.left_at)
  const myPlayer = presentPlayers.find((p) => p.user_id === user?.id)
  const isHost = presentPlayers.find((p) => p.position === 0)?.id === myPlayer?.id
  const isShowdown = table?.current_round === 'showdown'
  const eligiblePlayers = presentPlayers.filter((p) => p.status !== 'folded')
  const isFoldOut = isShowdown && eligiblePlayers.length === 1

  // Fold-out (wszyscy poza jednym spasowali): nie ma kogo pytać o wybór
  // zwycięzcy, więc dealer nie musi nic klikać — rozstrzygamy automatycznie
  // w tle, jak tylko jego klient to wykryje.
  useEffect(() => {
    if (isFoldOut && myPlayer?.is_dealer && tableId && !autoResolvedRef.current) {
      autoResolvedRef.current = true
      resolveRound(tableId, myPlayer.id, [eligiblePlayers[0].id]).then((ok) => {
        if (ok) {
          refetch()
        } else {
          autoResolvedRef.current = false
        }
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFoldOut, myPlayer?.id, myPlayer?.is_dealer, tableId])

  // Host zamknął stół — wszyscy podłączeni klienci wracają na listę stołów.
  useEffect(() => {
    if (table?.status === 'finished') {
      navigate('/tables')
    }
  }, [table?.status, navigate])

  // Zostałem usunięty przez hosta (dowiaduję się przez Realtime, nie przez
  // własne kliknięcie) — gracze są już załadowani, ale mnie wśród nich nie ma.
  useEffect(() => {
    if (!loading && table && !myPlayer) {
      navigate('/tables')
    }
  }, [loading, table, myPlayer, navigate])

  if (loading) {
    return <p className="p-4 text-center text-sm text-fg-muted">Wczytywanie...</p>
  }
  if (error || !table) {
    return <p className="p-4 text-center text-sm text-brand-red">{error ?? 'Nie znaleziono stołu.'}</p>
  }

  const isMyTurn = !isShowdown && myPlayer?.status === 'active' && myPlayer.position === table.current_turn_position
  const toCall = myPlayer ? table.current_bet - myPlayer.current_round_bet : 0
  const currentPlayerName = presentPlayers.find((p) => p.position === table.current_turn_position)?.name
  const onlineCount = presentPlayers.filter((p) => p.user_id && onlineUserIds.has(p.user_id)).length

  async function handleAction(action: 'check' | 'call' | 'fold') {
    if (!tableId || !myPlayer) return
    const ok = await sendAction(tableId, myPlayer.id, action)
    // Nie czekamy na Realtime dla własnej akcji — inni gracze i tak dostaną
    // update tą drogą, ale to potrafi zająć kilka sekund.
    if (ok) await refetch()
  }

  return (
    <div className="flex min-h-svh flex-col p-4">
      <header className="mb-6 flex items-center justify-between">
        <button type="button" onClick={() => setMenuOpen(true)} aria-label="Menu stołu">
          <Menu size={22} className="text-fg" />
        </button>
        <span className="text-sm font-semibold text-brand-green">STÓŁ #{table.join_code}</span>
        <span className="flex items-center gap-3 text-xs text-fg-muted">
          <span className="flex items-center gap-1">
            <Users size={14} />
            {onlineCount}
          </span>
          <Link to={`/tables/${tableId}/game/transfer`} aria-label="Przekaż żetony">
            <ArrowLeftRight size={16} className="text-fg" />
          </Link>
        </span>
      </header>

      <div className="mb-6 text-center">
        <p className="text-xs tracking-widest text-fg-muted">POT</p>
        <p className="text-4xl font-bold text-fg">{table.pot.toLocaleString('pl-PL')}</p>
        <div className="mt-2">
          <RoundProgress table={table} />
        </div>
      </div>

      <Card className="mb-6 flex flex-col gap-3 divide-y divide-border p-0">
        {presentPlayers.map((player) => {
          const isCurrentTurn = !isShowdown && player.position === table.current_turn_position
          const isOnline = !!player.user_id && onlineUserIds.has(player.user_id)
          return (
            <div
              key={player.id}
              className={`flex flex-col gap-1.5 px-4 py-3 first:rounded-t-2xl last:rounded-b-2xl ${
                isCurrentTurn ? 'border border-brand-green bg-brand-green/10' : ''
              } ${player.status === 'folded' ? 'opacity-40' : ''}`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <span
                    title={isOnline ? 'Online' : 'Offline'}
                    className={`h-2 w-2 shrink-0 rounded-full ${isOnline ? 'bg-brand-green' : 'bg-surface-2'}`}
                  />
                  <span className="min-w-0 shrink truncate text-sm text-fg">{player.name}</span>
                </div>
                <span
                  className={`shrink-0 text-sm font-semibold ${isCurrentTurn ? 'text-brand-green' : 'text-fg'}`}
                >
                  {player.chip_total.toLocaleString('pl-PL')}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {player.is_dealer && <Badge color="green">D</Badge>}
                {player.is_small_blind && <Badge color="blue">SB</Badge>}
                {player.is_big_blind && <Badge color="yellow">BB</Badge>}
                {player.status === 'all_in' && <Badge color="yellow">ALL-IN</Badge>}
                {player.total_invested > 0 && (
                  <span className="whitespace-nowrap rounded-full bg-brand-violet/20 px-2.5 py-1 text-xs font-bold text-brand-violet">
                    SUMA {player.total_invested}
                  </span>
                )}
                {player.last_action && (
                  <span
                    className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${ACTION_BADGE_COLOR[player.last_action]}`}
                  >
                    {ACTION_LABEL[player.last_action]}
                    {player.last_action === 'raise' ? ` ${player.current_round_bet}` : ''}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </Card>

      <Card className="mb-4 text-center">
        {isShowdown ? (
          isFoldOut ? (
            <p className="text-sm text-fg">Rozstrzygnięcie puli — chwila...</p>
          ) : myPlayer?.is_dealer ? (
            <Button
              color="primary"
              tone="solid"
              fullWidth
              onClick={() => navigate(`/tables/${tableId}/game/resolve`)}
            >
              ROZSTRZYGNIJ ROZDANIE
            </Button>
          ) : (
            <p className="text-sm text-fg">Rozdanie zakończone — czeka na dealera.</p>
          )
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

      <TableMenu
        tableId={table.id}
        isHost={isHost}
        canResetHand={isHost && table.status === 'active'}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
      />
    </div>
  )
}
