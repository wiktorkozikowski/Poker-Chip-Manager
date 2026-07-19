import { Link } from 'react-router-dom'
import { History, LayoutGrid } from 'lucide-react'
import { Drawer } from '../ui/Drawer'

interface TableMenuProps {
  tableId: string
  open: boolean
  onClose: () => void
}

/** Menu kontekstowe stołu (hamburger w Lobby/Game) — na razie tylko Historia. */
export function TableMenu({ tableId, open, onClose }: TableMenuProps) {
  return (
    <Drawer open={open} onClose={onClose}>
      <nav className="flex flex-col gap-1">
        <Link
          to={`/tables/${tableId}/history`}
          onClick={onClose}
          className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-fg hover:bg-surface-2"
        >
          <History size={18} />
          Historia
        </Link>
        <Link
          to="/tables"
          onClick={onClose}
          className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-fg hover:bg-surface-2"
        >
          <LayoutGrid size={18} />
          Moje Stoły
        </Link>
      </nav>
    </Drawer>
  )
}
