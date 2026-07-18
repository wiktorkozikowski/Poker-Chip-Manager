import { useRef } from 'react'
import type { KeyboardEvent } from 'react'

interface CodeInputProps {
  length?: number
  value: string
  onChange: (value: string) => void
}

/**
 * Pole na kod dołączenia do stołu — jeden znak na box, auto-przeskok do
 * następnego pola. Zwraca do rodzica pełny string przez onChange.
 */
export function CodeInput({ length = 4, value, onChange }: CodeInputProps) {
  const inputsRef = useRef<Array<HTMLInputElement | null>>([])

  const chars = Array.from({ length }, (_, i) => value[i] ?? '')

  function setChar(index: number, char: string) {
    const next = chars.slice()
    next[index] = char.slice(-1).toUpperCase()
    onChange(next.join('').replace(/\s+/g, ''))
    if (char && index < length - 1) {
      inputsRef.current[index + 1]?.focus()
    }
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !chars[index] && index > 0) {
      inputsRef.current[index - 1]?.focus()
    }
  }

  return (
    <div className="code-input flex justify-center gap-2">
      {chars.map((char, i) => (
        <input
          key={i}
          ref={(el) => {
            inputsRef.current[i] = el
          }}
          value={char}
          onChange={(e) => setChar(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          maxLength={1}
          inputMode="text"
          className="h-12 w-12 rounded-xl border border-border bg-surface-2 text-center text-lg font-semibold uppercase text-fg outline-none focus:border-brand-green"
        />
      ))}
    </div>
  )
}
