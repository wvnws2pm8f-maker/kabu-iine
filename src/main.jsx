import React from 'react'
import ReactDOM from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App.jsx'
import './styles.css'

// PWAのService Worker自前登録(マニアスタジアム/妖怪カメラと同じ方式)。
// ホーム画面に追加した「開きっぱなしのアプリ」はページ遷移が起きず、ブラウザが自発的に
// 更新を探しに行く機会がほぼ無いため、1分おきに能動的に更新チェックし、見つかり次第
// 自動リロードする。
if ('serviceWorker' in navigator) {
  const updateSW = registerSW({
    immediate: true,
    onRegisteredSW(swUrl, registration) {
      if (!registration) return
      setInterval(() => {
        registration.update()
      }, 60 * 1000)
    },
    onNeedRefresh() {
      updateSW(true)
    }
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
