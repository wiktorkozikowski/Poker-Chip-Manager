import { RouterProvider } from 'react-router-dom'
import { router } from './routes/router'
import { useAuth } from './hooks/AuthContext'
import { AuthGatePage } from './pages/auth/AuthGatePage'

function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return <p className="p-4 text-center text-sm text-fg-muted">Wczytywanie...</p>
  }

  if (!user) {
    return <AuthGatePage />
  }

  return <RouterProvider router={router} />
}

export default App
