# FastForge Fan Favorite

The audience poll, served by the site Worker at /fan-favorite. Nothing on the main site links to it; share the URL directly.

This is a lightweight port of FastForge_Fan_Favorite_Developer_Package (a Next.js app) to the same setup as FastForge_Scorecard, so both run inside the site's single Worker and share its D1 database. Votes live in the fan_votes table, which worker.js at the repo root creates automatically.

## Files

- teams.json: the team names. Keep the IDs unchanged so votes stay attached to the right team.
- public/index.html: complete HTML, CSS, and browser JavaScript.
- worker/index.js: the page at "/" plus /api/poll (results) and /api/vote (cast or change a vote).
- dist/server/index.js: built Worker with the team names and HTML embedded. Commit this; Cloudflare deploys it as-is.
- drizzle/: the fan_votes table schema.

## Change team names or the page

Edit teams.json or public/index.html, then from this folder run:

    node scripts/build.mjs
    node scripts/check.mjs

Commit the rebuilt dist/server/index.js and push.
