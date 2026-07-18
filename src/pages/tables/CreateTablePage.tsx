import { Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { Button } from '../../components/ui/Button'

/**
 * Uwaga: brak szkicu graficznego dla tego ekranu — stylizacja utrzymana w
 * spójności z resztą dark theme, do doprecyzowania gdy pojawi się mockup.
 */
export function CreateTablePage() {
  return (
    <div className="p-4">
      <header className="mb-6 flex items-center gap-3">
        <Link to="/tables" aria-label="Wróć">
          <ChevronLeft size={22} className="text-fg" />
        </Link>
        <h1 className="text-base font-semibold text-fg">Utwórz nowy stół</h1>
      </header>

      <form className="flex flex-col gap-5">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm text-fg-muted">Liczba graczy</span>
          <input
            type="number"
            min={2}
            max={10}
            defaultValue={6}
            className="rounded-xl border border-border bg-surface-2 px-4 py-3 text-fg outline-none focus:border-brand-green"
          />
        </label>

        <div className="flex gap-3">
          <label className="flex flex-1 flex-col gap-1.5">
            <span className="text-sm text-fg-muted">Small blind</span>
            <input
              type="number"
              min={1}
              defaultValue={20}
              className="rounded-xl border border-border bg-surface-2 px-4 py-3 text-fg outline-none focus:border-brand-green"
            />
          </label>
          <label className="flex flex-1 flex-col gap-1.5">
            <span className="text-sm text-fg-muted">Big blind</span>
            <input
              type="number"
              min={1}
              defaultValue={40}
              className="rounded-xl border border-border bg-surface-2 px-4 py-3 text-fg outline-none focus:border-brand-green"
            />
          </label>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm text-fg-muted">Startowa wartość żetonów</span>
          <input
            type="number"
            min={1}
            defaultValue={1500}
            className="rounded-xl border border-border bg-surface-2 px-4 py-3 text-fg outline-none focus:border-brand-green"
          />
        </label>

        <Button color="primary" tone="solid" fullWidth className="mt-4">
          UTWÓRZ STÓŁ
        </Button>
      </form>
    </div>
  )
}
