// Edge Function: reorder-players
// Host zmienia kolejność miejsc pozostałych graczy (host sam nigdy się nie
// przesuwa — position 0 jest jedynym sposobem ustalenia hosta w każdej
// funkcji tego projektu).
//
// W lobby to tylko zamiana pozycji, bez żadnych efektów ubocznych. W trakcie
// aktywnej gry przetasowanie pozycji automatycznie ANULUJE bieżące rozdanie
// (dokładnie tak jak `reset-hand`: każdy odzyskuje to, co wpłacił w tej
// ręce, i od razu rozdawana jest nowa ręka) — to jedyny bezpieczny sposób na
// zmianę kolejności mid-hand, bo silnik (nextActivePosition) zakłada stały
// porządek pozycji w obrębie trwającej ulicy; anulowanie ręki eliminuje ten
// problem, zamiast próbować łatać kolejkę w locie.
//
// Zapis dwufazowy: najpierw wszyscy przenoszeni gracze lądują na tymczasowych
// ujemnych pozycjach (gwarantowanie unikalnych), dopiero potem na docelowych —
// inaczej prosta zamiana dwóch pozycji w jednym Promise.all mogłaby przejściowo
// złamać unique(table_id, position).
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
    const { tableId, hostPlayerId, orderedPlayerIds } = (await req.json()) as {
      tableId?: string
      hostPlayerId?: string
      orderedPlayerIds?: string[]
    }
    if (!tableId || !hostPlayerId || !Array.isArray(orderedPlayerIds)) {
      return json({ error: 'Brak tableId, hostPlayerId lub orderedPlayerIds.' }, 400)
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
    if (table.status === 'finished') return json({ error: 'Stolik jest już zamknięty.' }, 409)
    if (playersError || !playerRows) return json({ error: 'Nie udało się pobrać graczy.' }, 500)

    const host = playerRows.find((p) => p.position === 0)
    if (!host || host.id !== hostPlayerId) {
      return json({ error: 'Tylko host może zmieniać kolejność.' }, 403)
    }
    if (host.user_id !== callerUserId) {
      return json({ error: 'Nie możesz wykonać akcji za innego gracza.' }, 403)
    }

    const nonHostPresent = playerRows.filter((p) => p.id !== host.id)
    const requestedIds = new Set(orderedPlayerIds)
    const isValidPermutation =
      orderedPlayerIds.length === nonHostPresent.length &&
      requestedIds.size === orderedPlayerIds.length &&
      nonHostPresent.every((p) => requestedIds.has(p.id))
    if (!isValidPermutation) {
      return json({ error: 'Nieprawidłowa lista kolejności graczy.' }, 400)
    }

    const slotPool = nonHostPresent.map((p) => p.position).sort((a, b) => a - b)
    const newPositionById = new Map<string, number>(orderedPlayerIds.map((id, i) => [id, slotPool[i]]))
    newPositionById.set(host.id, 0)

    // Faza A: wszyscy (poza hostem, który się nie rusza) na tymczasowe ujemne
    // pozycje — czekamy aż się w pełni zakończy, zanim zaczniemy fazę B
    // (sekwencyjnie między fazami, równolegle w obrębie każdej).
    const phaseA = await Promise.all(
      nonHostPresent.map((p, i) => supabase.from('players').update({ position: -(i + 1) }).eq('id', p.id)),
    )
    const phaseAError = phaseA.find((r) => r.error)?.error
    if (phaseAError) return json({ error: phaseAError.message }, 500)

    if (table.status === 'lobby') {
      const phaseB = await Promise.all(
        orderedPlayerIds.map((id) => supabase.from('players').update({ position: newPositionById.get(id) }).eq('id', id)),
      )
      const phaseBError = phaseB.find((r) => r.error)?.error
      if (phaseBError) return json({ error: phaseBError.message }, 500)
      return json({ ok: true }, 200)
    }

    // Stół aktywny: przetasowanie anuluje bieżące rozdanie, dokładnie jak
    // reset-hand — każdy odzyskuje total_invested, po czym rozdawana jest
    // nowa ręka na NOWYCH pozycjach, przy tym samym (co do tożsamości)
    // dealerze, niezależnie na której teraz siedzi pozycji.
    const dealerRow = playerRows.find((p) => p.is_dealer)
    const newDealerPosition = dealerRow ? (newPositionById.get(dealerRow.id) ?? 0) : 0

    const refundedPlayers: GamePlayer[] = playerRows.map((p) => ({
      id: p.id,
      name: p.name,
      chipTotal: p.chip_total + p.total_invested,
      position: newPositionById.get(p.id) ?? p.position,
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
      result = computeResetHand(refundedPlayers, table.small_blind, table.big_blind, newDealerPosition)
    } catch (err) {
      return json({ error: err instanceof Error ? err.message : 'Nie udało się przetasować kolejności.' }, 400)
    }

    const playerUpdates = result.players.map((p) =>
      supabase
        .from('players')
        .update({
          position: p.position,
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
