import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { listWatchItems, addWatchItem, updateWatchItem, deleteWatchItem } from './utils/db.js'
import { fetchQuotes } from './utils/quote.js'
import AddItemForm from './components/AddItemForm.jsx'
import WatchlistTable from './components/WatchlistTable.jsx'

const MARKET_LABEL = { JP: '日本株', US: '米国株' }

export default function App() {
  const [items, setItems] = useState([])
  const [quotes, setQuotes] = useState({})
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [activeMarket, setActiveMarket] = useState('JP')

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

  // 仕込み値・メモどちらの編集もこの1つの関数でまとめて扱う
  // (WatchlistTable側はpatchオブジェクトを渡すだけでよい)
  const handleUpdateItem = async (id, patch) => {
    const updated = await updateWatchItem(id, patch)
    if (updated) {
      setItems((prev) => prev.map((i) => (i.id === id ? updated : i)))
    }
  }

  const shikomiCount = items.filter((item) => {
    const q = quotes[item.id]
    return q && !q.error && Number(item.targetPrice) > 0 && q.price <= Number(item.targetPrice)
  }).length

  const marketCounts = useMemo(() => {
    const counts = { JP: 0, US: 0 }
    for (const item of items) {
      if (counts[item.market] != null) counts[item.market] += 1
    }
    return counts
  }, [items])

  const marketHasShikomi = useMemo(() => {
    const flags = { JP: false, US: false }
    for (const item of items) {
      const q = quotes[item.id]
      const isShikomi = q && !q.error && Number(item.targetPrice) > 0 && q.price <= Number(item.targetPrice)
      if (isShikomi) flags[item.market] = true
    }
    return flags
  }, [items, quotes])

  const filteredItems = items.filter((item) => item.market === activeMarket)

  return (
    <div className="app">
      <header className="app-header">
        <h1>株、いい値</h1>
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

      <div className="market-tabs">
        {['JP', 'US'].map((market) => (
          <button
            key={market}
            className={`market-tab ${activeMarket === market ? 'active' : ''}`}
            onClick={() => setActiveMarket(market)}
          >
            {MARKET_LABEL[market]}（{marketCounts[market]}）
            {marketHasShikomi[market] && <span className="market-tab-dot" aria-label="仕込みチャンスあり" />}
          </button>
        ))}
      </div>

      {error && <div className="error-banner">{error}</div>}

      {loading ? (
        <p className="empty-state">読み込み中…</p>
      ) : items.length === 0 ? (
        <p className="empty-state">まだ銘柄が登録されていません。上のフォームから追加してください。</p>
      ) : filteredItems.length === 0 ? (
        <p className="empty-state">{MARKET_LABEL[activeMarket]}の銘柄はまだ登録されていません。</p>
      ) : (
        <WatchlistTable
          items={filteredItems}
          quotes={quotes}
          onDelete={handleDelete}
          onUpdate={handleUpdateItem}
        />
      )}
    </div>
  )
}
