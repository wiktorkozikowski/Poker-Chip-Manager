import type { BettingAction, BettingRound, GamePlayer, GameTableState } from './types'

const ROUND_ORDER: BettingRound[] = ['preflop', 'flop', 'turn', 'river']

function updatePlayer(players: GamePlayer[], id: string, patch: Partial<GamePlayer>): GamePlayer[] {
  return players.map((p) => (p.id === id ? { ...p, ...patch } : p))
}

/**
 * Następna pozycja wśród graczy ze statusem 'active' (pomija folded/all_in —
 * oni nie są pytani o akcję). Działa też gdy `from` sam nie jest już aktywny
 * (np. właśnie spasował, albo to pozycja dealera do wyznaczenia pierwszego
 * gracza po nim na nowej ulicy).
 */
export function nextActivePosition(players: GamePlayer[], from: number): number {
  const activePositions = players
    .filter((p) => p.status === 'active')
    .map((p) => p.position)
    .sort((a, b) => a - b)

  if (activePositions.length === 0) {
    throw new Error('Brak aktywnych graczy do wyznaczenia kolejki.')
  }

  const idx = activePositions.indexOf(from)
  if (idx === -1) {
    return activePositions.find((p) => p > from) ?? activePositions[0]
  }
  return activePositions[(idx + 1) % activePositions.length]
}

/**
 * Zamyka bieżącą ulicę i otwiera następną: reset stawek rundy, akcja od
 * pierwszego aktywnego gracza po dealerze (inaczej niż preflop, gdzie
 * zaczyna się po BB — patrz src/game-logic/startGame.ts).
 *
 * Jeśli zostało ≤1 graczy, którzy w ogóle mogą jeszcze licytować (reszta
 * spasowała lub jest all-in), nie ma sensu pytać o dalsze akcje — od razu
 * showdown ("dobieganie" reszty ulic bez licytacji).
 */
function startNextStreet(state: GameTableState): GameTableState {
  const currentIndex = ROUND_ORDER.indexOf(state.currentRound)
  const nextRound = ROUND_ORDER[currentIndex + 1]

  const players = state.players.map((p) =>
    p.status === 'active' ? { ...p, currentRoundBet: 0, lastAction: null } : p,
  )
  const playersWhoCanAct = players.filter((p) => p.status === 'active')

  if (!nextRound || playersWhoCanAct.length <= 1) {
    return { ...state, players, currentRound: 'showdown', currentBet: 0, playersToAct: 0 }
  }

  const firstToAct = nextActivePosition(players, state.dealerPosition)

  return {
    ...state,
    players,
    currentRound: nextRound,
    currentBet: 0,
    currentTurnPosition: firstToAct,
    playersToAct: playersWhoCanAct.length,
  }
}

/**
 * Aplikuje pojedynczą akcję gracza (check/call/raise/fold) i zwraca nowy
 * stan stołu — łącznie z automatycznym zamknięciem rundy/przejściem do
 * kolejnej ulicy albo wykryciem końca ręki (fold-out lub zamknięty river).
 *
 * Koniec rundy licytacji śledzimy licznikiem `playersToAct` (ilu aktywnych
 * graczy musi jeszcze zareagować), a nie samym porównywaniem pozycji do
 * last_raiser_position — to drugie zawodzi, gdy podbicie pada od gracza w
 * środku kolejki przy 3+ graczach (ostatni gracz przed "powrotem" akcji do
 * podbijającego nigdy nie dostawałby szansy zareagować). last_raiser_position
 * zostaje zaktualizowane przy każdym podbiciu — do wglądu/historii, ale
 * zamknięcie rundy nie zależy już od niego.
 */
