// ウォッチリストの保存先。ログイン機能が無い方針(マニアスタジアムの推し機能と同じ)なので、
// この端末のIndexedDBだけに保存する(他端末とは同期しない)。
import { openDB } from 'idb'

const DB_NAME = 'shikomi-note'
const DB_VERSION = 1
const STORE = 'watchlist'

let dbPromise = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: 'id' })
          store.createIndex('createdAt', 'createdAt')
        }
      }
    })
  }
  return dbPromise
}

export async function listWatchItems() {
  const db = await getDB()
  const items = await db.getAll(STORE)
  return items.sort((a, b) => b.createdAt - a.createdAt)
}

export async function addWatchItem(item) {
  const db = await getDB()
  const record = {
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    ...item
  }
  await db.put(STORE, record)
  return record
}

export async function updateWatchItem(id, patch) {
  const db = await getDB()
  const existing = await db.get(STORE, id)
  if (!existing) return null
  const updated = { ...existing, ...patch }
  await db.put(STORE, updated)
  return updated
}

export async function deleteWatchItem(id) {
  const db = await getDB()
  await db.delete(STORE, id)
}
