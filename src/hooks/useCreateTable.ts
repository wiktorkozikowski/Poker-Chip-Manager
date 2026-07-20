import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { generateJoinCode } from '../utils/joinCode'
import type { PlayerRow, TableRow } from '../types/database'

interface CreateTableInput {
  userId: string
  hostName: string
  maxPlayers: number
  smallBlind: number
  bigBlind: number
  startingChips: number
}

interface CreateTableResult {
  table: TableRow
  hostPlayer: PlayerRow
}

const MAX_JOIN_CODE_ATTEMPTS = 5

/**
 * Tworzy stolik i wstawia hosta jako pierwszego gracza (position 0).
 * Prosty zapis z frontendu — RLS dopuszcza insert na `tables`/`players`
 * w fazie lobby (patrz supabase/migrations/0002_lobby_writes.sql).
 */
export function useCreateTable() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function createTable(input: CreateTableInput): Promise<CreateTableResult | null> {
    setLoading(true)
    setError(null)

    try {
      let table: TableRow | null = null

      for (let attempt = 0; attempt < MAX_JOIN_CODE_ATTEMPTS; attempt++) {
        const { data, error: insertError } = await supabase
          .from('tables')
          .insert({
            join_code: generateJoinCode(),
            small_blind: input.smallBlind,
            big_blind: input.bigBlind,
            max_players: input.maxPlayers,
            starting_chips: input.startingChips,
          })
          .select()
          .single()

        if (!insertError) {
          table = data
          break
        }

        // 23505 = unique_violation — kod dołączenia już zajęty, spróbuj ponownie.
        if (insertError.code !== '23505') {
          throw insertError
        }
      }

      if (!table) {
        throw new Error('Nie udało się wylosować wolnego kodu dołączenia. Spróbuj ponownie.')
      }

      const { data: hostPlayer, error: playerError } = await supabase
        .from('players')
        .insert({
          table_id: table.id,
          user_id: input.userId,
          name: input.hostName,
          chip_total: input.startingChips,
          position: 0,
        })
        .select()
        .single()

      if (playerError) throw playerError

      return { table, hostPlayer }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się utworzyć stołu.')
      return null
    } finally {
      setLoading(false)
    }
  }

  return { createTable, loading, error }
}
