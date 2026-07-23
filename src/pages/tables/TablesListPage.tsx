import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Menu, Plus, Users, ChevronRight } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { CodeInput } from '../../components/ui/CodeInput'
import { SwipeToDelete } from '../../components/ui/SwipeToDelete'
import { useMyTablesData } from '../../hooks/useMyTablesData'
import { useJoinTable } from '../../hooks/useJoinTable'
import { useAuth } from '../../hooks/AuthContext'
import type { TableStatus } from '../../types/database'

const STATUS_LABEL: Record<TableStatus, { text: string; color: 'green' | 'yellow' | 'neutral' }> = {
  lobby: { text: 'LOBBY', color: 'yellow' },
  active: { text: 'AKTYWNY', color: 'green' },
  finished: { text: 'ZAKOŃCZONY', color: 'neutral' },
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
}

export function TablesListPage() {
  const navigate = useNavigate()
  const { user, displayName } = useAuth()
  const { data: tables, loading } = useMyTablesData(user?.id)
  const { joinTable, loading: joining, error: joinError } = useJoinTable()

  const [joinCode, setJoinCode] = useState('')
  const [playerName, setPlayerName] = useState(displayName)

  useEffect(() => {
    setPlayerName(displayName)
  }, [displayName])

  async function handleJoin() {
    if (!user) return
    const result = await joinTable(joinCode, playerName, user.id)
    if (!result) return
    navigate(`/tables/${result.table.id}/lobby`)
  }

  return (
    <div className="p-4">
      <header className="mb-6 flex items-center justify-between">
        <Menu size={22} className="text-fg" />
        <h1 className="text-base font-semibold text-fg">Moje Stoły</h1>
        <Link to="/tables/new" aria-label="Utwórz nowy stół">
          <Plus size={22} className="text-fg" />
        </Link>
      </header>

      {!loading && tables.length === 0 && (
        <p className="mb-4 text-center text-sm text-fg-muted">
          Nie masz jeszcze żadnych stołów. Utwórz nowy albo dołącz kodem.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {tables.map((table) => {
          const status = STATUS_LABEL[table.status]
          return (
            <SwipeToDelete
              key={table.id}
              onDelete={() => navigate(`/tables/${table.id}/${table.isHost ? 'close' : 'leave'}`)}
            >
              <Card highlighted={table.status === 'active'} onClick={() => navigate(`/tables/${table.id}/lobby`)}>
                <div className="flex items-center justify-between">
                  <Badge color={status.color}>●</Badge>
                  <span className="ml-auto flex items-center gap-1 text-xs text-fg-muted">
                    <Users size={14} />
                    {table.playerCount}/{table.max_players}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div>
                    <p className="text-lg font-bold text-fg">STÓŁ #{table.join_code}</p>
                    <p className="mt-1 text-xs text-fg-muted">
                      Blindy: {table.small_blind}/{table.big_blind}
                    </p>
                    <p className="text-xs text-fg-muted">Utworzony {formatTime(table.created_at)}</p>
                  </div>
                  <ChevronRight size={20} className="text-fg-muted" />
                </div>
              </Card>
            </SwipeToDelete>
          )
        })}
      </div>

      <Link to="/tables/new" className="mt-4 block">
        <Button color="neutral" tone="outline" fullWidth>
          + UTWÓRZ NOWY STÓŁ
        </Button>
      </Link>

      <div className="mt-6">
        <p className="mb-1 text-sm font-semibold text-fg">Dołącz do stołu</p>
        <p className="mb-3 text-xs text-fg-muted">Wpisz kod stołu i swoje imię</p>

        <input
          type="text"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          placeholder="Twoje imię"
          maxLength={20}
          className="mb-3 w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-fg outline-none focus:border-brand-green"
        />

        <div className="flex items-center justify-center gap-3">
          <CodeInput value={joinCode} onChange={setJoinCode} />
          <Button
            color="primary"
            tone="solid"
            disabled={joinCode.length < 4 || playerName.trim().length === 0 || joining}
            onClick={handleJoin}
          >
            {joining ? '...' : 'DOŁĄCZ'}
          </Button>
        </div>
        {joinError && <p className="mt-2 text-center text-sm text-brand-red">{joinError}</p>}
      </div>
    </div>
  )
}
