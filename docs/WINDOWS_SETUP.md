# Windows / Visual Studio Code Setup

This guide gets the project running on Windows with VS Code.

## Prerequisites

- [Node.js](https://nodejs.org/) 22 or later (LTS recommended)
- [pnpm](https://pnpm.io/installation) 9 or later
- [Git](https://git-scm.com/download/win)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (for PostgreSQL)
- [Visual Studio Code](https://code.visualstudio.com/)

## 1. Clone and open the project

```powershell
git clone https://github.com/harrisonanku65-ux/bizzhive.git
```

Then open the cloned folder in VS Code (`File > Open Folder...`) — open the folder itself, not a parent directory, so VS Code picks up `.vscode/launch.json` automatically.

## 2. Set up environment variables

Copy the example file to a real `.env` file in the project root:

```powershell
copy env.example .env
```

The default values match the local Docker database. If you changed the Docker credentials in `docker-compose.yml`, update `DATABASE_URL` in `.env`.

## 3. Start the database

```powershell
docker compose up -d
```

This creates a local PostgreSQL database named `bizzhive`.

## 4. Install dependencies

```powershell
pnpm install
```

## 5. Push the database schema

```powershell
pnpm run db:push
```

This reads the `.env` file and pushes the Drizzle schema to Postgres.

## 6. Run the app

Press `F5` in VS Code and select the **Run BizzHive** compound launch configuration. It starts both the API server and the web frontend in separate integrated terminals.

After a few seconds the app is available at:

- Web app: http://localhost:5173
- API server: http://localhost:3000/api

## Running from the terminal instead

If you prefer the terminal, run these in separate PowerShell windows from the project root:

```powershell
# Window 1 — API server (PORT defaults to 3000)
$env:DATABASE_URL="postgresql://postgres:postgres@localhost:5432/bizzhive"
$env:SESSION_SECRET="change-this-in-production"
pnpm --filter @workspace/api-server run dev
```

```powershell
# Window 2 — web frontend (PORT defaults to 5173)
pnpm --filter @workspace/bizzhive run dev
```

## Notes

- The API server falls back to `PORT=3000` in development when no `PORT` is set.
- The web frontend falls back to `PORT=5173` and `BASE_PATH=/` when not running inside Replit.
- The frontend proxies `/api` requests to the API server automatically in local development.
