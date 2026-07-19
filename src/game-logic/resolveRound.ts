import type { GamePlayer } from './types'

export interface PayoutResult {
  playerId: string
  amount: number
}

/**
 * Dzieli pulę między zwycięzców. Przy kilku zwycięzcach dzieli po równo;
 * nadwyżka z zaokrąglenia w dół trafia do zwycięzcy najbliżej lewej ręki
 * dealera (czyli pierwszego w kolejności miejsc po dealerze).
 */
export function computePotSplit(
  pot: number,
  dealerPosition: number,
  totalSeats: number,
  winners: GamePlayer[],
): PayoutResult[] {
  if (winners.length === 0) {
    throw new Error('Musisz wskazać przynajmniej jednego zwycięzcę.')
  }

  const share = Math.floor(pot / winners.length)
  const remainder = pot - share * winners.length

  const distanceFromDealer = (position: number) => (position - dealerPosition + totalSeats) % totalSeats
  const byProximityToDealersLeft = [...winners].sort(
    (a, b) => distanceFromDealer(a.position) - distanceFromDealer(b.position),
  )

  return byProximityToDealersLeft.map((winner, i) => ({
    playerId: winner.id,
    amount: share + (i === 0 ? remainder : 0),
  }))
}
