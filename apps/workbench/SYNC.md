# 云端账号同步（免买服务器）

电脑和手机用**同一个账号**登录后，任务会同步到 Cloudflare（免费额度即可）。

## 你需要准备什么

1. 一个免费 [Cloudflare](https://dash.cloudflare.com/sign-up) 账号  
2. 本机安装 Node / pnpm，以及 `wrangler`（仓库根目录已有）

**不需要**自己买 VPS / 云主机。

## 一键部署同步服务

在仓库里执行：

```bash
cd apps/workbench/sync-worker

# 登录 Cloudflare（浏览器授权）
pnpm exec wrangler login

# 创建 D1 数据库（免费）
pnpm exec wrangler d1 create workbench-sync
```

把命令输出里的 `database_id` 填进 `wrangler.jsonc` 的 `database_id` 字段，然后：

```bash
# 跑迁移
pnpm exec wrangler d1 migrations apply workbench-sync --remote

# 部署 Worker
pnpm exec wrangler deploy
```

部署成功后会得到类似：

```text
https://workbench-sync.<你的子域>.workers.dev
```

## 在 App 里填写地址

1. 打开电脑端或手机端工作台  
2. 在「云端账号同步」里粘贴上面的地址 → **保存地址**  
3. **注册**一个邮箱账号（密码至少 8 位）  
4. 另一台设备填**同一地址**，用**同一邮箱登录**  
5. 点 **立即同步**（登录后也会自动同步；本地改动会自动上传）

## 本地调试（可选）

```bash
cd apps/workbench/sync-worker
pnpm exec wrangler d1 migrations apply workbench-sync --local
pnpm exec wrangler dev
# 默认 http://127.0.0.1:8787
```

电脑 App 开发时把同步地址设为 `http://127.0.0.1:8787`。手机真机需用局域网 IP，且仅适合调试。

## 安全说明

- 密码用 PBKDF2 加盐哈希，不明文存储  
- 会话 Token 存 D1，约 30 天过期  
- 冲突时以「先拉取再合并 / 时间戳」保护，避免旧数据覆盖新数据  

## 费用

Cloudflare Workers + D1 个人用量通常落在**免费套餐**内。超免费额度才会计费，可在 Cloudflare 控制台查看用量。
