import { useNavigate, useParams } from 'react-router-dom'
import { Sheet } from '../../components/ui/Sheet'
import { Button } from '../../components/ui/Button'
import { useTableWithPlayers } from '../../hooks/useTableWithPlayers'
import { useAuth } from '../../hooks/AuthContext'
import { useResetHand } from '../../hooks/useResetHand'

export function ResetHandPage() {
  const { tableId } = useParams()
  const navigate = useNavigate()
  const { table, players, loading } = useTableWithPlayers(tableId)
  const { user } = useAuth()
  const { resetHand, loading: resetting, error } = useResetHand()

  const myPlayer = players.find((p) => !p.left_at && p.user_id === user?.id)
  const isHost = myPlayer?.position === 0

  if (loading) {
    return <p className="p-4 text-center text-sm text-fg-muted">Wczytywanie...</p>
  }
  if (!table || !myPlayer) {
    return <p className="p-4 text-center text-sm text-brand-red">Nie znaleziono stołu.</p>
  }
  if (!isHost) {
    return <p className="p-4 text-center text-sm text-fg-muted">Tylko host może zresetować rozdanie.</p>
  }
  if (table.status !== 'active') {
    return <p className="p-4 text-center text-sm text-fg-muted">Nie ma teraz żadnego rozdania do zresetowania.</p>
  }

  async function handleConfirm() {
    const ok = await resetHand(tableId!, myPlayer!.id)
    if (ok) navigate(`/tables/${tableId}/game`)
  }

  return (
    <Sheet title="Zresetuj rozdanie" subtitle="Na pewno chcesz cofnąć bieżące rozdanie?">
      <p className="text-sm text-brand-red">
        Wszystkie postawione w tej ręce żetony (pula: {table.pot.toLocaleString('pl-PL')}) wrócą do graczy. Od razu
        rozda się nowa ręka przy tym samym dealerze.
      </p>
      {error && <p className="mt-4 text-center text-sm text-brand-red">{error}</p>}
      <div className="mt-6 flex flex-col gap-2">
        <Button color="danger" tone="solid" fullWidth disabled={resetting} onClick={handleConfirm}>
          {resetting ? 'RESETOWANIE...' : 'ZRESETUJ ROZDANIE'}
        </Button>
        <Button color="neutral" tone="outline" fullWidth onClick={() => navigate(-1)}>
          ANULUJ
        </Button>
      </div>
    </Sheet>
  )
}
