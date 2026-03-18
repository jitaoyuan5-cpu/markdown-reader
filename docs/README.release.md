# FlowMark 发布手册（Release README）

本文件面向发布与运维，覆盖部署拓扑、环境分层、上线检查与回滚方案。

## 1. 部署拓扑

```text
[Electron Client]
  ├─ Main Process
  │   ├─ 本地会话存储（access in-memory + refresh 持久化）
  │   └─ 通过 BackendClient 调用 HTTP API
  └─ Renderer Process
      └─ 仅通过 preload 暴露 API，不直接持有敏感 token

[FlowMark Server / Node + Express]
  ├─ /api/auth
  ├─ /api/files
  └─ /api/bookmarks

[MySQL]
  ├─ users
  ├─ captcha_challenges
  ├─ refresh_tokens
  ├─ user_files
  └─ user_bookmarks
```

## 2. 环境分层

建议最少分为：
- `local`：本地开发
- `staging`：预发验证（强制跑 smoke）
- `prod`：生产

### 2.1 变量基线（server/.env）

- `PORT`
- `MYSQL_HOST`
- `MYSQL_PORT`
- `MYSQL_USER`
- `MYSQL_PASSWORD`
- `MYSQL_DATABASE`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `ACCESS_TOKEN_EXPIRES_IN`
- `REFRESH_TOKEN_EXPIRES_DAYS`
- `CAPTCHA_EXPIRES_SECONDS`

### 2.2 环境策略建议

- `JWT_ACCESS_SECRET/JWT_REFRESH_SECRET`：各环境独立且高强度
- `MYSQL_DATABASE`：各环境独立库，禁止复用生产库
- `CAPTCHA_EXPIRES_SECONDS`：`staging/prod` 建议与风控策略一致
- 服务地址固定：客户端主进程通过 `FLOWMARK_API_BASE_URL` 或 store 配置指向目标环境

## 3. 发布流程（建议）

1. 代码冻结：停止新增功能，仅接受阻塞级修复
2. 依赖安装：
   - `npm install`
   - `npm --prefix server install`
3. 数据库迁移：执行 `server/migrations/001_init.sql`（或后续增量迁移）
4. 自动化验证：
   - `npm run test:server`
   - `npm run test:ui-auth`
   - `npm run build`
   - `ENABLE_SMOKE_DB=1 npm run test:server:smoke`
5. 预发验收：手动走关键业务链路
6. 生产发布：先后端、后客户端
7. 发布后观察：错误日志、登录成功率、同步失败率

## 4. 上线检查清单（Go/No-Go）

### 4.1 服务与配置

- [ ] `GET /healthz` 返回 `ok=true`
- [ ] 后端 `.env` 已替换生产配置
- [ ] JWT 秘钥已更新且与非生产环境不同
- [ ] 数据库账号最小权限

### 4.2 鉴权链路

- [ ] 注册：账户/密码/验证码可成功
- [ ] 重复账户注册返回 `409`
- [ ] 未注册账户登录返回 `404`（必须先注册）
- [ ] 登录成功返回 token 与 user
- [ ] refresh 正常续期，logout 可失效 refresh token

### 4.3 数据链路

- [ ] 文件 `GET/PUT` 正常
- [ ] 书签 `GET/PUT/DELETE` 正常
- [ ] 多用户数据隔离验证通过
- [ ] 同步失败时客户端保留本地状态并提示

### 4.4 客户端体验

- [ ] 登录/注册页交互正常（验证码刷新、错误提示）
- [ ] 多文件标签切换与关闭正常
- [ ] 最近文件可持久化、可点击打开
- [ ] 打开文件/文件夹在目标机器不出现“位置不可用”

## 5. 回滚方案

### 5.1 后端回滚

- 回滚到上一个稳定版本
- 保留数据库结构，避免破坏已写入数据
- 若必须回滚 schema，需先评估 `users/refresh_tokens/user_files/user_bookmarks` 的数据影响

### 5.2 客户端回滚

- 回退到上一个安装包
- 保持与后端 API 兼容
- 回滚后重点验证登录、文件读取、书签操作

## 6. 发布后验证（Smoke）

最小人工验收路径：
1. 新账户注册
2. 该账户登录
3. 打开/创建文件并保存
4. 添加书签并刷新后仍存在
5. 退出登录，再登录后数据仍在

## 7. 监控与告警建议

- 关键日志：`/auth/login` 失败率、`/auth/register` 冲突率、`/auth/refresh` 失败率
- 关键指标：
  - 登录成功率
  - 同步成功率（files/bookmarks）
  - API 5xx 比率
- 告警阈值：
  - 5xx 持续升高
  - 登录失败率异常突增
  - refresh 失败率异常

## 8. Windows 运维注意事项

若路径带 `\\?\` 且 `npm` 退回 `C:\Windows`，使用：

```powershell
& "C:\Program Files\nodejs\npm.cmd" --prefix "D:\Codex\Markdwon阅读器\server" run dev
& "C:\Program Files\nodejs\npm.cmd" --prefix "D:\Codex\Markdwon阅读器" run build
```

---

建议将本文件作为每次发版的固定核对模板。
