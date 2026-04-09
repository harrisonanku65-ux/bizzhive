# BizzHive - Multi-Vendor Marketplace for Ghana

## Overview

BizzHive is a multi-vendor marketplace for Ghana where creators can sell online courses, digital products, and offer freelance services. Built as a pnpm workspace monorepo using TypeScript.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Frontend**: React + Vite + Tailwind CSS v4
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **UI Components**: shadcn/ui (Radix + Tailwind)
- **Router**: wouter
- **State**: TanStack React Query

## Architecture

### Frontend (artifacts/bizzhive)
- React + Vite web app at root path `/`
- Pages: Home, Courses, Course Detail, Products, Product Detail, Vendors, Vendor Detail, Cart, Orders, Dashboard
- Uses generated React Query hooks from `@workspace/api-client-react`
- Design: Ghana-inspired warm palette (orange primary, green secondary, golden accent)
- Fonts: Plus Jakarta Sans (body), Space Grotesk (headings)

### Backend (artifacts/api-server)
- Express 5 API server at `/api` path
- Routes: categories, vendors, courses, lessons, products, reviews, cart, orders, dashboard
- Session-based cart using cookies
- Structured logging with pino

### Database Schema (lib/db)
- **categories**: name, slug, description, icon
- **vendors**: name, slug, bio, avatar, location, rating, totalSales, featured
- **courses**: title, slug, description, thumbnail, price, currency, level, duration, featured, published, vendorId, categoryId
- **lessons**: title, description, duration, sortOrder, isFree, courseId
- **products**: title, slug, description, thumbnail, price, currency, productType, fileUrl, featured, published, vendorId, categoryId
- **reviews**: rating, comment, userName, courseId
- **cart_items**: sessionId, itemType, itemId
- **orders**: sessionId, items (jsonb), total, currency, status

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/bizzhive run dev` — run frontend dev server

## Currency

All prices are in GHS (Ghana Cedis). The currency symbol is GHS or ₵.

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
