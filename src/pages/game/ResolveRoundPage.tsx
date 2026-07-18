import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Pencil } from 'lucide-react'
import { Sheet } from '../../components/ui/Sheet'
import { Button } from '../../components/ui/Button'

// Lista graczy i pula przykładowe do podglądu warstwy wizualnej — realny
// stan rundy (Supabase + silnik gry) trafi tu w Fazie 4.
const MOCK_PLAYERS = ['Adam', 'Tomek', 'Karol', 'Kuba']
const MOCK_POT = 1420

export function ResolveRoundPage() {
  const navigate = useNavigate()
  const [winners, setWinners] = useState<string[]>(['Adam', 'Karol'])

  function toggle(player: string) {
    setWinners((prev) => (prev.includes(player) ? prev.filter((p) => p !== player) : [...prev, player]))
  }

  return (
    <Sheet
      title="Koniec rozdania"
      subtitle="Kto wygrał pulę?"
      footer={
        <Button color="primary" tone="solid" fullWidth disabled={winners.length === 0} onClick={() => navigate(-1)}>
          POTWIERDŹ WYNIK
        </Button>
      }
    >
      <div className="mb-8 flex flex-col divide-y divide-border">
        {MOCK_PLAYERS.map((player) => (
          <label key={player} className="flex items-center justify-between py-3">
            <span className="text-sm text-fg">{player}</span>
            <input
              type="checkbox"
              checked={winners.includes(player)}
              onChange={() => toggle(player)}
              className="h-5 w-5 accent-brand-green"
            />
          </label>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-fg-muted">Podział puli</p>
        <Pencil size={16} className="text-fg-muted" />
      </div>
      <p className="mt-1 text-2xl font-bold text-fg">{MOCK_POT.toLocaleString('pl-PL')}</p>
    </Sheet>
  )
}
