// Edge Function: leave-table
// Gracz opuszcza stół na zawsze (trwały marker left_at — nie kasujemy wiersza,
// żeby zachować jego historię w actions_log). Host nie może opuścić stołu bez
// wcześniejszego przekazania roli (patrz supabase/functions/transfer-host) —
// jedyny sposób ustalenia hosta w każdej funkcji to position === 0, więc
// odejście hosta zostawiłoby stół bez nikogo, kto mógłby nim zarządzać.
//
// W trakcie aktywnej ręki opuszczenie wymusza auto-fold przez czysty silnik
// (removePlayerFromHand) — dokładnie tak samo jak dobrowolny fold, tylko że
// może dotyczyć gracza, który akurat nie ma ruchu.
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { removePlayerFromHand } from '../../../src/game-logic/bettingRound.ts'
import type { GamePlayer, GameTableState } from '../../../src/game-logic/types.ts'
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
    const { tableId, playerId } = (await req.json()) as { tableId?: string; playerId?: string }
    if (!tableId || !playerId) {
      return json({ error: 'Brak tableId lub playerId.' }, 400)
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

    const player = playerRows.find((p) => p.id === playerId)
    if (!player || player.user_id !== callerUserId) {
      return json({ error: 'Nie możesz wykonać akcji za innego gracza.' }, 403)
    }
    if (player.position === 0) {
      return json({ error: 'Najpierw przekaż rolę hosta innemu graczowi.' }, 400)
    }
    if (player.left_at) {
      return json({ error: 'Już opuściłeś ten stolik.' }, 400)
    }

    const leftAt = new Date().toISOString()

    if (table.status === 'lobby') {
      const { error } = await supabase.from('players').update({ left_at: leftAt }).eq('id', playerId)
      if (error) return json({ error: error.message }, 500)
      return json({ ok: true }, 200)
    }

    const presentPlayers = playerRows.filter((p) => !p.left_at)
    const domainPlayers: GamePlayer[] = presentPlayers.map((p) => ({
      id: p.id,
      name: p.name,
      chipTotal: p.chip_total,
      position: p.position,
      status: p.status,
      currentRoundBet: p.current_round_bet,
      totalInvested: p.total_invested,
      isDealer: p.is_dealer,
      isSmallBlind: p.is_small_blind,
      isBigBlind: p.is_big_blind,
      lastAction: p.last_action,
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
      result = removePlayerFromHand(state, playerId)
    } catch (err) {
      return json({ error: err instanceof Error ? err.message : 'Nie udało się opuścić stołu.' }, 400)
    }

    const changedPlayerUpdates = result.players
      .filter((p) => {
        const before = domainPlayers.find((d) => d.id === p.id)!
        return before.status !== p.status || before.lastAction !== p.lastAction
      })
      .map((p) => supabase.from('players').update({ status: p.status, last_action: p.lastAction }).eq('id', p.id))

    const leaveUpdate = supabase.from('players').update({ left_at: leftAt }).eq('id', playerId)

    // Fold-out (albo river zamknięty) przeskakuje na 'showdown' z dowolnej
    // ulicy — zapamiętujemy, z której, jak w player-action.
    const showdownFromRound =
      result.currentRound === 'showdown' && state.currentRound !== 'showdown' ? state.currentRound : table.showdown_from_round

    const tableUpdate = supabase
      .from('tables')
      .update({
        current_turn_position: result.currentTurnPosition,
        current_round: result.currentRound,
        players_to_act: result.playersToAct,
        showdown_from_round: showdownFromRound,
      })
      .eq('id', tableId)

    const writeResults = await Promise.all([...changedPlayerUpdates, leaveUpdate, tableUpdate])
    const writeError = writeResults.find((r) => r.error)?.error
    if (writeError) return json({ error: writeError.message }, 500)

    return json({ ok: true }, 200)
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Nieznany błąd.' }, 500)
  }
})
