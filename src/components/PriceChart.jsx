import React, { useMemo, useRef, useState } from 'react'

// 過去約3ヶ月の株価推移を表示するシンプルな折れ線グラフ(スパークライン)。
// 1銘柄=1系列なので凡例は不要。色は既存の騰落バッジと同じ配色
// (日本式：上昇=赤、下降=青)に揃えて、新しい配色を増やさないようにしている。

const WIDTH = 300
const HEIGHT = 72
const PADDING = 4

function formatDate(unixSeconds) {
  const d = new Date(unixSeconds * 1000)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function formatPrice(value, currency) {
  const symbol = currency === 'USD' ? '$' : currency === 'JPY' ? '¥' : ''
  return `${symbol}${value.toLocaleString('ja-JP', { maximumFractionDigits: 2 })}`
}

export default function PriceChart({ history, currency }) {
  const containerRef = useRef(null)
  const [hoverIndex, setHoverIndex] = useState(null)

  const points = useMemo(() => {
    if (!history || history.length < 2) return null
    const closes = history.map((h) => h.c)
    const min = Math.min(...closes)
    const max = Math.max(...closes)
    const range = max - min || 1
    return history.map((h, i) => ({
      x: PADDING + (i / (history.length - 1)) * (WIDTH - PADDING * 2),
      y: PADDING + (1 - (h.c - min) / range) * (HEIGHT - PADDING * 2),
      ...h
    }))
  }, [history])

  if (!points) {
    return <div className="price-chart-empty">グラフ用データがありません</div>
  }

  const trendUp = history[history.length - 1].c >= history[0].c
  const lineColor = trendUp ? '#ff6b6b' : '#4dabf7'
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  const areaD = `${pathD} L ${points[points.length - 1].x.toFixed(1)} ${HEIGHT - PADDING} L ${points[0].x.toFixed(1)} ${HEIGHT - PADDING} Z`

  const handleMove = (clientX) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
    setHoverIndex(Math.round(ratio * (points.length - 1)))
  }

  const hoverPoint = hoverIndex != null ? points[hoverIndex] : null

  return (
    <div
      className="price-chart"
      ref={containerRef}
      onMouseMove={(e) => handleMove(e.clientX)}
      onMouseLeave={() => setHoverIndex(null)}
      onTouchStart={(e) => handleMove(e.touches[0].clientX)}
      onTouchMove={(e) => handleMove(e.touches[0].clientX)}
      onTouchEnd={() => setHoverIndex(null)}
    >
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" className="price-chart-svg">
        <defs>
          <linearGradient id={`priceChartFill-${trendUp ? 'up' : 'down'}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineColor} stopOpacity="0.25" />
            <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaD} fill={`url(#priceChartFill-${trendUp ? 'up' : 'down'})`} stroke="none" />
        <path d={pathD} fill="none" stroke={lineColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {hoverPoint && (
          <>
            <line x1={hoverPoint.x} y1={PADDING} x2={hoverPoint.x} y2={HEIGHT - PADDING} stroke="#3a4a5a" strokeWidth="1" />
            <circle cx={hoverPoint.x} cy={hoverPoint.y} r="3" fill={lineColor} stroke="#0f1720" strokeWidth="1.5" />
          </>
        )}
      </svg>
      <div className="price-chart-labels">
        <span>{formatDate(history[0].t)}</span>
        <span>約3ヶ月の推移</span>
        <span>{formatDate(history[history.length - 1].t)}</span>
      </div>
      {hoverPoint && (
        <div
          className="price-chart-tooltip"
          style={{ left: `${Math.min(90, Math.max(0, (hoverPoint.x / WIDTH) * 100))}%` }}
        >
          {formatDate(hoverPoint.t)} {formatPrice(hoverPoint.c, currency)}
        </div>
      )}
    </div>
  )
}
