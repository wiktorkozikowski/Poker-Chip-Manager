/**
 * Typy odzwierciedlające dokładnie schemat tabel w Supabase (Postgres).
 * Trzymane osobno od typów domenowych warstwy logiki gry (src/game-logic/types.ts),
 * żeby zmiana kształtu tabeli nie wymuszała zmian w silniku gry.
 */

export type TableStatus = 'lobby' | 'active' | 'finished'

export type PlayerStatus = 'active' | 'folded' | 'all_in'

export type ActionType = 'check' | 'call' | 'raise' | 'fold' | 'transfer' | 'round_win'

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
  created_at: string
}

export type PlayerRow = {
  id: string
  table_id: string
  name: string
  chip_total: number
  position: number
  status: PlayerStatus
  current_round_bet: number
  is_dealer: boolean
  is_small_blind: boolean
  is_big_blind: boolean
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
        Insert: Partial<PlayerRow> & Pick<PlayerRow, 'table_id' | 'name' | 'chip_total' | 'position'>
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