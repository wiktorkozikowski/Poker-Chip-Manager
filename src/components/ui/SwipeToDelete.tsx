import { useRef, useState, type MouseEvent, type PointerEvent, type ReactNode } from 'react'
import { Trash2 } from 'lucide-react'

interface SwipeToDeleteProps {
  onDelete: () => void
  children: ReactNode
  className?: string
}

const REVEAL_WIDTH = 80
const COMMIT_THRESHOLD = 60

/**
 * Przeciągnięcie w lewo odsłania czerwony kosz pod spodem (wzorem iOS
 * swipe-to-delete). Tylko dwa stany: albo przeciągnięcie przekracza
 * COMMIT_THRESHOLD i usuwa od razu przy puszczeniu, albo wraca w pełni do
 * ukrytej pozycji — świadomie bez pośredniego "zatrzaśniętego, odsłoniętego"
 * stanu (wymagającego drugiego stuknięcia), bo to zostawiało kosz widoczny
 * bez wyjaśnienia, dlaczego się nie chowa.
 *
 * `onClickCapture` tłumi kliknięcie pod spodem po realnym przeciągnięciu —
 * to pozwala owinąć tym komponentem coś klikalnego (np. całą kartę-link) bez
 * podwójnego efektu "swipe kończy się nawigacją".
 *
 * WAŻNE: `children` musi mieć własne NIEPRZEZROCZYSTE tło (np. `bg-surface`)
 * — kosz jest pozycjonowany pod spodem (position: absolute) i bez
 * nieprzezroczystego tła na dzieciach będzie prześwitywał przez cały czas,
 * nie tylko w trakcie przeciągania (to konkretnie był bug w LobbyPage).
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
    setDragX(0)
    if (delta > COMMIT_THRESHOLD) {
      draggingRef.current = false
      onDelete()
      return
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
