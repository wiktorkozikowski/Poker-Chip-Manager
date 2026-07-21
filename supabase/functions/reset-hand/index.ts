// Edge Function: reset-hand
// Host anuluje bieżące rozdanie w trakcie gry — każdy obecny gracz odzyskuje
// dokładnie to, co wpłacił w tej ręce (total_invested), pot wraca do 0, a
// nowa ręka startuje od razu przy TYM SAMYM dealerze (poprzednia i tak nie
// zakończyła się normalnie, więc rotacja nie ma sensu — patrz
// computeResetHand w src/game-logic/startGame.ts).
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { computeResetHand } from '../../../src/game-logic/startGame.ts'
import type { GamePlayer } from '../../../src/game-logic/types.ts'
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
      supabase.from('players').select('*').eq('table_id', tableId).is('left_at', null).order('position'),
    ])
    if (!callerUserId) return json({ error: 'Brak autoryzacji.' }, 401)
    if (tableError || !table) return json({ error: 'Nie znaleziono stołu.' }, 404)
    if (table.status !== 'active') return json({ error: 'Stolik nie jest w trakcie gry.' }, 409)
    if (playersError || !playerRows) return json({ error: 'Nie udało się pobrać graczy.' }, 500)

    const host = playerRows.find((p) => p.position === 0)
    if (!host || host.id !== hostPlayerId) {
      return json({ error: 'Tylko host może zresetować rozdanie.' }, 403)
    }
    if (host.user_id !== callerUserId) {
      return json({ error: 'Nie możesz wykonać akcji za innego gracza.' }, 403)
    }

    // Zwrot postawionej kasy: każdy dostaje z powrotem dokładnie to, co sam
    // wpłacił w tej ręce (total_invested obejmuje blindy + wszystkie
    // call/raise na wszystkich dotychczasowych ulicach tego rozdania).
    const refundedPlayers: GamePlayer[] = playerRows.map((p) => ({
      id: p.id,
      name: p.name,
      chipTotal: p.chip_total + p.total_invested,
      position: p.position,
      status: 'active',
      currentRoundBet: 0,
      totalInvested: 0,
      isDealer: p.is_dealer,
      isSmallBlind: p.is_small_blind,
      isBigBlind: p.is_big_blind,
      lastAction: null,
    }))

    let result
    try {
      result = computeResetHand(refundedPlayers, table.small_blind, table.big_blind, table.dealer_position)
    } catch (err) {
      return json({ error: err instanceof Error ? err.message : 'Nie udało się zresetować rozdania.' }, 400)
    }

    const playerUpdates = result.players.map((p) =>
      supabase
        .from('players')
        .update({
          chip_total: p.chipTotal,
          current_round_bet: p.currentRoundBet,
          total_invested: p.totalInvested,
          status: p.status,
          is_dealer: p.isDealer,
          is_small_blind: p.isSmallBlind,
          is_big_blind: p.isBigBlind,
          last_action: p.lastAction,
        })
        .eq('id', p.id),
    )

    const tableUpdate = supabase
      .from('tables')
      .update({
        pot: result.pot,
        current_bet: result.currentBet,
        dealer_position: result.dealerPosition,
        current_turn_position: result.currentTurnPosition,
        last_raiser_position: result.lastRaiserPosition,
        current_round: 'preflop',
        players_to_act: result.playersToAct,
        showdown_from_round: null,
      })
      .eq('id', tableId)

    const logInsert = supabase
      .from('actions_log')
      .insert({ table_id: tableId, player_id: host.id, action_type: 'reset_hand', amount: table.pot })

    const writeResults = await Promise.all([...playerUpdates, tableUpdate, logInsert])
    const writeError = writeResults.find((r) => r.error)?.error
    if (writeError) return json({ error: writeError.message }, 500)

    return json({ ok: true }, 200)
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Nieznany błąd.' }, 500)
  }
})
