import type { GamePlayer } from './types'

export interface StartGameResult {
  dealerPosition: number
  smallBlindPosition: number
  bigBlindPosition: number
  currentTurnPosition: number
  pot: number
  currentBet: number
  lastRaiserPosition: number
  /** Kopie graczy z zaktualizowanym chipTotal/currentRoundBet/flagami. */
  players: GamePlayer[]
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
  if (players.length < 2) {
    throw new Error('Potrzeba minimum 2 graczy, żeby rozpocząć grę.')
  }

  const seats = [...players].sort((a, b) => a.position - b.position)
  const positions = seats.map((p) => p.position)

  function nextPosition(from: number): number {
    const idx = positions.indexOf(from)
    return positions[(idx + 1) % positions.length]
  }

  const dealerPosition =
    previousDealerPosition !== null && positions.includes(previousDealerPosition)
      ? nextPosition(previousDealerPosition)
      : positions[0]

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
      isDealer: p.position === dealerPosition,
      isSmallBlind: isSB,
      isBigBlind: isBB,
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
    players: updatedPlayers,
  }
}
