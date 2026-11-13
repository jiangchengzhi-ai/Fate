# 部署与回滚

服务器：`8.210.182.233`（阿里云香港轻量，Alibaba Cloud Linux 3）
代码目录：`/opt/wenhe`（git 仓库）
服务：`systemctl status wenhe`
域名：https://wenheai.cn

## 目录约定

| 路径 | 内容 | 是否进 git |
| --- | --- | --- |
| `/opt/wenhe` | 代码 | 是 |
| `/opt/wenhe/.env` | 模型 key、后台 token | **否** |
| `/opt/wenhe/data` | 白名单、统计、日志 | **否** |
| `/opt/backup` | 每日 data 备份，保留 7 天 | 否 |

## 发布新版本

```bash
# 本地：提交并打 tag
git add -A && git commit -m "feat: ..."
git tag -a v0.3.0 -m "说明"
git push origin main --tags

# 服务器：更新到某个 tag（不带参数则 main）
ssh root@8.210.182.233
cd /opt/wenhe
bash deploy/update.sh v0.3.0
```

`update.sh` 会：记录当前 commit → fetch → reset → 重启 → 健康检查；**检查失败自动回滚**。

## 回滚

```bash
bash deploy/rollback.sh          # 回到上次 update 之前
bash deploy/update.sh v0.2.0     # 或回到指定版本
```

## 常用命令

```bash
git log --oneline -10            # 看历史
git tag -l                       # 看版本
systemctl restart wenhe          # 重启
journalctl -u wenhe -n 50        # 看日志
curl -s localhost:5173/api/health
```

## 注意

- `.env` 和 `data/` 不进 git，`update.sh` 的 `reset --hard` 不会删它们
- 每次发布前建议打 tag，回滚时按 tag 最省事
- 证书由 certbot 自动续期，不需要手动管
