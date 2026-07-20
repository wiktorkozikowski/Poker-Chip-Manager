import { Button } from '../../components/ui/Button'
import { useAuth } from '../../hooks/AuthContext'

export function SettingsPage() {
  const { user, displayName, isGuest, signOut } = useAuth()

  return (
    <div className="p-4">
      <h1 className="text-base font-semibold text-fg">Ustawienia</h1>
      <p className="mt-2 text-sm text-fg-muted">Zawartość ustalimy później.</p>

      <div className="mt-6 rounded-2xl border border-border bg-surface p-4">
        <p className="text-sm text-fg">{displayName || 'Bez nazwy'}</p>
        <p className="text-xs text-fg-muted">{isGuest ? 'Konto gościa' : (user?.email ?? '')}</p>
        <Button color="neutral" tone="outline" className="mt-4" onClick={signOut}>
          Wyloguj się
        </Button>
      </div>
    </div>
  )
}
