import type { ReactNode } from 'react'

interface SheetProps {
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
}

/**
 * Pełnoekranowy wrapper w stylu "bottom sheet" (uchwyt do przeciągania u
 * góry, tytuł, podtytuł) — używany przez ekrany wywoływane z rozgrywki
 * (Raise, Transfer, Resolve Round).
 */
export function Sheet({ title, subtitle, children, footer }: SheetProps) {
  return (
    <div className="sheet flex min-h-svh flex-col bg-bg px-5 pb-6 pt-3">
      <div className="mx-auto mb-4 h-1 w-10 shrink-0 rounded-full bg-surface-2" />
      <div className="mb-6 text-center">
        <h1 className="text-lg font-semibold text-fg">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-fg-muted">{subtitle}</p>}
      </div>
      <div className="flex-1">{children}</div>
      {footer && <div className="mt-6">{footer}</div>}
    </div>
  )
}
