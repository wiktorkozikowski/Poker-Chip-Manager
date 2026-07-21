import type { BettingRound, TableRow } from '../../types/database'

const STEPS: { round: BettingRound; label: string }[] = [
  { round: 'preflop', label: 'Preflop' },
  { round: 'flop', label: 'Flop' },
  { round: 'turn', label: 'Turn' },
  { round: 'river', label: 'River' },
]

interface RoundProgressProps {
  table: TableRow
}

/**
 * Cztery kropki (Preflop/Flop/Turn/River) połączone linią zamiast napisu
 * "Runda: X" — na niebiesko obecny etap, na zielono zakończone, bez koloru
 * jeszcze nieosiągnięte. Na żółto etap, na którym licytacja się zamknęła i
 * czeka na rozstrzygnięcie przez dealera (koniec rivera ALBO fold-out —
 * `showdown_from_round` pamięta, z której ulicy, bo fold-out może zamknąć
 * rozdanie wcześniej niż na riverze).
 */
export function RoundProgress({ table }: RoundProgressProps) {
  const isShowdown = table.current_round === 'showdown'
  const activeRound = isShowdown ? (table.showdown_from_round ?? 'river') : table.current_round
  const activeIndex = STEPS.findIndex((s) => s.round === activeRound)

  return (
    <div
      className="flex items-center justify-center"
      role="img"
      aria-label={`Etap rozdania: ${STEPS[activeIndex]?.label ?? ''}${isShowdown ? ' — czeka na rozstrzygnięcie' : ''}`}
    >
      {STEPS.map((step, i) => {
        const isDone = i < activeIndex
        const isActive = i === activeIndex
        const dotColor = isDone
          ? 'bg-brand-green'
          : isActive
            ? isShowdown
              ? 'bg-brand-yellow'
              : 'bg-brand-blue'
            : 'bg-surface-2'
        const lineColor = i < activeIndex ? 'bg-brand-green' : 'bg-surface-2'

        return (
          <div key={step.round} className="flex items-center">
            <span className={`h-2.5 w-2.5 rounded-full transition-colors ${dotColor}`} title={step.label} />
            {i < STEPS.length - 1 && <span className={`h-0.5 w-7 transition-colors ${lineColor}`} />}
          </div>
        )
      })}
    </div>
  )
}
