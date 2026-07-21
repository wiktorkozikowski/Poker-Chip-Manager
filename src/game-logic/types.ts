/**
 * Typy domenowe silnika gry. Niezależne od kształtu tabel w Supabase
 * (src/types/database.ts) i od warstwy prezentacji — silnik nie wie nic
 * o Reacie ani o bazie danych.
 */

export type PlayerStatus = 'active' | 'folded' | 'all_in'

export type BettingAction = 'check' | 'call' | 'raise' | 'fold'

/** 'showdown' = licytacja rivera zamknięta (albo fold-out) — czeka na Fazę 4. */
export type BettingRound = 'preflop' | 'flop' | 'turn' | 'river' | 'showdown'

export interface GamePlayer {
  id: string
  name: string
  chipTotal: number
  position: number
  status: PlayerStatus
  currentRoundBet: number
  /** Suma wpłat w całym bieżącym rozdaniu (przez wszystkie ulice), reset na nowej ręce. */
  totalInvested: number
  isDealer: boolean
  isSmallBlind: boolean
  isBigBlind: boolean
  /** Ostatnia akcja w bieżącej rundzie licytacji — czyszczona przy nowym podbiciu/ulicy. */
  lastAction: BettingAction | null
}

export interface GameTableState {
  smallBlind: number
  bigBlind: number
  pot: number
  currentBet: number
  dealerPosition: number
  currentTurnPosition: number
  lastRaiserPosition: number | null
  currentRound: BettingRound
  /** Ilu aktywnych graczy musi jeszcze zareagować, zanim runda się zamknie. */
  playersToAct: number
  players: GamePlayer[]
}
