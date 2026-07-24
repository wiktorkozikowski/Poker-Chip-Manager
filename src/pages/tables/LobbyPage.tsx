import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { Users, Crown, ArrowLeftRight, Menu, GripVertical } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { SwipeToDelete } from '../../components/ui/SwipeToDelete'
import { TableMenu } from '../../components/nav/TableMenu'
import { useTableWithPlayers } from '../../hooks/useTableWithPlayers'
import { useAuth } from '../../hooks/AuthContext'
import { useStartGame } from '../../hooks/useStartGame'
import { useKickPlayer } from '../../hooks/useKickPlayer'
import { useReorderPlayers } from '../../hooks/useReorderPlayers'
import type { PlayerRow } from '../../types/database'

const ROW_HEIGHT = 56

/**
 * Uwaga: brak szkicu graficznego dla tego ekranu — stylizacja utrzymana w
 * spójności z resztą dark theme, do doprecyzowania gdy pojawi się mockup.
 *
 * Konwencja: gracz na position 0 to host (twórca stołu) — nie ma osobnej
 * kolumny is_host w bazie, position 0 jest zawsze przypisywana hostowi przy
 * tworzeniu stołu (patrz useCreateTable) i nie zmienia się przy rotacji
 * dealera (to osobne pole is_dealer).
 *
 * Zmiana kolejności (drag na uchwycie) i usuwanie graczy (swipe-left) są tu,
 * bezpośrednio na liście — host widzi i zmienia skład stołu w tym samym
 * miejscu, bez wchodzenia do osobnego panelu "Gracze" (ten zostaje dla
 * przekazania roli hosta i zarządzania w trakcie gry, patrz PlayerConfigPage).
 */
export function LobbyPage() {
  const { tableId } = useParams()
  const navigate = useNavigate()
  const { table, players, loading, error, refetch } = useTableWithPlayers(tableId)
  const { user } = useAuth()
  const { startGame, loading: starting, error: startError } = useStartGame()
  const { kickPlayer, error: kickError } = useKickPlayer()
  const { reorderPlayers, error: reorderError } = useReorderPlayers()
  const [menuOpen, setMenuOpen] = useState(false)

  const presentPlayers = players.filter((p) => !p.left_at)
  const myPlayer = presentPlayers.find((p) => p.user_id === user?.id)
  const host = presentPlayers.find((p) => p.position === 0)
  const isHost = host?.id === myPlayer?.id

  const nonHostServerOrder = presentPlayers.filter((p) => p.position !== 0).sort((a, b) => a.position - b.position)
  const [order, setOrder] = useState<PlayerRow[]>(nonHostServerOrder)
  const draggingIndexRef = useRef<number | null>(null)
  const startYRef = useRef(0)
  const startIndexRef = useRef(0)
  const pointerIdRef = useRef<number | null>(null)

  useEffect(() => {
    if (draggingIndexRef.current === null) {
      setOrder(nonHostServerOrder)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players])

  // Realtime: gdy status stołu zmieni się na 'active' (host kliknął start —
  // u siebie albo u kogoś innego), wszyscy gracze trafiają na ekran gry.
  useEffect(() => {
    if (table?.status === 'active' && tableId) {
      navigate(`/tables/${tableId}/game`)
    }
  }, [table?.status, tableId, navigate])

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

  async function handleStart() {
    if (!tableId || !myPlayer) return
    const ok = await startGame(tableId, myPlayer.id)
    // Nie czekamy na Realtime u hosta — od razu odświeżamy, co przez
    // useEffect powyżej natychmiast przekieruje na ekran gry.
    if (ok) await refetch()
  }

  function handlePointerDown(e: PointerEvent<HTMLDivElement>, index: number) {
    draggingIndexRef.current = index
    startIndexRef.current = index
    startYRef.current = e.clientY
    pointerIdRef.current = e.pointerId
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function handlePointerMove(e: PointerEvent<HTMLDivElement>) {
    if (draggingIndexRef.current === null || pointerIdRef.current !== e.pointerId) return
    const deltaY = e.clientY - startYRef.current
    const hoverIndex = Math.max(
      0,
      Math.min(order.length - 1, startIndexRef.current + Math.round(deltaY / ROW_HEIGHT)),
    )
    if (hoverIndex !== draggingIndexRef.current) {
      const from = draggingIndexRef.current
      setOrder((prev) => {
        const next = [...prev]
        const [moved] = next.splice(from, 1)
        next.splice(hoverIndex, 0, moved)
        return next
      })
      draggingIndexRef.current = hoverIndex
    }
  }

  async function handlePointerUp(e: PointerEvent<HTMLDivElement>) {
    if (pointerIdRef.current !== e.pointerId) return
    pointerIdRef.current = null
    draggingIndexRef.current = null
    const changed = order.some((p, i) => p.id !== nonHostServerOrder[i]?.id)
    if (changed && tableId && host) {
      const ok = await reorderPlayers(
        tableId,
        host.id,
        order.map((p) => p.id),
      )
      if (ok) await refetch()
      else setOrder(nonHostServerOrder)
    }
  }

  async function handleKick(targetId: string) {
    if (!tableId || !host) return
    const ok = await kickPlayer(tableId, host.id, targetId)
    if (ok) await refetch()
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
        {host && (
          <div className="flex items-center gap-2 px-4 py-3">
            <Users size={16} className="text-fg-muted" />
            <span className="flex-1 truncate text-sm text-fg">{host.name}</span>
            <Crown size={14} className="text-brand-yellow" />
          </div>
        )}
        {isHost
          ? order.map((player, index) => (
              <SwipeToDelete key={player.id} onDelete={() => handleKick(player.id)}>
                <div className="flex items-center gap-2 bg-surface px-4" style={{ height: ROW_HEIGHT }}>
                  <div
                    onPointerDown={(e) => handlePointerDown(e, index)}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    className="cursor-grab touch-none text-fg-muted"
                  >
                    <GripVertical size={18} />
                  </div>
                  <span className="flex-1 truncate text-sm text-fg">{player.name}</span>
                </div>
              </SwipeToDelete>
            ))
          : order.map((player) => (
              <div key={player.id} className="flex items-center gap-2 px-4 py-3">
                <Users size={16} className="text-fg-muted" />
                <span className="text-sm text-fg">{player.name}</span>
              </div>
            ))}
        {Array.from({ length: table.max_players - presentPlayers.length }).map((_, i) => (
          <div key={`empty-${i}`} className="px-4 py-3 text-sm text-fg-muted">
            Wolne miejsce
          </div>
        ))}
      </Card>

      {(kickError || reorderError) && <p className="mb-4 text-center text-sm text-brand-red">{kickError || reorderError}</p>}

      <Button
        color="primary"
        tone="solid"
        fullWidth
        disabled={!isHost || presentPlayers.length < 2 || starting}
        onClick={handleStart}
      >
        {starting ? 'STARTOWANIE...' : 'START GRY'}
      </Button>
      <p className="mt-2 text-center text-xs text-fg-muted">
        {isHost ? (presentPlayers.length < 2 ? 'Potrzeba minimum 2 graczy.' : ' ') : 'Czeka na start hosta.'}
      </p>
      {startError && <p className="mt-2 text-center text-sm text-brand-red">{startError}</p>}

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
