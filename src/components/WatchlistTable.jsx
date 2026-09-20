import React, { useState } from 'react'
import PriceChart from './PriceChart.jsx'

const MARKET_SHORT_LABEL = { JP: '日本', US: '米国', PRE: '未上場' }

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

function TargetPriceEditor({ item, onUpdate }) {
  const [value, setValue] = useState(item.targetPrice ?? '')

  const commit = () => {
    const num = value === '' ? null : Number(value)
    if (num !== item.targetPrice) {
      onUpdate(item.id, { targetPrice: num })
    }
  }

  return (
    <input
      className="target-price-input"
      type="number"
      step="0.01"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      placeholder="未設定"
    />
  )
}

function MemoEditor({ item, onUpdate }) {
  const [value, setValue] = useState(item.memo ?? '')

  const commit = () => {
    const trimmed = value.trim()
    if (trimmed !== (item.memo ?? '')) {
      onUpdate(item.id, { memo: trimmed })
    }
  }

  return (
    <input
      className="memo-input"
      type="text"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      placeholder="任意（気になる理由など）"
    />
  )
}

function IpoTimingEditor({ item, onUpdate }) {
  const [value, setValue] = useState(item.ipoTiming ?? '')

  const commit = () => {
    const trimmed = value.trim()
    if (trimmed !== (item.ipoTiming ?? '')) {
      onUpdate(item.id, { ipoTiming: trimmed })
    }
  }

  return (
    <input
      className="ipo-timing-input"
      type="text"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      placeholder="未定"
    />
  )
}

// 未上場銘柄が実際に上場したときに使う。証券コードを入力して送信すると
// market/codeが更新され、以後は通常の株価監視・仕込みチャンス判定の対象になる。
function PromoteForm({ item, onUpdate }) {
  const [promoteMarket, setPromoteMarket] = useState('JP')
  const [promoteCode, setPromoteCode] = useState('')

  const handlePromote = (e) => {
    e.preventDefault()
    const trimmed = promoteCode.trim()
    if (!trimmed) return
    onUpdate(item.id, { market: promoteMarket, code: trimmed })
  }

  return (
    <form className="promote-form" onSubmit={handlePromote}>
      <span className="promote-form-label">上場したら証券コードを入力 → 株価監視に切り替え</span>
      <div className="promote-form-row">
        <select value={promoteMarket} onChange={(e) => setPromoteMarket(e.target.value)}>
          <option value="JP">日本株</option>
          <option value="US">米国株</option>
        </select>
        <input
          type="text"
          value={promoteCode}
          onChange={(e) => setPromoteCode(e.target.value)}
          placeholder={promoteMarket === 'JP' ? '例: 7203' : '例: AAPL'}
        />
        <button type="submit">切り替える</button>
      </div>
    </form>
  )
}

export default function WatchlistTable({ items, quotes, onDelete, onUpdate, onMove }) {
  return (
    <div className="watchlist">
      {items.map((item, index) => {
        const isPreIpo = item.market === 'PRE'
        const quote = quotes[item.id]
        const price = quote?.price
        const isShikomi =
          quote && !quote.error && Number(item.targetPrice) > 0 && price <= Number(item.targetPrice)

        return (
          <div key={item.id} className={`watch-card ${isShikomi ? 'shikomi' : ''}`}>
            <div className="watch-card-reorder">
              <button
                className="reorder-button"
                onClick={() => onMove(item.id, -1)}
                disabled={index === 0}
                aria-label="上へ移動"
              >
                ▲
              </button>
              <button
                className="reorder-button"
                onClick={() => onMove(item.id, 1)}
                disabled={index === items.length - 1}
                aria-label="下へ移動"
              >
                ▼
              </button>
            </div>

            <div className="watch-card-main">
              <div className="watch-card-title">
                <span className={`market-badge ${item.market}`}>{MARKET_SHORT_LABEL[item.market]}</span>
                <span className="watch-name">{item.name}</span>
                {item.code && <span className="watch-code">{item.code}</span>}
                {isShikomi && <span className="shikomi-tag">🎯 仕込みチャンス</span>}
              </div>
              <div className="watch-memo-row">
                <label className="memo-field-label">メモ</label>
                <MemoEditor item={item} onUpdate={onUpdate} />
              </div>
            </div>

            <div className="watch-card-price">
              {isPreIpo ? (
                <div className="ipo-timing-field">
                  <label className="ipo-timing-label">上場予定</label>
                  <IpoTimingEditor item={item} onUpdate={onUpdate} />
                </div>
              ) : quote?.error ? (
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
              {!isPreIpo && (
                <>
                  <label>仕込み値</label>
                  <TargetPriceEditor item={item} onUpdate={onUpdate} />
                </>
              )}
            </div>

            <button className="delete-button" onClick={() => onDelete(item.id)} aria-label="削除">
              ✕
            </button>

            <div className="watch-card-chart">
              {isPreIpo ? (
                <PromoteForm item={item} onUpdate={onUpdate} />
              ) : quote?.history ? (
                <PriceChart history={quote.history} currency={quote.currency} />
              ) : (
                <div className="price-chart-empty">
                  {quote?.error ? 'グラフを表示できません' : 'グラフを読み込み中…'}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
