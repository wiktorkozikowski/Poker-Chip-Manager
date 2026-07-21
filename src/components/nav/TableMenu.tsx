import { Link } from 'react-router-dom'
import { History, LayoutGrid, Users, Lock, LogOut, RotateCcw } from 'lucide-react'
import { Drawer } from '../ui/Drawer'

interface TableMenuProps {
  tableId: string
  isHost: boolean
  /** Host widzi "Zresetuj rozdanie" tylko gdy jest jakaś ręka w toku (status 'active'). */
  canResetHand: boolean
  open: boolean
  onClose: () => void
}

const itemClass = 'flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-fg hover:bg-surface-2'
const dangerItemClass = 'flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-brand-red hover:bg-brand-red/10'

/**
 * Menu kontekstowe stołu (hamburger w Lobby/Game). Host widzi "Gracze"
 * (kick/reorder/przekazanie roli) i "Zamknij stół", ale nigdy "Opuść stół" —
 * position 0 (host) nie może opuścić bez wcześniejszego przekazania roli
 * (patrz LeaveTablePage), więc ta opcja byłaby zawsze ślepym zaułkiem dla
 * niego. Jeśli przekaże rolę w panelu Gracze, `isHost` przeliczy się na
 * false przy następnym renderze i wtedy zobaczy "Opuść stół" naturalnie.
 */
export function TableMenu({ tableId, isHost, canResetHand, open, onClose }: TableMenuProps) {
  return (
    <Drawer open={open} onClose={onClose}>
      <nav className="flex flex-col gap-1">
        <Link to={`/tables/${tableId}/history`} onClick={onClose} className={itemClass}>
          <History size={18} />
          Historia
        </Link>
        <Link to="/tables" onClick={onClose} className={itemClass}>
          <LayoutGrid size={18} />
          Moje Stoły
        </Link>
        {isHost ? (
          <>
            <Link to={`/tables/${tableId}/players`} onClick={onClose} className={itemClass}>
              <Users size={18} />
              Gracze
            </Link>
            {canResetHand && (
              <Link to={`/tables/${tableId}/reset-hand`} onClick={onClose} className={dangerItemClass}>
                <RotateCcw size={18} />
                Zresetuj rozdanie
              </Link>
            )}
            <Link to={`/tables/${tableId}/close`} onClick={onClose} className={dangerItemClass}>
              <Lock size={18} />
              Zamknij stół
            </Link>
          </>
        ) : (
          <Link to={`/tables/${tableId}/leave`} onClick={onClose} className={dangerItemClass}>
            <LogOut size={18} />
            Opuść stół
          </Link>
        )}
      </nav>
    </Drawer>
  )
}
