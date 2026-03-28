# 管理后台 HTTP API

- **Base URL**：与 Nest 服务一致，例如 `http://127.0.0.1:3003`
- **鉴权**：除 `POST /admin/login`、`POST /admin/bootstrap` 外，均需请求头  
  `Authorization: Bearer <管理员 JWT>`  
  JWT 由登录接口返回，载荷含 `typ: "admin"`（与前台用户 JWT 相同 `JWT_SECRET` 签发）。

## 首次创建管理员

`POST /admin/bootstrap`

```json
{
  "email": "admin@example.com",
  "password": "至少8位",
  "secret": "与服务器环境变量 ADMIN_BOOTSTRAP_SECRET 一致"
}
```

仅当数据库中**尚无任何管理员**时成功。成功后请妥善保管 `ADMIN_BOOTSTRAP_SECRET`，或从 `.env` 中移除。

## 登录

`POST /admin/login`

```json
{ "email": "admin@example.com", "password": "..." }
```

响应：`{ "ok": true, "token": "...", "admin": { "id", "email" } }`

---

## 用户

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/admin/users?page=1&pageSize=20&q=邮箱片段` | 列表 |
| GET | `/admin/users/:id` | 详情 |
| PATCH | `/admin/users/:id` | 更新：`email`、`subExpire`（ISO 或 null）、`pnlTotal`、`betCountTotal`、`betAmountTotal` |
| POST | `/admin/users/:id/reset-password` | `{ "newPassword": "..." }` |

---

## 策略（StrategyMarket）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/admin/strategies` | 列表 |
| POST | `/admin/strategies` | 新建：`id`（整数）、`name`、`price`、`scriptUrl`、`isHot` |
| PATCH | `/admin/strategies/:id` | 部分更新 |
| DELETE | `/admin/strategies/:id` | 删除（会先删关联购买与使用记录） |

---

## 市场庄家（MarketBanker）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/admin/market-bankers` | 列表 |
| POST | `/admin/market-bankers` | `name`、`address`、`odds`，可选 `rebate`、`sortOrder`、`note`、`description` |
| PATCH | `/admin/market-bankers/:id` | 部分更新 |
| DELETE | `/admin/market-bankers/:id` | 删除 |

---

## 管理员账号

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/admin/admins` | 列表（不含密码） |
| POST | `/admin/admins` | `{ "email", "password" }` |
| PATCH | `/admin/admins/:id` | `{ "email"?, "password"? }` |
| DELETE | `/admin/admins/:id` | 不能删当前登录账号；至少保留一名管理员 |

---

## 盈亏同步（客户端）

`POST /sync/pnl-summary` 现支持在 body 中增加 **`totalBetAmount`**（当日投注金额合计），HMAC 为五段：  
`userId|date|totalPnL|betCount|totalBetAmount`。  
若使用本仓库 **Electron 客户端**，请同步更新 `apps/electron-client/src/main/pnl-sync.service.ts`（已改为五段校验）。

旧版仅四段 payload 的校验**仍兼容**（不传 `totalBetAmount` 时服务端按 0 累计投注额）。
