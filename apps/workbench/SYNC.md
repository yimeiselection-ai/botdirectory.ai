# 云端同步 · 零基础逐步教程

本教程假设你**几乎没用过命令行**。  
请准备一台电脑（手机无法完成部署）。  
整份教程大约 30–60 分钟。

> **重要：** 不要把任何密码发给 AI 或任何人。  
> 若密码曾经发到聊天里，请先改密码（见第 0 步）。

---

# 第 0 步：先改密码（如果发过聊天）

### 0.1 改 Cloudflare 密码
1. 用浏览器打开：https://dash.cloudflare.com  
2. 登录你的账号  
3. 点右上角头像 / 邮箱  
4. 找 **My Profile** 或 **账户设置**  
5. 找 **Password** / **密码** → 修改  
6. 保存  

### 0.2 改 Gmail 密码（如果 Cloudflare 用的是这个邮箱，且密码相同）
1. 打开：https://myaccount.google.com/security  
2. 点 **密码**  
3. 按提示改掉  

改完再继续下面的步骤。

---

# 第 1 步：确认你的电脑系统

看电脑是哪一种：

- 屏幕左下角有 **开始菜单** 的 Windows 图标 → **Windows**  
- 屏幕左上角有苹果菜单 → **Mac**

后面凡是写「Windows」或「Mac」的，只看你自己那一段。

---

# 第 2 步：安装 Node.js（运行工具用）

## Windows

1. 打开浏览器，访问：https://nodejs.org  
2. 点绿色大按钮 **Download Node.js (LTS)**  
3. 下载完成后，双击安装包（`.msi`）  
4. 一路点 **Next**  
   - 若看到 “Automatically install necessary tools”，可勾选，也可不勾  
5. 点 **Install**，等完成，点 **Finish**  

### 检查是否装好（Windows）
1. 按键盘 `Win` 键，输入：`powershell`  
2. 打开 **Windows PowerShell**  
3. 输入下面两行，每输完一行按 Enter：

```text
node -v
npm -v
```

4. 如果各自显示类似 `v22.x.x` 和 `10.x.x`，说明成功  

若提示「无法识别 node」，关掉 PowerShell 重新开一次再试。

## Mac

1. 打开浏览器，访问：https://nodejs.org  
2. 点 **Download Node.js (LTS)**  
3. 打开下载的 `.pkg`，一路继续安装  
4. 打开 **终端（Terminal）**：  
   - `Command + 空格`，输入 `终端` 或 `Terminal`，回车  

5. 输入：

```text
node -v
npm -v
```

有版本号就成功。

---

# 第 3 步：安装 pnpm

在**刚才打开的终端 / PowerShell**里输入：

```text
npm install -g pnpm
```

按 Enter，等它跑完。再输入：

```text
pnpm -v
```

出现版本号即可。

---

# 第 4 步：下载项目代码

## 方法 A（推荐，用浏览器下载 ZIP）

1. 电脑浏览器打开：

https://github.com/yimeiselection-ai/botdirectory.ai

2. 如果页面提示切换分支：找分支下拉框，选  

`cursor/multi-agent-workbench-86bf`

（如果默认就是这个分支，可跳过）

3. 点绿色 **Code** 按钮  
4. 点 **Download ZIP**  
5. 下载完成后，把 ZIP **解压**到好找的位置，例如：  
   - Windows：`桌面\botdirectory`  
   - Mac：`下载/botdirectory`  

6. 记住这个文件夹位置。

## 方法 B（会用 git 的人）

```text
git clone https://github.com/yimeiselection-ai/botdirectory.ai.git
cd botdirectory.ai
git checkout cursor/multi-agent-workbench-86bf
```

---

# 第 5 步：用终端进入项目文件夹

## Windows（PowerShell）

假设你解压到桌面，文件夹名类似 `botdirectory.ai-cursor-multi-agent-workbench-86bf`：

1. 打开 PowerShell  
2. 输入（按你的真实路径改）：

```text
cd Desktop
dir
```

3. 看到解压出来的文件夹名后：

