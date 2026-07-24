import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { functionErrorMessage } from '../lib/functionErrorMessage'

/** Wywołuje Edge Function `kick-player` — host usuwa gracza ze stołu. */
export function useKickPlayer() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function kickPlayer(tableId: string, hostPlayerId: string, targetPlayerId: string): Promise<boolean> {
    setLoading(true)
    setError(null)

    const { error: invokeError } = await supabase.functions.invoke('kick-player', {
      body: { tableId, hostPlayerId, targetPlayerId },
    })

    setLoading(false)

    if (invokeError) {
      setError(await functionErrorMessage(invokeError, 'Nie udało się usunąć gracza.'))
      return false
    }

    return true
  }

  return { kickPlayer, loading, error }
}
