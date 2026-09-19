// 株、いい値 株価プロキシ用 Cloudflare Worker
//
// フロントエンド(GitHub Pages上の静的サイト)から複数の銘柄シンボルを受け取り、
// Yahoo Financeの非公式チャートAPI(query1.finance.yahoo.com/v8/finance/chart/{symbol})を
// サーバー側(Worker)から叩いて現在値・前日終値をまとめて返す。
//
// 日本株・米国株どちらもこのAPIで同じ形式で取れる(日本株は "7203.T" のように
// 証券コードに.Tを付けたシンボル、米国株は "AAPL" のようなティッカーそのまま)。
// ブラウザから直接fetchするとCORSでブロックされるため、この中継が必要
// (マニアスタジアムでESPN APIが直接fetchでブロックされたのと同じ理由、妖怪カメラと
// 同じくCloudflare Workersで解決する構成)。
//
// 必要な設定:
//   環境変数(Settings > Variables and Secrets)に APP_SECRET を設定(任意だが推奨)。
//   フロント側の環境変数 VITE_APP_SECRET と同じ値にすること。無料枠・Yahoo側への
//   過剰アクセスを防ぐ簡易ガード。

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-App-Secret'
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS })
    }
    if (url.pathname !== '/quote') {
      return json({ error: 'Not found' }, 404)
    }
    if (request.method !== 'GET') {
      return json({ error: 'GETのみ対応しています' }, 405)
    }

    if (env.APP_SECRET) {
      const provided = request.headers.get('X-App-Secret')
      if (provided !== env.APP_SECRET) {
        return json({ error: '合言葉が違います' }, 401)
      }
    }

    const symbolsParam = url.searchParams.get('symbols') || ''
    const symbols = [...new Set(symbolsParam.split(',').map((s) => s.trim()).filter(Boolean))]
    if (symbols.length === 0) {
      return json({ error: 'symbolsパラメータが必要です(例: ?symbols=7203.T,AAPL)' }, 400)
    }
    if (symbols.length > 50) {
      return json({ error: '一度に取得できるのは50銘柄までです' }, 400)
    }

    const results = await Promise.all(symbols.map((symbol) => fetchOneQuote(symbol)))

    const quotes = {}
    symbols.forEach((symbol, i) => {
      quotes[symbol] = results[i]
    })

    return json({ quotes })
  }
}

async function fetchOneQuote(symbol) {
  // range=3mo: 変動グラフ表示用に約3ヶ月分の日次終値も一緒に取得する。
  // 現在値と履歴を別々のリクエストにすると呼び出し回数が倍になるため、
  // 1回のリクエストで両方まかなう(このAPIはrangeを広げても現在値=meta部分は変わらない)。
  const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=3mo&interval=1d`
  try {
    const res = await fetch(yahooUrl, {
      headers: {
        // Yahoo側がUser-Agent無しのリクエストを弾くことがあるため、ブラウザ相当のものを付ける
        'User-Agent': 'Mozilla/5.0 (compatible; ShikomiNoteBot/1.0)'
      }
    })
    if (!res.ok) {
      return { error: `HTTP ${res.status}` }
    }
    const data = await res.json()
    const result = data?.chart?.result?.[0]
    if (!result) {
      const err = data?.chart?.error?.description
      return { error: err || 'シンボルが見つかりません' }
    }
    const meta = result.meta || {}
    const price = meta.regularMarketPrice
    if (typeof price !== 'number') {
      return { error: '価格データを取得できませんでした' }
    }

    // 変動グラフ用の履歴データ。休場日などclose値がnullの日は除外する。
    const timestamps = result.timestamp || []
    const closes = result.indicators?.quote?.[0]?.close || []
    const history = []
    for (let i = 0; i < timestamps.length; i++) {
      const c = closes[i]
      if (typeof c === 'number') {
        history.push({ t: timestamps[i], c: Math.round(c * 100) / 100 })
      }
    }

    // 前日比の計算には meta.chartPreviousClose を使わない。この値は
    // 「表示期間(range)の開始日の前営業日終値」を指すため、range=3moに
    // 広げた影響で「3ヶ月前からの変化率」になってしまうバグがあった
    // (2026-09-20発覚)。履歴データの末尾から2番目=直近の前営業日終値を使う。
    const previousClose =
      history.length >= 2
        ? history[history.length - 2].c
        : typeof meta.previousClose === 'number'
          ? meta.previousClose
          : null

    return {
      price,
      previousClose,
      currency: meta.currency || null,
      name: meta.shortName || meta.longName || symbol,
      exchange: meta.exchangeName || null,
      marketTime: meta.regularMarketTime || null,
      history
    }
  } catch (err) {
    return { error: err && err.message ? err.message : String(err) }
  }
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
  })
}
