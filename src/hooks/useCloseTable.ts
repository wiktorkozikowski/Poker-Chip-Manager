import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { functionErrorMessage } from '../lib/functionErrorMessage'

/** Wywołuje Edge Function `close-table` — host zamyka stół na zawsze. */
export function useCloseTable() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function closeTable(tableId: string, hostPlayerId: string): Promise<boolean> {
    setLoading(true)
    setError(null)

    const { error: invokeError } = await supabase.functions.invoke('close-table', {
      body: { tableId, hostPlayerId },
    })

    setLoading(false)

    if (invokeError) {
      setError(await functionErrorMessage(invokeError, 'Nie udało się zamknąć stołu.'))
      return false
    }

    return true
  }

  return { closeTable, loading, error }
}
