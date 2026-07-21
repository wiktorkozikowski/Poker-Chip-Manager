import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { PlayerRow, TableRow } from '../types/database'

interface JoinTableResult {
  table: TableRow
  player: PlayerRow
}

/**
 * Dołącza gracza do stołu po kodzie. Prosty zapis z frontendu — RLS na
 * `players` sam odrzuci insert, jeśli stolik nie jest w lobby albo jest
 * już pełny (patrz supabase/migrations/0002_lobby_writes.sql).
 */
export function useJoinTable() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function joinTable(joinCode: string, playerName: string, userId: string): Promise<JoinTableResult | null> {
    setLoading(true)
    setError(null)

    try {
      const { data: table, error: tableError } = await supabase
        .from('tables')
        .select('*')
        .eq('join_code', joinCode.toUpperCase())
        .maybeSingle()

      if (tableError) throw tableError
      if (!table) throw new Error('Nie znaleziono stołu o tym kodzie.')
      if (table.status !== 'lobby') throw new Error('Ten stolik już rozpoczął grę.')

      const { data: myRows } = await supabase
        .from('players')
        .select('table_id')
        .eq('user_id', userId)
        .is('left_at', null)
      const myTableIds = [...new Set((myRows ?? []).map((r) => r.table_id))]
      if (myTableIds.length > 0) {
        const { count: activeCount } = await supabase
          .from('tables')
          .select('id', { count: 'exact', head: true })
          .in('id', myTableIds)
          .neq('status', 'finished')
        if ((activeCount ?? 0) >= 4) {
          throw new Error('Możesz należeć maksymalnie do 4 aktywnych stołów jednocześnie.')
        }
      }

      const { count } = await supabase
        .from('players')
        .select('id', { count: 'exact', head: true })
        .eq('table_id', table.id)

      if (count !== null && count >= table.max_players) {
        throw new Error('Stolik jest już pełny.')
      }

      const { data: player, error: playerError } = await supabase
        .from('players')
        .insert({
          table_id: table.id,
          user_id: userId,
          name: playerName,
          chip_total: table.starting_chips,
          position: count ?? 0,
        })
        .select()
        .single()

      if (playerError) throw playerError

      return { table, player }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się dołączyć do stołu.')
      return null
    } finally {
      setLoading(false)
    }
  }

  return { joinTable, loading, error }
}
