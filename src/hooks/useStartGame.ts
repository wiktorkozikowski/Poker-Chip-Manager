import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { functionErrorMessage } from '../lib/functionErrorMessage'

/**
 * Wywołuje Edge Function `start-game` — jedyny sposób przejścia stołu z
 * 'lobby' do 'active'. Walidacja (kto jest hostem, ilu graczy, przypisanie
 * dealera/blindów) dzieje się po stronie serwera, patrz
 * supabase/functions/start-game.
 */
export function useStartGame() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function startGame(tableId: string, playerId: string): Promise<boolean> {
    setLoading(true)
    setError(null)

    const { error: invokeError } = await supabase.functions.invoke('start-game', {
      body: { tableId, playerId },
    })

    setLoading(false)

    if (invokeError) {
      setError(await functionErrorMessage(invokeError, 'Nie udało się rozpocząć gry.'))
      return false
    }

    return true
  }

  return { startGame, loading, error }
}
