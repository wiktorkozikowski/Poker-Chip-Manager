// Edge Function: start-game
// Waliduje i wykonuje start rozgrywki (ustawienie dealera/blindów) —
// jedyna droga, którą stolik przechodzi z 'lobby' do 'active'. Klient nigdy
// nie zapisuje tego bezpośrednio (RLS nie ma polityki UPDATE na `tables`/
// `players` dla anon), więc ta walidacja nie da się obejść z devtools.
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { computeStartGame } from '../../../src/game-logic/startGame.ts'
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
    const { tableId, playerId } = await req.json()
    if (!tableId || !playerId) {
      return json({ error: 'Brak tableId lub playerId.' }, 400)
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const [
      callerUserId,
      { data: table, error: tableError },
      { data: players, error: playersError },
    ] = await Promise.all([
      getCallerUserId(req),
      supabase.from('tables').select('*').eq('id', tableId).single(),
      supabase.from('players').select('*').eq('table_id', tableId).order('position'),
    ])
    if (!callerUserId) return json({ error: 'Brak autoryzacji.' }, 401)
    if (tableError || !table) return json({ error: 'Nie znaleziono stołu.' }, 404)
    if (table.status !== 'lobby') return json({ error: 'Gra już wystartowała.' }, 409)
    if (playersError || !players) return json({ error: 'Nie udało się pobrać graczy.' }, 500)

    const host = players.find((p) => p.position === 0)
    if (!host || host.id !== playerId) {
      return json({ error: 'Tylko host może rozpocząć grę.' }, 403)
    }
    if (host.user_id !== callerUserId) {
      return json({ error: 'Nie możesz wykonać akcji za innego gracza.' }, 403)
    }

    const domainPlayers: GamePlayer[] = players.map((p) => ({
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

    const result = computeStartGame(domainPlayers, table.small_blind, table.big_blind, null)

    const playerUpdates = result.players.map((p) =>
      supabase
        .from('players')
        .update({
          chip_total: p.chipTotal,
          current_round_bet: p.currentRoundBet,
          total_invested: p.totalInvested,
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
        status: 'active',
        dealer_position: result.dealerPosition,
        current_turn_position: result.currentTurnPosition,
        current_bet: result.currentBet,
        pot: result.pot,
        last_raiser_position: result.lastRaiserPosition,
        current_round: 'preflop',
        players_to_act: result.playersToAct,
        showdown_from_round: null,
      })
      .eq('id', tableId)

    const sbPlayer = result.players.find((p) => p.isSmallBlind)!
    const bbPlayer = result.players.find((p) => p.isBigBlind)!
    const logInsert = supabase.from('actions_log').insert([
      { table_id: tableId, player_id: sbPlayer.id, action_type: 'blind', amount: table.small_blind },
      { table_id: tableId, player_id: bbPlayer.id, action_type: 'blind', amount: table.big_blind },
    ])

    const writeResults = await Promise.all([...playerUpdates, tableUpdate, logInsert])
    const writeError = writeResults.find((r) => r.error)?.error
    if (writeError) return json({ error: writeError.message }, 500)

    return json({ ok: true }, 200)
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Nieznany błąd.' }, 500)
  }
})
