import { Outlet } from 'react-router-dom'

/**
 * Layout dla rozgrywki przy stole (Lobby, Game, Raise, ResolveRound,
 * TransferChips). Świadomie bez dolnego paska nawigacji, żeby nic nie
 * odrywało gracza od aktualnej ręki.
 */
export function TableLayout() {
  return (
    <div className="flex min-h-svh justify-center">
      <div className="w-full max-w-md sm:max-w-xl">
        <Outlet />
      </div>
    </div>
  )
}
