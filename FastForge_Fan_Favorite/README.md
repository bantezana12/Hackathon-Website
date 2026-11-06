# FastForge Fan Favorite

The audience poll, served by the site Worker at /fan-favorite. Nothing on the main site links to it; share the URL directly.

This is a lightweight port of FastForge_Fan_Favorite_Developer_Package (a Next.js app) to the same setup as FastForge_Scorecard, so both run inside the site's single Worker and share its D1 database. Votes live in the fan_votes table, which worker.js at the repo root creates automatically.

## Files

- teams.json: the team IDs and default names. Keep the IDs unchanged so votes stay attached to the right team.
- public/index.html: complete HTML, CSS, and browser JavaScript.
- worker/index.js: the page at "/" plus /api/poll (the ballot, with no vote counts), /api/vote (cast or change a vote) and /api/fan-admin (organizer settings and results).
- dist/server/index.js: built Worker with the default team names and HTML embedded. Commit this; Cloudflare deploys it as-is.
- drizzle/: the fan_votes and fan_team_names table schemas.

## Organizer settings

On the poll page, press Cmd+Shift+U (Mac) or Ctrl+Shift+U (Windows) to open the settings popup, where you can see the results, name the teams and reset all votes. The audience never sees vote counts. Names and resets apply to everyone viewing the poll. Clearing a name returns that team to its default from teams.json.

Saving requires a passcode, stored as a Cloudflare secret so it stays out of the repo. Settings stay locked until it is set. From the repo root:

    npx wrangler secret put FAN_ADMIN_PASSCODE

## Change default team names or the page

Edit teams.json or public/index.html, then from this folder run:

    node scripts/build.mjs
    node scripts/check.mjs

Commit the rebuilt dist/server/index.js and push.
