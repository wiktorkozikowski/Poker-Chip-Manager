import { useParams } from 'react-router-dom'
import { Users } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'

// Lista graczy przykładowa do podglądu warstwy wizualnej — realna, realtime
// lista (Supabase) trafi tu w Fazie 2.
const MOCK_PLAYERS = ['Adam (Host)', 'Tomek', 'Karol', 'Kuba']

/**
 * Uwaga: brak szkicu graficznego dla tego ekranu — stylizacja utrzymana w
 * spójności z resztą dark theme, do doprecyzowania gdy pojawi się mockup.
 */
export function LobbyPage() {
  const { tableId } = useParams()

  return (
    <div className="p-4">
      <header className="mb-6 text-center">
        <p className="text-xs tracking-widest text-fg-muted">STÓŁ</p>
        <h1 className="text-xl font-bold text-brand-green">#{tableId?.toUpperCase()}</h1>
      </header>

      <Card className="mb-6 flex flex-col divide-y divide-border p-0">
        {MOCK_PLAYERS.map((player) => (
          <div key={player} className="flex items-center gap-2 px-4 py-3">
            <Users size={16} className="text-fg-muted" />
            <span className="text-sm text-fg">{player}</span>
          </div>
        ))}
      </Card>

      <Button color="primary" tone="solid" fullWidth>
        START GRY
      </Button>
    </div>
  )
}
