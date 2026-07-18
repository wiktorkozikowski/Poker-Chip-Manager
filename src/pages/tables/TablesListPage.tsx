import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Menu, Plus, Users, ChevronRight } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { CodeInput } from '../../components/ui/CodeInput'

// Dane przykładowe do podglądu warstwy wizualnej — realna lista
// (localStorage + Supabase) trafi tu w Fazie 1.
const MOCK_TABLES = [
  {
    id: 'a7f9',
    joinCode: 'A7F9',
    isActive: true,
    players: 5,
    maxPlayers: 8,
    smallBlind: 20,
    bigBlind: 40,
    createdAt: '21:15',
  },
]

export function TablesListPage() {
  const [joinCode, setJoinCode] = useState('')

  return (
    <div className="p-4">
      <header className="mb-6 flex items-center justify-between">
        <Menu size={22} className="text-fg" />
        <h1 className="text-base font-semibold text-fg">Moje Stoły</h1>
        <Link to="/tables/new" aria-label="Utwórz nowy stół">
          <Plus size={22} className="text-fg" />
        </Link>
      </header>

      <div className="flex flex-col gap-3">
        {MOCK_TABLES.map((table) => (
          <Link key={table.id} to={`/tables/${table.id}/lobby`}>
            <Card highlighted={table.isActive}>
              <div className="flex items-center justify-between">
                {table.isActive && <Badge color="green">●</Badge>}
                <span className="ml-auto flex items-center gap-1 text-xs text-fg-muted">
                  <Users size={14} />
                  {table.players}/{table.maxPlayers}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <div>
                  <p className="text-lg font-bold text-fg">STÓŁ #{table.joinCode}</p>
                  <p className="mt-1 text-xs text-fg-muted">
                    Blindy: {table.smallBlind}/{table.bigBlind}
                  </p>
                  <p className="text-xs text-fg-muted">Utworzony {table.createdAt}</p>
                </div>
                <ChevronRight size={20} className="text-fg-muted" />
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <Link to="/tables/new" className="mt-4 block">
        <Button color="neutral" tone="outline" fullWidth>
          + UTWÓRZ NOWY STÓŁ
        </Button>
      </Link>

      <div className="mt-6">
        <p className="mb-1 text-sm font-semibold text-fg">Dołącz do stołu</p>
        <p className="mb-3 text-xs text-fg-muted">Wpisz kod stołu</p>
        <div className="flex items-center justify-center gap-3">
          <CodeInput value={joinCode} onChange={setJoinCode} />
          <Button color="primary" tone="solid" disabled={joinCode.length < 4}>
            DOŁĄCZ
          </Button>
        </div>
      </div>
    </div>
  )
}
