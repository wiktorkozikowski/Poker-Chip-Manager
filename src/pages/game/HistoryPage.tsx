import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ChevronLeft,
  SlidersHorizontal,
  Trophy,
  ArrowUpCircle,
  PlusCircle,
  ArrowLeftRight,
  Circle,
  CircleDot,
  XCircle,
  RotateCcw,
} from 'lucide-react'
import type { ComponentType } from 'react'
import { Badge } from '../../components/ui/Badge'
import { useActionsLog } from '../../hooks/useActionsLog'
import { useTableWithPlayers } from '../../hooks/useTableWithPlayers'
import type { ActionLogRow, ActionType } from '../../types/database'

type BadgeColor = 'green' | 'yellow' | 'red' | 'blue' | 'neutral'

interface DisplayEntry {
  id: string
  time: string
  date: string
  icon: ComponentType<{ size?: number }>
  iconColor: BadgeColor
  title: string
  subtitle: string
  amounts: { value: number; positive: boolean }[]
  note?: string
}

const ICON_BY_TYPE: Record<ActionType, { icon: ComponentType<{ size?: number }>; color: BadgeColor }> = {
  check: { icon: Circle, color: 'neutral' },
  call: { icon: CircleDot, color: 'neutral' },
  raise: { icon: ArrowUpCircle, color: 'red' },
  fold: { icon: XCircle, color: 'red' },
  blind: { icon: PlusCircle, color: 'neutral' },
  transfer: { icon: ArrowLeftRight, color: 'green' },
  round_win: { icon: Trophy, color: 'yellow' },
  reset_hand: { icon: RotateCcw, color: 'red' },
}

function formatTime(iso: string) {
  const d = new Date(iso)
  return {
    time: d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }),
    date: d.toLocaleDateString('pl-PL'),
  }
}

/**
 * Blindy i wygrane przy split pot są w bazie osobnymi wierszami per gracz
 * (jeden wiersz = jeden player_id), ale mają wyglądać jak jeden wpis — grupujemy
 * po dokładnie tym samym created_at (oba wiersze powstają w jednym insert()).
 */
function groupEntries(rows: ActionLogRow[], nameById: Map<string, string>): DisplayEntry[] {
  const result: DisplayEntry[] = []
  let i = 0

  while (i < rows.length) {
    const row = rows[i]
    const { time, date } = formatTime(row.created_at)
    const { icon, color } = ICON_BY_TYPE[row.action_type]
    const name = nameById.get(row.player_id) ?? '?'

    if (row.action_type === 'blind' || row.action_type === 'round_win') {
      const group = [row]
      let j = i + 1
      while (j < rows.length && rows[j].created_at === row.created_at && rows[j].action_type === row.action_type) {
        group.push(rows[j])
        j++
      }
      i = j

      const names = group.map((r) => nameById.get(r.player_id) ?? '?')
      const total = group.reduce((sum, r) => sum + (r.amount ?? 0), 0)

      if (row.action_type === 'blind') {
        const sorted = [...group].sort((a, b) => (a.amount ?? 0) - (b.amount ?? 0))
        result.push({
          id: row.id,
          time,
          date,
          icon,
          iconColor: color,
          title: 'Blindy',
          subtitle: sorted.map((r) => r.amount).join(' / '),
          amounts: [{ value: total, positive: false }],
          note: sorted.map((r) => nameById.get(r.player_id) ?? '?').join(', '),
        })
      } else {
        result.push({
          id: row.id,
          time,
          date,
          icon,
          iconColor: color,
          title: names.join(', '),
          subtitle: group.length > 1 ? 'Wygrali pulę' : 'Wygrał pulę',
          amounts: [{ value: total, positive: true }],
          note: group.length > 1 ? 'Split pot' : undefined,
        })
      }
      continue
    }

    if (row.action_type === 'reset_hand') {
      result.push({
        id: row.id,
        time,
        date,
        icon,
        iconColor: color,
        title: 'Rozdanie zresetowane',
        subtitle: `Host: ${name}`,
        amounts: [],
        note: row.amount ? `Zwrot: ${row.amount.toLocaleString('pl-PL')}` : undefined,
      })
      i++
      continue
    }

    if (row.action_type === 'transfer') {
      const targetName = row.target_player_id ? (nameById.get(row.target_player_id) ?? '?') : '?'
      result.push({
        id: row.id,
        time,
        date,
        icon,
        iconColor: color,
        title: `${name} → ${targetName}`,
        subtitle: 'Transfer',
        amounts: [
          { value: row.amount ?? 0, positive: false },
          { value: row.amount ?? 0, positive: true },
        ],
      })
      i++
      continue
    }

    const SUBTITLE: Record<'check' | 'call' | 'raise' | 'fold', string> = {
      check: 'Check',
      call: 'Call',
      raise: `Raise do ${row.amount}`,
      fold: 'Fold',
    }
    result.push({
      id: row.id,
      time,
      date,
      icon,
      iconColor: color,
      title: name,
      subtitle: SUBTITLE[row.action_type as 'check' | 'call' | 'raise' | 'fold'],
      amounts: row.amount ? [{ value: row.amount, positive: false }] : [],
    })
    i++
  }

  return result
}

/**
 * Historia zdarzeń DLA TEGO STOŁU — wejście z menu kontekstowego (hamburger)
 * w Lobby/Game, nie z globalnej nawigacji (patrz src/pages/history/HistoryPlaceholderPage.tsx
 * dla wyjaśnienia, dlaczego dolna zakładka "Historia" na razie tego nie robi).
 * Filtrowanie po konkretnym graczu — funkcja na później.
 */
export function HistoryPage() {
  const { tableId } = useParams()
  const navigate = useNavigate()
  const { players } = useTableWithPlayers(tableId)
  const { entries, loading } = useActionsLog(tableId)

  const nameById = useMemo(() => new Map(players.map((p) => [p.id, p.name])), [players])
  const displayEntries = useMemo(() => groupEntries(entries, nameById), [entries, nameById])

  return (
    <div className="p-4">
      <header className="mb-6 flex items-center justify-between">
        <button type="button" onClick={() => navigate(-1)} aria-label="Wróć">
          <ChevronLeft size={22} className="text-fg" />
        </button>
        <h1 className="text-base font-semibold text-fg">Historia</h1>
        <SlidersHorizontal size={20} className="text-fg" />
      </header>

      {loading && <p className="text-center text-sm text-fg-muted">Wczytywanie...</p>}
      {!loading && displayEntries.length === 0 && (
        <p className="text-center text-sm text-fg-muted">Brak jeszcze żadnych zdarzeń.</p>
      )}

      <div className="flex flex-col divide-y divide-border">
        {displayEntries.map((entry) => (
          <div key={entry.id} className="flex items-start gap-3 py-3">
            <div className="w-12 shrink-0 text-xs text-fg-muted">
              <p>{entry.time}</p>
              <p>{entry.date}</p>
            </div>
            <Badge color={entry.iconColor} size={36}>
              <entry.icon size={18} />
            </Badge>
            <div className="flex-1">
              <p className="text-sm font-semibold text-fg">{entry.title}</p>
              <p className="text-xs text-fg-muted">{entry.subtitle}</p>
            </div>
            <div className="text-right">
              {entry.amounts.map((a, i) => (
                <p key={i} className={`text-sm font-semibold ${a.positive ? 'text-brand-green' : 'text-brand-red'}`}>
                  {a.positive ? '+' : '-'}
                  {a.value.toLocaleString('pl-PL')}
                </p>
              ))}
              {entry.note && <p className="text-xs text-fg-muted">{entry.note}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
