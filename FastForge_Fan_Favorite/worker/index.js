// Fan Favorite poll: the page at "/", shared results at /api/poll and voting at /api/vote.
// TEAMS and HTML are prepended by scripts/build.mjs.
const COOKIE='ff_fan';
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
  const teams=TEAMS.map(({id,name})=>({team:id,name,votes:Number(counts.results.find(x=>x.team===id)?.votes||0)})).sort((a,b)=>b.votes-a.votes||a.team-b.team);
  const total=teams.reduce((sum,x)=>sum+x.votes,0);
  return {voterToken:id,teams:teams.map(x=>({...x,rank:x.votes?teams.findIndex(y=>y.votes===x.votes)+1:null,percentage:total?Math.round(x.votes/total*100):0})),total,myVote:TEAMS.some(team=>team.id===own?.team)?own.team:null};
}
async function getPoll(request,db){
  try{
    if(!db)throw new Error('Missing database');
    const existing=voterId(request),id=existing||crypto.randomUUID();
    const data=await results(db,id);
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
    return json(await results(db,id));
  }catch{return json({error:'Your vote could not be saved. Please try again.'},503)}
}
export default {async fetch(request,env){
  const path=new URL(request.url).pathname;
  if(path==='/'&&request.method==='GET')return new Response(HTML,{headers:{'Content-Type':'text/html;charset=utf-8','Cache-Control':'no-cache'}});
  if(path==='/api/poll'&&request.method==='GET')return getPoll(request,env.DB);
  if(path==='/api/vote'&&request.method==='POST')return castVote(request,env.DB);
  return json({error:'Not found.'},404);
}};
