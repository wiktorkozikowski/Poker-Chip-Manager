import { Outlet } from 'react-router-dom'

/**
 * Layout dla rozgrywki przy stole (Lobby, Game, Raise, ResolveRound,
 * TransferChips). Świadomie bez dolnego paska nawigacji, żeby nic nie
 * odrywało gracza od aktualnej ręki.
 */
export function TableLayout() {
  return (
    <div className="min-h-svh">
      <Outlet />
    </div>
  )
}
