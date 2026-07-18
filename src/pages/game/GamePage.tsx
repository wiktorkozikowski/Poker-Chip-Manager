import { useParams, useNavigate } from 'react-router-dom'
import { Menu, Users } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'

// Dane przykładowe do podglądu warstwy wizualnej — realny stan stołu
// (Supabase Realtime + silnik gry) trafi tu w Fazie 3.
const MOCK_PLAYERS = [
  { id: 'adam', name: 'Adam', chipTotal: 1540, isDealer: true, isHost: false, isCurrentTurn: true },
  { id: 'tomek', name: 'Tomek', chipTotal: 980, isDealer: false, isHost: true, isCurrentTurn: false },
  { id: 'karol', name: 'Karol', chipTotal: 720, isDealer: false, isHost: false, isCurrentTurn: false },
  { id: 'kuba', name: 'Kuba', chipTotal: 2130, isDealer: false, isHost: false, isCurrentTurn: false },
  { id: 'you', name: 'Ty (Dealer)', chipTotal: 1860, isDealer: false, isHost: false, isCurrentTurn: false },
]

export function GamePage() {
  const { tableId } = useParams()
  const navigate = useNavigate()

  return (
    <div className="flex min-h-svh flex-col p-4">
      <header className="mb-6 flex items-center justify-between">
        <Menu size={22} className="text-fg" />
        <span className="text-sm font-semibold text-brand-green">STÓŁ #{tableId?.toUpperCase()}</span>
        <span className="flex items-center gap-1 text-xs text-fg-muted">
          <Users size={14} />5
        </span>
      </header>

      <div className="mb-6 text-center">
        <p className="text-xs tracking-widest text-fg-muted">POT</p>
        <p className="text-4xl font-bold text-fg">1 420</p>
        <p className="mt-1 text-xs text-fg-muted">Runda: Preflop</p>
      </div>

      <Card className="mb-6 flex flex-col gap-3 divide-y divide-border p-0">
        {MOCK_PLAYERS.map((player) => (
          <div
            key={player.id}
            className={`flex items-center justify-between px-4 py-3 first:rounded-t-2xl last:rounded-b-2xl ${
              player.isCurrentTurn ? 'border border-brand-green bg-brand-green/10' : ''
            }`}
          >
            <div className="flex items-center gap-2">
              {player.isCurrentTurn && <span className="h-2 w-2 rounded-full bg-brand-green" />}
              <span className="text-sm text-fg">{player.name}</span>
              {player.isDealer && <Badge color="green">D</Badge>}
              {player.isHost && <Badge color="blue">H</Badge>}
            </div>
            <span className={`text-sm font-semibold ${player.isCurrentTurn ? 'text-brand-green' : 'text-fg'}`}>
              {player.chipTotal.toLocaleString('pl-PL')}
            </span>
          </div>
        ))}
      </Card>

      <Card className="mb-4 text-center">
        <p className="text-sm text-fg">Twoja kolej</p>
        <p className="mt-1 text-sm font-semibold text-brand-yellow">Call 40</p>
        <div className="mt-3 flex justify-center gap-1">
          {MOCK_PLAYERS.map((p, i) => (
            <span key={p.id} className={`h-1.5 w-1.5 rounded-full ${i === 0 ? 'bg-brand-green' : 'bg-surface-2'}`} />
          ))}
        </div>
      </Card>

      <div className="mt-auto grid grid-cols-4 gap-2">
        <Button color="neutral">CHECK</Button>
        <Button color="primary">CALL 40</Button>
        <Button color="warning" tone="outline" onClick={() => navigate(`/tables/${tableId}/game/raise`)}>
          RAISE
        </Button>
        <Button color="danger" tone="outline">
          FOLD
        </Button>
      </div>
    </div>
  )
}
