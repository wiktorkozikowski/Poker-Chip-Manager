import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from './AuthContext'
import type { PlayerRow, TableRow } from '../types/database'

/**
 * Stan stołu + graczy, na żywo. Początkowy fetch, a potem realtime
 * subskrypcja na `players`/`tables` (np. host klika "Start gry" i wszyscy
 * pozostali gracze widzą to bez odświeżania strony).
 *
 * `refetch` pozwala aktorowi własnej akcji (np. kliknął CALL) odświeżyć się
 * od razu z bazy zamiast czekać na powiadomienie Realtime, które potrafi
 * zająć kilka sekund — inni gracze i tak dostaną update przez Realtime.
 *
 * `onlineUserIds` — Supabase Realtime Presence na tym samym kanale: kto z
 * graczy ma teraz faktycznie otwartą tę stronę (nie to samo co "aktywny w
 * ręce" — to status połączenia urządzenia, nie stanu gry).
 */
export function useTableWithPlayers(tableId: string | undefined) {
  const { user } = useAuth()
  const [table, setTable] = useState<TableRow | null>(null)
  const [players, setPlayers] = useState<PlayerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set())

  const reloadPlayers = useCallback(async (id: string) => {
    const { data } = await supabase.from('players').select('*').eq('table_id', id).order('position')
    setPlayers(data ?? [])
  }, [])

  const fetchAll = useCallback(async (id: string) => {
    const [{ data: tableData, error: tableError }, { data: playersData, error: playersError }] = await Promise.all([
      supabase.from('tables').select('*').eq('id', id).single(),
      supabase.from('players').select('*').eq('table_id', id).order('position'),
    ])

    if (tableError || playersError) {
      setError(tableError?.message ?? playersError?.message ?? 'Błąd pobierania stołu.')
      return
    }
    setTable(tableData)
    setPlayers(playersData ?? [])
  }, [])

  const refetch = useCallback(async () => {
    if (!tableId) return
    await fetchAll(tableId)
  }, [tableId, fetchAll])

  useEffect(() => {
    if (!tableId) return
    const id = tableId
    let cancelled = false
    setLoading(true)

    fetchAll(id).then(() => {
      if (!cancelled) setLoading(false)
    })

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
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<{ user_id: string }>()
        const ids = new Set(Object.values(state).flat().map((p) => p.user_id))
        setOnlineUserIds(ids)
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED' && user) {
          channel.track({ user_id: user.id })
        }
      })

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [tableId, reloadPlayers, fetchAll, user])

  return { table, players, loading, error, refetch, onlineUserIds }
}
