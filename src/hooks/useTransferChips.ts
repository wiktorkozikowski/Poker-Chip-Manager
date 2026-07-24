import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { functionErrorMessage } from '../lib/functionErrorMessage'

/**
 * Wywołuje Edge Function `transfer-chips` — jedyny sposób ręcznego
 * przekazania żetonów między graczami (korekta pomyłek, w dowolnym momencie).
 */
export function useTransferChips() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function transferChips(
    tableId: string,
    fromPlayerId: string,
    toPlayerId: string,
    amount: number,
  ): Promise<boolean> {
    setLoading(true)
    setError(null)

    const { error: invokeError } = await supabase.functions.invoke('transfer-chips', {
      body: { tableId, fromPlayerId, toPlayerId, amount },
    })

    setLoading(false)

    if (invokeError) {
      setError(await functionErrorMessage(invokeError, 'Nie udało się przekazać żetonów.'))
      return false
    }

    return true
  }

  return { transferChips, loading, error }
}
