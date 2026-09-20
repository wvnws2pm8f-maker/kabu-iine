import React, { useEffect, useRef, useState } from 'react'
import { lookupSymbolName } from '../utils/quote.js'

export default function AddItemForm({ onAdd }) {
  const [market, setMarket] = useState('JP')
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [nameTouched, setNameTouched] = useState(false) // ユーザーが銘柄名を手入力/編集したか
  const [targetPrice, setTargetPrice] = useState('')
  const [memo, setMemo] = useState('')
  const [ipoTiming, setIpoTiming] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [lookingUp, setLookingUp] = useState(false)
  const lookupTokenRef = useRef(0)

  const isPreIpo = market === 'PRE'

  // 証券コード/ティッカーの入力が0.6秒落ち着いたら、銘柄名をWorker経由で自動取得して埋める。
  // ユーザーが銘柄名欄を自分で編集した後は上書きしない(nameTouched)。未上場はそもそも
  // コードが無いので対象外。
  useEffect(() => {
    const trimmed = code.trim()
    if (isPreIpo || !trimmed || nameTouched) {
      setLookingUp(false)
      return
    }
    const token = ++lookupTokenRef.current
    const timer = setTimeout(async () => {
      setLookingUp(true)
      try {
        const found = await lookupSymbolName(market, trimmed)
        // 待っている間にコードが変わっている/手入力された場合は無視(古い結果で上書きしない)
        if (found && lookupTokenRef.current === token) {
          setName(found)
        }
      } catch {
        // 自動入力の失敗は無視。手入力すればよいだけなのでエラー表示はしない
      } finally {
        if (lookupTokenRef.current === token) setLookingUp(false)
      }
    }, 600)
    return () => clearTimeout(timer)
  }, [code, market, nameTouched, isPreIpo])

  const handleSubmit = async (e) => {
    e.preventDefault()
    // 未上場は証券コード不要、それ以外(日本株/米国株)はコード必須
    if (!name.trim()) return
    if (!isPreIpo && !code.trim()) return
    setSubmitting(true)
    try {
      await onAdd({
        market,
        code: isPreIpo ? '' : code.trim(),
        name: name.trim(),
        targetPrice: targetPrice === '' ? null : Number(targetPrice),
        memo: memo.trim(),
        ipoTiming: isPreIpo ? ipoTiming.trim() : ''
      })
      setCode('')
      setName('')
      setNameTouched(false)
      setTargetPrice('')
      setMemo('')
      setIpoTiming('')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="add-form" onSubmit={handleSubmit}>
      <div className="add-form-row">
        <label>
          市場
          <select
            value={market}
            onChange={(e) => {
              setMarket(e.target.value)
              setNameTouched(false) // 市場が変わったら同じコードでも別銘柄になりうるので再検索させる
            }}
          >
            <option value="JP">日本株</option>
            <option value="US">米国株</option>
            <option value="PRE">未上場</option>
          </select>
        </label>
        {!isPreIpo && (
          <label>
            {market === 'JP' ? '証券コード' : 'ティッカー'}
            <input
              type="text"
              value={code}
              onChange={(e) => {
                setCode(e.target.value)
                setNameTouched(false) // コードを変えたら新しいコードの銘柄名で再検索
              }}
              placeholder={market === 'JP' ? '例: 7203' : '例: AAPL'}
              required
            />
          </label>
        )}
        <label>
          {isPreIpo ? '企業名' : '銘柄名'}
          {lookingUp && <span className="lookup-hint">検索中…</span>}
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              setNameTouched(true)
            }}
            placeholder={isPreIpo ? '例: 株式会社〇〇' : '例: トヨタ自動車（コード入力で自動入力）'}
            required
          />
        </label>
        {isPreIpo && (
          <label>
            上場予定時期
            <input
              type="text"
              value={ipoTiming}
              onChange={(e) => setIpoTiming(e.target.value)}
              placeholder="任意（例: 2026年中、未定 など）"
            />
          </label>
        )}
      </div>
      <div className="add-form-row">
        {!isPreIpo && (
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
        )}
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
