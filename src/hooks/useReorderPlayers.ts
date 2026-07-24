import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { functionErrorMessage } from '../lib/functionErrorMessage'

/** Wywołuje Edge Function `reorder-players` — host zmienia kolejność miejsc (tylko w lobby). */
export function useReorderPlayers() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function reorderPlayers(tableId: string, hostPlayerId: string, orderedPlayerIds: string[]): Promise<boolean> {
    setLoading(true)
    setError(null)

    const { error: invokeError } = await supabase.functions.invoke('reorder-players', {
      body: { tableId, hostPlayerId, orderedPlayerIds },
    })

    setLoading(false)

    if (invokeError) {
      setError(await functionErrorMessage(invokeError, 'Nie udało się zmienić kolejności.'))
      return false
    }

    return true
  }

  return { reorderPlayers, loading, error }
}
