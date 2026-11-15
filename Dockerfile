# 確率ラボ21 を Railway で公開するための Dockerfile
# (Railway対応メモ.md の 2-2 を、静的サイト用に変えたもの。Django はなく、ビルド結果を nginx で配信する)

# ---- 1. ビルド(テストに通らなければ、ここで止まる) ----
FROM node:22-slim AS build
WORKDIR /app
COPY app/package.json app/package-lock.json ./
RUN npm ci
COPY app/ ./
RUN npm test && npm run build

# ---- 2. 配信(nginx) ----
FROM nginx:1.27-alpine
# templates/*.template は起動時に環境変数(PORT)を埋めて /etc/nginx/conf.d/ に置かれる
COPY deploy/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
# Railway は PORT を渡す。渡されないとき(ローカルで docker run など)は 8080
ENV PORT=8080
EXPOSE 8080
