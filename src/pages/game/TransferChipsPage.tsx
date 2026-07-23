import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Sheet } from '../../components/ui/Sheet'
import { Stepper } from '../../components/ui/Stepper'
import { Button } from '../../components/ui/Button'
import { useTableWithPlayers } from '../../hooks/useTableWithPlayers'
import { useAuth } from '../../hooks/AuthContext'
import { useTransferChips } from '../../hooks/useTransferChips'

/**
 * Zwykły gracz może przekazać tylko swoje własne żetony (from = on sam,
 * niewybieralne). Host dodatkowo widzi selektor "Od kogo" i może przenieść
 * żetony między DOWOLNĄ parą graczy — np. żeby wyrównać pomyłkę albo
 * dołożyć komuś, kto zszedł do zera (serwer w transfer-chips egzekwuje to
 * samo uprawnienie, więc to nie jest tylko kosmetyka UI).
 */
export function TransferChipsPage() {
  const { tableId } = useParams()
  const navigate = useNavigate()
  const { players, loading } = useTableWithPlayers(tableId)
  const { user } = useAuth()
  const { transferChips, loading: sending, error } = useTransferChips()

  const presentPlayers = players.filter((p) => !p.left_at)
  const myPlayer = presentPlayers.find((p) => p.user_id === user?.id)
  const isHost = myPlayer?.position === 0

  const [fromId, setFromId] = useState<string | null>(null)
  const [targetId, setTargetId] = useState<string | null>(null)
  const [amount, setAmount] = useState(100)

  const from = (isHost ? presentPlayers.find((p) => p.id === fromId) : undefined) ?? myPlayer
  const otherPlayers = presentPlayers.filter((p) => p.id !== from?.id)
  const target = otherPlayers.find((p) => p.id === targetId) ?? otherPlayers[0]

  if (loading) {
    return <p className="p-4 text-center text-sm text-fg-muted">Wczytywanie...</p>
  }
  if (!tableId || !myPlayer || !from || !target) {
    return <p className="p-4 text-center text-sm text-brand-red">Brak innych graczy do przekazania żetonów.</p>
  }

  async function handleConfirm() {
    const ok = await transferChips(tableId!, from!.id, target!.id, amount)
    if (ok) navigate(-1)
  }

  return (
    <Sheet
      title="Przekaż żetony"
      subtitle={isHost ? 'Wybierz od kogo i do kogo' : 'Wybierz gracza'}
      footer={
        <>
          {error && <p className="mb-2 text-center text-sm text-brand-red">{error}</p>}
          <Button
            color="primary"
            tone="solid"
            fullWidth
            disabled={sending || amount <= 0 || amount > from.chip_total}
            onClick={handleConfirm}
          >
            {sending ? 'WYSYŁANIE...' : `WYŚLIJ ${amount} DO ${target.name.toUpperCase()}`}
          </Button>
        </>
      }
    >
      {isHost && (
        <>
          <p className="mb-2 text-sm font-semibold text-fg">Od kogo</p>
          <div className="mb-6 flex flex-col divide-y divide-border">
            {presentPlayers.map((player) => (
              <label key={player.id} className="flex items-center justify-between py-3">
                <span className="text-sm text-fg">
                  {player.name} {player.id === myPlayer.id && '(Ty)'}
                </span>
                <input
                  type="radio"
                  name="from-player"
                  checked={from.id === player.id}
                  onChange={() => {
                    setFromId(player.id)
                    if (targetId === player.id) setTargetId(null)
                  }}
                  className="h-5 w-5 accent-brand-green"
                />
              </label>
            ))}
          </div>
        </>
      )}

      <p className="mb-2 text-sm font-semibold text-fg">Do kogo</p>
      <div className="mb-8 flex flex-col divide-y divide-border">
        {otherPlayers.map((player) => (
          <label key={player.id} className="flex items-center justify-between py-3">
            <span className="text-sm text-fg">{player.name}</span>
            <input
              type="radio"
              name="target-player"
              checked={target.id === player.id}
              onChange={() => setTargetId(player.id)}
              className="h-5 w-5 accent-brand-green"
            />
          </label>
        ))}
      </div>

      <p className="mb-3 text-sm font-semibold text-fg">
        Kwota ({from.id === myPlayer.id ? 'masz' : `${from.name} ma`} {from.chip_total})
      </p>
      <Stepper value={amount} onChange={setAmount} min={0} max={from.chip_total} />
    </Sheet>
  )
}
