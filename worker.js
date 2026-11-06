// Serves the static site from assets, plus two unlinked pages: the judges' scorecard at /scorecard
// and the audience fan favorite poll at /fan-favorite.
// Only the paths listed in wrangler.jsonc "run_worker_first" reach this code.
import scorecard from './FastForge_Scorecard/dist/server/index.js';
import fanFavorite from './FastForge_Fan_Favorite/dist/server/index.js';

// Final schema from FastForge_Scorecard/drizzle/*.sql and FastForge_Fan_Favorite/drizzle/*.sql,
// so a fresh D1 database needs no migration step.
const SCHEMA = [
  "CREATE TABLE IF NOT EXISTS ballots (judge_id text NOT NULL, team integer NOT NULL, judge_name text NOT NULL, ratings text NOT NULL, total integer NOT NULL, updated_at text NOT NULL, scoring_version integer DEFAULT 1 NOT NULL, went_well text DEFAULT '' NOT NULL, could_improve text DEFAULT '' NOT NULL, round_id text DEFAULT 'initial' NOT NULL, PRIMARY KEY(judge_id, team))",
  "CREATE TABLE IF NOT EXISTS judge_reviews (judge_id text NOT NULL, round_id text NOT NULL, score_snapshot text NOT NULL, confirmed_at text NOT NULL, PRIMARY KEY(judge_id, round_id))",
  "CREATE TABLE IF NOT EXISTS fan_votes (voter_id text PRIMARY KEY NOT NULL, team integer NOT NULL, updated_at text NOT NULL)",
  "CREATE TABLE IF NOT EXISTS fan_team_names (team integer PRIMARY KEY NOT NULL, name text NOT NULL, updated_at text NOT NULL)",
];
let schemaReady;

// Each app serves its page at "/"; these map the public paths onto it.
const PAGES = { '/scorecard': scorecard, '/fan-favorite': fanFavorite };
const FAN_FAVORITE_API = ['/api/poll', '/api/vote', '/api/fan-admin'];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.endsWith('/') && PAGES[url.pathname.slice(0, -1)]) return Response.redirect(url.origin + url.pathname.slice(0, -1), 301);

    let app = PAGES[url.pathname];
    if (app) url.pathname = '/';
    else if (FAN_FAVORITE_API.includes(url.pathname)) app = fanFavorite;
    else if (url.pathname.startsWith('/api/') || url.pathname === '/favicon.svg') app = scorecard;
    else return env.ASSETS.fetch(request);

    if (env.DB) {
      schemaReady ??= env.DB.batch(SCHEMA.map(sql => env.DB.prepare(sql))).catch(error => { schemaReady = undefined; throw error; });
      try { await schemaReady; } catch (error) { console.error('Schema setup failed', error); }
    }

    const response = await app.fetch(new Request(url, request), env);
    const headers = new Headers(response.headers);
    headers.set('X-Robots-Tag', 'noindex, nofollow');
    return new Response(response.body, { status: response.status, headers });
  },
};