```text
cd "文件夹的完整名字"
```

例如：

```text
cd "botdirectory.ai-cursor-multi-agent-workbench-86bf"
```

4. 再输入：

```text
dir
```

如果能看到 `apps`、`package.json`、`bots` 这些，就说明进对了。

## Mac（终端）

```text
cd ~/Downloads
ls
cd "解压出来的文件夹名"
ls
```

同样应看到 `apps`、`package.json`。

---

# 第 6 步：安装项目依赖

在项目根目录（能看到 `package.json` 的地方）依次输入，每行回车，等跑完再输下一行：

```text
pnpm install
```

```text
cd apps/workbench
```

```text
pnpm install
```

```text
cd ../..
```

最后一行会回到项目根目录。

若某一步报红字错误：把**完整错误文字**复制发给我（不要带密码）。

---

# 第 7 步：登录 Cloudflare（浏览器授权）

1. 进入同步服务目录并安装依赖（必须先装好 `wrangler`）：

```text
cd apps/workbench/sync-worker
pnpm install --config.minimumReleaseAge=0
```

2. 输入：

```text
pnpm exec wrangler login
```

若提示 `Command "wrangler" not found`：说明还在错误目录，或依赖未安装。  
先回到项目根目录再进一次：

```text
cd ../..\..
cd apps/workbench/sync-worker
pnpm install --config.minimumReleaseAge=0
pnpm exec wrangler login
```

（Mac / Linux 用 `cd ../../..` 回到根目录。）
3. 会发生其中一种情况：  
   - **自动打开浏览器**  
   - 或终端出现一串以 `https://` 开头的链接 → **复制到浏览器打开**

4. 在浏览器里：  
   - 登录你的 Cloudflare 账号  
   - 看到授权页面，点 **Allow / 允许**

5. 回到终端，应看到类似：

```text
Successfully logged in.
```

看到这句话，第 7 步完成。

---

# 第 8 步：创建免费数据库

仍在 `apps/workbench/sync-worker` 目录，输入：

```text
pnpm exec wrangler d1 create workbench-sync
```

成功后，终端会出现类似：

```text
database_id = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
```

### 请做这件事：
1. 用鼠标选中这串 ID（引号里面的内容）  
2. 复制  
3. 先粘贴到手机备忘录 / 记事本里保存  

**示例（假的）：** `a1b2c3d4-e5f6-7890-abcd-ef1234567890`

---

# 第 9 步：把 database_id 写进配置文件

1. 用记事本 / VS Code / Cursor 打开这个文件：

```text
apps/workbench/sync-worker/wrangler.jsonc
```

完整路径类似：

```text
你的项目文件夹/apps/workbench/sync-worker/wrangler.jsonc
```

2. 找到这一行：

```text
"database_id": "00000000-0000-0000-0000-000000000000",
```

3. 把中间那串全是 0 的 ID，换成你第 8 步复制的真实 ID。  

改完后类似：

```text
"database_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
```

4. **保存文件**（Ctrl+S / Command+S）

---

# 第 10 步：创建数据表

确认终端还在 `apps/workbench/sync-worker`（不确定就再执行一次 `cd` 进这个目录）。

输入：

```text
pnpm exec wrangler d1 migrations apply workbench-sync --remote
```

若问是否继续，输入 `y` 再回车。

成功时会看到 migration 成功、有 ✅ 之类提示。

---

# 第 11 步：正式部署同步服务

输入：

```text
pnpm exec wrangler deploy
```

等它跑完。成功时会出现类似：

```text
Published workbench-sync
  https://workbench-sync.xxxxx.workers.dev
```

### 请做这件事：
1. 复制这个 `https://……workers.dev` 地址  
2. 保存到备忘录  

这就是你的**同步服务地址**。电脑和手机都要用它。

---

# 第 12 步：检查服务是否正常

1. 打开浏览器  
2. 在地址栏粘贴（注意末尾加 `/health`）：

```text
https://workbench-sync.xxxxx.workers.dev/health
```

3. 页面应显示类似：

