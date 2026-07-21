import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { TableRow } from '../types/database'

export interface MyTableSummary extends TableRow {
  /** Liczba graczy aktualnie ONLINE przy stole (Presence), nie liczba dołączonych ogółem. */
  playerCount: number
  isHost: boolean
}

/**
 * Stoły, do których należy zalogowany użytkownik (user_id w players) —
 * "Moje Stoły" to teraz prawdziwe zapytanie do bazy, nie lista z localStorage.
 *
 * Skład stołów (kto do nich należy) pobierany jest raz przy wejściu na
 * ekran — bez realtime, bo to się rzadko zmienia w trakcie oglądania listy.
 * Liczba graczy online natomiast jest "na żywo": dla każdego stołu z listy
 * (max 4, patrz limit aktywnych stołów) obserwujemy ten sam kanał Presence
 * co GamePage/LobbyPage (`table-${id}`), bez `track()` — ten widok tylko
 * podgląda, kto jest podłączony, sam się nie "melduje" jako obecny.
 */
export function useMyTablesData(userId: string | undefined) {
  const [tables, setTables] = useState<TableRow[]>([])
  const [isHostByTable, setIsHostByTable] = useState<Map<string, boolean>>(new Map())
  const [onlineCounts, setOnlineCounts] = useState<Map<string, number>>(new Map())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) {
      setTables([])
      setIsHostByTable(new Map())
      setOnlineCounts(new Map())
      setLoading(false)
      return
    }

    const id = userId
    let cancelled = false
    setLoading(true)

    async function load() {
      const { data: myRows } = await supabase
        .from('players')
        .select('table_id, position')
        .eq('user_id', id)
        .is('left_at', null)
      const tableIds = [...new Set((myRows ?? []).map((r) => r.table_id))]
      const myPositionByTable = new Map((myRows ?? []).map((r) => [r.table_id, r.position]))

      if (tableIds.length === 0) {
        if (!cancelled) {
          setTables([])
          setIsHostByTable(new Map())
          setOnlineCounts(new Map())
          setLoading(false)
        }
        return
      }

      const { data: tablesData } = await supabase.from('tables').select('*').in('id', tableIds)
      if (cancelled) return

      setTables(tablesData ?? [])
      setIsHostByTable(new Map(tableIds.map((tid) => [tid, myPositionByTable.get(tid) === 0])))
      setLoading(false)
    }

    load()

    return () => {
      cancelled = true
    }
  }, [userId])

  useEffect(() => {
    if (tables.length === 0) {
      setOnlineCounts(new Map())
      return
    }

    const channels = tables.map((t) => {
      const channel = supabase.channel(`table-${t.id}`)
      channel
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState<{ user_id: string }>()
          const uniqueUserIds = new Set(Object.values(state).flat().map((p) => p.user_id))
          setOnlineCounts((prev) => new Map(prev).set(t.id, uniqueUserIds.size))
        })
        .subscribe()
      return channel
    })

    return () => {
      for (const channel of channels) supabase.removeChannel(channel)
    }
  }, [tables])

  const data: MyTableSummary[] = tables.map((t) => ({
    ...t,
    playerCount: onlineCounts.get(t.id) ?? 0,
    isHost: isHostByTable.get(t.id) ?? false,
  }))

  return { data, loading }
}
