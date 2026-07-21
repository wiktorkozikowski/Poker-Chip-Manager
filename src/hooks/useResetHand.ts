import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

/** Wywołuje Edge Function `reset-hand` — host anuluje bieżące rozdanie, żetony wracają do graczy. */
export function useResetHand() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function resetHand(tableId: string, hostPlayerId: string): Promise<boolean> {
    setLoading(true)
    setError(null)

    const { data, error: invokeError } = await supabase.functions.invoke('reset-hand', {
      body: { tableId, hostPlayerId },
    })

    setLoading(false)

    if (invokeError) {
      setError(data?.error ?? invokeError.message)
      return false
    }

    return true
  }

  return { resetHand, loading, error }
}
