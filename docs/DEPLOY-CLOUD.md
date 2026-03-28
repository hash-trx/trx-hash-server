# 云端全量部署 / 重新同步（Docker）

仓库：`https://github.com/hash-trx/trx-hash-server`

## 1. 服务器上拉代码

```bash
# 若目录不存在：克隆
cd /opt
git clone https://github.com/hash-trx/trx-hash-server.git
cd trx-hash-server

# 若已有 /opt/nestjs-server 等旧目录：进入后改远程再拉
cd /opt/nestjs-server
git remote set-url origin https://github.com/hash-trx/trx-hash-server.git
git fetch origin
git reset --hard origin/main
```

## 2. 配置 `.env`（与 `docker-compose.yml` 同级目录）

```bash
cd /opt/trx-hash-server   # 或你的 nestjs-server 路径
cp .env.example .env
nano .env
```

至少填写：

- `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB`（三者与 compose 一致；**密码改成长随机**）
- `JWT_SECRET`、`PNL_SYNC_SECRET`（生产请用长随机串）
- `SUB_ADDRESS`（激活收款 TRON 地址，若用该功能）
- `TRONGRID_API_KEYS`（代广播功能，逗号分隔多个 Key）
- `ADMIN_BOOTSTRAP_SECRET`（**首次**创建后台管理员时用，见 `docs/API-ADMIN.md`；创建后可删或留空）

**不要**在 Docker 部署里再手写一条与容器内冲突的 `DATABASE_URL`；compose 已用 `POSTGRES_*` 自动生成指向服务名 `postgres` 的连接串。

## 3. 清空旧卷并重建（全新数据库；有重要数据勿执行 `-v`）

```bash
docker compose down -v
docker compose build --no-cache nestjs-server
docker compose up -d
```

## 4. 验证

```bash
docker compose ps
curl -s http://127.0.0.1:3003/version
# 期望 JSON 含 "version":"0.2.0"（以 package.json 为准）

docker compose logs nestjs-server --tail 40
```

若 Nest 一直 `Restarting`，多为数据库密码与卷不一致；已用 `down -v` 后需保证 `.env` 里 `POSTGRES_PASSWORD` 与上面一致且未再改乱。

## 5. 以后只更新代码

```bash
git pull origin main
docker compose build --no-cache nestjs-server
docker compose up -d
npx prisma migrate deploy   # 若 CMD 未包含迁移且需手动执行时
```

（镜像内 `CMD` 已含 `prisma migrate deploy`，一般无需在宿主机再跑。）