```text
{"ok":true,"service":"workbench-sync"}
```

看到这个，说明云端服务已经好了。

---

# 第 13 步：在电脑上打开工作台并注册账号

回到终端，先回到 workbench 目录：

```text
cd ../..
```

不对的话用：

```text
cd 你的项目根目录/apps/workbench
```

然后：

```text
pnpm build
pnpm electron:dev
```

会弹出工作台窗口。

### 在窗口里操作：
1. 找到标题 **「云端账号同步」**  
2. 在「同步服务地址」框里，粘贴第 11 步的地址  
   （例如 `https://workbench-sync.xxxxx.workers.dev`）  
3. 点 **保存地址**  
4. 邮箱：填一个你能记住的邮箱（可用 Gmail）  
5. 密码：自己设一个（至少 8 位），**记在安全的地方**  
6. 点 **注册**  

看到登录成功 / 已上传之类提示，电脑端完成。

> 这个邮箱+密码是「工作台账号」，以后手机登录也要用这一套。

---

# 第 14 步：手机端（Android 详细）

> iPhone 需要 Mac + 苹果开发者账号，步骤更长；你若是 iPhone，做完电脑端后告诉我，我再单独写 iPhone 版。

## 14.1 电脑安装 Android Studio
1. 打开：https://developer.android.com/studio  
2. 下载并安装 Android Studio  
3. 第一次打开按提示安装 SDK（一路 Next / Finish）

## 14.2 生成并打开安卓工程
在终端进入：

```text
cd 你的项目根目录/apps/workbench
```

执行：

```text
pnpm build
npx cap sync android
npx cap open android
```

Android Studio 会打开工程。

## 14.3 安装到手机
任选一种：

**A. USB 连接手机**
1. 手机打开「开发者选项」和「USB 调试」  
2. 用数据线连电脑  
3. 在 Android Studio 顶部点绿色 Run ▶  
4. 选你的手机，安装  

**B. 生成 APK 拷贝安装**
1. Android Studio 菜单：Build → Build Bundle(s) / APK(s) → Build APK(s)  
2. 完成后点 locate，找到 `.apk` 文件  
3. 发到手机（微信文件传输、网盘、数据线均可）  
4. 手机打开 APK 安装（允许「未知来源」）

## 14.4 手机里登录同步
1. 打开「多智能体工作台」App  
2. 找到 **云端账号同步**  
3. 同步服务地址：填电脑上**同一个** `https://……workers.dev`  
4. 点 **保存地址**  
5. 邮箱、密码：填电脑上**同一个**  
6. 点 **登录**（不要点注册）  
7. 点 **立即同步**

---

# 第 15 步：验证同步成功

1. 在**电脑**工作台发布一条任务，内容写：`同步测试1`  
2. 等 2 秒，或点 **立即同步**  
3. 打开**手机**，点 **立即同步**  
4. 如果手机能看到 `同步测试1`，说明成功  

再反过来：手机改一条结果 → 电脑同步，也应能看到。

---

# 卡住时怎么找我帮忙

把下面这些发我（**不要带密码**）：

1. 你做到第几步了  
2. 电脑是 Windows 还是 Mac  
3. 终端里的红色报错全文  
4. 浏览器打开 `/health` 时看到的内容（如果已经部署）

---

# 步骤总览（打卡用）

- [ ] 0 改密码  
- [ ] 2 安装 Node.js  
- [ ] 3 安装 pnpm  
- [ ] 4 下载并解压项目  
- [ ] 5 终端进入项目目录  
- [ ] 6 `pnpm install`  
- [ ] 7 `wrangler login`  
- [ ] 8 创建 D1，复制 database_id  
- [ ] 9 写入 wrangler.jsonc 并保存  
- [ ] 10 migrations apply  
- [ ] 11 wrangler deploy，复制 https 地址  
- [ ] 12 打开 /health 检查  
- [ ] 13 电脑 App 保存地址并注册  
- [ ] 14 手机安装并登录同一账号  
- [ ] 15 两边同步测试成功  
