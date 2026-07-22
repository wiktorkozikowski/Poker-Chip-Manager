import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'

type Suit = '♥' | '♦' | '♣' | '♠'

interface CardSpec {
  rank: string
  suit: Suit
}

interface HandRanking {
  rank: number
  name: string
  description: string
  cards: CardSpec[]
  note: string
}

const RED_SUITS: Suit[] = ['♥', '♦']

const HAND_RANKINGS: HandRanking[] = [
  {
    rank: 1,
    name: 'Poker królewski',
    description: 'Piątka w tym samym kolorze od 10 do asa.',
    cards: [
      { rank: '10', suit: '♥' },
      { rank: 'J', suit: '♥' },
      { rank: 'Q', suit: '♥' },
      { rank: 'K', suit: '♥' },
      { rank: 'A', suit: '♥' },
    ],
    note: 'Najsilniejszy układ w pokerze.',
  },
  {
    rank: 2,
    name: 'Poker',
    description: 'Pięć kart po kolei w tym samym kolorze.',
    cards: [
      { rank: '9', suit: '♠' },
      { rank: '8', suit: '♠' },
      { rank: '7', suit: '♠' },
      { rank: '6', suit: '♠' },
      { rank: '5', suit: '♠' },
    ],
    note: 'Wszystkie karty są kolejne i w jednym kolorze.',
  },
  {
    rank: 3,
    name: 'Kareta',
    description: 'Cztery karty tej samej wartości.',
    cards: [
      { rank: 'K', suit: '♣' },
      { rank: 'K', suit: '♦' },
      { rank: 'K', suit: '♥' },
      { rank: 'K', suit: '♠' },
      { rank: '8', suit: '♦' },
    ],
    note: 'Cztery jednakowe karty + jedna dowolna.',
  },
  {
    rank: 4,
    name: 'Full',
    description: 'Trzy karty jednej wartości + para.',
    cards: [
      { rank: 'Q', suit: '♠' },
      { rank: 'Q', suit: '♥' },
      { rank: 'Q', suit: '♦' },
      { rank: '7', suit: '♣' },
      { rank: '7', suit: '♠' },
    ],
    note: 'Trójka i para w jednym układzie.',
  },
  {
    rank: 5,
    name: 'Kolor',
    description: 'Pięć kart w tym samym kolorze.',
    cards: [
      { rank: 'A', suit: '♣' },
      { rank: 'J', suit: '♣' },
      { rank: '7', suit: '♣' },
      { rank: '3', suit: '♣' },
      { rank: '2', suit: '♣' },
    ],
    note: 'Karty nie muszą być kolejne.',
  },
  {
    rank: 6,
    name: 'Strit',
    description: 'Pięć kart po kolei, w dowolnym kolorze.',
    cards: [
      { rank: 'Q', suit: '♦' },
      { rank: 'J', suit: '♣' },
      { rank: '10', suit: '♥' },
      { rank: '9', suit: '♠' },
      { rank: '8', suit: '♦' },
    ],
    note: 'Kolejność kart ma znaczenie.',
  },
  {
    rank: 7,
    name: 'Trójka',
    description: 'Trzy karty tej samej wartości.',
    cards: [
      { rank: '5', suit: '♠' },
      { rank: '5', suit: '♦' },
      { rank: '5', suit: '♣' },
      { rank: 'A', suit: '♥' },
      { rank: '9', suit: '♠' },
    ],
    note: 'Trzy jednakowe karty + dwie dowolne.',
  },
  {
    rank: 8,
    name: 'Dwie pary',
    description: 'Dwie pary kart o tej samej wartości.',
    cards: [
      { rank: '10', suit: '♦' },
      { rank: '10', suit: '♣' },
      { rank: '8', suit: '♥' },
      { rank: '8', suit: '♠' },
      { rank: 'Q', suit: '♣' },
    ],
    note: 'Dwie pary + jedna dowolna karta.',
  },
  {
    rank: 9,
    name: 'Para',
    description: 'Jedna para kart o tej samej wartości.',
    cards: [
      { rank: 'A', suit: '♥' },
      { rank: 'A', suit: '♠' },
      { rank: 'J', suit: '♦' },
      { rank: '6', suit: '♣' },
      { rank: '3', suit: '♠' },
    ],
    note: 'Para + trzy dowolne karty.',
  },
  {
    rank: 10,
    name: 'Wysoka karta',
    description: 'Brak układu. Liczy się najwyższa karta.',
    cards: [
      { rank: 'K', suit: '♦' },
      { rank: 'J', suit: '♠' },
      { rank: '8', suit: '♥' },
      { rank: '5', suit: '♣' },
      { rank: '2', suit: '♠' },
    ],
    note: '',
  },
]

function MiniCard({ rank, suit }: CardSpec) {
  const isRed = RED_SUITS.includes(suit)
  return (
    <div
      className={`flex h-14 w-11 shrink-0 flex-col items-center justify-center rounded-lg border border-border bg-surface-2 text-sm font-bold ${
        isRed ? 'text-brand-red' : 'text-fg'
      }`}
    >
      <span>{rank}</span>
      <span className="text-base leading-none">{suit}</span>
    </div>
  )
}

export function HandRankingsPage() {
  const navigate = useNavigate()

  return (
    <div className="p-4">
      <header className="mb-6 flex items-center gap-3">
        <button type="button" onClick={() => navigate(-1)} aria-label="Wróć">
          <ChevronLeft size={22} className="text-fg" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-fg">Układy kart – Texas Hold'em</h1>
          <p className="text-xs text-fg-muted">Od najsilniejszego do najsłabszego</p>
        </div>
      </header>

      <div className="flex flex-col gap-3">
        {HAND_RANKINGS.map((hand) => (
          <div key={hand.rank} className="flex items-start gap-3 rounded-2xl border border-border bg-surface p-4">
            <span className="w-5 shrink-0 text-lg font-bold text-brand-green">{hand.rank}</span>
            <div className="min-w-0 flex-1">
              <p className="text-base font-bold text-fg">{hand.name}</p>
              <p className="mt-0.5 text-sm text-fg-muted">{hand.description}</p>
              <div className="mt-3 flex gap-1.5 overflow-x-auto">
                {hand.cards.map((card, i) => (
                  <MiniCard key={i} {...card} />
                ))}
              </div>
            </div>
            {hand.note && (
              <div className="w-24 shrink-0 border-l border-border pl-3 text-xs text-fg-muted">{hand.note}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
