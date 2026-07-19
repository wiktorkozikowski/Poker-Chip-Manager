// Edge Function: resolve-round
// Dealer wskazuje zwycięzcę/zwycięzców rozdania -> wypłata puli, reset stanu
// rundy i start nowej ręki (dealer przesuwa się o jedną pozycję, nowe
// blindy). Klient nigdy nie zapisuje chip_total/pot bezpośrednio (RLS nie ma
// polityki UPDATE dla anon) — to jedyna droga wypłaty puli.
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { computePotSplit } from '../../../src/game-logic/resolveRound.ts'
import { computeStartGame } from '../../../src/game-logic/startGame.ts'
import type { GamePlayer } from '../../../src/game-logic/types.ts'

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
    const { tableId, dealerPlayerId, winnerIds } = (await req.json()) as {
      tableId?: string
      dealerPlayerId?: string
      winnerIds?: string[]
    }

    if (!tableId || !dealerPlayerId || !Array.isArray(winnerIds)) {
      return json({ error: 'Brak tableId, dealerPlayerId lub winnerIds.' }, 400)
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const { data: table, error: tableError } = await supabase.from('tables').select('*').eq('id', tableId).single()
    if (tableError || !table) return json({ error: 'Nie znaleziono stołu.' }, 404)
    if (table.status !== 'active' || table.current_round !== 'showdown') {
      return json({ error: 'Runda nie jest jeszcze gotowa do rozstrzygnięcia.' }, 409)
    }

    const { data: playerRows, error: playersError } = await supabase
      .from('players')
      .select('*')
      .eq('table_id', tableId)
      .order('position')
    if (playersError || !playerRows) return json({ error: 'Nie udało się pobrać graczy.' }, 500)

    const dealer = playerRows.find((p) => p.id === dealerPlayerId)
    if (!dealer || !dealer.is_dealer) {
      return json({ error: 'Tylko dealer może rozstrzygnąć rozdanie.' }, 403)
    }

    const eligible = playerRows.filter((p) => p.status !== 'folded')
    // Fold-out: jest tylko jeden kandydat, dealer nie musi nic zaznaczać —
    // wymuszamy to po stronie serwera niezależnie od tego, co przyszło od klienta.
    const effectiveWinnerIds = eligible.length === 1 ? [eligible[0].id] : winnerIds
    const invalidWinner = effectiveWinnerIds.some((id) => !eligible.some((p) => p.id === id))
    if (effectiveWinnerIds.length === 0 || invalidWinner) {
      return json({ error: 'Nieprawidłowa lista zwycięzców.' }, 400)
    }

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

    const winners = domainPlayers.filter((p) => effectiveWinnerIds.includes(p.id))
    const payouts = computePotSplit(table.pot, table.dealer_position, domainPlayers.length, winners)
    const payoutMap = new Map(payouts.map((p) => [p.playerId, p.amount]))

    // Wszyscy wracają do gry na nową rękę (reset fold/all-in), z doliczoną wygraną.
    const playersForNextHand: GamePlayer[] = domainPlayers.map((p) => ({
      ...p,
      chipTotal: p.chipTotal + (payoutMap.get(p.id) ?? 0),
      status: 'active',
      currentRoundBet: 0,
    }))

    const nextHand = computeStartGame(playersForNextHand, table.small_blind, table.big_blind, table.dealer_position)

    for (const p of nextHand.players) {
      const { error: updateError } = await supabase
        .from('players')
        .update({
          chip_total: p.chipTotal,
          current_round_bet: p.currentRoundBet,
          status: p.status,
          is_dealer: p.isDealer,
          is_small_blind: p.isSmallBlind,
          is_big_blind: p.isBigBlind,
        })
        .eq('id', p.id)
      if (updateError) return json({ error: updateError.message }, 500)
    }

    const { error: tableUpdateError } = await supabase
      .from('tables')
      .update({
        pot: nextHand.pot,
        current_bet: nextHand.currentBet,
        dealer_position: nextHand.dealerPosition,
        current_turn_position: nextHand.currentTurnPosition,
        last_raiser_position: nextHand.lastRaiserPosition,
        current_round: 'preflop',
        players_to_act: nextHand.playersToAct,
      })
      .eq('id', tableId)
    if (tableUpdateError) return json({ error: tableUpdateError.message }, 500)

    await supabase
      .from('actions_log')
      .insert(payouts.map((p) => ({ table_id: tableId, player_id: p.playerId, action_type: 'round_win', amount: p.amount })))

    return json({ ok: true, payouts }, 200)
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Nieznany błąd.' }, 500)
  }
})
