開発を始める前に、必ず「C:\Users\right\OneDrive\Desktop\Python\master\SaaS\プロジェクト開始前必須確認\00_開発初期読み込み.md」を読み、その指示に従うこと。

# 確率ラボ21(旧名 Blackjack Count Trainer)

- 仕様の原典:`企画.txt`。確定した要件は `docs/01_企画・要件定義/README.md`、決定事項は `docs/99_決定事項ログ/README.md`
- アプリ本体:`app/`(React + TypeScript + Vite + Tailwind v4 + Zustand)
- コマンド(`app/` で実行):`npm run dev` / `npm test` / `npm run build`
- ゲームのロジックは `app/src/game/`(純粋関数)、状態とフェーズの遷移は `app/src/store/useGameStore.ts`
- 工程を進めたら、その日のうちに対応する docs を更新する
