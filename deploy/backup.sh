#!/usr/bin/env bash
# 每天备份 data/（账号、白名单、统计）
set -euo pipefail
STAMP=$(date +%F)
mkdir -p /opt/backup
tar -czf "/opt/backup/data-${STAMP}.tgz" -C /opt/wenhe data
find /opt/backup -name 'data-*.tgz' -mtime +7 -delete
