// Serves the static site from assets, plus the judges' scorecard at /scorecard.
// Only the paths listed in wrangler.jsonc "run_worker_first" reach this code.
import scorecard from './FastForge_Scorecard/dist/server/index.js';

// Final schema from FastForge_Scorecard/drizzle/*.sql, so a fresh D1 database needs no migration step.
const SCHEMA = [
  "CREATE TABLE IF NOT EXISTS ballots (judge_id text NOT NULL, team integer NOT NULL, judge_name text NOT NULL, ratings text NOT NULL, total integer NOT NULL, updated_at text NOT NULL, scoring_version integer DEFAULT 1 NOT NULL, went_well text DEFAULT '' NOT NULL, could_improve text DEFAULT '' NOT NULL, round_id text DEFAULT 'initial' NOT NULL, PRIMARY KEY(judge_id, team))",
  "CREATE TABLE IF NOT EXISTS judge_reviews (judge_id text NOT NULL, round_id text NOT NULL, score_snapshot text NOT NULL, confirmed_at text NOT NULL, PRIMARY KEY(judge_id, round_id))",
];
let schemaReady;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/scorecard/') return Response.redirect(url.origin + '/scorecard', 301);
    if (url.pathname !== '/scorecard' && !url.pathname.startsWith('/api/') && url.pathname !== '/favicon.svg') return env.ASSETS.fetch(request);

    if (env.DB) {
      schemaReady ??= env.DB.batch(SCHEMA.map(sql => env.DB.prepare(sql))).catch(error => { schemaReady = undefined; throw error; });
      try { await schemaReady; } catch (error) { console.error('Scorecard schema setup failed', error); }
    }

    // The scorecard app serves its page at "/"; map /scorecard onto it.
    if (url.pathname === '/scorecard') url.pathname = '/';
    const response = await scorecard.fetch(new Request(url, request), env);
    const headers = new Headers(response.headers);
    headers.set('X-Robots-Tag', 'noindex, nofollow');
    return new Response(response.body, { status: response.status, headers });
  },
};
