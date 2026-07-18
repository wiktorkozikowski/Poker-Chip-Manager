import { SlidersHorizontal, Trophy, ArrowUpCircle, PlusCircle, ArrowLeftRight } from 'lucide-react'
import type { ComponentType } from 'react'
import { Badge } from '../../components/ui/Badge'

type BadgeColor = 'green' | 'yellow' | 'red' | 'blue' | 'neutral'

interface HistoryEntry {
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

// Dane przykładowe do podglądu warstwy wizualnej — realny log z actions_log
// trafi tu w Fazie 5.
const MOCK_HISTORY: HistoryEntry[] = [
  {
    id: '1',
    time: '22:15',
    date: '24.05.2024',
    icon: Trophy,
    iconColor: 'yellow',
    title: 'Adam, Karol',
    subtitle: 'Wygrali pulę',
    amounts: [{ value: 1420, positive: true }],
    note: 'Split pot',
  },
  {
    id: '2',
    time: '22:13',
    date: '24.05.2024',
    icon: ArrowUpCircle,
    iconColor: 'red',
    title: 'Karol',
    subtitle: 'Raise do 120',
    amounts: [{ value: 120, positive: false }],
  },
  {
    id: '3',
    time: '22:12',
    date: '24.05.2024',
    icon: PlusCircle,
    iconColor: 'neutral',
    title: 'Blindy',
    subtitle: '20 / 40',
    amounts: [{ value: 60, positive: false }],
    note: 'Tomek, Kuba',
  },
  {
    id: '4',
    time: '22:10',
    date: '24.05.2024',
    icon: ArrowLeftRight,
    iconColor: 'green',
    title: 'Tomek → Adam',
    subtitle: 'Transfer',
    amounts: [
      { value: 200, positive: false },
      { value: 200, positive: true },
    ],
  },
]

function formatAmount(value: number, positive: boolean) {
  const sign = positive ? '+' : '-'
  return `${sign}${value.toLocaleString('pl-PL')}`
}

export function HistoryPage() {
  return (
    <div className="p-4">
      <header className="mb-6 flex items-center justify-between">
        <span className="w-6" />
        <h1 className="text-base font-semibold text-fg">Historia</h1>
        <SlidersHorizontal size={20} className="text-fg" />
      </header>

      <div className="flex flex-col divide-y divide-border">
        {MOCK_HISTORY.map((entry) => (
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
                  {formatAmount(a.value, a.positive)}
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
