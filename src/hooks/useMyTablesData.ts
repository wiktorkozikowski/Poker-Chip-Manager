import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { TableRow } from '../types/database'

export interface MyTableSummary extends TableRow {
  playerCount: number
}

/**
 * Dociąga ze Supabase aktualny stan stołów zapamiętanych lokalnie
 * (localStorage — patrz useLocalTables) wraz z liczbą dołączonych graczy.
 * Bez realtime — odświeżenie live listy w Lobby to Faza 2.
 */
export function useMyTablesData(tableIds: string[]) {
  const [data, setData] = useState<MyTableSummary[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (tableIds.length === 0) {
      setData([])
      return
    }

    let cancelled = false
    setLoading(true)

    async function load() {
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
  }, [tableIds.join(',')])

  return { data, loading }
}
