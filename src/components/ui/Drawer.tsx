import type { ReactNode } from 'react'
import { X } from 'lucide-react'

interface DrawerProps {
  open: boolean
  onClose: () => void
  children: ReactNode
}

/**
 * Generyczny boczny panel wysuwany z lewej krawędzi (menu kontekstowe
 * stołu). Zamyka się kliknięciem w tło albo w X.
 */
export function Drawer({ open, onClose, children }: DrawerProps) {
  return (
    <>
      <div
        className={`fixed inset-0 z-20 bg-black/60 transition-opacity ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
      />
      <div
        className={`fixed inset-y-0 left-0 z-30 w-64 max-w-[80vw] border-r border-border bg-surface p-4 transition-transform duration-200 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button type="button" aria-label="Zamknij menu" onClick={onClose} className="mb-4 text-fg-muted">
          <X size={20} />
        </button>
        {children}
      </div>
    </>
  )
}
