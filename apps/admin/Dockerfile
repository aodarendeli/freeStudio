# Bu Dockerfile monorepo KÖKÜNDEN build edilmeli:
#   docker build -f apps/admin/Dockerfile -t freestudio-admin .

FROM node:22-alpine AS base
RUN npm install -g pnpm@10.32.1 turbo@2.11.2

FROM base AS pruner
WORKDIR /app
COPY . .
RUN turbo prune @repo/admin --docker

FROM base AS installer
WORKDIR /app

COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=pruner /app/out/pnpm-workspace.yaml ./pnpm-workspace.yaml
RUN pnpm install --frozen-lockfile

COPY --from=pruner /app/out/full/ .

# NEXT_PUBLIC_* değişkenleri tarayıcı bundle'ına build-time'da gömülür,
# bu yüzden runtime env değil, build arg olarak geliyor.
ARG NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL

RUN pnpm turbo run build --filter=@repo/admin

FROM base AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=installer --chown=nextjs:nodejs /app/apps/admin/.next/standalone ./
COPY --from=installer --chown=nextjs:nodejs /app/apps/admin/.next/static ./apps/admin/.next/static
COPY --from=installer --chown=nextjs:nodejs /app/apps/admin/public ./apps/admin/public

USER nextjs

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
EXPOSE 3000

CMD ["node", "apps/admin/server.js"]
