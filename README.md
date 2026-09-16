# 株、いい値（Phase 1）

NISA枠を中心に長中期で株を保有している人向けの、
「気になる株が値下がりしたタイミングを見逃さない」ためのウォッチリストPWAアプリです。

## このPhase 1でできること

- 📋 気になる銘柄（日本株・米国株）を「仕込みたい値段」つきでウォッチリストに登録
- 💹 アプリを開いたときに現在値をまとめて取得（Cloudflare Workers経由でYahoo Financeの株価データを取得。**未設定の場合は自動で「仮の値」モックにフォールバック**するので、Worker未設定でも動作確認はできる）
- 🎯 現在値が「仕込みたい値段」以下になった銘柄を自動でハイライト表示
- 💾 登録データはこの端末のIndexedDBにローカル保存（ログイン機能なし、他端末とは同期しない）
- 🌐 Service Workerでアプリ自体はオフラインでも起動できる（株価取得だけはオンラインが必要）

通知機能はあえて付けていません（本人の希望により、アプリを開いたときに一覧で確認できれば十分という方針）。

## まだ入っていない機能（次のフェーズで追加予定）

- Phase 2: 保有銘柄のポートフォリオ管理（取得単価・含み損益）、NISA枠の消化状況トラッキング
- Phase 3: 配当権利確定日のリマインド、移動平均乖離率などの補助シグナル

## 開発者向け: ローカルで動かす

```bash
npm install
npm run dev
```

`http://localhost:5173` が起動します。Worker未設定でもウォッチリストの追加・削除・仕込みチャンス判定の見た目は確認できます（現在値は仮のランダム値になります）。

## ビルド

```bash
npm run build
npm run preview
```

## 株価取得(Cloudflare Workers)を有効にするための設定

Worker本体のコードは `worker/worker.js` に用意してあります。**wranglerコマンドやCLIは不要**、
Cloudflareのダッシュボード(ブラウザ)だけで設定できます。妖怪カメラと同じ手順です。

1. [Cloudflare](https://dash.cloudflare.com/)にログイン（アカウントが無ければ無料登録）
2. 「Workers & Pages」→「Create」→「Create Worker」
3. 適当な名前(例: `kabu-iine-quote`)で作成し、エディタ画面が開いたら`worker/worker.js`の中身を全部貼り付けて「Deploy」
4. Settings → Variables and Secrets で `APP_SECRET`（合言葉、好きな文字列でOK）を追加
5. デプロイ後に表示されるWorkerのURL（`https://xxxxx.workers.dev`）を控える

### GitHub PagesでのビルドにWorkerのURLを反映する

このリポジトリのGitHub Settings → Secrets and variables → Actions で以下を登録してください:

- `WORKER_URL`: 上で控えたWorkerのURL
- `APP_SECRET`: Worker側に設定したのと同じ合言葉

登録後、mainブランチにpushすると`.github/workflows/deploy.yml`がこれらを`VITE_WORKER_URL` / `VITE_APP_SECRET`としてビルドに埋め込みます。

ローカル開発でも試したい場合は、プロジェクト直下に`.env.local`を作成してください:

```
VITE_WORKER_URL=https://xxxxx.workers.dev
VITE_APP_SECRET=好きな合言葉
```

## 銘柄コードの入力方法

- 日本株: 証券コード4桁（例: トヨタ自動車なら `7203`）。内部で自動的に`.T`を付けてYahoo Financeのシンボル形式に変換します
- 米国株: ティッカーシンボル（例: Appleなら `AAPL`）

## アイコンの再生成

```bash
node scripts/generate-icons.mjs
```
