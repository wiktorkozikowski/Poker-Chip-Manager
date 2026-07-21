import { useRef, useState, type MouseEvent, type PointerEvent, type ReactNode } from 'react'
import { Trash2 } from 'lucide-react'

interface SwipeToDeleteProps {
  onDelete: () => void
  children: ReactNode
  className?: string
}

const REVEAL_WIDTH = 80
const SNAP_THRESHOLD = 24
const COMMIT_THRESHOLD = 60

/**
 * Przeciągnięcie w lewo odsłania czerwony kosz pod spodem (wzorem iOS
 * swipe-to-delete). Krótkie przeciągnięcie (>SNAP_THRESHOLD) zatrzaskuje w
 * pozycji odsłoniętej — trzeba dotknąć kosza, żeby faktycznie usunąć
 * (zabezpieczenie przed przypadkowym szybkim swipe'em). Dłuższe
 * (>COMMIT_THRESHOLD) usuwa od razu przy puszczeniu.
 *
 * `onClickCapture` tłumi kliknięcie pod spodem po realnym przeciągnięciu —
 * to pozwala owinąć tym komponentem coś klikalnego (np. całą kartę-link) bez
 * podwójnego efektu "swipe kończy się nawigacją".
 */
export function SwipeToDelete({ onDelete, children, className = '' }: SwipeToDeleteProps) {
  const [dragX, setDragX] = useState(0)
  const draggingRef = useRef(false)
  const startXRef = useRef(0)
  const pointerIdRef = useRef<number | null>(null)

  function handlePointerDown(e: PointerEvent<HTMLDivElement>) {
    startXRef.current = e.clientX
    pointerIdRef.current = e.pointerId
    // Świadomie NIE wołamy tu setPointerCapture — w Chromium przechwycenie
    // wskaźnika przekierowuje też końcowe zdarzenie 'click' do tego diva,
    // co zablokowałoby zwykłe tapnięcie w cokolwiek klikalnego w środku
    // (np. całą kartę-link). Capture włączamy dopiero w handlePointerMove,
    // gdy realnie zaczyna się przeciąganie — zwykły tap nigdy go nie ustawia.
  }

  function handlePointerMove(e: PointerEvent<HTMLDivElement>) {
    if (pointerIdRef.current !== e.pointerId) return
    const delta = e.clientX - startXRef.current
    if (Math.abs(delta) > 8 && !draggingRef.current) {
      draggingRef.current = true
      e.currentTarget.setPointerCapture(e.pointerId)
    }
    setDragX(Math.max(-REVEAL_WIDTH, Math.min(0, delta)))
  }

  function handlePointerUp(e: PointerEvent<HTMLDivElement>) {
    if (pointerIdRef.current !== e.pointerId) return
    pointerIdRef.current = null
    const delta = -dragX
    if (delta > COMMIT_THRESHOLD) {
      setDragX(0)
      draggingRef.current = false
      onDelete()
      return
    }
    if (delta > SNAP_THRESHOLD) {
      setDragX(-REVEAL_WIDTH)
    } else {
      setDragX(0)
    }
    // Klik-tłumiący ref resetujemy z lekkim opóźnieniem, żeby zdążył
    // przechwycić syntetyczny click, który przeglądarka wystrzeli po pointerup.
    setTimeout(() => {
      draggingRef.current = false
    }, 0)
  }

  function handleClickCapture(e: MouseEvent) {
    if (draggingRef.current) {
      e.preventDefault()
      e.stopPropagation()
    }
  }

  return (
    <div className={`relative overflow-hidden rounded-2xl ${className}`}>
      <div className="absolute inset-y-0 right-0 flex w-20 items-center justify-center rounded-2xl bg-brand-red">
        <button
          type="button"
          aria-label="Usuń"
          onClick={() => {
            setDragX(0)
            onDelete()
          }}
          className="flex h-full w-full items-center justify-center"
        >
          <Trash2 size={20} className="text-white" />
        </button>
      </div>
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onClickCapture={handleClickCapture}
        style={{ transform: `translateX(${dragX}px)`, touchAction: 'pan-y' }}
        className="relative transition-transform duration-150 ease-out"
      >
        {children}
      </div>
    </div>
  )
}
