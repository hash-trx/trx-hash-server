# bookworm（非 slim）自带完整 OpenSSL/libssl，Prisma 5 在 slim 上常检测失败并报 Schema engine error
FROM node:20-bookworm

WORKDIR /app

# 先拷贝依赖清单，利用层缓存
COPY package.json package-lock.json* ./
RUN npm install

# 拷贝源码并构建
COPY . .
RUN npm run prisma:generate && npm run build

ENV NODE_ENV=production
EXPOSE 3003

# 启动时先应用迁移，再启动服务
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
