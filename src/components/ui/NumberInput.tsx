import { useEffect, useState } from 'react'

interface NumberInputProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  className?: string
}

/**
 * Input liczbowy, który da się faktycznie wyczyścić podczas pisania.
 *
 * Zwykły `<input type="number" value={n}>` sterowany bezpośrednio stanem
 * liczbowym psuje się przy czyszczeniu pola: pusty string parsuje się na 0,
 * które natychmiast wraca do pola jako "0" — więc pole nigdy nie jest
 * naprawdę puste, a wpisanie kolejnej cyfry daje "030" zamiast "30".
 * Ten komponent trzyma osobny stan tekstowy podczas edycji i dopiero przy
 * pustym/nieprawidłowym polu na blur wraca do ostatniej poprawnej wartości
 * (bez przycinania do min/max w trakcie pisania — to też by przeszkadzało).
 */
export function NumberInput({ value, onChange, min, max, className }: NumberInputProps) {
  const [text, setText] = useState(String(value))

  useEffect(() => {
    setText(String(value))
  }, [value])

  function handleChange(raw: string) {
    setText(raw)
    if (raw !== '' && !Number.isNaN(Number(raw))) {
      onChange(Number(raw))
    }
  }

  function handleBlur() {
    let n = Number(text)
    if (text === '' || Number.isNaN(n)) {
      n = value
    }
    if (min !== undefined) n = Math.max(min, n)
    if (max !== undefined) n = Math.min(max, n)
    setText(String(n))
    onChange(n)
  }

  return (
    <input
      type="number"
      min={min}
      max={max}
      value={text}
      onChange={(e) => handleChange(e.target.value)}
      onBlur={handleBlur}
      className={className}
    />
  )
}
