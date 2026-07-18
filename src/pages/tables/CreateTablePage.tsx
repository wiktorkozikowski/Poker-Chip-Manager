import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { useCreateTable } from '../../hooks/useCreateTable'
import { useLocalTables } from '../../hooks/useLocalTables'

/**
 * Uwaga: brak szkicu graficznego dla tego ekranu — stylizacja utrzymana w
 * spójności z resztą dark theme, do doprecyzowania gdy pojawi się mockup.
 */
export function CreateTablePage() {
  const navigate = useNavigate()
  const { createTable, loading, error } = useCreateTable()
  const { addTable } = useLocalTables()

  const [hostName, setHostName] = useState('')
  const [maxPlayers, setMaxPlayers] = useState(6)
  const [smallBlind, setSmallBlind] = useState(20)
  const [bigBlind, setBigBlind] = useState(40)
  const [startingChips, setStartingChips] = useState(1500)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()

    const result = await createTable({ hostName, maxPlayers, smallBlind, bigBlind, startingChips })
    if (!result) return

    addTable({
      tableId: result.table.id,
      joinCode: result.table.join_code,
      playerId: result.hostPlayer.id,
      playerName: result.hostPlayer.name,
    })

    navigate(`/tables/${result.table.id}/lobby`)
  }

  return (
    <div className="p-4">
      <header className="mb-6 flex items-center gap-3">
        <Link to="/tables" aria-label="Wróć">
          <ChevronLeft size={22} className="text-fg" />
        </Link>
        <h1 className="text-base font-semibold text-fg">Utwórz nowy stół</h1>
      </header>

      <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm text-fg-muted">Twoje imię</span>
          <input
            type="text"
            required
            value={hostName}
            onChange={(e) => setHostName(e.target.value)}
            placeholder="np. Adam"
            className="rounded-xl border border-border bg-surface-2 px-4 py-3 text-fg outline-none focus:border-brand-green"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm text-fg-muted">Liczba graczy</span>
          <input
            type="number"
            min={2}
            max={10}
            value={maxPlayers}
            onChange={(e) => setMaxPlayers(Number(e.target.value))}
            className="rounded-xl border border-border bg-surface-2 px-4 py-3 text-fg outline-none focus:border-brand-green"
          />
        </label>

        <div className="flex gap-3">
          <label className="flex flex-1 flex-col gap-1.5">
            <span className="text-sm text-fg-muted">Small blind</span>
            <input
              type="number"
              min={1}
              value={smallBlind}
              onChange={(e) => setSmallBlind(Number(e.target.value))}
              className="rounded-xl border border-border bg-surface-2 px-4 py-3 text-fg outline-none focus:border-brand-green"
            />
          </label>
          <label className="flex flex-1 flex-col gap-1.5">
            <span className="text-sm text-fg-muted">Big blind</span>
            <input
              type="number"
              min={1}
              value={bigBlind}
              onChange={(e) => setBigBlind(Number(e.target.value))}
              className="rounded-xl border border-border bg-surface-2 px-4 py-3 text-fg outline-none focus:border-brand-green"
            />
          </label>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm text-fg-muted">Startowa wartość żetonów</span>
          <input
            type="number"
            min={1}
            value={startingChips}
            onChange={(e) => setStartingChips(Number(e.target.value))}
            className="rounded-xl border border-border bg-surface-2 px-4 py-3 text-fg outline-none focus:border-brand-green"
          />
        </label>

        {error && <p className="text-sm text-brand-red">{error}</p>}

        <Button color="primary" tone="solid" fullWidth className="mt-4" disabled={loading}>
          {loading ? 'TWORZENIE...' : 'UTWÓRZ STÓŁ'}
        </Button>
      </form>
    </div>
  )
}
