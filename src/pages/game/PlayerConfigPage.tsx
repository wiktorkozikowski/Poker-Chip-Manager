import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { GripVertical, Crown } from 'lucide-react'
import { Sheet } from '../../components/ui/Sheet'
import { SwipeToDelete } from '../../components/ui/SwipeToDelete'
import { useTableWithPlayers } from '../../hooks/useTableWithPlayers'
import { useAuth } from '../../hooks/AuthContext'
import { useKickPlayer } from '../../hooks/useKickPlayer'
import { useReorderPlayers } from '../../hooks/useReorderPlayers'
import { useTransferHost } from '../../hooks/useTransferHost'
import type { PlayerRow } from '../../types/database'

const ROW_HEIGHT = 56

/**
 * Panel hosta: usuwanie graczy (swipe-left, dostępne zawsze) + zmiana
 * kolejności (drag na uchwycie, w lobby i w trakcie gry — mid-hand
 * automatycznie anuluje bieżące rozdanie, patrz reorder-players) +
 * przekazanie roli hosta (ikona korony, w lobby albo między rozdaniami).
 */
export function PlayerConfigPage() {
  const { tableId } = useParams()
  const navigate = useNavigate()
  const { table, players, loading, refetch } = useTableWithPlayers(tableId)
  const { user } = useAuth()
  const { kickPlayer, error: kickError } = useKickPlayer()
  const { reorderPlayers, error: reorderError } = useReorderPlayers()
  const { transferHost, loading: transferring, error: transferError } = useTransferHost()

  const presentPlayers = players.filter((p) => !p.left_at)
  const myPlayer = presentPlayers.find((p) => p.user_id === user?.id)
  const host = presentPlayers.find((p) => p.position === 0)
  const isHost = !!host && host.id === myPlayer?.id

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

  // Reorder działa też w trakcie gry — przetasowanie automatycznie anuluje
  // bieżące rozdanie (patrz reorder-players), więc silnik nigdy nie widzi
  // przetasowanych pozycji w środku trwającej ulicy.
  const canReorder = table?.status === 'lobby' || table?.status === 'active'
  const canTransfer = table?.status === 'lobby' || (table?.status === 'active' && table?.current_round === 'showdown')

  if (loading) {
    return <p className="p-4 text-center text-sm text-fg-muted">Wczytywanie...</p>
  }
  if (!table || !myPlayer) {
    return <p className="p-4 text-center text-sm text-brand-red">Nie znaleziono stołu.</p>
  }
  if (!isHost) {
    return <p className="p-4 text-center text-sm text-fg-muted">Tylko host ma dostęp do tego panelu.</p>
  }

  function handlePointerDown(e: PointerEvent<HTMLDivElement>, index: number) {
    if (!canReorder) return
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

  async function handleTransfer(targetId: string) {
    if (!tableId || !host) return
    const ok = await transferHost(tableId, host.id, targetId)
    if (ok) navigate(`/tables/${tableId}/lobby`)
  }

  return (
    <Sheet title="Gracze" subtitle="Zarządzaj składem stołu">
      {table.status === 'active' && (
        <p className="mb-3 text-xs text-brand-red">
          Zmiana kolejności w trakcie gry anuluje bieżące rozdanie — postawione żetony wrócą do graczy.
        </p>
      )}
      <div className="mb-2 flex items-center gap-2 rounded-xl bg-surface-2 px-4 py-3">
        <Crown size={16} className="text-brand-yellow" />
        <span className="flex-1 truncate text-sm text-fg">{host?.name}</span>
        <span className="text-xs text-fg-muted">HOST</span>
      </div>

      <div className="flex flex-col gap-2">
        {order.map((player, index) => (
          <SwipeToDelete key={player.id} onDelete={() => handleKick(player.id)}>
            <div
              className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3"
              style={{ height: ROW_HEIGHT }}
            >
              <div
                onPointerDown={(e) => handlePointerDown(e, index)}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                className={canReorder ? 'cursor-grab touch-none text-fg-muted' : 'touch-none text-surface-2'}
              >
                <GripVertical size={18} />
              </div>
              <span className="flex-1 truncate text-sm text-fg">{player.name}</span>
              {canTransfer && (
                <button
                  type="button"
                  aria-label={`Przekaż rolę hosta graczowi ${player.name}`}
                  disabled={transferring}
                  onClick={() => handleTransfer(player.id)}
                  className="shrink-0 text-fg-muted hover:text-brand-yellow"
                >
                  <Crown size={16} />
                </button>
              )}
            </div>
          </SwipeToDelete>
        ))}
        {order.length === 0 && <p className="text-center text-sm text-fg-muted">Nie ma innych graczy przy stole.</p>}
      </div>

      {(kickError || transferError || reorderError) && (
        <p className="mt-4 text-center text-sm text-brand-red">{kickError || transferError || reorderError}</p>
      )}
    </Sheet>
  )
}
