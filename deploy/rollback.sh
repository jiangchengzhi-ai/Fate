#!/usr/bin/env bash
# 回滚到上一次 update 之前的版本
set -euo pipefail

APP=/opt/wenhe
cd "$APP"

if [ ! -f "$APP/.prev-rev" ]; then
  echo "没有 .prev-rev，无法回滚；可手动指定：bash deploy/update.sh <commit>"
  exit 1
fi

PREV=$(cat "$APP/.prev-rev")
echo "==> 回滚到 $PREV ($(git log -1 --format=%s "$PREV" 2>/dev/null || echo '未知'))"

git reset --hard "$PREV"
systemctl restart wenhe
sleep 2

if curl -fsS -o /dev/null http://127.0.0.1:5173/api/health; then
  echo "==> 回滚完成：$(git rev-parse --short HEAD)"
else
  echo "==> 回滚后健康检查仍失败，请查 journalctl -u wenhe -n 50"
  exit 1
fi
