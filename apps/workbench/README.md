# 多智能体工作台 · 本地安装包

把 Cursor / Codex / 豆包 工作台装到**电脑**和**手机**上，不依赖浏览器标签页。

## 目录

```
apps/workbench/
  src/           # 工作台界面
  electron/      # 电脑端壳
  android/       # 手机 Android 工程（cap sync 后生成）
  ios/           # 手机 iOS 工程（需在 Mac 上 sync）
  release/       # 电脑安装包输出
```

## 电脑端（Electron）

在 `apps/workbench` 下：

```bash
pnpm install
pnpm electron:build:linux   # → release/*.AppImage 与 .deb
pnpm electron:build:win     # → release/*portable*.exe（建议在 Windows 上打）
pnpm electron:build:mac     # → release/*.dmg（必须在 Mac 上打）
```

开发调试：

```bash
pnpm build && pnpm electron:dev
```

### 安装方式

| 系统 | 文件 | 怎么用 |
|------|------|--------|
| Linux | `.AppImage` | 加执行权限后双击；或装 `.deb` |
| Windows | `portable.exe` / 安装包 | 双击运行（portable 免安装） |
| macOS | `.dmg` | 拖到「应用程序」 |

## 手机端（Capacitor）

```bash
pnpm install
pnpm build
npx cap add android   # 首次
npx cap add ios       # 首次，需 Mac
pnpm cap:sync
```

### Android

1. 安装 [Android Studio](https://developer.android.com/studio)
2. `pnpm cap:android` 打开工程
3. 用模拟器运行，或 Build → Build APK(s) / Generate Signed Bundle
4. 把 APK 拷到手机安装（需允许「未知来源」）

### iPhone

1. 在 **Mac** 上安装 Xcode
2. `pnpm cap:ios` 打开工程
3. 选你的 Team 签名后 Run，或 Archive 后通过 TestFlight / 爱思助手等安装

> 当前云端 Linux 环境可以打 **Linux 电脑包**；Windows / macOS / iOS 安装包需要在对应系统上执行上述命令（或用 CI）。

## 和网站版的关系

- 网站：`/workbench/`（浏览器）
- 本地 App：本目录打包结果（独立窗口 / 手机图标）

两边逻辑一致；任务数据存在各设备本地，默认不同步。

## 云端同步（电脑 ↔ 手机）

**不需要自购服务器。** 用免费 Cloudflare 账号部署同步 Worker 即可。

完整步骤见 [SYNC.md](./SYNC.md)。

简要：

```bash
cd apps/workbench/sync-worker
pnpm exec wrangler login
pnpm exec wrangler d1 create workbench-sync
# 把 database_id 写入 wrangler.jsonc 后：
pnpm exec wrangler d1 migrations apply workbench-sync --remote
pnpm exec wrangler deploy
```

在 App「云端账号同步」里填 `https://….workers.dev`，注册/登录同一邮箱即可。
