# Stage 1: Install dependencies
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json yarn.lock ./
# 如果有 prisma schema 記得這步也要 copy
RUN yarn install --frozen-lockfile

# Stage 2: Build the app
FROM node:24-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 這裡會產生 .next/standalone 資料夾
RUN yarn build

# Stage 3: Production Runner
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV production

# 建立 non-root user 提升安全性
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 只複製 standalone 必要檔案
COPY --from=builder /app/public ./public
# Set the correct permission for prerender cache
mkdir .next
chown nextjs:nodejs .next

# 自動追蹤出來的最小化 server
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
# server.js 是 standalone 模式的進入點
CMD ["node", "server.js"]
