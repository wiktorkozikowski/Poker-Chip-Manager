import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { PlayerRow, TableRow } from '../types/database'

/**
 * Jednorazowe pobranie stołu wraz z graczami. Realtime subskrypcja
 * (aktualizacja na żywo listy graczy w Lobby) to Faza 2 — na razie dane
 * odświeżają się tylko przy wejściu na ekran.
 */
export function useTableWithPlayers(tableId: string | undefined) {
  const [table, setTable] = useState<TableRow | null>(null)
  const [players, setPlayers] = useState<PlayerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

    return () => {
      cancelled = true
    }
  }, [tableId])

  return { table, players, loading, error }
}
