import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { functionErrorMessage } from '../lib/functionErrorMessage'
import type { BettingAction } from '../game-logic/types'

/**
 * Wywołuje Edge Function `player-action` — jedyny sposób wykonania
 * check/call/raise/fold. Walidacja (czyja kolej, legalność akcji, limity
 * podbicia) dzieje się po stronie serwera przez czysty silnik, patrz
 * supabase/functions/player-action i src/game-logic/bettingRound.ts.
 */
export function usePlayerAction() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function sendAction(
    tableId: string,
    playerId: string,
    action: BettingAction,
    raiseTo?: number,
  ): Promise<boolean> {
    setLoading(true)
    setError(null)

    const { error: invokeError } = await supabase.functions.invoke('player-action', {
      body: { tableId, playerId, action, raiseTo },
    })

    setLoading(false)

    if (invokeError) {
      setError(await functionErrorMessage(invokeError, 'Nie udało się wykonać akcji.'))
      return false
    }

    return true
  }

  return { sendAction, loading, error }
}
