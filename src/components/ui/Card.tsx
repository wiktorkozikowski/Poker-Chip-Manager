import type { HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  highlighted?: boolean
}

/**
 * Generyczny kontener karty. `highlighted` daje zielone obramowanie/poświatę
 * — używane dla aktywnego stołu, gracza na ruchu itp.
 */
export function Card({ highlighted = false, className = '', ...rest }: CardProps) {
  return (
    <div
      className={`card rounded-2xl border bg-surface p-4 ${
        highlighted ? 'border-brand-green bg-brand-green/10' : 'border-border'
      } ${className}`}
      {...rest}
    />
  )
}
