# deps: instala node_modules por separado para aprovechar la cache de Docker —
# solo se reinstala si cambia package.json/pnpm-lock.yaml, no en cada cambio de código.
# corepack (incluido en la imagen node:20-slim) lee el campo "packageManager" de
# package.json y activa la versión exacta de pnpm que se usó para generar el lockfile.
FROM node:20-slim AS deps

WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml* ./
RUN pnpm install --frozen-lockfile

# builder: usa "output: standalone" (next.config.ts) para que next build genere un
# server.js mínimo con solo los node_modules que la app realmente usa.
FROM node:20-slim AS builder

WORKDIR /app
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* se inlinea en el bundle de cliente durante el build, no se puede
# cambiar después en runtime — por eso son ARG (build-time), no ENV en el runner.
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_BASE_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_BASE_URL=$NEXT_PUBLIC_BASE_URL \
    NEXT_TELEMETRY_DISABLED=1

RUN pnpm run build

# runner: imagen final mínima — solo el server.js standalone + los estáticos que
# ese server no copia automáticamente (public/, .next/static).
FROM node:20-slim AS runner

WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000 \
    HOSTNAME=0.0.0.0

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/admin/login', res => process.exit(res.statusCode < 500 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "server.js"]
