import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

/** Wywołuje Edge Function `kick-player` — host usuwa gracza ze stołu. */
export function useKickPlayer() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function kickPlayer(tableId: string, hostPlayerId: string, targetPlayerId: string): Promise<boolean> {
    setLoading(true)
    setError(null)

    const { data, error: invokeError } = await supabase.functions.invoke('kick-player', {
      body: { tableId, hostPlayerId, targetPlayerId },
    })

    setLoading(false)

    if (invokeError) {
      setError(data?.error ?? invokeError.message)
      return false
    }

    return true
  }

  return { kickPlayer, loading, error }
}
