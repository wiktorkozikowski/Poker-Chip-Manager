import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { functionErrorMessage } from '../lib/functionErrorMessage'

/**
 * Wywołuje Edge Function `resolve-round` — jedyny sposób wypłaty puli.
 * Wypłata, reset stanu rundy i start nowej ręki (rotacja dealera, nowe
 * blindy) dzieją się atomowo po stronie serwera, patrz
 * supabase/functions/resolve-round.
 */
export function useResolveRound() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function resolveRound(tableId: string, dealerPlayerId: string, winnerIds: string[]): Promise<boolean> {
    setLoading(true)
    setError(null)

    const { error: invokeError } = await supabase.functions.invoke('resolve-round', {
      body: { tableId, dealerPlayerId, winnerIds },
    })

    setLoading(false)

    if (invokeError) {
      setError(await functionErrorMessage(invokeError, 'Nie udało się rozstrzygnąć rozdania.'))
      return false
    }

    return true
  }

  return { resolveRound, loading, error }
}
