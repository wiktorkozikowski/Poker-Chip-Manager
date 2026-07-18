import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sheet } from '../../components/ui/Sheet'
import { Stepper } from '../../components/ui/Stepper'
import { Button } from '../../components/ui/Button'

// Lista graczy przykładowa do podglądu warstwy wizualnej — realni gracze
// stołu (Supabase) trafią tu w Fazie 5.
const MOCK_PLAYERS = ['Adam', 'Tomek', 'Karol', 'Kuba']

export function TransferChipsPage() {
  const navigate = useNavigate()
  const [target, setTarget] = useState(MOCK_PLAYERS[0])
  const [amount, setAmount] = useState(100)

  return (
    <Sheet
      title="Przekaż żetony"
      subtitle="Wybierz gracza"
      footer={
        <Button color="primary" tone="solid" fullWidth onClick={() => navigate(-1)}>
          WYŚLIJ {amount} DO {target.toUpperCase()}
        </Button>
      }
    >
      <div className="mb-8 flex flex-col divide-y divide-border">
        {MOCK_PLAYERS.map((player) => (
          <label key={player} className="flex items-center justify-between py-3">
            <span className="text-sm text-fg">{player}</span>
            <input
              type="radio"
              name="target-player"
              checked={target === player}
              onChange={() => setTarget(player)}
              className="h-5 w-5 accent-brand-green"
            />
          </label>
        ))}
      </div>

      <p className="mb-3 text-sm font-semibold text-fg">Kwota</p>
      <Stepper value={amount} onChange={setAmount} min={0} />
    </Sheet>
  )
}
