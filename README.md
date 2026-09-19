# Monorepo

Turborepo + pnpm workspaces.

## Structure

- `apps/client` — Next.js (App Router, TypeScript, Tailwind)
- `apps/backend` — ASP.NET Core API (Backend.slnx)
- `packages/ui` — paylaşılan React component'leri (`@repo/ui`)

## Komutlar

```bash
pnpm install        # tüm workspace bağımlılıkları
pnpm dev            # turbo ile tüm apps'i dev modda çalıştır
pnpm build          # turbo ile build

# backend
cd apps/backend
dotnet build Backend.slnx
dotnet test Backend.slnx
```
