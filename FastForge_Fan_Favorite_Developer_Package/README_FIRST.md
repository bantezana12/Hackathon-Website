# FastForge Fan Favorite: developer handoff

## What this is

The complete three-team fan favorite poll, in FastForge's yellow, cyan, cream and dark-outline style. A guest picks Team 1, 2 or 3, then sees a shared leaderboard with vote counts, percentages and rankings. Results refresh every three seconds while the results page is visible.

The package includes the current source, a ready-built deployment, the database schema, migrations, functional checks, and a deployment configuration helper. It includes the fix for voting when a session cookie is unavailable.

**This is a working web application with a backend and database. Pasting the page into an HTML block alone will not provide shared voting.** The deployment instructions below use Cloudflare Workers and D1, which match this application's runtime. Link to the deployed poll from your main website, or connect it to a voting subdomain.

No existing votes, login credentials, private keys, repository history, or original hosting account identifiers are included. A new deployment starts with an empty vote tally. Exporting this package has not changed the existing live poll.

## Change the team names

Edit **`lib/teams.ts`**:

```ts
export const TEAMS = [
  { id: 1, name: 'Team 1' },
  { id: 2, name: 'Team 2' },
  { id: 3, name: 'Team 3' },
];
```

Replace the names with the actual team names. Keep IDs 1, 2 and 3 unchanged so votes remain attached to the correct teams. Names are controlled in the source; guests cannot rename teams. Rebuild and redeploy after an edit. There is no admin editing screen in this version.

## Important files

| File or folder | Purpose |
| --- | --- |
| `app/page.tsx` | Voting screen and live leaderboard |
| `app/globals.css` | FastForge styling and responsive layout |
| `lib/teams.ts` | The three editable team names |
| `lib/poll.ts` | Vote validation, database writes, counts and ranking |
| `app/api/poll/route.ts` | Read results and restore the browser's vote |
| `app/api/vote/route.ts` | Cast or change a vote |
| `db/schema.ts` and `drizzle/` | Database structure and migrations |
| `worker/index.ts`, `vite.config.ts`, `scripts/` | Runtime and build tooling |
| `dist/` | Ready-built application from the current source |
| `scripts/check-poll.mjs` | Functional checks using a temporary in-memory database |
| `scripts/configure-production.mjs` | Create deployment settings for a new Cloudflare account |

## Requirements

- Node.js 24 or later. Node 24 is the tested runtime for the included checks.
- pnpm; use the version specified in `package.json`.
- A Cloudflare account with Workers and D1 for production hosting.

Run commands from this package's root folder. These are instructions for the recipient to run on their own account; no account access is included in the ZIP.

## Fast deployment using the included build

The included `dist/` directory is already built. If no code has been changed, it can be used directly after installing the dependencies required by the deployment tools:

```sh
pnpm install --frozen-lockfile
pnpm exec wrangler login
pnpm exec wrangler d1 create fastforge-fan-favorite
```

Copy the real `database_id` printed by the last command. Replace `YOUR_DATABASE_ID` below with that value:

```sh
node scripts/configure-production.mjs YOUR_DATABASE_ID
pnpm exec wrangler d1 migrations apply DB --remote --config dist/server/wrangler.production.json
pnpm exec wrangler deploy --config dist/server/wrangler.production.json
```

The migration creates the `fan_votes` table in the new database. The final command deploys the Worker and prints the site's URL. Set a custom domain or voting subdomain in your Cloudflare account if desired.

If the database or Worker needs a different name, the helper supports:

```sh
node scripts/configure-production.mjs YOUR_DATABASE_ID YOUR_DATABASE_NAME YOUR_WORKER_NAME
```

Keep using the SAME database ID for later updates to preserve the vote tally. Do not create a new database for every deployment.

## Rebuild after changing code or names

```sh
pnpm install --frozen-lockfile
pnpm run build
node scripts/check-poll.mjs
node scripts/configure-production.mjs YOUR_DATABASE_ID
pnpm exec wrangler d1 migrations apply DB --remote --config dist/server/wrangler.production.json
pnpm exec wrangler deploy --config dist/server/wrangler.production.json
```

Re-run the configuration helper after each build, because the build regenerates `dist/server/wrangler.json`. Never deploy with the all-zero placeholder database ID in that generated file.

The test script intentionally checks unavailable-database responses; its final `Passed` line reports success. The in-memory test votes do not affect the hosted poll.

## Local development

After installing dependencies, build once and initialize the local development database:

```sh
pnpm run build
pnpm exec wrangler d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_minor_misty_knight.sql
pnpm run dev
```

Open the URL printed by the dev server. Local development votes and hosted votes are separate. New copies default to the portable execution profile, so the original build workspace is not required.

## Behavior and integration notes

- The server stores a browser voting ID and team choice in D1. A repeat vote from the same ID replaces its previous choice rather than increasing the total.
- A browser-stored ID is used when the voting cookie is unavailable. Cookies remain supported for existing visitors.
- This is one vote per browser identity, not verified one-person-one-vote. Clearing browser storage, changing browsers or using another device can create another identity.
- Only the active three teams appear in counts and rankings. Entries for inactive team IDs are excluded from displayed totals.
- Tied teams share a rank. Zero-vote teams show a dash until they receive a vote.
- The browser and API routes must be served from the same origin. The POST endpoint checks the request Origin.
- This version has no voting closing time, reset button, or administrator control panel.
- For an existing website on another stack, the developer can port the interface and API logic, but must keep shared server storage for live totals. Browser-only storage is not a replacement for that database.

## Source reference

Exported on November 2, 2026 from source commit `a1a8693d10aa4b29627898e62352e043eeb0bf34`. The deployment helper and this handoff guide were added only to the export; the live website was not modified.
