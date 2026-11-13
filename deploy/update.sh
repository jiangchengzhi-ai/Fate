#!/usr/bin/env bash
# 更新到指定 commit / tag / 分支，失败自动回滚
# 用法：bash deploy/update.sh [ref]，默认 main
set -euo pipefail

APP=/opt/wenhe
REF="${1:-main}"
cd "$APP"

PREV=$(git rev-parse HEAD)
echo "$PREV" > "$APP/.prev-rev"
echo "==> 当前 $PREV，目标 $REF"

git fetch --all --tags --prune
git reset --hard "$REF"
chmod +x deploy/*.sh 2>/dev/null || true

systemctl restart wenhe
sleep 2

if curl -fsS -o /dev/null http://127.0.0.1:5173/api/health; then
  echo "==> 部署成功：$REF → $(git rev-parse --short HEAD)"
else
  echo "==> 健康检查失败，回滚到 $PREV"
  git reset --hard "$PREV"
  systemctl restart wenhe
  exit 1
fi
