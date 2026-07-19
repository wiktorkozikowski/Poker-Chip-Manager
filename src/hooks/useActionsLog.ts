import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { ActionLogRow } from '../types/database'

/** Log zdarzeń stołu, najnowsze pierwsze, na żywo (realtime). */
export function useActionsLog(tableId: string | undefined) {
  const [entries, setEntries] = useState<ActionLogRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!tableId) return
    const id = tableId
    let cancelled = false
    setLoading(true)

    async function load() {
      const { data } = await supabase
        .from('actions_log')
        .select('*')
        .eq('table_id', id)
        .order('created_at', { ascending: false })
      if (!cancelled) {
        setEntries(data ?? [])
        setLoading(false)
      }
    }

    load()

    const channel = supabase
      .channel(`actions-log-${id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'actions_log', filter: `table_id=eq.${id}` },
        () => load(),
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [tableId])

  return { entries, loading }
}
