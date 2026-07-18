interface AmountSliderProps {
  value: number
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
}

/**
 * Suwak kwoty — natywny input[range] kolorowany przez accent-color, żeby
 * uniknąć custom CSS dla thumbów w każdej przeglądarce.
 */
export function AmountSlider({ value, min, max, step = 1, onChange }: AmountSliderProps) {
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="amount-slider h-2 w-full cursor-pointer accent-brand-green"
    />
  )
}
