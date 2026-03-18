# FlowMark Auth & Sync

## 1. 启动与环境变量

1. 复制 `server/.env.example` 为 `server/.env` 并填写数据库和 JWT 配置。
2. 执行 SQL 迁移：`server/migrations/001_init.sql`。
3. 安装后端依赖并启动：
   - `cd server && npm install`
   - `npm run dev`

默认后端地址：`http://127.0.0.1:4000/api`。

## 2. 鉴权时序

1. 客户端 `GET /api/auth/captcha` 获取验证码图片和 `captchaId`。
2. 新用户先调用 `POST /api/auth/register` 完成注册（账户、密码、验证码）。
3. 客户端提交 `POST /api/auth/login`：
   - 必填：`account`, `password`, `captchaId`, `captchaText`
   - 未注册账号将被拒绝（必须先注册）。
4. 后端返回 `accessToken + refreshToken + user`。
5. Electron 主进程持久化 token，并通过 preload 暴露登录态。
6. 业务接口携带 `Authorization: Bearer <accessToken>`。
7. 遇到 401 时自动调用 `POST /api/auth/refresh` 刷新 token，失败则清会话并通知渲染层回登录页。

## 3. API 简表

### Auth
- `GET /api/auth/captcha`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`

### Files
- `GET /api/files`
- `PUT /api/files/:fileKey`

### Bookmarks
- `GET /api/bookmarks`
- `PUT /api/bookmarks/:bookmarkId`
- `DELETE /api/bookmarks/:bookmarkId`

## 4. 数据模型与关系

- `users`：用户主表（`account` 唯一）
- `captcha_challenges`：验证码挑战表（一次性消费）
- `refresh_tokens`：refresh token 记录（仅存 hash，可撤销）
- `user_files`：用户文件（`(user_id, file_key)` 唯一）
- `user_bookmarks`：用户书签（`(user_id, bookmark_id)` 唯一）

文件和书签都通过 `user_id` 与用户绑定，天然支持用户隔离。

## 5. 同步策略（最小闭环）

- 登录成功后：
  - 拉取文件：`GET /api/files`
  - 拉取书签：`GET /api/bookmarks`
- 文件变更时：`PUT /api/files/:fileKey`
- 书签变更时：
  - 新增/更新：`PUT /api/bookmarks/:bookmarkId`
  - 删除：`DELETE /api/bookmarks/:bookmarkId`

客户端在同步失败时保留本地状态并提示用户。
