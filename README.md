# FlowMark Reader

沉浸式 Markdown 阅读器，基于 Electron + React + TypeScript，支持本地阅读体验与用户级云端数据持久化（登录/注册/验证码、文件与书签同步）。

## 1. 项目定位

FlowMark 面向“长文阅读 + 结构化标注”的桌面场景，提供：
- 本地 Markdown 打开与多文件切换
- 文本高亮、书签、备注与大纲导航
- 登录鉴权与用户级云端数据同步
- Electron 桌面端稳定运行（含 Windows 特殊路径兼容）

## 2. 核心功能

### 2.1 阅读与浏览
- Markdown 渲染：支持代码高亮、Front Matter、KaTeX 数学公式
- 三种视图：双栏模式 / 卡片模式 / 专注模式
- 主题切换：浅色 / 深色 / 护眼 / Midnight
- 缩放控制：放大、缩小、重置
- 导出能力：支持导出为 PDF / HTML（可选择保存位置和文件名，尽量保持当前主题风格）

### 2.2 文件管理
- 打开单文件、打开文件夹（递归读取 Markdown）
- 拖拽导入文件/文件夹
- 最近文件列表（持久化）
- 顶部标签栏多文件切换与关闭

### 2.3 标注与知识管理
- 选中文本后可添加高亮/备注
- 书签与高亮按文件隔离
- 大纲自动生成（H1-H6）
- 搜索与命中高亮

### 2.4 智能辅助
- 阅读统计面板：字数、字符数、预估阅读时长、难度评级
- 语法检查：基础拼写检查、异常标点识别
- 链接校验：危险协议、锚点缺失、URL 格式异常提示

### 2.5 账号与同步
- 登录/注册：账户 + 密码 + 图片验证码
- 会话管理：access/refresh token（主进程存储，渲染层不可见敏感 token）
- 云端同步：
  - 文件：读取/更新
  - 书签：读取/新增/更新/删除
- 用户数据隔离：不同账号仅访问自己的文件与书签

## 3. 技术架构

### 3.1 前端（Renderer）
- React 18 + MUI 5 + TypeScript
- `AuthContext`：登录态与验证码拉取
- `AppContext`：文件、标签、书签、高亮、同步状态

### 3.2 桌面层（Electron Main + Preload）
- Main 负责：窗口、菜单、IPC、安全边界、后端请求代理
- Preload 暴露受控 API：
  - `auth.*`
  - `sync.files.*`
  - `sync.bookmarks.*`
  - 文件与对话框能力

### 3.3 后端（server）
- Node.js + Express + MySQL
- 路由：`/api/auth`、`/api/files`、`/api/bookmarks`
- 验证码一次性消费
- refresh token 可撤销

## 4. 目录结构

```text
.
├── src
│   ├── main                  # Electron 主进程
│   │   ├── main.ts
│   │   ├── preload.ts
│   │   ├── backendClient.ts
│   │   ├── fileManager.ts
│   │   └── store.ts
│   └── renderer              # React 渲染层
│       ├── components
│       ├── context
│       ├── styles
│       ├── types
│       └── utils
├── server                    # 后端服务
│   ├── src
│   │   ├── app.js
│   │   ├── routes
│   │   ├── middleware
│   │   └── utils
│   ├── migrations
│   │   └── 001_init.sql
│   └── test
├── docs
│   └── auth-and-sync.md
└── scripts
    └── run-electron.js
```

## 5. 环境要求

- Node.js 18+
- npm 9+
- MySQL 8+
- Windows / macOS / Linux（当前文档以 Windows 为主）

## 6. 初始化与运行

### 6.1 安装依赖

```bash
npm install
npm --prefix server install
```

### 6.2 配置后端环境变量

复制：
- `server/.env.example` -> `server/.env`

至少配置：
- `MYSQL_HOST`
- `MYSQL_PORT`
- `MYSQL_USER`
- `MYSQL_PASSWORD`
- `MYSQL_DATABASE`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`

### 6.3 初始化数据库

执行：
- `server/migrations/001_init.sql`

### 6.4 启动方式

1. 启动后端：

```bash
npm run dev:server
```

2. 启动桌面端（开发模式）：

```bash
npm run dev
```

3. 仅启动 Electron（基于现有构建产物）：

```bash
npm run electron
```

### 6.5 Windows 特殊路径（`\\?\`）建议

若终端提示 `UNC 路径不受支持`，请统一使用 `npm.cmd --prefix`：

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
& "C:\Program Files\nodejs\npm.cmd" --prefix "D:\Codex\Markdwon阅读器\server" run dev
& "C:\Program Files\nodejs\npm.cmd" --prefix "D:\Codex\Markdwon阅读器" run dev
```

## 7. 构建与打包

```bash
npm run build
npm run package
```

## 8. 测试命令

### 8.1 后端测试

```bash
npm run test:server
```

### 8.2 后端真实数据库 smoke（发布前）

```bash
# Windows PowerShell
$env:ENABLE_SMOKE_DB='1'
npm run test:server:smoke
```

### 8.3 前端登录页回归

```bash
npm run test:ui-auth
```

### 8.4 鉴权同步综合验证

```bash
npm run verify:auth-sync
```

## 9. 接口概览

后端基础地址：`http://127.0.0.1:4000/api`

### 9.1 Auth
- `GET /auth/captcha`
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`

### 9.2 Files
- `GET /files`
- `PUT /files/:fileKey`

### 9.3 Bookmarks
- `GET /bookmarks`
- `PUT /bookmarks/:bookmarkId`
- `DELETE /bookmarks/:bookmarkId`

## 10. 数据模型

见 `server/migrations/001_init.sql`，核心表：
- `users`
- `captcha_challenges`
- `refresh_tokens`
- `user_files`
- `user_bookmarks`

## 11. 关键行为约束

- 登录需验证码
- 注册需验证码
- token 仅在主进程持久化
- 同步失败不丢本地状态（提示可重试）
- 文件/书签/高亮按文件隔离
- 用户数据按 `user_id` 隔离

## 12. 常见问题

### 12.1 打开文件/打开文件夹报“位置不可用”
- 应用已实现对话框默认路径回退机制
- 如仍报错，先彻底关闭 Electron 再重启

### 12.2 PowerShell 执行策略拦截 npm
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

### 12.3 `npm` 跑到 `C:\Windows\package.json`
- 使用 `npm.cmd --prefix <项目路径>` 方式启动

## 13. 许可证

MIT

---

Reading should flow like water.
