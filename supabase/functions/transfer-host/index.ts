// Edge Function: transfer-host
// Host przekazuje rolę innemu graczowi (position 0 to jedyny sposób ustalenia
// hosta w każdej funkcji tego projektu — więc "przekazanie roli" to fizyczna
// zamiana pozycji hosta z pozycją docelowego gracza). To jedyna droga, którą
// host może w ogóle opuścić stół bez zamykania go (leave-table blokuje
// position === 0).
//
// Dozwolone w lobby ORAZ gdy stół jest aktywny, ale między rozdaniami
// (current_round === 'showdown', czeka na resolve-round) — zablokowane w
// trakcie żywej ulicy licytacji, bo silnik (nextActivePosition) zakłada
// stały porządek pozycji w obrębie ulicy. Nawet w dozwolonym oknie zawsze
// remapujemy dealer_position/current_turn_position/last_raiser_position po
// tożsamości (nie po numerze), bo resolveRound.ts's computePotSplit czyta
// dealer_position numerycznie, nie player.is_dealer — bez remapowania transfer
// w trakcie showdown mógłby przypisać resztę z podziału puli złej osobie.
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
    const { tableId, hostPlayerId, targetPlayerId } = (await req.json()) as {
      tableId?: string
      hostPlayerId?: string
      targetPlayerId?: string
    }
    if (!tableId || !hostPlayerId || !targetPlayerId) {
      return json({ error: 'Brak tableId, hostPlayerId lub targetPlayerId.' }, 400)
    }
    if (hostPlayerId === targetPlayerId) {
      return json({ error: 'Jesteś już hostem.' }, 400)
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
    if (table.status === 'finished') return json({ error: 'Stolik jest już zamknięty.' }, 409)
    if (table.status === 'active' && table.current_round !== 'showdown') {
      return json({ error: 'Rolę hosta można przekazać dopiero po zakończeniu bieżącej ulicy.' }, 409)
    }
    if (playersError || !playerRows) return json({ error: 'Nie udało się pobrać graczy.' }, 500)

    const host = playerRows.find((p) => p.position === 0)
    if (!host || host.id !== hostPlayerId) {
      return json({ error: 'Tylko host może przekazać swoją rolę.' }, 403)
    }
    if (host.user_id !== callerUserId) {
      return json({ error: 'Nie możesz wykonać akcji za innego gracza.' }, 403)
    }

    const target = playerRows.find((p) => p.id === targetPlayerId)
    if (!target || target.left_at) {
      return json({ error: 'Nie znaleziono gracza.' }, 404)
    }

    const oldHostPosition = host.position
    const oldTargetPosition = target.position

    // Faza A: oboje na tymczasowe ujemne pozycje, dopiero potem faza B —
    // inaczej prosta zamiana dwóch pozycji łamie przejściowo unique(table_id, position).
    const phaseA = await Promise.all([
      supabase.from('players').update({ position: -1 }).eq('id', host.id),
      supabase.from('players').update({ position: -2 }).eq('id', target.id),
    ])
    const phaseAError = phaseA.find((r) => r.error)?.error
    if (phaseAError) return json({ error: phaseAError.message }, 500)

    const phaseB = await Promise.all([
      supabase.from('players').update({ position: oldTargetPosition }).eq('id', host.id),
      supabase.from('players').update({ position: oldHostPosition }).eq('id', target.id),
    ])
    const phaseBError = phaseB.find((r) => r.error)?.error
    if (phaseBError) return json({ error: phaseBError.message }, 500)

    const remap = (p: number) => (p === oldHostPosition ? oldTargetPosition : p === oldTargetPosition ? oldHostPosition : p)

    const { error: tableUpdateError } = await supabase
      .from('tables')
      .update({
        dealer_position: remap(table.dealer_position),
        current_turn_position: remap(table.current_turn_position),
        last_raiser_position: table.last_raiser_position === null ? null : remap(table.last_raiser_position),
      })
      .eq('id', tableId)
    if (tableUpdateError) return json({ error: tableUpdateError.message }, 500)

    return json({ ok: true }, 200)
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Nieznany błąd.' }, 500)
  }
})
