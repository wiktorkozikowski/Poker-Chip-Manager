import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { PlayerRow, TableRow } from '../types/database'

/**
 * Stan stołu + graczy, na żywo. Początkowy fetch, a potem realtime
 * subskrypcja na `players`/`tables` (np. host klika "Start gry" i wszyscy
 * pozostali gracze widzą to bez odświeżania strony).
 */
export function useTableWithPlayers(tableId: string | undefined) {
  const [table, setTable] = useState<TableRow | null>(null)
  const [players, setPlayers] = useState<PlayerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reloadPlayers = useCallback(async (id: string) => {
    const { data } = await supabase.from('players').select('*').eq('table_id', id).order('position')
    setPlayers(data ?? [])
  }, [])

  useEffect(() => {
    if (!tableId) return
    const id = tableId
    let cancelled = false
    setLoading(true)

    async function load() {
      const [{ data: tableData, error: tableError }, { data: playersData, error: playersError }] =
        await Promise.all([
          supabase.from('tables').select('*').eq('id', id).single(),
          supabase.from('players').select('*').eq('table_id', id).order('position'),
        ])

      if (cancelled) return

      if (tableError || playersError) {
        setError(tableError?.message ?? playersError?.message ?? 'Błąd pobierania stołu.')
      } else {
        setTable(tableData)
        setPlayers(playersData ?? [])
      }
      setLoading(false)
    }

    load()

    const channel = supabase
      .channel(`table-${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'players', filter: `table_id=eq.${id}` },
        () => reloadPlayers(id),
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tables', filter: `id=eq.${id}` },
        (payload) => setTable(payload.new as TableRow),
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [tableId, reloadPlayers])

  return { table, players, loading, error }
}
