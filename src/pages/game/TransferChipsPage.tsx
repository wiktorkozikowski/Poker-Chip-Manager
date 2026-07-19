import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Sheet } from '../../components/ui/Sheet'
import { Stepper } from '../../components/ui/Stepper'
import { Button } from '../../components/ui/Button'
import { useTableWithPlayers } from '../../hooks/useTableWithPlayers'
import { useLocalTables } from '../../hooks/useLocalTables'
import { useTransferChips } from '../../hooks/useTransferChips'

export function TransferChipsPage() {
  const { tableId } = useParams()
  const navigate = useNavigate()
  const { players, loading } = useTableWithPlayers(tableId)
  const { getEntry } = useLocalTables()
  const { transferChips, loading: sending, error } = useTransferChips()

  const myEntry = tableId ? getEntry(tableId) : undefined
  const myPlayer = players.find((p) => p.id === myEntry?.playerId)
  const otherPlayers = players.filter((p) => p.id !== myPlayer?.id)

  const [targetId, setTargetId] = useState<string | null>(null)
  const [amount, setAmount] = useState(100)

  const target = otherPlayers.find((p) => p.id === targetId) ?? otherPlayers[0]

  if (loading) {
    return <p className="p-4 text-center text-sm text-fg-muted">Wczytywanie...</p>
  }
  if (!tableId || !myPlayer || !target) {
    return <p className="p-4 text-center text-sm text-brand-red">Brak innych graczy do przekazania żetonów.</p>
  }

  async function handleConfirm() {
    const ok = await transferChips(tableId!, myPlayer!.id, target!.id, amount)
    if (ok) navigate(-1)
  }

  return (
    <Sheet
      title="Przekaż żetony"
      subtitle="Wybierz gracza"
      footer={
        <>
          {error && <p className="mb-2 text-center text-sm text-brand-red">{error}</p>}
          <Button
            color="primary"
            tone="solid"
            fullWidth
            disabled={sending || amount <= 0 || amount > myPlayer.chip_total}
            onClick={handleConfirm}
          >
            {sending ? 'WYSYŁANIE...' : `WYŚLIJ ${amount} DO ${target.name.toUpperCase()}`}
          </Button>
        </>
      }
    >
      <div className="mb-8 flex flex-col divide-y divide-border">
        {otherPlayers.map((player) => (
          <label key={player.id} className="flex items-center justify-between py-3">
            <span className="text-sm text-fg">{player.name}</span>
            <input
              type="radio"
              name="target-player"
              checked={target.id === player.id}
              onChange={() => setTargetId(player.id)}
              className="h-5 w-5 accent-brand-green"
            />
          </label>
        ))}
      </div>

      <p className="mb-3 text-sm font-semibold text-fg">Kwota (masz {myPlayer.chip_total})</p>
      <Stepper value={amount} onChange={setAmount} min={0} max={myPlayer.chip_total} />
    </Sheet>
  )
}
