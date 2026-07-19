import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

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

    const { data, error: invokeError } = await supabase.functions.invoke('start-game', {
      body: { tableId, playerId },
    })

    setLoading(false)

    if (invokeError) {
      setError(data?.error ?? invokeError.message)
      return false
    }

    return true
  }

  return { startGame, loading, error }
}
