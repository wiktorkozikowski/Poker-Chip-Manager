import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'

/**
 * Tożsamość użytkownika przez Supabase Auth — pełne konto (email/hasło) albo
 * trwały gość (logowanie anonimowe). Obie ścieżki dają prawdziwe `auth.uid()`,
 * które jest teraz źródłem prawdy o tym, kim jest gracz przy stole (patrz
 * migracja 20260720070000_auth_identity.sql) — koniec z fragile localStorage.
 *
 * Kontekst (nie osobny hook per komponent) celowo — sesja i onAuthStateChange
 * subskrypcja są jedne, współdzielone. Osobne instancje per komponent
 * powodowały realny bug: pierwszy render łapał user=null zanim getSession()
 * zdążyło się rozwiązać, a useState() z tą wartością zamrażał ją na stałe
 * (np. puste pole "Twoje imię" mimo zalogowania).
 */
interface AuthContextValue {
  user: User | null
  loading: boolean
  displayName: string
  isGuest: boolean
  signInAsGuest: (displayName: string) => Promise<User | null>
  signUp: (email: string, password: string, displayName: string) => Promise<User | null>
  signIn: (email: string, password: string) => Promise<User | null>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      setLoading(false)
    })

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.subscription.unsubscribe()
  }, [])

  async function signInAsGuest(displayName: string) {
    const { data, error } = await supabase.auth.signInAnonymously({ options: { data: { display_name: displayName } } })
    if (error) throw error
    return data.user
  }

  async function signUp(email: string, password: string, displayName: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    })
    if (error) throw error
    return data.user
  }

  async function signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data.user
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  const displayName = (user?.user_metadata?.display_name as string | undefined) ?? ''
  const isGuest = user?.is_anonymous ?? false

  return (
    <AuthContext.Provider
      value={{ user, loading, displayName, isGuest, signInAsGuest, signUp, signIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth musi być użyty wewnątrz <AuthProvider>.')
  return ctx
}
