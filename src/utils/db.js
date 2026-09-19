// ウォッチリストの保存先。ログイン機能が無い方針(マニアスタジアムの推し機能と同じ)なので、
// この端末のIndexedDBだけに保存する(他端末とは同期しない)。
import { openDB } from 'idb'

const DB_NAME = 'kabu-iine'
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
  // orderを手動で並び替えたことが無い項目は、これまで通り新しい順(createdAt降順)を
  // 維持するため -createdAt をフォールバック値として使う(数値が小さいほど先頭に来る)
  return items.sort((a, b) => {
    const orderA = typeof a.order === 'number' ? a.order : -a.createdAt
    const orderB = typeof b.order === 'number' ? b.order : -b.createdAt
    return orderA - orderB
  })
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

// 表示順を丸ごと差し替える(呼び出し側=App.jsxが「並び替え後の順番のidリスト」を渡す)。
// 渡されたidだけに連番のorderを振るので、他の市場の項目には影響しない
// (タブごとに独立して並び替えられる設計)。
export async function reorderWatchItems(orderedIds) {
  const db = await getDB()
  const tx = db.transaction(STORE, 'readwrite')
  for (let i = 0; i < orderedIds.length; i++) {
    const existing = await tx.store.get(orderedIds[i])
    if (existing) {
      await tx.store.put({ ...existing, order: i })
    }
  }
  await tx.done
}
