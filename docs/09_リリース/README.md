# 09_リリース

## 書く内容
リリース手順、公開先、公開の記録。

## 状態
作成中(最終更新:2026-11-16)。公開先は Railway。公開用のファイルは作成済み、デプロイは未実施。

## 公開先
Railway(2026-11-15 オーナー指定)。手順は `C:\Users\right\OneDrive\Desktop\Python\master\SaaS\プロジェクト開始前必須確認\Railway対応メモ.md` に従う。
このアプリはサーバー処理・DB・アップロードがない静的サイトなので、メモのうち settings.py、Postgres、Volume、migrate は不要。

## リリース手順
| # | 作業 | 状態 |
|---|---|---|
| 1 | Dockerfile、.dockerignore、railway.json、nginx の設定を置く(04 を参照) | 済(2026-11-15) |
| 2 | プロジェクト直下で git リポジトリを作り、GitHub に push する | 済(2026-11-16。https://github.com/NaoyaHamazaki/BJCounting 、main ブランチ) |
| 3 | Railway で New Project → Deploy from GitHub repo → リポジトリを選ぶ | 済(2026-11-16、オーナー) |
| 4 | Settings → Networking → Generate Domain で URL を発行する | 未 |
| 5 | 公開後の確認:Deployments が Active、Deploy Logs に nginx の起動ログ、PC とスマホで画面が出る、アイコンが出る | 未 |
| 6 | Serverless:Railway の画面でオンになっているか確認し、10〜15分放置して Sleeping になること、停止中から数秒で表示されることを確認 | 未 |

2回目以降は、main に push すると自動でビルドされ、公開される。テストに通らない場合は、ビルドが失敗して前の版のまま残る。

## 環境変数
設定するものはなし(`PORT` は Railway が自動で入れる)。秘密情報はない。

## 公開の記録
| 日付 | 内容 | URL |
|---|---|---|
| (未公開) | | |

## 関連
- V字モデルの対応先:[08_受入テスト](../08_受入テスト/README.md)
- 公開用のファイル:[04_実装](../04_実装/README.md)
