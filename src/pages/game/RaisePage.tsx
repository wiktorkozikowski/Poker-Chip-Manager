import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sheet } from '../../components/ui/Sheet'
import { Stepper } from '../../components/ui/Stepper'
import { AmountSlider } from '../../components/ui/AmountSlider'
import { Button } from '../../components/ui/Button'

const QUICK_AMOUNTS = [10, 20, 50, 100]

// Wartości przykładowe do podglądu warstwy wizualnej — realne min/max
// (na bazie current_bet i pot) trafią tu w Fazie 3.
const MIN_RAISE = 80
const MAX_RAISE = 220

export function RaisePage() {
  const navigate = useNavigate()
  const [amount, setAmount] = useState(180)

  const clamp = (n: number) => Math.min(MAX_RAISE, Math.max(MIN_RAISE, n))

  return (
    <Sheet
      title="Raise"
      subtitle="Wybierz kwotę"
      footer={
        <Button color="warning" tone="solid" fullWidth onClick={() => navigate(-1)}>
          POTWIERDŹ RAISE {amount}
        </Button>
      }
    >
      <div className="mb-8 grid grid-cols-4 gap-2">
        {QUICK_AMOUNTS.map((step) => (
          <button
            key={step}
            type="button"
            onClick={() => setAmount(clamp(amount + step))}
            className="rounded-xl bg-surface-2 py-2 text-sm font-semibold text-fg"
          >
            +{step}
          </button>
        ))}
      </div>

      <Stepper value={amount} onChange={(v) => setAmount(clamp(v))} min={MIN_RAISE} max={MAX_RAISE} />

      <div className="mt-4 flex justify-between text-xs text-fg-muted">
        <span>Minimalna: {MIN_RAISE}</span>
        <span>Do pota: {MAX_RAISE}</span>
      </div>

      <div className="mt-4">
        <AmountSlider value={amount} min={MIN_RAISE} max={MAX_RAISE} onChange={setAmount} />
      </div>
    </Sheet>
  )
}
