/**
 * Typy odzwierciedlające dokładnie schemat tabel w Supabase (Postgres).
 * Trzymane osobno od typów domenowych warstwy logiki gry (src/game-logic/types.ts),
 * żeby zmiana kształtu tabeli nie wymuszała zmian w silniku gry.
 */

export type TableStatus = 'lobby' | 'active' | 'finished'

export type PlayerStatus = 'active' | 'folded' | 'all_in'

export type LastAction = 'check' | 'call' | 'raise' | 'fold'

export type BettingRound = 'preflop' | 'flop' | 'turn' | 'river' | 'showdown'

export type ActionType = 'check' | 'call' | 'raise' | 'fold' | 'blind' | 'transfer' | 'round_win' | 'reset_hand'

// `type` (nie `interface`) celowo — interfejsy nie mają niejawnej sygnatury
// indeksu, więc nie spełniają strukturalnie `Record<string, unknown>`
// wymaganego przez generyczne typy supabase-js (Row/Insert/Update).
export type TableRow = {
  id: string
  join_code: string
  status: TableStatus
  small_blind: number
  big_blind: number
  /** Maksymalna liczba graczy — ustalana przez hosta przy tworzeniu stołu. */
  max_players: number
  /** Startowa wartość żetonów przydzielana każdemu dołączającemu graczowi. */
  starting_chips: number
  pot: number
  current_bet: number
  dealer_position: number
  current_turn_position: number
  last_raiser_position: number | null
  /** Ulica licytacji bieżącego rozdania — 'showdown' = czeka na rozstrzygnięcie. */
  current_round: BettingRound
  /** Ilu aktywnych graczy musi jeszcze zareagować, zanim runda się zamknie. */
  players_to_act: number
  /**
   * Na której ulicy faktycznie zamknęła się licytacja, gdy current_round
   * przeszło na 'showdown' — potrzebne przy fold-out, bo wtedy silnik
   * przeskakuje na showdown z dowolnej ulicy, nie tylko z rivera.
   */
  showdown_from_round: BettingRound | null
  created_at: string
}

export type PlayerRow = {
  id: string
  table_id: string
  /** Sesja Supabase Auth (pełne konto albo gość anonimowy) — kim jest ten gracz. */
  user_id: string | null
  name: string
  chip_total: number
  position: number
  status: PlayerStatus
  current_round_bet: number
  /** Suma wpłat w całym bieżącym rozdaniu (przez wszystkie ulice), reset na nowej ręce. */
  total_invested: number
  is_dealer: boolean
  is_small_blind: boolean
  is_big_blind: boolean
  /** Ostatnia akcja w bieżącej rundzie licytacji — czyszczona przy nowym podbiciu/ulicy. */
  last_action: LastAction | null
  /** Trwały znacznik odejścia (opuścił stół albo został usunięty przez hosta) — nigdy nie kasujemy wiersza. */
  left_at: string | null
}

export type ActionLogRow = {
  id: string
  table_id: string
  player_id: string
  action_type: ActionType
  amount: number | null
  target_player_id: string | null
  created_at: string
}

export interface Database {
  public: {
    Tables: {
      tables: {
        Row: TableRow
        Insert: Partial<TableRow> &
          Pick<TableRow, 'join_code' | 'small_blind' | 'big_blind' | 'max_players' | 'starting_chips'>
        Update: Partial<TableRow>
        Relationships: []
      }
      players: {
        Row: PlayerRow
        Insert: Partial<PlayerRow> & Pick<PlayerRow, 'table_id' | 'user_id' | 'name' | 'chip_total' | 'position'>
        Update: Partial<PlayerRow>
        Relationships: []
      }
      actions_log: {
        Row: ActionLogRow
        Insert: Partial<ActionLogRow> & Pick<ActionLogRow, 'table_id' | 'player_id' | 'action_type'>
        Update: Partial<ActionLogRow>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}