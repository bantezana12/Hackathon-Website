# FastForge Scorecard source

This is the source for the published FastForge Scorecard, including the final ranking review, judge confirmation, 0-3 rubric, bonus budget, and shared leaderboard.

## Files

- public/index.html: complete HTML, CSS, and browser JavaScript (also provided separately as FastForge_Scorecard.html).
- worker/index.js: server routes for judge sessions, saved scores, shared totals, and final confirmation.
- dist/server/index.js: built Worker with the HTML and favicon embedded.
- db/schema.ts and drizzle/: database schema and ordered migrations.
- scripts/build.mjs: creates the deployable Worker.
- scripts/check.mjs: functional checks against a temporary in-memory database.

## Build and check

With Node.js 24 installed, run:

    npm ci
    npm run build
    node scripts/check.mjs

The checks deliberately exercise an unavailable database and may print a corresponding error before the final success message.

## Hosting

The application runs as a Cloudflare Worker with a Cloudflare D1 binding named DB. Apply the SQL migrations in drizzle/ in filename order to a new database, and deploy dist/server/index.js with that binding. The deployment manifest supplied here retains the DB binding and omits the original hosted Site identity. Configure a new hosting project for your own copy.

The HTML file includes the complete interface, styling, and browser behavior. Shared judging is server-backed: opening the HTML on its own cannot save scores or load the leaderboard. Serve the HTML and /api routes from the same origin for the complete experience.

This export contains source code only. It includes no saved judge submissions, database exports, credentials, or repository history. It represents source commit 7a3beb4520dd58ed2287e06909eca9b3e3ff1950.
