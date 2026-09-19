// 株価取得。日本株・米国株どちらもYahoo Financeの非公式API
// (query1.finance.yahoo.com/v8/finance/chart/{symbol})で統一的に取れるが、
// ブラウザから直接fetchするとCORSでブロックされる(マニアスタジアムのESPN APIと同じ問題)。
// そのためCloudflare Workerを1枚挟んで中継する(妖怪カメラと同じ構成)。
//
// VITE_WORKER_URLが未設定の間は、Worker未セットアップでもUI動作確認ができるよう
// ダミー値を返す「仮の株価」モードで動く(妖怪カメラのcomposite.jsと同じ考え方)。

const WORKER_URL = import.meta.env.VITE_WORKER_URL
const APP_SECRET = import.meta.env.VITE_APP_SECRET

// 日本株は証券コード(4桁数字)を入力してもらい、内部で.Tを付与してYahoo Financeの
// シンボル形式にする。米国株はティッカーシンボルをそのまま大文字化して使う。
export function toYahooSymbol(market, code) {
  const trimmed = String(code || '').trim()
  if (market === 'JP') {
    return /\.T$/i.test(trimmed) ? trimmed.toUpperCase() : `${trimmed}.T`
  }
  return trimmed.toUpperCase()
}

// items: [{id, market, code}, ...] → { [id]: { price, previousClose, currency, name, error } }
export async function fetchQuotes(items) {
  if (items.length === 0) return {}

  const symbolToIds = new Map()
  for (const item of items) {
    const symbol = toYahooSymbol(item.market, item.code)
    if (!symbolToIds.has(symbol)) symbolToIds.set(symbol, [])
    symbolToIds.get(symbol).push(item.id)
  }
  const symbols = [...symbolToIds.keys()]

  if (!WORKER_URL) {
    return mockQuotes(items)
  }

  const url = new URL('/quote', WORKER_URL)
  url.searchParams.set('symbols', symbols.join(','))

  const res = await fetch(url, {
    headers: APP_SECRET ? { 'X-App-Secret': APP_SECRET } : {}
  })
  if (!res.ok) {
    throw new Error(`株価の取得に失敗しました (HTTP ${res.status})`)
  }
  const data = await res.json()

  const result = {}
  for (const [symbol, ids] of symbolToIds) {
    const quote = data.quotes?.[symbol]
    for (const id of ids) {
      result[id] = quote || { error: 'データなし' }
    }
  }
  return result
}

// 証券コード/ティッカー入力時に銘柄名を自動取得するための単体検索。
// 既存の/quoteエンドポイントをそのまま1銘柄だけ叩いて名前だけ拾う(専用エンドポイントは設けない)。
// Worker未設定(モック環境)では自動入力の意味が無いのでnullを返すだけにする。
export async function lookupSymbolName(market, code) {
  const trimmed = String(code || '').trim()
  if (!trimmed || !WORKER_URL) return null

  const symbol = toYahooSymbol(market, trimmed)
  const url = new URL('/quote', WORKER_URL)
  url.searchParams.set('symbols', symbol)

  const res = await fetch(url, {
    headers: APP_SECRET ? { 'X-App-Secret': APP_SECRET } : {}
  })
  if (!res.ok) return null
  const data = await res.json()
  const quote = data.quotes?.[symbol]
  if (!quote || quote.error || !quote.name) return null
  return quote.name
}

function mockQuotes(items) {
  const result = {}
  for (const item of items) {
    // 目標価格を軸にランダムな仮の現在値を生成(開発時の見た目確認用)
    const base = Number(item.targetPrice) > 0 ? Number(item.targetPrice) : 1000
    const jitter = 0.85 + Math.random() * 0.3
    const price = Math.round(base * jitter * 10) / 10
    const previousClose = Math.round(price * (0.98 + Math.random() * 0.04) * 10) / 10

    // グラフ確認用に、直近60日分のランダムウォークの仮履歴も生成する
    const days = 60
    const daySeconds = 86400
    const now = Math.floor(Date.now() / 1000)
    let walk = price * (0.9 + Math.random() * 0.1)
    const history = []
    for (let i = days; i >= 1; i--) {
      walk = walk * (0.985 + Math.random() * 0.03)
      history.push({ t: now - i * daySeconds, c: Math.round(walk * 100) / 100 })
    }
    history.push({ t: now, c: price })

    result[item.id] = {
      price,
      previousClose,
      currency: item.market === 'JP' ? 'JPY' : 'USD',
      name: item.name,
      history,
      mock: true
    }
  }
  return result
}
