import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'pcm.myTables'

export interface LocalTableEntry {
  tableId: string
  joinCode: string
  playerId: string
  playerName: string
}

function readFromStorage(): LocalTableEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as LocalTableEntry[]) : []
  } catch {
    return []
  }
}

function writeToStorage(entries: LocalTableEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
}

/**
 * Brak kont/logowania — urządzenie samo pamięta, do jakich stołów dołączył
 * (i jakim graczem tam jest), trzymając to w localStorage.
 */
export function useLocalTables() {
  const [tables, setTables] = useState<LocalTableEntry[]>(() => readFromStorage())

  useEffect(() => {
    writeToStorage(tables)
  }, [tables])

  const addTable = useCallback((entry: LocalTableEntry) => {
    setTables((prev) => [...prev.filter((t) => t.tableId !== entry.tableId), entry])
  }, [])

  const removeTable = useCallback((tableId: string) => {
    setTables((prev) => prev.filter((t) => t.tableId !== tableId))
  }, [])

  const getEntry = useCallback(
    (tableId: string) => tables.find((t) => t.tableId === tableId),
    [tables],
  )

  return { tables, addTable, removeTable, getEntry }
}
