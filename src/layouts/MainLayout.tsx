import { Outlet } from 'react-router-dom'
import { BottomTabBar } from '../components/nav/BottomTabBar'

/**
 * Layout dla trybów spoza rozgrywki (Stoły / Historia / Ustawienia).
 * Utrzymuje stały dolny pasek nawigacji.
 */
export function MainLayout() {
  return (
    <div className="flex min-h-svh flex-col pb-16">
      <main className="flex-1">
        <Outlet />
      </main>
      <BottomTabBar />
    </div>
  )
}
