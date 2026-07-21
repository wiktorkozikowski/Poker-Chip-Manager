// Edge Function: close-table
// Host zamyka stół na zawsze (status -> 'finished'). Zawsze dozwolone, także
// w trakcie aktywnej gry — serwer niczego nie rozlicza, ostrzeżenie o
// nierozliczonych żetonach to czysto kliencka treść w dialogu potwierdzenia.
// Update (nie DELETE!) — useTableWithPlayers subskrybuje 'tables' tylko na
// event:'UPDATE', a DELETE zniszczyłby też historię w actions_log.
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
    const { tableId, hostPlayerId } = (await req.json()) as { tableId?: string; hostPlayerId?: string }
    if (!tableId || !hostPlayerId) {
      return json({ error: 'Brak tableId lub hostPlayerId.' }, 400)
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
    if (playersError || !playerRows) return json({ error: 'Nie udało się pobrać graczy.' }, 500)

    const host = playerRows.find((p) => p.position === 0)
    if (!host || host.id !== hostPlayerId) {
      return json({ error: 'Tylko host może zamknąć stół.' }, 403)
    }
    if (host.user_id !== callerUserId) {
      return json({ error: 'Nie możesz wykonać akcji za innego gracza.' }, 403)
    }

    const { error } = await supabase.from('tables').update({ status: 'finished' }).eq('id', tableId)
    if (error) return json({ error: error.message }, 500)

    return json({ ok: true }, 200)
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Nieznany błąd.' }, 500)
  }
})
