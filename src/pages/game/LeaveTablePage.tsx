import { useNavigate, useParams, Link } from 'react-router-dom'
import { Sheet } from '../../components/ui/Sheet'
import { Button } from '../../components/ui/Button'
import { useTableWithPlayers } from '../../hooks/useTableWithPlayers'
import { useAuth } from '../../hooks/AuthContext'
import { useLeaveTable } from '../../hooks/useLeaveTable'

export function LeaveTablePage() {
  const { tableId } = useParams()
  const navigate = useNavigate()
  const { table, players, loading } = useTableWithPlayers(tableId)
  const { user } = useAuth()
  const { leaveTable, loading: leaving, error } = useLeaveTable()

  const myPlayer = players.find((p) => !p.left_at && p.user_id === user?.id)
  const isHost = myPlayer?.position === 0

  if (loading) {
    return <p className="p-4 text-center text-sm text-fg-muted">Wczytywanie...</p>
  }
  if (!table || !myPlayer) {
    return <p className="p-4 text-center text-sm text-brand-red">Nie znaleziono stołu.</p>
  }

  if (isHost) {
    return (
      <Sheet title="Opuść stół" subtitle="Jesteś hostem tego stołu">
        <p className="text-sm text-fg-muted">
          Zanim opuścisz stół, musisz przekazać rolę hosta innemu graczowi — inaczej nikt nie mógłby nim dalej
          zarządzać.
        </p>
        <Link to={`/tables/${tableId}/players`} className="mt-6 block">
          <Button color="primary" tone="solid" fullWidth>
            PRZEKAŻ ROLĘ HOSTA
          </Button>
        </Link>
      </Sheet>
    )
  }

  async function handleConfirm() {
    const ok = await leaveTable(tableId!, myPlayer!.id)
    if (ok) navigate('/tables')
  }

  return (
    <Sheet title="Opuść stół" subtitle="Na pewno chcesz opuścić ten stół?">
      {table.status === 'active' && (
        <p className="text-sm text-brand-red">Nie będziesz mógł dołączyć ponownie do tej rozgrywki.</p>
      )}
      {error && <p className="mt-4 text-center text-sm text-brand-red">{error}</p>}
      <div className="mt-6 flex flex-col gap-2">
        <Button color="danger" tone="solid" fullWidth disabled={leaving} onClick={handleConfirm}>
          {leaving ? 'OPUSZCZANIE...' : 'OPUŚĆ STÓŁ'}
        </Button>
        <Button color="neutral" tone="outline" fullWidth onClick={() => navigate(-1)}>
          ANULUJ
        </Button>
      </div>
    </Sheet>
  )
}
