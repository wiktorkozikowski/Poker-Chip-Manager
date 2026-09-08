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
 * Nawigacja poza rozgrywką (patrz src/layouts/TableLayout.tsx, gdzie jej nie
 * ma). Na telefonie — stały dolny pasek zakładek (kciuk w zasięgu). Na
 * desktopie ten sam dolny pasek nie ma sensu (nawyk "kciukiem" nie dotyczy
 * myszki, a wąski pasek zgubiony na środku szerokiego ekranu wygląda
 * ucięty) — tam zamiast niego pełnoszerokościowy górny navbar.
 */
export function BottomTabBar() {
  return (
    <>
      <nav className="tab-bar fixed bottom-0 left-1/2 z-10 flex w-full max-w-md -translate-x-1/2 border-t border-border bg-surface sm:hidden">
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

      <nav className="fixed inset-x-0 top-0 z-10 hidden border-b border-border bg-surface sm:block">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-6">
          <span className="font-logo text-lg font-bold tracking-tight text-fg">
            Poker <span className="text-brand-green">Chip</span> Manager
          </span>
          <div className="flex items-center gap-6">
            {TABS.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-2 text-sm font-semibold transition hover:text-fg ${
                    isActive ? 'text-brand-green' : 'text-fg-muted'
                  }`
                }
              >
                <Icon size={18} />
                {label}
              </NavLink>
            ))}
          </div>
        </div>
      </nav>
    </>
  )
}
