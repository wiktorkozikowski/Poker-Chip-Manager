import type { ReactNode } from 'react'

type BadgeColor = 'green' | 'yellow' | 'red' | 'blue' | 'neutral'

interface BadgeProps {
  children: ReactNode
  color?: BadgeColor
  size?: number
}

const COLOR_CLASSES: Record<BadgeColor, string> = {
  green: 'bg-brand-green/20 text-brand-green',
  yellow: 'bg-brand-yellow/20 text-brand-yellow',
  red: 'bg-brand-red/20 text-brand-red',
  blue: 'bg-brand-blue/20 text-brand-blue',
  neutral: 'bg-surface-2 text-fg-muted',
}

/**
 * Mały okrągły znacznik — litera (Dealer "D" / Host "H") albo ikonka
 * (wpisy w Historii). Kolor niesie znaczenie, kształt jest zawsze taki sam.
 */
export function Badge({ children, color = 'neutral', size = 22 }: BadgeProps) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full text-xs font-bold ${COLOR_CLASSES[color]}`}
      style={{ width: size, height: size }}
    >
      {children}
    </span>
  )
}
