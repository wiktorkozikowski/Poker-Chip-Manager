import { useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '../../components/ui/Button'
import { useAuth } from '../../hooks/AuthContext'

type Mode = 'login' | 'register' | 'guest'

const TABS: { mode: Mode; label: string }[] = [
  { mode: 'login', label: 'Zaloguj się' },
  { mode: 'register', label: 'Zarejestruj się' },
  { mode: 'guest', label: 'Gość' },
]

/**
 * Ekran wejściowy — pokazywany zamiast całej reszty apki, dopóki nie ma
 * sesji (pełne konto albo gość). Patrz App.tsx.
 */
export function AuthGatePage() {
  const { signIn, signUp, signInAsGuest } = useAuth()
  const [mode, setMode] = useState<Mode>('guest')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setLoading(true)
    try {
      if (mode === 'login') {
        await signIn(email, password)
      } else if (mode === 'register') {
        await signUp(email, password, name)
        setInfo('Konto utworzone — sprawdź e-mail, żeby je potwierdzić, a potem się zaloguj.')
      } else {
        await signInAsGuest(name)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Coś poszło nie tak.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-svh flex-col justify-center p-4">
      <h1 className="mb-1 text-center text-xl font-bold text-fg">Poker Chip Manager</h1>
      <p className="mb-6 text-center text-sm text-fg-muted">Zaloguj się, żeby dołączyć do stołu.</p>

      <div className="mb-6 flex rounded-xl bg-surface-2 p-1">
        {TABS.map((tab) => (
          <button
            key={tab.mode}
            type="button"
            onClick={() => {
              setMode(tab.mode)
              setError(null)
              setInfo(null)
            }}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
              mode === tab.mode ? 'bg-brand-green text-black' : 'text-fg-muted'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        {mode !== 'login' && (
          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-fg-muted">Twoje imię</span>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="np. Adam"
              maxLength={20}
              className="rounded-xl border border-border bg-surface-2 px-4 py-3 text-fg outline-none focus:border-brand-green"
            />
          </label>
        )}

        {mode !== 'guest' && (
          <>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm text-fg-muted">E-mail</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-xl border border-border bg-surface-2 px-4 py-3 text-fg outline-none focus:border-brand-green"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm text-fg-muted">Hasło</span>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-xl border border-border bg-surface-2 px-4 py-3 text-fg outline-none focus:border-brand-green"
              />
            </label>
          </>
        )}

        {error && <p className="text-sm text-brand-red">{error}</p>}
        {info && <p className="text-sm text-brand-green">{info}</p>}

        <Button color="primary" tone="solid" fullWidth disabled={loading} className="mt-2">
          {loading
            ? 'CHWILA...'
            : mode === 'login'
              ? 'ZALOGUJ SIĘ'
              : mode === 'register'
                ? 'ZAŁÓŻ KONTO'
                : 'GRAJ JAKO GOŚĆ'}
        </Button>
      </form>
    </div>
  )
}
