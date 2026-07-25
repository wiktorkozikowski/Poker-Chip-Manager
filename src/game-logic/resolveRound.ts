import type { GamePlayer } from './types'

export interface PayoutResult {
  playerId: string
  amount: number
}

/**
 * Dzieli daną warstwę puli między odbiorców po równo; nadwyżka z
 * zaokrąglenia w dół trafia do odbiorcy najbliżej lewej ręki dealera.
 */
function distributeLayer(
  amount: number,
  recipients: GamePlayer[],
  dealerPosition: number,
  totalSeats: number,
): PayoutResult[] {
  if (recipients.length === 0 || amount <= 0) return []

  const share = Math.floor(amount / recipients.length)
  const remainder = amount - share * recipients.length

  const distanceFromDealer = (position: number) => (position - dealerPosition + totalSeats) % totalSeats
  const ordered = [...recipients].sort((a, b) => distanceFromDealer(a.position) - distanceFromDealer(b.position))

  return ordered.map((p, i) => ({ playerId: p.id, amount: share + (i === 0 ? remainder : 0) }))
}

/**
 * Dzieli pulę między zwycięzców z uwzględnieniem "side potów" — gracz
 * all-in za mniej niż reszta jest uprawniony tylko do tego, co realnie
 * dopasowali mu POZOSTALI gracze (z każdego licząc do wysokości jego
 * stawki); nadwyżka ponad to, czego nie miał czym dobić, wraca do tych,
 * którzy ją wpłacili (proporcjonalnie — w obrębie jednej warstwy każdy
 * wpłacił dokładnie tyle samo, więc "proporcjonalnie" = po równo).
 *
 * Algorytm: buduje warstwy puli wg rosnących progów totalInvested. Każda
 * warstwa ma własny zbiór "uprawnionych" (nie spasowali i dopłacili do
 * tego progu). Jeśli KTOŚ ze zgłoszonych zwycięzców kwalifikuje się do
 * danej warstwy — dostają ją oni. Jeśli NIKT ze zgłoszonych zwycięzców się
 * nie kwalifikuje (bo zwycięzca był all-in za mniej) — warstwa wraca do
 * wszystkich, którzy ją wpłacili (niedobita stawka, nie wygrana — spasowani
 * też ją odzyskują, bo to nie było nigdy w grze o pulę).
 */
export function computePotSplit(
  players: GamePlayer[],
  dealerPosition: number,
  totalSeats: number,
  winnerIds: string[],
): PayoutResult[] {
  if (winnerIds.length === 0) {
    throw new Error('Musisz wskazać przynajmniej jednego zwycięzcę.')
  }

  const contributors = players.filter((p) => p.totalInvested > 0)
  if (contributors.length === 0) return []

  const levels = [...new Set(contributors.map((p) => p.totalInvested))].sort((a, b) => a - b)

  const totals = new Map<string, number>()
  function credit(results: PayoutResult[]) {
    for (const r of results) {
      totals.set(r.playerId, (totals.get(r.playerId) ?? 0) + r.amount)
    }
  }

  let previousLevel = 0
  for (const level of levels) {
    const layerContributors = contributors.filter((p) => p.totalInvested >= level)
    const layerAmount = (level - previousLevel) * layerContributors.length
    previousLevel = level
    if (layerAmount <= 0) continue

    const eligible = layerContributors.filter((p) => p.status !== 'folded')
    const eligibleWinners = eligible.filter((p) => winnerIds.includes(p.id))

    if (eligibleWinners.length > 0) {
      credit(distributeLayer(layerAmount, eligibleWinners, dealerPosition, totalSeats))
    } else {
      credit(distributeLayer(layerAmount, layerContributors, dealerPosition, totalSeats))
    }
  }

  return [...totals.entries()].map(([playerId, amount]) => ({ playerId, amount }))
}
