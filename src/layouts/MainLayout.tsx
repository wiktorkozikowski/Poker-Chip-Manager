import { Outlet } from 'react-router-dom'
import { BottomTabBar } from '../components/nav/BottomTabBar'

/**
 * Layout dla trybów spoza rozgrywki (Stoły / Historia / Ustawienia).
 * Utrzymuje stały dolny pasek nawigacji.
 */
export function MainLayout() {
  return (
    <div className="flex min-h-svh justify-center">
      <div className="flex w-full max-w-md flex-col pb-16 sm:max-w-2xl sm:pb-0 sm:pt-16">
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
      <BottomTabBar />
    </div>
  )
}
