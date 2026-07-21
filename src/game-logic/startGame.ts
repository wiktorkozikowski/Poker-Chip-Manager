import type { GamePlayer } from './types'

export interface StartGameResult {
  dealerPosition: number
  smallBlindPosition: number
  bigBlindPosition: number
  currentTurnPosition: number
  pot: number
  currentBet: number
  lastRaiserPosition: number
  /** Wszyscy gracze muszą zareagować przynajmniej raz (BB ma "opcję"). */
  playersToAct: number
  /** Kopie graczy z zaktualizowanym chipTotal/currentRoundBet/flagami. */
  players: GamePlayer[]
}

/**
 * Rozdaje świeżą rękę przy KONKRETNYM, ustalonym z góry dealerze (bez
 * rotacji) — wspólna logika dla `computeStartGame` (który dealera dopiero
 * wyznacza, patrz niżej) i `computeResetHand` (który świadomie zostawia
 * dealera bez zmian, bo poprzednia ręka nie zakończyła się normalnie).
 */
function dealHandAtDealer(
  players: GamePlayer[],
  smallBlind: number,
  bigBlind: number,
  dealerPosition: number,
): StartGameResult {
  if (players.length < 2) {
    throw new Error('Potrzeba minimum 2 graczy, żeby rozpocząć grę.')
  }

  const seats = [...players].sort((a, b) => a.position - b.position)
  const positions = seats.map((p) => p.position)

  function nextPosition(from: number): number {
    const idx = positions.indexOf(from)
    return positions[(idx + 1) % positions.length]
  }

  // Heads-up (2 graczy): dealer jest jednocześnie small blindem — standardowa
  // konwencja pokerowa, inaczej niż przy 3+ graczach.
  const smallBlindPosition = seats.length === 2 ? dealerPosition : nextPosition(dealerPosition)
  const bigBlindPosition = nextPosition(smallBlindPosition)
  const currentTurnPosition = nextPosition(bigBlindPosition)

  const updatedPlayers = seats.map((p) => {
    const isSB = p.position === smallBlindPosition
    const isBB = p.position === bigBlindPosition
    const bet = isSB ? smallBlind : isBB ? bigBlind : 0
    return {
      ...p,
      chipTotal: p.chipTotal - bet,
      currentRoundBet: bet,
      // Nowa ręka — licznik inwestycji zaczyna się od zera (plus blind, jeśli dotyczy).
      totalInvested: bet,
      isDealer: p.position === dealerPosition,
      isSmallBlind: isSB,
      isBigBlind: isBB,
      // Nowa ręka — nikt jeszcze nie zagrał (posty blindów to nie akcja).
      lastAction: null,
    }
  })

  return {
    dealerPosition,
    smallBlindPosition,
    bigBlindPosition,
    currentTurnPosition,
    pot: smallBlind + bigBlind,
    currentBet: bigBlind,
    lastRaiserPosition: bigBlindPosition,
    playersToAct: seats.length,
    players: updatedPlayers,
  }
}

/**
 * Wyznacza dealera, small/big blind i pierwszego gracza do akcji na starcie
 * ręki. Czysta funkcja — używana przez Edge Function `start-game` (Deno
 * importuje ten plik bezpośrednio, patrz supabase/functions/start-game).
 *
 * `previousDealerPosition`: null przy pierwszym rozdaniu na stole (dealer =
 * gracz na position 0, czyli host). W kolejnych rozdaniach (Faza 4) podać
 * dealer_position z poprzedniej rundy — funkcja przesunie go o jedno miejsce.
 */
export function computeStartGame(
  players: GamePlayer[],
  smallBlind: number,
  bigBlind: number,
  previousDealerPosition: number | null,
): StartGameResult {
  const seats = [...players].sort((a, b) => a.position - b.position)
  const positions = seats.map((p) => p.position)
  const idx = previousDealerPosition !== null ? positions.indexOf(previousDealerPosition) : -1

  const dealerPosition = idx !== -1 ? positions[(idx + 1) % positions.length] : positions[0]

  return dealHandAtDealer(players, smallBlind, bigBlind, dealerPosition)
}

/**
 * Rozdaje rękę od nowa przy TYM SAMYM dealerze co poprzednio (bez rotacji)
 * — używane przez Edge Function `reset-hand`, gdy host anuluje bieżące
 * rozdanie: skoro ręka nie zakończyła się normalnie (przez showdown), dealer
 * się nie przesuwa. Wywołujący musi wcześniej zwrócić graczom ich
 * `totalInvested` z anulowanej ręki (do `chipTotal`) — ta funkcja tylko
 * rozdaje nową rękę na już-zwróconych stosach.
 */
export function computeResetHand(
  players: GamePlayer[],
  smallBlind: number,
  bigBlind: number,
  dealerPosition: number,
): StartGameResult {
  return dealHandAtDealer(players, smallBlind, bigBlind, dealerPosition)
}
