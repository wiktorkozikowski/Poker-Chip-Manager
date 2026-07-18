import { Minus, Plus } from 'lucide-react'

interface StepperProps {
  value: number
  onChange: (value: number) => void
  step?: number
  min?: number
  max?: number
}

/**
 * Duży centralny licznik z okrągłymi przyciskami minus/plus po bokach —
 * używany do wyboru kwoty (Raise, Transfer).
 */
export function Stepper({ value, onChange, step = 10, min = 0, max = Infinity }: StepperProps) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n))

  return (
    <div className="stepper flex items-center justify-center gap-6">
      <button
        type="button"
        aria-label="Zmniejsz"
        onClick={() => onChange(clamp(value - step))}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-2 text-fg"
      >
        <Minus size={18} />
      </button>
      <span className="w-24 text-center text-4xl font-bold tabular-nums text-fg">{value}</span>
      <button
        type="button"
        aria-label="Zwiększ"
        onClick={() => onChange(clamp(value + step))}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-2 text-fg"
      >
        <Plus size={18} />
      </button>
    </div>
  )
}
