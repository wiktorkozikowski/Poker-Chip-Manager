// Edge Function: reorder-players
// Host zmienia kolejność miejsc pozostałych graczy (host sam nigdy się nie
// przesuwa — position 0 jest jedynym sposobem ustalenia hosta w każdej
// funkcji tego projektu). Dostępne WYŁĄCZNIE w lobby — w trakcie aktywnej
// gry table.dealer_position/current_turn_position/last_raiser_position są
// surowymi wskaźnikami numerycznymi w przestrzeni position, a silnik
// (nextActivePosition) zakłada stały porządek pozycji w obrębie ulicy;
// przetasowanie mid-hand mogłoby kogoś pominąć albo zapytać dwa razy.
//
// Zapis dwufazowy: najpierw wszyscy przenoszeni gracze lądują na tymczasowych
// ujemnych pozycjach (gwarantowanie unikalnych), dopiero potem na docelowych —
// inaczej prosta zamiana dwóch pozycji w jednym Promise.all mogłaby przejściowo
// złamać unique(table_id, position).
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { getCallerUserId } from '../_shared/auth.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { tableId, hostPlayerId, orderedPlayerIds } = (await req.json()) as {
      tableId?: string
      hostPlayerId?: string
      orderedPlayerIds?: string[]
    }
    if (!tableId || !hostPlayerId || !Array.isArray(orderedPlayerIds)) {
      return json({ error: 'Brak tableId, hostPlayerId lub orderedPlayerIds.' }, 400)
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const [
      callerUserId,
      { data: table, error: tableError },
      { data: playerRows, error: playersError },
    ] = await Promise.all([
      getCallerUserId(req),
      supabase.from('tables').select('*').eq('id', tableId).single(),
      supabase.from('players').select('*').eq('table_id', tableId).order('position'),
    ])
    if (!callerUserId) return json({ error: 'Brak autoryzacji.' }, 401)
    if (tableError || !table) return json({ error: 'Nie znaleziono stołu.' }, 404)
    if (table.status !== 'lobby') return json({ error: 'Kolejność można zmieniać tylko przed startem gry.' }, 409)
    if (playersError || !playerRows) return json({ error: 'Nie udało się pobrać graczy.' }, 500)

    const host = playerRows.find((p) => p.position === 0)
    if (!host || host.id !== hostPlayerId) {
      return json({ error: 'Tylko host może zmieniać kolejność.' }, 403)
    }
    if (host.user_id !== callerUserId) {
      return json({ error: 'Nie możesz wykonać akcji za innego gracza.' }, 403)
    }

    const nonHostPresent = playerRows.filter((p) => !p.left_at && p.id !== host.id)
    const requestedIds = new Set(orderedPlayerIds)
    const isValidPermutation =
      orderedPlayerIds.length === nonHostPresent.length &&
      requestedIds.size === orderedPlayerIds.length &&
      nonHostPresent.every((p) => requestedIds.has(p.id))
    if (!isValidPermutation) {
      return json({ error: 'Nieprawidłowa lista kolejności graczy.' }, 400)
    }

    const slotPool = nonHostPresent.map((p) => p.position).sort((a, b) => a - b)
    const newPositionById = new Map(orderedPlayerIds.map((id, i) => [id, slotPool[i]]))

    // Faza A: wszyscy na tymczasowe ujemne pozycje — czekamy aż się w pełni
    // zakończy, zanim zaczniemy fazę B (sekwencyjnie między fazami, równolegle
    // w obrębie każdej), inaczej wracamy do tego samego ryzyka kolizji.
    const phaseA = await Promise.all(
      nonHostPresent.map((p, i) => supabase.from('players').update({ position: -(i + 1) }).eq('id', p.id)),
    )
    const phaseAError = phaseA.find((r) => r.error)?.error
    if (phaseAError) return json({ error: phaseAError.message }, 500)

    const phaseB = await Promise.all(
      orderedPlayerIds.map((id) => supabase.from('players').update({ position: newPositionById.get(id) }).eq('id', id)),
    )
    const phaseBError = phaseB.find((r) => r.error)?.error
    if (phaseBError) return json({ error: phaseBError.message }, 500)

    return json({ ok: true }, 200)
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Nieznany błąd.' }, 500)
  }
})
