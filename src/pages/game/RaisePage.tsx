import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Sheet } from '../../components/ui/Sheet'
import { Stepper } from '../../components/ui/Stepper'
import { AmountSlider } from '../../components/ui/AmountSlider'
import { Button } from '../../components/ui/Button'
import { useTableWithPlayers } from '../../hooks/useTableWithPlayers'
import { useAuth } from '../../hooks/AuthContext'
import { usePlayerAction } from '../../hooks/usePlayerAction'

const QUICK_AMOUNTS = [10, 20, 50, 100]

export function RaisePage() {
  const { tableId } = useParams()
  const navigate = useNavigate()
  const { table, players, loading } = useTableWithPlayers(tableId)
  const { user } = useAuth()
  const { sendAction, loading: sending, error } = usePlayerAction()

  const myPlayer = players.find((p) => p.user_id === user?.id)

  const maxRaise = myPlayer ? myPlayer.chip_total + myPlayer.current_round_bet : 0
  const minRaise = table ? Math.min(table.current_bet + table.big_blind, maxRaise) : 0
  const [amount, setAmount] = useState<number | null>(null)
  const value = amount ?? minRaise

  const clamp = (n: number) => Math.min(maxRaise, Math.max(minRaise, n))

  if (loading) {
    return <p className="p-4 text-center text-sm text-fg-muted">Wczytywanie...</p>
  }
  if (!table || !myPlayer || !tableId) {
    return <p className="p-4 text-center text-sm text-brand-red">Nie można teraz podbić.</p>
  }

  async function handleConfirm() {
    const ok = await sendAction(tableId!, myPlayer!.id, 'raise', value)
    if (ok) navigate(`/tables/${tableId}/game`)
  }

  return (
    <Sheet
      title="Raise"
      subtitle="Wybierz kwotę"
      footer={
        <>
          {error && <p className="mb-2 text-center text-sm text-brand-red">{error}</p>}
          <Button color="warning" tone="solid" fullWidth disabled={sending} onClick={handleConfirm}>
            {sending ? 'WYSYŁANIE...' : `POTWIERDŹ RAISE ${value}`}
          </Button>
        </>
      }
    >
      <div className="mb-8 grid grid-cols-4 gap-2">
        {QUICK_AMOUNTS.map((step) => (
          <button
            key={step}
            type="button"
            onClick={() => setAmount(clamp(value + step))}
            className="rounded-xl bg-surface-2 py-2 text-sm font-semibold text-fg"
          >
            +{step}
          </button>
        ))}
      </div>

      <Stepper value={value} onChange={(v) => setAmount(clamp(v))} min={minRaise} max={maxRaise} />

      <div className="mt-4 flex justify-between text-xs text-fg-muted">
        <span>Minimalna: {minRaise}</span>
        <span>Maksymalna (all-in): {maxRaise}</span>
      </div>

      <div className="mt-4">
        <AmountSlider value={value} min={minRaise} max={maxRaise} onChange={setAmount} />
      </div>
    </Sheet>
  )
}
