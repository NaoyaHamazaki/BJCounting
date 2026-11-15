@echo off
chcp 65001 > nul
title Blackjack Count Trainer
cd /d "%~dp0app"

where node > nul 2>&1
if errorlevel 1 (
  echo Node.js が見つかりません。https://nodejs.org/ からインストールしてください。
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo 初回のため、ライブラリをインストールしています...
  call npm install
  if errorlevel 1 (
    echo インストールに失敗しました。
    pause
    exit /b 1
  )
)

echo ブラウザで http://localhost:5173 を開きます。終了するときは、このウィンドウを閉じてください。
call npm run dev -- --open
pause
