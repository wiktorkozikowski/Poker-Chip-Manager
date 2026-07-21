// Edge Function: kick-player
// Host usuwa gracza ze stołu (trwały marker left_at) — dostępne zarówno w
// lobby jak i w trakcie aktywnej gry. W trakcie ręki wymusza auto-fold przez
// ten sam czysty silnik co leave-table (removePlayerFromHand).
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
    const { tableId, hostPlayerId, targetPlayerId } = (await req.json()) as {
      tableId?: string
      hostPlayerId?: string
      targetPlayerId?: string
    }
    if (!tableId || !hostPlayerId || !targetPlayerId) {
      return json({ error: 'Brak tableId, hostPlayerId lub targetPlayerId.' }, 400)
    }
    if (hostPlayerId === targetPlayerId) {
      return json({ error: 'Host nie może usunąć samego siebie.' }, 400)
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
      return json({ error: 'Tylko host może usuwać graczy.' }, 403)
    }
    if (host.user_id !== callerUserId) {
      return json({ error: 'Nie możesz wykonać akcji za innego gracza.' }, 403)
    }

    const target = playerRows.find((p) => p.id === targetPlayerId)
    if (!target) return json({ error: 'Nie znaleziono gracza.' }, 404)
    if (target.left_at) return json({ error: 'Ten gracz już opuścił stolik.' }, 400)

    const leftAt = new Date().toISOString()

    if (table.status === 'lobby') {
      const { error } = await supabase.from('players').update({ left_at: leftAt }).eq('id', targetPlayerId)
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
      result = removePlayerFromHand(state, targetPlayerId)
    } catch (err) {
      return json({ error: err instanceof Error ? err.message : 'Nie udało się usunąć gracza.' }, 400)
    }

    const changedPlayerUpdates = result.players
      .filter((p) => {
        const before = domainPlayers.find((d) => d.id === p.id)!
        return before.status !== p.status || before.lastAction !== p.lastAction
      })
      .map((p) => supabase.from('players').update({ status: p.status, last_action: p.lastAction }).eq('id', p.id))

    const kickUpdate = supabase.from('players').update({ left_at: leftAt }).eq('id', targetPlayerId)

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

    const writeResults = await Promise.all([...changedPlayerUpdates, kickUpdate, tableUpdate])
    const writeError = writeResults.find((r) => r.error)?.error
    if (writeError) return json({ error: writeError.message }, 500)

    return json({ ok: true }, 200)
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Nieznany błąd.' }, 500)
  }
})
