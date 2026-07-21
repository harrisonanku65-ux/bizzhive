---
name: Environment file handling
description: Why `.env` files can't be committed and how to provide local development templates.
---

**Rule:** Replit tooling blocks writing any `.env*` file, including `.env.development`. It treats them as places where secrets/credentials would be stored.

**How to apply:** Keep environment templates as a non-dot file, e.g. `env.example`. Provide a Node loader script (like `scripts/db-push.js`) that reads the user's `.env` and sets `process.env` before invoking a command. For VS Code, use the `envFile` property in `launch.json` to load the user's `.env` at runtime.

**Why:** This lets developers copy the example once locally without leaking secrets into the repository.
