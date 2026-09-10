# 云端账号同步 · 详细操作步骤（免买服务器）

电脑和手机用**同一个工作台账号**登录后，任务会存到 Cloudflare（免费额度即可）。  
**不需要**自己买 VPS。

> 部署必须在**电脑**上完成（需要终端 + 浏览器授权）。手机只负责装 App、填地址、登录。

---

## 0. 开始前（安全）

若你曾把 Cloudflare / 邮箱密码发到聊天里，请先：

1. 打开 https://dash.cloudflare.com 修改密码  
2. 打开 https://myaccount.google.com/security 修改 Gmail 密码（若复用过）  
3. 尽量开启两步验证  

**不要**再把密码发给任何人（包括 AI）。

---

## 1. 准备电脑环境

### 1.1 安装 Node.js

- 打开 https://nodejs.org  
- 安装 **LTS** 版本  
- 打开终端，确认：

```bash
node -v
npm -v
```

### 1.2 安装 pnpm

```bash
npm install -g pnpm
pnpm -v
```

### 1.3 拿到本仓库代码

任选一种：

**A. 已有 GitHub Desktop / git**

```bash
git clone https://github.com/yimeiselection-ai/botdirectory.ai.git
cd botdirectory.ai
git checkout cursor/multi-agent-workbench-86bf
```

**B. 网页下载 ZIP**

1. 打开仓库页面  
2. Code → Download ZIP  
3. 解压后进入文件夹  

### 1.4 安装依赖

在仓库**根目录**：

```bash
pnpm install
cd apps/workbench
pnpm install
cd ../..
```

---

## 2. 登录 Cloudflare（浏览器授权，不用把密码给我）

```bash
cd apps/workbench/sync-worker
pnpm exec wrangler login
```

1. 终端会给出一个链接，或自动打开浏览器  
2. 用你的 Cloudflare 账号在浏览器里登录并点 **Allow**  
3. 回到终端，看到类似 `Successfully logged in` 即可  

若提示未安装 wrangler，在仓库根目录执行：

```bash
pnpm install
```

然后再跑上面的 `wrangler login`。

---

## 3. 创建免费数据库（D1）

仍在 `apps/workbench/sync-worker`：

```bash
pnpm exec wrangler d1 create workbench-sync
```

终端会输出类似：

```text
[[d1_databases]]
binding = "DB"
database_name = "workbench-sync"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

** ent整个 `database_id`（那串带横线的 ID）。**

---

## 4. 把 database_id 写进配置

用编辑器打开：

```text
apps/workbench/sync-worker/wrangler.jsonc
```

找到：

```jsonc
"database_id": "00000000-0000-0000-0000-000000000000"
```

改成你刚才复制的真实 ID，例如：

```jsonc
"database_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

保存文件。

---

## 5. 初始化数据表并部署

仍在 `apps/workbench/sync-worker`：

```bash
# 在云端创建表结构
pnpm exec wrangler d1 migrations apply workbench-sync --remote

# 部署同步服务
pnpm exec wrangler deploy
```

成功后终端会出现：

```text
Published workbench-sync
  https://workbench-sync.<你的账号子域>.workers.dev
```

**复制这个 https 地址**，后面电脑和手机都要用。

自检（可选，浏览器或手机都能打开）：

```text
https://workbench-sync.<你的子域>.workers.dev/health
```

应看到类似：

```json
{"ok":true,"service":"workbench-sync"}
```

---

## 6. 电脑端：填地址并注册

### 6.1 先能打开工作台

开发调试（最快）：

```bash
cd apps/workbench
pnpm install
pnpm build
pnpm electron:dev
```

或按你的系统打包安装：

```bash
# Windows
pnpm electron:build:win

# macOS（必须在 Mac 上）
pnpm electron:build:mac
```

### 6.2 配置同步

1. 打开工作台 App  
2. 找到 **「云端账号同步」**  
3. 在「同步服务地址」粘贴第 5 步的 `https://….workers.dev`（不要末尾多余斜杠也行）  
4. 点 **保存地址**  
5. 输入邮箱 + 密码（至少 8 位）→ 点 **注册**  
6. 看到「登录成功 / 已上传」类提示即可  

> 这个邮箱密码是**工作台自己的账号**，可以和 Cloudflare 账号不同。请自己记住。

---

## 7. 手机端：同一地址、同一邮箱

### Android（推荐先做）

1. 电脑安装 [Android Studio](https://developer.android.com/studio)  
2. 在仓库执行：

```bash
cd apps/workbench
pnpm build
npx cap sync android
npx cap open android
```

3. 在 Android Studio 里 Run，或 Build → Build APK(s)  
4. 把 APK 拷到手机安装（需允许「未知来源」）  
5. 打开 App → **云端账号同步**  
6. 填**同一个** `https://….workers.dev` → 保存  
7. 用电脑上**同一个邮箱和密码** → **登录**（不要再注册一个新的）  
8. 点 **立即同步**

### iPhone

需要 Mac + Xcode：

```bash
cd apps/workbench
pnpm build
npx cap add ios    # 首次
npx cap sync ios
npx cap open ios
```

用 Xcode 签名后安装到手机，同步配置方式与 Android 相同。

---

## 8. 验证两边是否同步

1. 在**电脑**发布一条任务（例如「测试同步」）  
2. 等 1–2 秒，或点 **立即同步**  
3. 打开**手机**，点 **立即同步**  
4. 应能看到同一条任务  

反过来：手机改结果 → 电脑同步，也应一致。

---

## 9. 常见问题

| 现象 | 处理 |
|------|------|
| `wrangler login` 打不开浏览器 | 复制终端里的链接，手动粘贴到浏览器 |
| `database_id` 忘记填 | 部署会失败或连错库；检查 `wrangler.jsonc` |
| `/health` 打不开 | 重新 `wrangler deploy`，确认复制的是 https 地址 |
| 手机登不上 | 确认地址完全一致、用的是「登录」不是再「注册」 |
| 提示云端有更新的数据 | 先点「立即同步」拉取，再继续编辑 |
| 不想用 Electron，只想网页 | 可先 `pnpm --dir apps/workbench dev`，浏览器调试同步逻辑 |

---

## 10. 你可发给我协助的内容（不要含密码）

部署卡住时，可发这些（**打码**隐私信息）：

- `wrangler deploy` 的终端输出  
- `/health` 打开后的内容  
- `wrangler.jsonc` 里除真实 `database_id` 外的结构（ID 可打码中间几位）  

**不要发：** Cloudflare 密码、Gmail 密码、工作台登录密码、完整 API Token。
