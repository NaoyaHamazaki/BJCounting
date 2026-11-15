# 04_実装

## 書く内容
技術選定の理由、環境構築の手順、実装の進捗と注意点、環境変数の一覧。

## 状態
プロトタイプ完了(最終更新:2026-11-16)

## 技術選定
| 領域 | 採用 | 理由 |
|---|---|---|
| フロントエンド | React 19 + TypeScript | 企画書どおり |
| ビルド | Vite 8 | 静的サイトとして出力でき、起動が速い |
| スタイリング | Tailwind CSS v4 | 企画書どおり |
| 状態管理 | Zustand 5 | 企画書の候補のうち、ボイラープレートが少ない方 |
| テスト | Vitest 5 | Vite と設定を共有できる |

## 環境構築(再現手順)
前提:Node.js 24 以上(2026-11-15 時点で v24.15.0 で確認)。

**簡単な起動**:プロジェクト直下の `起動.bat` をダブルクリック。初回は `npm install` を自動で行い、開発サーバーを起動してブラウザで http://localhost:5173 を開く。ウィンドウを閉じると終了する。

手動で行う場合:

```
cd app
npm install
npm run dev       # 開発サーバー(http://localhost:5173)
npm test          # 自動テスト
npm run build     # 静的ファイルを app/dist に出力
npm run preview   # ビルド結果の確認(http://localhost:4173)
```
`vite.config.ts` の `base: './'` で相対パス出力にしてあるため、サブパスで公開しても動く。

## 公開用のファイル(Railway)
`Railway対応メモ.md` を、Django のない静的サイト向けに変えて使う。

| ファイル | 内容 |
|---|---|
| `Dockerfile` | 1段目:Node 22 で `npm ci` → `npm test` → `npm run build`(テストに通らなければビルドが止まる)。2段目:nginx で `app/dist` を配信 |
| `deploy/nginx.conf.template` | Railway が渡す `PORT` で待ち受ける。`/assets/` は長くキャッシュ、`index.html` は毎回確認。セキュリティ用のヘッダーを付ける |
| `.dockerignore` | `node_modules`、`dist`、`docs`、`.bat` などをイメージに入れない |
| `railway.json` | Dockerfile でビルド。`sleepApplication: true`(Serverless)、ヘルスチェックは `/` |
| `.gitignore`(プロジェクト直下) | `node_modules`、`dist`、`.env` を入れない |

ローカルでの確認(Docker がある場合):`docker build -t prob21 .` → `docker run -p 8080:8080 prob21` → http://localhost:8080 。**2026-11-15 時点では、この PC に Docker がないため未確認。**

## アイコン
- `app/public/favicon.svg`:元の絵柄(SVG)。`components/Icons.tsx` の `AppIcon` と同じ絵
- `app/public/apple-touch-icon.png`(180px)、`icon-192.png`、`icon-512.png`:favicon.svg をヘッドレス Edge で描いて作った PNG。絵柄を変えたら作り直す
- `ChanceIcon`:chance?(青、棒の3本目が点線)/ chance!(金、棒がそろって星が光る)

## 環境変数
アプリが読むものはなし。`PORT` は Railway が自動で入れる(nginx の待ち受けポート。ないときは 8080)。

## 実装の記録
- 2026-11-15:プロトタイプを実装。全機能(F-01〜F-13)を実装し、自動テスト25件が合格
- 2026-11-15:カード一覧(七並べ、F-24)を追加。`components/CardGridModal.tsx`。Railway 用の Dockerfile などを追加
- 2026-11-16:ヘッダーのデッキ数、デッキ数のおすすめ、チップを用意する画面(ログインボーナス、銀行口座)、カウンティングの説明モーダルを追加。チップ補充(+1,000)を廃止。GitHub に push

## 注意点
- lint(oxlint)の警告2件:`components/Chips.tsx` がコンポーネントと定数を一緒に出しているため、開発中のホットリロードが効きにくい。動作には影響しない
- 所持チップ・所持金・設定はブラウザ(localStorage)に保存する。ゲームの途中の状態(シュー、カウント、テーブルのカード)は保存しないため、再読み込みするとシャッフルからやり直しになる
- git リポジトリ:https://github.com/NaoyaHamazaki/BJCounting(公開リポジトリ。docs も公開されるため、秘密情報は書かない)

## 関連
- 単体テスト:[05_単体テスト](../05_単体テスト/README.md)
- 前:[03_詳細設計](../03_詳細設計/README.md)
