/**
 * Typy domenowe silnika gry. Niezależne od kształtu tabel w Supabase
 * (src/types/database.ts) i od warstwy prezentacji — silnik nie wie nic
 * o Reacie ani o bazie danych.
 */

export type PlayerStatus = 'active' | 'folded' | 'all_in'

export type BettingAction = 'check' | 'call' | 'raise' | 'fold'

export interface GamePlayer {
  id: string
  name: string
  chipTotal: number
  position: number
  status: PlayerStatus
  currentRoundBet: number
  isDealer: boolean
  isSmallBlind: boolean
  isBigBlind: boolean
}

export interface GameTableState {
  smallBlind: number
  bigBlind: number
  pot: number
  currentBet: number
  dealerPosition: number
  currentTurnPosition: number
  lastRaiserPosition: number | null
  players: GamePlayer[]
}
