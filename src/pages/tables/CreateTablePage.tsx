import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { NumberInput } from '../../components/ui/NumberInput'
import { useCreateTable } from '../../hooks/useCreateTable'
import { useAuth } from '../../hooks/AuthContext'

// Stół zawsze przyjmuje do tylu graczy — host nie deklaruje liczby z góry,
// dołącza tylu, ilu faktycznie przyjdzie (do tego limitu).
const MAX_PLAYERS_PER_TABLE = 10

/**
 * Uwaga: brak szkicu graficznego dla tego ekranu — stylizacja utrzymana w
 * spójności z resztą dark theme, do doprecyzowania gdy pojawi się mockup.
 */
export function CreateTablePage() {
  const navigate = useNavigate()
  const { createTable, loading, error } = useCreateTable()
  const { user, displayName } = useAuth()

  const [hostName, setHostName] = useState(displayName)
  const [smallBlind, setSmallBlind] = useState(20)
  const [bigBlind, setBigBlind] = useState(40)
  const [startingChips, setStartingChips] = useState(1500)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!user) return

    // Bez deklarowania liczby graczy z góry — stół zawsze przyjmuje do
    // MAX_PLAYERS_PER_TABLE (limit egzekwowany też po stronie RLS).
    const result = await createTable({
      userId: user.id,
      hostName,
      maxPlayers: MAX_PLAYERS_PER_TABLE,
      smallBlind,
      bigBlind,
      startingChips,
    })
    if (!result) return

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

        <div className="flex gap-3">
          <label className="flex flex-1 flex-col gap-1.5">
            <span className="text-sm text-fg-muted">Small blind</span>
            <NumberInput
              min={1}
              value={smallBlind}
              onChange={setSmallBlind}
              className="rounded-xl border border-border bg-surface-2 px-4 py-3 text-fg outline-none focus:border-brand-green"
            />
          </label>
          <label className="flex flex-1 flex-col gap-1.5">
            <span className="text-sm text-fg-muted">Big blind</span>
            <NumberInput
              min={1}
              value={bigBlind}
              onChange={setBigBlind}
              className="rounded-xl border border-border bg-surface-2 px-4 py-3 text-fg outline-none focus:border-brand-green"
            />
          </label>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm text-fg-muted">Startowa wartość żetonów</span>
          <NumberInput
            min={1}
            value={startingChips}
            onChange={setStartingChips}
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
