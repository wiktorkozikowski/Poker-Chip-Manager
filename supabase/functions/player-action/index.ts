// Edge Function: player-action
// Waliduje i wykonuje pojedynczą akcję gracza (check/call/raise/fold) przez
// czysty silnik w src/game-logic/bettingRound.ts. Klient nigdy nie zapisuje
// chip_total/pot bezpośrednio (RLS nie ma polityki UPDATE dla anon) — to
// jedyna droga zmiany stanu licytacji, więc nie da się tego obejść z devtools.
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { applyAction } from '../../../src/game-logic/bettingRound.ts'
import type { BettingAction, GamePlayer, GameTableState } from '../../../src/game-logic/types.ts'

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
    const { tableId, playerId, action, raiseTo } = (await req.json()) as {
      tableId?: string
      playerId?: string
      action?: BettingAction
      raiseTo?: number
    }

    if (!tableId || !playerId || !action) {
      return json({ error: 'Brak tableId, playerId lub action.' }, 400)
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const { data: table, error: tableError } = await supabase.from('tables').select('*').eq('id', tableId).single()
    if (tableError || !table) return json({ error: 'Nie znaleziono stołu.' }, 404)
    if (table.status !== 'active') return json({ error: 'Stolik nie jest w trakcie gry.' }, 409)

    const { data: playerRows, error: playersError } = await supabase
      .from('players')
      .select('*')
      .eq('table_id', tableId)
      .order('position')
    if (playersError || !playerRows) return json({ error: 'Nie udało się pobrać graczy.' }, 500)

    const domainPlayers: GamePlayer[] = playerRows.map((p) => ({
      id: p.id,
      name: p.name,
      chipTotal: p.chip_total,
      position: p.position,
      status: p.status,
      currentRoundBet: p.current_round_bet,
      isDealer: p.is_dealer,
      isSmallBlind: p.is_small_blind,
      isBigBlind: p.is_big_blind,
    }))

    const state: GameTableState = {
      smallBlind: table.small_blind,
      bigBlind: table.big_blind,
      pot: table.pot,
      currentBet: table.current_bet,
      dealerPosition: table.dealer_position,
      currentTurnPosition: table.current_turn_position,
      lastRaiserPosition: table.last_raiser_position,
      currentRound: table.current_round,
      playersToAct: table.players_to_act,
      players: domainPlayers,
    }

    let result: GameTableState
    try {
      result = applyAction(state, playerId, action, raiseTo)
    } catch (err) {
      return json({ error: err instanceof Error ? err.message : 'Nieprawidłowa akcja.' }, 400)
    }

    for (const p of result.players) {
      const before = domainPlayers.find((d) => d.id === p.id)!
      if (
        before.chipTotal !== p.chipTotal ||
        before.currentRoundBet !== p.currentRoundBet ||
        before.status !== p.status
      ) {
        const { error: updateError } = await supabase
          .from('players')
          .update({ chip_total: p.chipTotal, current_round_bet: p.currentRoundBet, status: p.status })
          .eq('id', p.id)
        if (updateError) return json({ error: updateError.message }, 500)
      }
    }

    const { error: tableUpdateError } = await supabase
      .from('tables')
      .update({
        pot: result.pot,
        current_bet: result.currentBet,
        current_turn_position: result.currentTurnPosition,
        last_raiser_position: result.lastRaiserPosition,
        current_round: result.currentRound,
        players_to_act: result.playersToAct,
      })
      .eq('id', tableId)
    if (tableUpdateError) return json({ error: tableUpdateError.message }, 500)

    const actor = domainPlayers.find((p) => p.id === playerId)!
    const actionAmount =
      action === 'raise'
        ? raiseTo!
        : action === 'call'
          ? result.players.find((p) => p.id === playerId)!.currentRoundBet
          : null
    await supabase
      .from('actions_log')
      .insert({ table_id: tableId, player_id: actor.id, action_type: action, amount: actionAmount })

    return json({ ok: true, currentRound: result.currentRound }, 200)
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Nieznany błąd.' }, 500)
  }
})
