import React, { useState } from 'react'

function formatPrice(price, currency) {
  if (typeof price !== 'number') return '-'
  const symbol = currency === 'USD' ? '$' : currency === 'JPY' ? '¥' : ''
  return `${symbol}${price.toLocaleString('ja-JP', { maximumFractionDigits: 2 })}`
}

function ChangeBadge({ price, previousClose }) {
  if (typeof price !== 'number' || typeof previousClose !== 'number' || previousClose === 0) {
    return <span className="change-badge neutral">-</span>
  }
  const diff = price - previousClose
  const pct = (diff / previousClose) * 100
  const cls = diff > 0 ? 'up' : diff < 0 ? 'down' : 'neutral'
  const sign = diff > 0 ? '+' : ''
  return (
    <span className={`change-badge ${cls}`}>
      {sign}
      {pct.toFixed(2)}%
    </span>
  )
}

function TargetPriceEditor({ item, onUpdateTarget }) {
  const [value, setValue] = useState(item.targetPrice ?? '')
  const [editing, setEditing] = useState(false)

  const commit = () => {
    setEditing(false)
    const num = value === '' ? null : Number(value)
    if (num !== item.targetPrice) {
      onUpdateTarget(item.id, num)
    }
  }

  return (
    <input
      className="target-price-input"
      type="number"
      step="0.01"
      value={value}
      onFocus={() => setEditing(true)}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      placeholder="未設定"
    />
  )
}

export default function WatchlistTable({ items, quotes, onDelete, onUpdateTarget }) {
  return (
    <div className="watchlist">
      {items.map((item) => {
        const quote = quotes[item.id]
        const price = quote?.price
        const isShikomi =
          quote && !quote.error && Number(item.targetPrice) > 0 && price <= Number(item.targetPrice)

        return (
          <div key={item.id} className={`watch-card ${isShikomi ? 'shikomi' : ''}`}>
            <div className="watch-card-main">
              <div className="watch-card-title">
                <span className={`market-badge ${item.market}`}>{item.market === 'JP' ? '日本' : '米国'}</span>
                <span className="watch-name">{item.name}</span>
                <span className="watch-code">{item.code}</span>
                {isShikomi && <span className="shikomi-tag">🎯 仕込みチャンス</span>}
              </div>
              {item.memo && <p className="watch-memo">{item.memo}</p>}
            </div>

            <div className="watch-card-price">
              {quote?.error ? (
                <span className="quote-error">{quote.error}</span>
              ) : quote?.mock ? (
                <>
                  <span className="current-price">{formatPrice(price, quote.currency)}</span>
                  <span className="mock-tag">仮の値（Worker未設定）</span>
                </>
              ) : quote ? (
                <>
                  <span className="current-price">{formatPrice(price, quote.currency)}</span>
                  <ChangeBadge price={price} previousClose={quote.previousClose} />
                </>
              ) : (
                <span className="quote-error">未取得</span>
              )}
            </div>

            <div className="watch-card-target">
              <label>仕込み値</label>
              <TargetPriceEditor item={item} onUpdateTarget={onUpdateTarget} />
            </div>

            <button className="delete-button" onClick={() => onDelete(item.id)} aria-label="削除">
              ✕
            </button>
          </div>
        )
      })}
    </div>
  )
}
