import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // マニアスタジアム/妖怪カメラと同じ理由で自前登録にする。vite-plugin-pwaの
      // 自動生成registerSW.jsはregister()するだけで更新チェックが無く、ホーム画面に
      // 追加したアプリ(ページ遷移が起きない)は新しいService Workerに気づけないため。
      injectRegister: false,
      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: '株、いい値',
        short_name: '株、いい値',
        description: '気になる株が値下がりしたタイミングを見逃さないための、NISA中心の長期投資向けウォッチリストアプリ',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#0f1720',
        theme_color: '#0f1720',
        lang: 'ja',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,json}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        // 株価はWorker経由で常に最新を取りに行きたいのでSWキャッシュ対象に含めない
        navigateFallbackDenylist: [/^\/quote/]
      }
    })
  ]
})
