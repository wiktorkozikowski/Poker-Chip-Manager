import { createBrowserRouter, Navigate } from 'react-router-dom'
import { MainLayout } from '../layouts/MainLayout'
import { TableLayout } from '../layouts/TableLayout'
import { TablesListPage } from '../pages/tables/TablesListPage'
import { CreateTablePage } from '../pages/tables/CreateTablePage'
import { LobbyPage } from '../pages/tables/LobbyPage'
import { GamePage } from '../pages/game/GamePage'
import { RaisePage } from '../pages/game/RaisePage'
import { ResolveRoundPage } from '../pages/game/ResolveRoundPage'
import { TransferChipsPage } from '../pages/game/TransferChipsPage'
import { HistoryPage } from '../pages/game/HistoryPage'
import { PlayerConfigPage } from '../pages/game/PlayerConfigPage'
import { LeaveTablePage } from '../pages/game/LeaveTablePage'
import { CloseTablePage } from '../pages/game/CloseTablePage'
import { ResetHandPage } from '../pages/game/ResetHandPage'
import { HandRankingsPage } from '../pages/game/HandRankingsPage'
import { HistoryPlaceholderPage } from '../pages/history/HistoryPlaceholderPage'
import { SettingsPage } from '../pages/settings/SettingsPage'

export const router = createBrowserRouter([
  {
    // Tryby spoza rozgrywki — stały dolny pasek nawigacji (Stoły/Historia/Ustawienia).
    element: <MainLayout />,
    children: [
      { index: true, element: <Navigate to="/tables" replace /> },
      { path: 'tables', element: <TablesListPage /> },
      { path: 'tables/new', element: <CreateTablePage /> },
      { path: 'tables/:tableId/lobby', element: <LobbyPage /> },
      { path: 'history', element: <HistoryPlaceholderPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
  {
    // Rozgrywka przy stole — bez dolnego paska nawigacji.
    element: <TableLayout />,
    children: [
      { path: 'tables/:tableId/game', element: <GamePage /> },
      { path: 'tables/:tableId/game/raise', element: <RaisePage /> },
      { path: 'tables/:tableId/game/resolve', element: <ResolveRoundPage /> },
      { path: 'tables/:tableId/game/transfer', element: <TransferChipsPage /> },
      { path: 'tables/:tableId/history', element: <HistoryPage /> },
      { path: 'tables/:tableId/players', element: <PlayerConfigPage /> },
      { path: 'tables/:tableId/leave', element: <LeaveTablePage /> },
      { path: 'tables/:tableId/close', element: <CloseTablePage /> },
      { path: 'tables/:tableId/reset-hand', element: <ResetHandPage /> },
      { path: 'tables/:tableId/hand-rankings', element: <HandRankingsPage /> },
    ],
  },
])
