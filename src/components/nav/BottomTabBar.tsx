import { NavLink } from 'react-router-dom'
import { LayoutGrid, History, Settings } from 'lucide-react'
import type { ComponentType } from 'react'

interface TabDefinition {
  to: string
  label: string
  icon: ComponentType<{ size?: number }>
}

const TABS: TabDefinition[] = [
  { to: '/tables', label: 'Stoły', icon: LayoutGrid },
  { to: '/history', label: 'Historia', icon: History },
  { to: '/settings', label: 'Ustawienia', icon: Settings },
]

/**
 * Stały dolny pasek nawigacji, widoczny we wszystkich ekranach poza
 * rozgrywką przy stole (patrz src/layouts/TableLayout.tsx).
 */
export function BottomTabBar() {
  return (
    <nav className="tab-bar fixed inset-x-0 bottom-0 z-10 flex border-t border-border bg-surface">
      {TABS.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `tab-bar-item flex flex-1 flex-col items-center gap-1 py-2.5 text-xs ${
              isActive ? 'font-semibold text-brand-green' : 'text-fg-muted'
            }`
          }
        >
          <Icon size={20} />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
