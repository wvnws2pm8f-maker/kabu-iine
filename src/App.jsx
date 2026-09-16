import React, { useCallback, useEffect, useState } from 'react'
import { listWatchItems, addWatchItem, updateWatchItem, deleteWatchItem } from './utils/db.js'
import { fetchQuotes } from './utils/quote.js'
import AddItemForm from './components/AddItemForm.jsx'
import WatchlistTable from './components/WatchlistTable.jsx'

export default function App() {
  const [items, setItems] = useState([])
  const [quotes, setQuotes] = useState({})
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)

  const refreshQuotes = useCallback(async (currentItems) => {
    if (currentItems.length === 0) {
      setQuotes({})
      return
    }
    setRefreshing(true)
    setError(null)
    try {
      const result = await fetchQuotes(currentItems)
      setQuotes(result)
      setLastUpdated(Date.now())
    } catch (err) {
      setError(err.message || '株価の取得に失敗しました')
    } finally {
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    ;(async () => {
      const stored = await listWatchItems()
      setItems(stored)
      setLoading(false)
      refreshQuotes(stored)
    })()
  }, [refreshQuotes])

  const handleAdd = async (input) => {
    const record = await addWatchItem(input)
    const updated = [record, ...items]
    setItems(updated)
    refreshQuotes(updated)
  }

  const handleDelete = async (id) => {
    await deleteWatchItem(id)
    setItems((prev) => prev.filter((i) => i.id !== id))
    setQuotes((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  const handleUpdateTarget = async (id, targetPrice) => {
    const updated = await updateWatchItem(id, { targetPrice })
    if (updated) {
      setItems((prev) => prev.map((i) => (i.id === id ? updated : i)))
    }
  }

  const shikomiCount = items.filter((item) => {
    const q = quotes[item.id]
    return q && !q.error && Number(item.targetPrice) > 0 && q.price <= Number(item.targetPrice)
  }).length

  return (
    <div className="app">
      <header className="app-header">
        <h1>仕込みノート</h1>
        <p className="app-subtitle">気になる株の「仕込みたい値段」を登録して、値下がりを見逃さない</p>
      </header>

      {shikomiCount > 0 && (
        <div className="shikomi-banner">🎯 今が仕込みチャンスの銘柄が {shikomiCount} 件あります</div>
      )}

      <AddItemForm onAdd={handleAdd} />

      <div className="toolbar">
        <button onClick={() => refreshQuotes(items)} disabled={refreshing || items.length === 0}>
          {refreshing ? '更新中…' : '株価を更新'}
        </button>
        {lastUpdated && (
          <span className="last-updated">最終更新: {new Date(lastUpdated).toLocaleTimeString('ja-JP')}</span>
        )}
      </div>

      {error && <div className="error-banner">{error}</div>}

      {loading ? (
        <p className="empty-state">読み込み中…</p>
      ) : items.length === 0 ? (
        <p className="empty-state">まだ銘柄が登録されていません。上のフォームから追加してください。</p>
      ) : (
        <WatchlistTable
          items={items}
          quotes={quotes}
          onDelete={handleDelete}
          onUpdateTarget={handleUpdateTarget}
        />
      )}
    </div>
  )
}
