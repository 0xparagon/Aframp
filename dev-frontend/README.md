# 🛠️ dev-frontend — Contributor Sandbox

This directory is the **safe workspace** for contributors on the `dev-frontend` branch.

## Rules

| ✅ Allowed | ❌ Forbidden |
|-----------|-------------|
| Create files inside `dev-frontend/` | Modify anything in `app/` |
| Open PRs targeting `dev-frontend` branch | Modify anything in `components/` |
| Add new components, pages, hooks here | Modify anything in `lib/` |
| Write tests inside `dev-frontend/` | Modify `next.config.mjs` |
| Add docs here | Modify `styles/`, `public/`, `types/`, `hooks/` |

## Why?

The main frontend (`app/`, `components/`, `lib/`, etc.) is the production codebase.
Contributors using this branch experiment and build new features in isolation here
before they are reviewed, tested, and merged into `main`.

The CI workflow `.github/workflows/dev-frontend-guard.yml` **automatically fails**
any push or PR on this branch that touches a protected main-frontend path.

## Getting Started

1. Clone the repo and check out `dev-frontend`:
   ```bash
   git checkout dev-frontend
   ```

2. Create your feature directory under `dev-frontend/`:
   ```bash
   mkdir dev-frontend/my-feature
   cd dev-frontend/my-feature
   ```

3. Build your feature. Reference the main frontend code **read-only** for patterns.

4. Open a PR against `dev-frontend`. The guard CI will verify you haven't
   accidentally edited any production files.

5. Once reviewed and approved, a maintainer will cherry-pick or merge your
   changes into `main` with full test coverage.

## Docker Development

Run these commands from the repository root. The development Compose service
bind-mounts the whole repository (`.:/app`), so this directory is available at
`/app/dev-frontend` in the container. Changes under the mount are visible to
Next.js for hot reload, and the same workspace is available to TypeScript.

1. Create the environment file required by Compose and set `NEXT_API_URL` to a
   backend reachable from the container:

   ```bash
   cp .env.example .env.local
   ```

2. Build and start the development service:

   ```bash
   docker compose -f docker-compose.dev.yml up --build aframp-dev
   ```

3. Open the frontend at [http://localhost:3001](http://localhost:3001). To run
   the TypeScript check inside the container, use:

   ```bash
   docker compose -f docker-compose.dev.yml exec aframp-dev npm run type-check
   ```

4. Follow logs in another terminal or stop the service:

   ```bash
   docker compose -f docker-compose.dev.yml logs -f aframp-dev
   docker compose -f docker-compose.dev.yml down
   ```

## Questions?

Open an issue on GitHub or ping a maintainer in the PR.
