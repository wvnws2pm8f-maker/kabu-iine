import React, { useState } from 'react'

export default function AddItemForm({ onAdd }) {
  const [market, setMarket] = useState('JP')
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [targetPrice, setTargetPrice] = useState('')
  const [memo, setMemo] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!code.trim() || !name.trim()) return
    setSubmitting(true)
    try {
      await onAdd({
        market,
        code: code.trim(),
        name: name.trim(),
        targetPrice: targetPrice === '' ? null : Number(targetPrice),
        memo: memo.trim()
      })
      setCode('')
      setName('')
      setTargetPrice('')
      setMemo('')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="add-form" onSubmit={handleSubmit}>
      <div className="add-form-row">
        <label>
          市場
          <select value={market} onChange={(e) => setMarket(e.target.value)}>
            <option value="JP">日本株</option>
            <option value="US">米国株</option>
          </select>
        </label>
        <label>
          {market === 'JP' ? '証券コード' : 'ティッカー'}
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={market === 'JP' ? '例: 7203' : '例: AAPL'}
            required
          />
        </label>
        <label>
          銘柄名
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例: トヨタ自動車"
            required
          />
        </label>
      </div>
      <div className="add-form-row">
        <label>
          仕込みたい値段
          <input
            type="number"
            step="0.01"
            value={targetPrice}
            onChange={(e) => setTargetPrice(e.target.value)}
            placeholder="この値段以下になったら知りたい"
          />
        </label>
        <label className="memo-label">
          メモ
          <input
            type="text"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="任意（気になる理由など）"
          />
        </label>
      </div>
      <button type="submit" disabled={submitting}>
        ＋ ウォッチリストに追加
      </button>
    </form>
  )
}
