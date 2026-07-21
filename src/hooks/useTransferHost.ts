import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

/** Wywołuje Edge Function `transfer-host` — host przekazuje rolę innemu graczowi. */
export function useTransferHost() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function transferHost(tableId: string, hostPlayerId: string, targetPlayerId: string): Promise<boolean> {
    setLoading(true)
    setError(null)

    const { data, error: invokeError } = await supabase.functions.invoke('transfer-host', {
      body: { tableId, hostPlayerId, targetPlayerId },
    })

    setLoading(false)

    if (invokeError) {
      setError(data?.error ?? invokeError.message)
      return false
    }

    return true
  }

  return { transferHost, loading, error }
}
