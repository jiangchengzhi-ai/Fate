#!/usr/bin/env bash
# 问鹤 AI —— 阿里云香港 / Alibaba Cloud Linux 3 部署脚本
# 用法：bash setup.sh <域名> <证书邮箱>
set -euo pipefail

DOMAIN="${1:-wenheai.cn}"
EMAIL="${2:-}"
APP_DIR=/opt/wenhe

echo "==> 1/6 安装依赖"
dnf install -y nginx tar gzip curl >/dev/null

if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://rpm.nodesource.com/setup_20.x | bash - >/dev/null
  dnf install -y nodejs >/dev/null
fi
node -v

echo "==> 2/6 解包到 ${APP_DIR}"
mkdir -p "$APP_DIR"
tar -xzf /tmp/wenhe.tar.gz -C "$APP_DIR" --strip-components=1

echo "==> 3/6 安装 systemd 服务"
cp "$APP_DIR/deploy/wenhe.service" /etc/systemd/system/wenhe.service
systemctl daemon-reload
systemctl enable wenhe >/dev/null
systemctl restart wenhe

echo "==> 4/6 配置 Nginx"
sed "s/server_name .*/server_name ${DOMAIN} www.${DOMAIN};/" "$APP_DIR/deploy/wenhe.conf" > /etc/nginx/conf.d/wenhe.conf
nginx -t
systemctl enable nginx >/dev/null
systemctl restart nginx

echo "==> 5/6 防火墙（若启用 firewalld）"
if systemctl is-active --quiet firewalld; then
  firewall-cmd --permanent --add-service=http >/dev/null
  firewall-cmd --permanent --add-service=https >/dev/null
  firewall-cmd --reload >/dev/null
fi

echo "==> 6/6 HTTPS"
if [ -n "$EMAIL" ]; then
  dnf install -y certbot python3-certbot-nginx >/dev/null 2>&1 || true
  certbot --nginx -d "$DOMAIN" -d "www.${DOMAIN}" --agree-tos -m "$EMAIL" --redirect --non-interactive || \
    echo "证书申请失败：确认域名已解析到本机后再跑 certbot --nginx -d $DOMAIN -d www.$DOMAIN"
else
  echo "未提供邮箱，跳过 HTTPS；之后运行：certbot --nginx -d $DOMAIN -d www.$DOMAIN"
fi

echo "==> 完成"
systemctl --no-pager status wenhe | head -5
curl -s -o /dev/null -w "本地健康检查: %{http_code}\n" http://127.0.0.1:5173/api/health || true
