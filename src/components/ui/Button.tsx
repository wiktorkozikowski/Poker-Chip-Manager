import type { ButtonHTMLAttributes } from 'react'

type Color = 'primary' | 'warning' | 'danger' | 'neutral'
type Tone = 'solid' | 'outline'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  color?: Color
  tone?: Tone
  fullWidth?: boolean
}

const COLOR_CLASSES: Record<Color, Record<Tone, string>> = {
  primary: {
    solid: 'bg-brand-green text-black',
    outline: 'border border-brand-green text-brand-green bg-transparent',
  },
  warning: {
    solid: 'bg-brand-yellow text-black',
    outline: 'border border-brand-yellow text-brand-yellow bg-transparent',
  },
  danger: {
    solid: 'bg-brand-red text-white',
    outline: 'border border-brand-red text-brand-red bg-transparent',
  },
  neutral: {
    solid: 'bg-surface-2 text-fg',
    outline: 'border border-border text-fg bg-transparent',
  },
}

/**
 * Generyczny przycisk — kolor i wariant (solid/outline) sterują wyglądem,
 * a nie osobne klasy per ekran. Restyle = zmiana COLOR_CLASSES.
 */
export function Button({
  color = 'neutral',
  tone = 'solid',
  fullWidth = false,
  className = '',
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`btn rounded-xl px-4 py-3 text-sm font-semibold transition active:opacity-80 disabled:opacity-40 ${COLOR_CLASSES[color][tone]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...rest}
    />
  )
}
