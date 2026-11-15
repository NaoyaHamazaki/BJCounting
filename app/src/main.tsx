import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { useGameStore } from './store/useGameStore'

// 開発時だけ、画面確認用にストアを window から触れるようにする(本番ビルドには含まれない)
if (import.meta.env.DEV) (window as unknown as { __store: typeof useGameStore }).__store = useGameStore

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
