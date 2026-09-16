// 仕込みノート 株価プロキシ用 Cloudflare Worker
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
  const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=5d&interval=1d`
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
    const previousClose = meta.previousClose ?? meta.chartPreviousClose
    if (typeof price !== 'number') {
      return { error: '価格データを取得できませんでした' }
    }
    return {
      price,
      previousClose: typeof previousClose === 'number' ? previousClose : null,
      currency: meta.currency || null,
      name: meta.shortName || meta.longName || symbol,
      exchange: meta.exchangeName || null,
      marketTime: meta.regularMarketTime || null
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
