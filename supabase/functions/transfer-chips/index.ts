// Edge Function: transfer-chips
// Ręczny transfer żetonów między graczami przy tym samym stole, dostępny w
// dowolnym momencie (nie tylko w trakcie ręki). Klient nigdy nie zapisuje
// chip_total bezpośrednio (RLS nie ma polityki UPDATE dla anon).
import { createClient } from 'jsr:@supabase/supabase-js@2'

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
    const { tableId, fromPlayerId, toPlayerId, amount } = (await req.json()) as {
      tableId?: string
      fromPlayerId?: string
      toPlayerId?: string
      amount?: number
    }

    if (!tableId || !fromPlayerId || !toPlayerId || !amount) {
      return json({ error: 'Brak tableId, fromPlayerId, toPlayerId lub amount.' }, 400)
    }
    if (fromPlayerId === toPlayerId) return json({ error: 'Nie można przekazać żetonów samemu sobie.' }, 400)
    if (amount <= 0) return json({ error: 'Kwota musi być dodatnia.' }, 400)

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('*')
      .eq('table_id', tableId)
      .in('id', [fromPlayerId, toPlayerId])
    if (playersError || !players) return json({ error: 'Nie udało się pobrać graczy.' }, 500)

    const from = players.find((p) => p.id === fromPlayerId)
    const to = players.find((p) => p.id === toPlayerId)
    if (!from || !to) return json({ error: 'Gracz nie należy do tego stołu.' }, 404)
    if (from.chip_total < amount) return json({ error: 'Nie masz tylu żetonów.' }, 400)

    const { error: fromError } = await supabase
      .from('players')
      .update({ chip_total: from.chip_total - amount })
      .eq('id', from.id)
    if (fromError) return json({ error: fromError.message }, 500)

    const { error: toError } = await supabase
      .from('players')
      .update({ chip_total: to.chip_total + amount })
      .eq('id', to.id)
    if (toError) return json({ error: toError.message }, 500)

    await supabase.from('actions_log').insert({
      table_id: tableId,
      player_id: from.id,
      target_player_id: to.id,
      action_type: 'transfer',
      amount,
    })

    return json({ ok: true }, 200)
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Nieznany błąd.' }, 500)
  }
})
