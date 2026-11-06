// Fan Favorite poll: the page at "/", the ballot at /api/poll, voting at /api/vote and organizer settings and results at /api/fan-admin.
// Vote counts stay private: only /api/fan-admin, behind the passcode, returns them.
// TEAMS and HTML are prepended by scripts/build.mjs.
const COOKIE='ff_fan',MAX_NAME=40;
function json(data,status=200,extra={}){return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store',...extra}})}
function validToken(value){return typeof value==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(value)}
function voterId(request){
  const cookie=request.headers.get('cookie')?.match(/(?:^|;\s*)ff_fan=([a-f0-9-]{36})(?:;|$)/)?.[1];
  if(validToken(cookie))return cookie;
  const header=request.headers.get('X-Fan-Voter');return validToken(header)?header:null;
}
async function results(db,id){
  const counts=await db.prepare('SELECT team, COUNT(*) AS votes FROM fan_votes GROUP BY team').all();
  const own=await db.prepare('SELECT team FROM fan_votes WHERE voter_id = ?').bind(id).first();
  const names=await db.prepare('SELECT team, name FROM fan_team_names').all();
  const teams=TEAMS.map(({id,name})=>({team:id,name:names.results.find(x=>x.team===id)?.name||name,votes:Number(counts.results.find(x=>x.team===id)?.votes||0)})).sort((a,b)=>b.votes-a.votes||a.team-b.team);
  const total=teams.reduce((sum,x)=>sum+x.votes,0);
  return {voterToken:id,teams:teams.map(x=>({...x,rank:x.votes?teams.findIndex(y=>y.votes===x.votes)+1:null,percentage:total?Math.round(x.votes/total*100):0})),total,myVote:TEAMS.some(team=>team.id===own?.team)?own.team:null};
}
// What the public may see: team names in a fixed order and this voter's own pick, so responses can't reveal who is ahead.
function ballot({voterToken,teams,myVote}){return {voterToken,myVote,teams:teams.map(({team,name})=>({team,name})).sort((a,b)=>a.team-b.team)}}
async function getPoll(request,db){
  try{
    if(!db)throw new Error('Missing database');
    const existing=voterId(request),id=existing||crypto.randomUUID();
    const data=ballot(await results(db,id));
    return json(data,200,existing?{}:{'Set-Cookie':`${COOKIE}=${id}; HttpOnly; SameSite=Lax; Path=/; Max-Age=31536000${new URL(request.url).protocol==='https:'?'; Secure':''}`});
  }catch{return json({error:'Voting is temporarily unavailable. Please try again.'},503)}
}
async function castVote(request,db){
  if(request.headers.get('origin')!==new URL(request.url).origin)return json({error:'Please vote from this page.'},403);
  try{
    const text=await request.text();if(text.length>4096)return json({error:'Invalid vote.'},413);
    let body;try{body=JSON.parse(text)}catch{return json({error:'Please choose a team.'},400)}
    const id=voterId(request)||(validToken(body?.voterToken)?body.voterToken:null);if(!id)return json({error:'Reconnect before voting. Please try again.'},401);
    const team=body?.team;if(!Number.isInteger(team)||!TEAMS.some(option=>option.id===team))return json({error:`Please choose one of the ${TEAMS.length} teams.`},400);
    if(!db)throw new Error('Missing database');
    await db.prepare('INSERT INTO fan_votes (voter_id, team, updated_at) VALUES (?, ?, ?) ON CONFLICT(voter_id) DO UPDATE SET team = excluded.team, updated_at = excluded.updated_at').bind(id,team,new Date().toISOString()).run();
    return json(ballot(await results(db,id)));
  }catch{return json({error:'Your vote could not be saved. Please try again.'},503)}
}
async function samePasscode(a,b){
  const hash=async value=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))].join();
  return await hash(a)===await hash(b);
}
// Organizer settings. Every change needs the FAN_ADMIN_PASSCODE secret, because the page itself is public.
async function adminAction(request,env){
  if(request.headers.get('origin')!==new URL(request.url).origin)return json({error:'Please use this page to change settings.'},403);
  if(!env.FAN_ADMIN_PASSCODE)return json({error:'The settings passcode has not been set up yet.'},503);
  try{
    const text=await request.text();if(text.length>4096)return json({error:'That request is too large.'},413);
    let body;try{body=JSON.parse(text)}catch{return json({error:'Invalid request.'},400)}
    if(typeof body?.passcode!=='string'||!await samePasscode(body.passcode,env.FAN_ADMIN_PASSCODE))return json({error:'Incorrect passcode.'},401);
    const db=env.DB;if(!db)throw new Error('Missing database');
    if(body.action==='rename'){
      const statements=[];
      for(const {id} of TEAMS){
        const raw=body.names?.[id];if(typeof raw!=='string')return json({error:'Please name every team.'},400);
        const name=raw.replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim();
        if(name.length>MAX_NAME)return json({error:`Team names can be up to ${MAX_NAME} characters.`},400);
        statements.push(name?db.prepare('INSERT INTO fan_team_names (team, name, updated_at) VALUES (?, ?, ?) ON CONFLICT(team) DO UPDATE SET name = excluded.name, updated_at = excluded.updated_at').bind(id,name,new Date().toISOString()):db.prepare('DELETE FROM fan_team_names WHERE team = ?').bind(id));
      }
      await db.batch(statements);
    }else if(body.action==='reset')await db.prepare('DELETE FROM fan_votes').run();
    else if(body.action!=='results')return json({error:'Unknown setting.'},400);
    return json(await results(db,voterId(request)||crypto.randomUUID()));
  }catch{return json({error:'That change could not be saved. Please try again.'},503)}
}
export default {async fetch(request,env){
  const path=new URL(request.url).pathname;
  if(path==='/'&&request.method==='GET')return new Response(HTML,{headers:{'Content-Type':'text/html;charset=utf-8','Cache-Control':'no-cache'}});
  if(path==='/api/poll'&&request.method==='GET')return getPoll(request,env.DB);
  if(path==='/api/vote'&&request.method==='POST')return castVote(request,env.DB);
  if(path==='/api/fan-admin'&&request.method==='POST')return adminAction(request,env);
  return json({error:'Not found.'},404);
}};
