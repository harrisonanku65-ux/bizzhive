@echo off
pnpm install --frozen-lockfile
pnpm --filter @workspace/db push
