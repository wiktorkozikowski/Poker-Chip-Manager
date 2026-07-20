import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { TableRow } from '../types/database'

export interface MyTableSummary extends TableRow {
  playerCount: number
}

/**
 * Stoły, do których należy zalogowany użytkownik (user_id w players) —
 * "Moje Stoły" to teraz prawdziwe zapytanie do bazy, nie lista z localStorage.
 * Bez realtime — wystarczy świeże zapytanie przy wejściu na ekran.
 */
export function useMyTablesData(userId: string | undefined) {
  const [data, setData] = useState<MyTableSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) {
      setData([])
      setLoading(false)
      return
    }

    const id = userId
    let cancelled = false
    setLoading(true)

    async function load() {
      const { data: myRows } = await supabase.from('players').select('table_id').eq('user_id', id)
      const tableIds = [...new Set((myRows ?? []).map((r) => r.table_id))]

      if (tableIds.length === 0) {
        if (!cancelled) {
          setData([])
          setLoading(false)
        }
        return
      }

      const [{ data: tables }, { data: players }] = await Promise.all([
        supabase.from('tables').select('*').in('id', tableIds),
        supabase.from('players').select('id, table_id').in('table_id', tableIds),
      ])

      if (cancelled) return

      const counts = new Map<string, number>()
      for (const p of players ?? []) {
        counts.set(p.table_id, (counts.get(p.table_id) ?? 0) + 1)
      }

      setData((tables ?? []).map((t) => ({ ...t, playerCount: counts.get(t.id) ?? 0 })))
      setLoading(false)
    }

    load()

    return () => {
      cancelled = true
    }
  }, [userId])

  return { data, loading }
}
