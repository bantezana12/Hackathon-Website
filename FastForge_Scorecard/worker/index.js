const CURRENT_ROUND='2026-10-21-reset-1';
function json(data,status=200,extra={}){return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store',...extra}})}
function database(env){if(!env.DB)throw new Error('Score database unavailable');return env.DB}
function scoreSnapshot(ballots){return JSON.stringify([...ballots].sort((a,b)=>a.team-b.team).map(x=>({team:x.team,ratings:typeof x.ratings==='string'?JSON.parse(x.ratings):x.ratings})))}
function cookieJudge(request){const value=request.headers.get('cookie')?.match(/(?:^|;\s*)ff_judge=([a-f0-9-]{36})(?:;|$)/)?.[1];return value||null}
export default {async fetch(request,env){
  const url=new URL(request.url),path=url.pathname;
  if(path==='/favicon.svg')return new Response(FAVICON,{headers:{'Content-Type':'image/svg+xml'}});
  if(path==='/'&&request.method==='GET')return new Response(HTML,{headers:{'Content-Type':'text/html;charset=utf-8','Cache-Control':'no-cache'}});
  try{
    if(path==='/api/session'&&request.method==='GET'){
      const existing=cookieJudge(request),id=existing||crypto.randomUUID();
      const mine=await database(env).prepare('SELECT team, judge_name, ratings, total FROM ballots WHERE judge_id = ? AND scoring_version = 2 AND round_id = ?').bind(id,CURRENT_ROUND).all();
      const legacy=await database(env).prepare('SELECT COUNT(*) AS count, MAX(judge_name) AS name FROM ballots WHERE judge_id = ? AND scoring_version = 1 AND round_id = ?').bind(id,CURRENT_ROUND).first();
      const review=await database(env).prepare('SELECT score_snapshot FROM judge_reviews WHERE judge_id = ? AND round_id = ?').bind(id,CURRENT_ROUND).first();
      return json({confirmed:mine.results.length===5&&review?.score_snapshot===scoreSnapshot(mine.results),ballots:mine.results,legacyCount:legacy.count,legacyName:legacy.name},200,existing?{}:{'Set-Cookie':`ff_judge=${id}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=31536000`});
    }
    if(path==='/api/summary'&&request.method==='GET'){
      const result=await database(env).prepare('SELECT team, COUNT(*) AS judges, SUM(total) AS total, ROUND(AVG(total), 1) AS average FROM ballots WHERE scoring_version = 2 AND round_id = ? GROUP BY team ORDER BY team').bind(CURRENT_ROUND).all();
      const count=await database(env).prepare('SELECT COUNT(DISTINCT judge_id) AS judges FROM ballots WHERE scoring_version = 2 AND round_id = ?').bind(CURRENT_ROUND).first();
      const ballots=await database(env).prepare('SELECT team, judge_name, ratings, total FROM ballots WHERE scoring_version = 2 AND round_id = ? ORDER BY judge_name COLLATE NOCASE, updated_at').bind(CURRENT_ROUND).all();
      const legacy=await database(env).prepare('SELECT COUNT(*) AS count FROM ballots WHERE scoring_version = 1 AND round_id = ?').bind(CURRENT_ROUND).first();
      return json({legacyCount:legacy.count,teams:Array.from({length:5},(_,i)=>({...result.results.find(x=>x.team===i+1)||{team:i+1,judges:0,total:0,average:0},scores:ballots.results.filter(x=>x.team===i+1).map(x=>({name:x.judge_name,total:x.total,ratings:JSON.parse(x.ratings)}))})),judges:count.judges});
    }
    if(path==='/api/finalize'&&request.method==='POST'){
      if(request.headers.get('origin')!==url.origin)return json({error:'Please confirm from this scorecard.'},403);
      const id=cookieJudge(request);if(!id)return json({error:'Reload the page to reconnect your judge session.'},401);
      if(Number(request.headers.get('content-length')||0)>16384)return json({error:'Confirmation too large.'},413);
      let body;try{body=await request.json()}catch{return json({error:'Invalid confirmation.'},400)}
      if(body?.roundId!==CURRENT_ROUND)return json({error:'The scorecard has been reset. Reload the page.'},409);
      const ballots=await database(env).prepare('SELECT team, ratings FROM ballots WHERE judge_id = ? AND round_id = ? AND scoring_version = 2 ORDER BY team').bind(id,CURRENT_ROUND).all();
      if(ballots.results.length!==5)return json({error:'Save a scorecard for all five teams before confirming.'},400);
      const expected=scoreSnapshot(ballots.results);
      if(!Array.isArray(body.ballots)||body.ballots.length!==5||body.ballots.some(x=>!x||!Number.isInteger(x.team)||!Array.isArray(x.ratings))||scoreSnapshot(body.ballots)!==expected)return json({error:'Your saved scores have changed. Reload to review the latest scores before confirming.'},409);
      await database(env).prepare('INSERT INTO judge_reviews (judge_id, round_id, score_snapshot, confirmed_at) VALUES (?, ?, ?, ?) ON CONFLICT(judge_id, round_id) DO UPDATE SET score_snapshot = excluded.score_snapshot, confirmed_at = excluded.confirmed_at').bind(id,CURRENT_ROUND,expected,new Date().toISOString()).run();
      return json({confirmed:true});
    }
    if(path==='/api/submit'&&request.method==='POST'){
      if(request.headers.get('origin')!==url.origin)return json({error:'Please submit from this scorecard.'},403);
      const id=cookieJudge(request);if(!id)return json({error:'Reload the page to reconnect your judge session.'},401);
      if(Number(request.headers.get('content-length')||0)>16384)return json({error:'Submission too large.'},413);
      let body;try{body=await request.json()}catch{return json({error:'Invalid scorecard.'},400)}
      if(body.roundId!==CURRENT_ROUND)return json({error:'The scorecard has been reset. Reload the page to start a new scorecard.'},409);
      if(body.scoringVersion!==2)return json({error:'The rubric now uses 0–3. Reload this page and score again.'},409);
      const {team,ratings}=body,name=typeof body.name==='string'?body.name.trim():'';
      if(!Number.isInteger(team)||team<1||team>5||!Array.isArray(ratings)||ratings.length!==10||ratings.some(x=>!Number.isInteger(x)||x<0||x>3)||!name||name.length>80)return json({error:'Enter your name and fill all ten scores from 0–3.'},400);
      const total=ratings.reduce((a,b)=>a+b,0);
      const saved=await database(env).prepare("INSERT INTO ballots (judge_id, team, judge_name, ratings, total, updated_at, scoring_version, round_id) SELECT ?, ?, ?, ?, ?, ?, 2, ? WHERE COALESCE((SELECT SUM(CAST(json_extract(ratings, '$[9]') AS INTEGER)) FROM ballots WHERE judge_id = ? AND team <> ? AND scoring_version = 2 AND round_id = ?), 0) + ? <= 3 ON CONFLICT(judge_id, team) DO UPDATE SET judge_name = excluded.judge_name, ratings = excluded.ratings, total = excluded.total, updated_at = excluded.updated_at, scoring_version = excluded.scoring_version, round_id = excluded.round_id").bind(id,team,name,JSON.stringify(ratings),total,new Date().toISOString(),CURRENT_ROUND,id,team,CURRENT_ROUND,ratings[9]).run();
      if(Number(saved.meta?.changes??saved.changes)!==1)return json({error:'You have only 3 bonus points across all teams. Reduce this bonus or update another team’s submitted bonus first.'},409);
      return json({team,total,ratings,name});
    }
    return json({error:'Not found.'},404);
  }catch(error){console.error('Scorecard request failed',path,error);return json({error:'Scores are temporarily unavailable. Your selections are still here; please try again.'},503)}
}};
