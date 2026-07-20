import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Sheet } from '../../components/ui/Sheet'
import { Button } from '../../components/ui/Button'
import { useTableWithPlayers } from '../../hooks/useTableWithPlayers'
import { useAuth } from '../../hooks/AuthContext'
import { useResolveRound } from '../../hooks/useResolveRound'

export function ResolveRoundPage() {
  const { tableId } = useParams()
  const navigate = useNavigate()
  const { table, players, loading } = useTableWithPlayers(tableId)
  const { user } = useAuth()
  const { resolveRound, loading: resolving, error } = useResolveRound()

  const myPlayer = players.find((p) => p.user_id === user?.id)
  const eligible = players.filter((p) => p.status !== 'folded')
  const isFoldOut = eligible.length === 1

  const [winners, setWinners] = useState<string[]>([])

  // Fold-out: tylko jeden kandydat — nie ma czego "zaznaczać".
  useEffect(() => {
    if (isFoldOut) setWinners([eligible[0].id])
  }, [isFoldOut, eligible])

  function toggle(playerId: string) {
    setWinners((prev) => (prev.includes(playerId) ? prev.filter((id) => id !== playerId) : [...prev, playerId]))
  }

  if (loading) {
    return <p className="p-4 text-center text-sm text-fg-muted">Wczytywanie...</p>
  }
  if (!table || !myPlayer) {
    return <p className="p-4 text-center text-sm text-brand-red">Nie znaleziono stołu.</p>
  }
  if (table.current_round !== 'showdown') {
    return <p className="p-4 text-center text-sm text-fg-muted">Runda jeszcze się nie zakończyła.</p>
  }
  if (!myPlayer.is_dealer) {
    return <p className="p-4 text-center text-sm text-fg-muted">Czeka na rozstrzygnięcie przez dealera.</p>
  }

  async function handleConfirm() {
    const ok = await resolveRound(tableId!, myPlayer!.id, winners)
    if (ok) navigate(`/tables/${tableId}/game`)
  }

  return (
    <Sheet
      title="Koniec rozdania"
      subtitle={isFoldOut ? 'Zostaje jeden aktywny gracz' : 'Kto wygrał pulę?'}
      footer={
        <>
          {error && <p className="mb-2 text-center text-sm text-brand-red">{error}</p>}
          <Button
            color="primary"
            tone="solid"
            fullWidth
            disabled={winners.length === 0 || resolving}
            onClick={handleConfirm}
          >
            {resolving ? 'ZAPISYWANIE...' : 'POTWIERDŹ WYNIK'}
          </Button>
        </>
      }
    >
      <div className="mb-8 flex flex-col divide-y divide-border">
        {eligible.map((player) => (
          <label key={player.id} className="flex items-center justify-between py-3">
            <span className="text-sm text-fg">{player.name}</span>
            <input
              type="checkbox"
              checked={winners.includes(player.id)}
              onChange={() => toggle(player.id)}
              disabled={isFoldOut}
              className="h-5 w-5 accent-brand-green"
            />
          </label>
        ))}
      </div>

      <p className="text-sm text-fg-muted">Podział puli</p>
      <p className="mt-1 text-2xl font-bold text-fg">{table.pot.toLocaleString('pl-PL')}</p>
    </Sheet>
  )
}