export function applyAction(
  state: GameTableState,
  playerId: string,
  action: BettingAction,
  raiseTo?: number,
): GameTableState {
  if (state.currentRound === 'showdown') {
    throw new Error('Runda licytacji jest już zamknięta.')
  }

  const actor = state.players.find((p) => p.id === playerId)
  if (!actor) throw new Error('Gracz nie należy do tego stołu.')
  if (actor.position !== state.currentTurnPosition) throw new Error('To nie jest Twoja kolej.')
  if (actor.status !== 'active') throw new Error('Nie możesz teraz wykonać akcji.')

  const toCall = state.currentBet - actor.currentRoundBet

  let players = state.players
  let pot = state.pot
  let currentBet = state.currentBet
  let lastRaiserPosition = state.lastRaiserPosition
  let playersToAct = state.playersToAct

  switch (action) {
    case 'fold': {
      players = updatePlayer(players, actor.id, { status: 'folded', lastAction: 'fold' })
      playersToAct -= 1
      break
    }
    case 'check': {
      if (toCall > 0) throw new Error('Nie możesz czekować — jest stawka do wyrównania.')
      players = updatePlayer(players, actor.id, { lastAction: 'check' })
      playersToAct -= 1
      break
    }
    case 'call': {
      if (toCall <= 0) throw new Error('Nie ma nic do wyrównania — użyj check.')
      const amount = Math.min(toCall, actor.chipTotal)
      const isAllIn = amount === actor.chipTotal
      players = updatePlayer(players, actor.id, {
        chipTotal: actor.chipTotal - amount,
        currentRoundBet: actor.currentRoundBet + amount,
        totalInvested: actor.totalInvested + amount,
        status: isAllIn ? 'all_in' : 'active',
        lastAction: 'call',
      })
      pot += amount
      playersToAct -= 1
      break
    }
    case 'raise': {
      if (raiseTo === undefined) throw new Error('Brak kwoty podbicia.')
      const maxTotal = actor.currentRoundBet + actor.chipTotal
      const minTotal = Math.min(state.currentBet + state.bigBlind, maxTotal)
      if (maxTotal <= state.currentBet) throw new Error('Nie masz tylu żetonów, żeby podbić.')
      if (raiseTo < minTotal) throw new Error(`Minimalna kwota podbicia to ${minTotal}.`)
      if (raiseTo > maxTotal) throw new Error('Nie masz tylu żetonów.')

      const amountAdded = raiseTo - actor.currentRoundBet
      const isAllIn = raiseTo === maxTotal
      // Podbicie otwiera kolejkę na nowo — czyścimy oznaczenia akcji innym
      // wciąż aktywnym graczom (fold zostaje, bo status='folded' nie jest
      // ruszany przez ten reset).
      players = players.map((p) =>
        p.status === 'active' && p.id !== actor.id ? { ...p, lastAction: null } : p,
      )
      players = updatePlayer(players, actor.id, {
        chipTotal: actor.chipTotal - amountAdded,
        currentRoundBet: raiseTo,
        totalInvested: actor.totalInvested + amountAdded,
        status: isAllIn ? 'all_in' : 'active',
        lastAction: 'raise',
      })
      pot += amountAdded
      currentBet = raiseTo
      lastRaiserPosition = actor.position
      playersToAct = players.filter((p) => p.status === 'active' && p.id !== actor.id).length
      break
    }
  }

  const nextState: GameTableState = { ...state, players, pot, currentBet, lastRaiserPosition, playersToAct }

  const inHand = players.filter((p) => p.status !== 'folded')
  if (inHand.length === 1) {
    return { ...nextState, currentRound: 'showdown', playersToAct: 0 }
  }

  if (playersToAct <= 0) {
    return startNextStreet(nextState)
  }

  return { ...nextState, currentTurnPosition: nextActivePosition(players, actor.position) }
}

/**
 * Wymusza wyjście gracza z bieżącej ręki (opuścił stół albo został usunięty
 * przez hosta) — mirror zwykłego folda (status→'folded', pot/stawki
 * nietknięte, bo pieniądze już są w puli z poprzedniego call/raise), ale w
 * przeciwieństwie do applyAction('fold') może dotyczyć DOWOLNEGO gracza, nie
 * tylko tego, kto akurat ma ruch — stąd dodatkowa obsługa: dekrementujemy
 * playersToAct tylko jeśli jeszcze nie zagrał w tej ulicy, a jeśli to on
 * akurat miał ruch, trzeba przesunąć kolejkę (inaczej gra się zawiesza, bo
 * spasowany gracz nigdy nie przejdzie bramki applyAction).
 */
export function removePlayerFromHand(state: GameTableState, playerId: string): GameTableState {
  const player = state.players.find((p) => p.id === playerId)
  if (!player) throw new Error('Gracz nie należy do tego stołu.')
  if (player.status === 'folded') return state

  const players = updatePlayer(state.players, player.id, { status: 'folded', lastAction: 'fold' })

  let playersToAct = state.playersToAct
  if (player.status === 'active' && player.lastAction === null) {
    playersToAct -= 1
  }

  const nextState: GameTableState = { ...state, players, playersToAct }

  const inHand = players.filter((p) => p.status !== 'folded')
  if (inHand.length === 1) {
    return { ...nextState, currentRound: 'showdown', playersToAct: 0 }
  }

  if (player.position === state.currentTurnPosition) {
    if (playersToAct <= 0) return startNextStreet(nextState)
    return { ...nextState, currentTurnPosition: nextActivePosition(players, player.position) }
  }

  if (playersToAct <= 0) return startNextStreet(nextState)
  return nextState
}
