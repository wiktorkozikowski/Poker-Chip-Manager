import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

/** Wywołuje Edge Function `leave-table` — gracz opuszcza stół na zawsze. */
export function useLeaveTable() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function leaveTable(tableId: string, playerId: string): Promise<boolean> {
    setLoading(true)
    setError(null)

    const { data, error: invokeError } = await supabase.functions.invoke('leave-table', {
      body: { tableId, playerId },
    })

    setLoading(false)

    if (invokeError) {
      setError(data?.error ?? invokeError.message)
      return false
    }

    return true
  }

  return { leaveTable, loading, error }
}
