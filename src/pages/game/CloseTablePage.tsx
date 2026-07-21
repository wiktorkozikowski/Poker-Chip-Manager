import { useNavigate, useParams } from 'react-router-dom'
import { Sheet } from '../../components/ui/Sheet'
import { Button } from '../../components/ui/Button'
import { useTableWithPlayers } from '../../hooks/useTableWithPlayers'
import { useAuth } from '../../hooks/AuthContext'
import { useCloseTable } from '../../hooks/useCloseTable'

export function CloseTablePage() {
  const { tableId } = useParams()
  const navigate = useNavigate()
  const { table, players, loading } = useTableWithPlayers(tableId)
  const { user } = useAuth()
  const { closeTable, loading: closing, error } = useCloseTable()

  const myPlayer = players.find((p) => !p.left_at && p.user_id === user?.id)
  const isHost = myPlayer?.position === 0

  if (loading) {
    return <p className="p-4 text-center text-sm text-fg-muted">Wczytywanie...</p>
  }
  if (!table || !myPlayer) {
    return <p className="p-4 text-center text-sm text-brand-red">Nie znaleziono stołu.</p>
  }
  if (!isHost) {
    return <p className="p-4 text-center text-sm text-fg-muted">Tylko host może zamknąć stół.</p>
  }

  async function handleConfirm() {
    const ok = await closeTable(tableId!, myPlayer!.id)
    if (ok) navigate('/tables')
  }

  return (
    <Sheet title="Zamknij stół" subtitle="Na pewno chcesz zamknąć ten stół?">
      {table.status === 'active' && (
        <p className="text-sm text-brand-red">Gra jest w trakcie. Żetony NIE zostaną rozliczone.</p>
      )}
      {error && <p className="mt-4 text-center text-sm text-brand-red">{error}</p>}
      <div className="mt-6 flex flex-col gap-2">
        <Button color="danger" tone="solid" fullWidth disabled={closing} onClick={handleConfirm}>
          {closing ? 'ZAMYKANIE...' : 'ZAMKNIJ STÓŁ'}
        </Button>
        <Button color="neutral" tone="outline" fullWidth onClick={() => navigate(-1)}>
          ANULUJ
        </Button>
      </div>
    </Sheet>
  )
}
