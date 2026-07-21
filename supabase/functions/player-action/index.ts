// Edge Function: player-action
// Waliduje i wykonuje pojedynczą akcję gracza (check/call/raise/fold) przez
// czysty silnik w src/game-logic/bettingRound.ts. Klient nigdy nie zapisuje
// chip_total/pot bezpośrednio (RLS nie ma polityki UPDATE dla anon) — to
// jedyna droga zmiany stanu licytacji, więc nie da się tego obejść z devtools.
//
// Odczyty i zapisy idą równolegle (Promise.all) tam, gdzie się da — to
// jedyna droga zmiany stanu, więc każda milisekunda w tej funkcji to
// milisekunda, na którą czeka gracz z palcem nad przyciskiem.
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { applyAction } from '../../../src/game-logic/bettingRound.ts'
import type { BettingAction, GamePlayer, GameTableState } from '../../../src/game-logic/types.ts'
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

    // Weryfikacja tokenu i pobranie danych nie zależą od siebie nawzajem —
    // lecą równolegle zamiast czekać w kolejce (jedna mniej sekwencyjna
    // podróż w obie strony do serwera = odczuwalnie szybsza akcja).
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
    if (table.status !== 'active') return json({ error: 'Stolik nie jest w trakcie gry.' }, 409)
    if (playersError || !playerRows) return json({ error: 'Nie udało się pobrać graczy.' }, 500)

    const actorRow = playerRows.find((p) => p.id === playerId)
    if (!actorRow || actorRow.user_id !== callerUserId) {
      return json({ error: 'Nie możesz wykonać akcji za innego gracza.' }, 403)
    }

    const domainPlayers: GamePlayer[] = playerRows.map((p) => ({
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
      result = applyAction(state, playerId, action, raiseTo)
    } catch (err) {
      return json({ error: err instanceof Error ? err.message : 'Nieprawidłowa akcja.' }, 400)
    }

    const actor = domainPlayers.find((p) => p.id === playerId)!
    const actionAmount =
      action === 'raise'
        ? raiseTo!
        : action === 'call'
          ? result.players.find((p) => p.id === playerId)!.currentRoundBet
          : null

    const changedPlayerUpdates = result.players
      .filter((p) => {
        const before = domainPlayers.find((d) => d.id === p.id)!
        return (
          before.chipTotal !== p.chipTotal ||
          before.currentRoundBet !== p.currentRoundBet ||
          before.totalInvested !== p.totalInvested ||
          before.status !== p.status ||
          before.lastAction !== p.lastAction
        )
      })
      .map((p) =>
        supabase
          .from('players')
          .update({
            chip_total: p.chipTotal,
            current_round_bet: p.currentRoundBet,
            total_invested: p.totalInvested,
            status: p.status,
            last_action: p.lastAction,
          })
          .eq('id', p.id),
      )

    // Fold-out (albo river zamknięty) przeskakuje na 'showdown' z dowolnej
    // ulicy — zapamiętujemy, z której, żeby UI mogło podświetlić właściwą
    // kropkę postępu rozdania zamiast zawsze zakładać river.
    const showdownFromRound =
      result.currentRound === 'showdown' && state.currentRound !== 'showdown' ? state.currentRound : table.showdown_from_round

    const tableUpdate = supabase
      .from('tables')
      .update({
        pot: result.pot,
        current_bet: result.currentBet,
        current_turn_position: result.currentTurnPosition,
        last_raiser_position: result.lastRaiserPosition,
        current_round: result.currentRound,
        players_to_act: result.playersToAct,
        showdown_from_round: showdownFromRound,
      })
      .eq('id', tableId)

    const logInsert = supabase
      .from('actions_log')
      .insert({ table_id: tableId, player_id: actor.id, action_type: action, amount: actionAmount })

    const writeResults = await Promise.all([...changedPlayerUpdates, tableUpdate, logInsert])
    const writeError = writeResults.find((r) => r.error)?.error
    if (writeError) return json({ error: writeError.message }, 500)

    return json({ ok: true, currentRound: result.currentRound }, 200)
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Nieznany błąd.' }, 500)
  }
})
