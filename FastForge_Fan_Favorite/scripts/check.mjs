// Functional checks for the built Worker against a temporary in-memory database.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import worker from '../dist/server/index.js';
const sqlite=new DatabaseSync(':memory:');
for(const file of fs.readdirSync('drizzle').filter(x=>x.endsWith('.sql')).sort())sqlite.exec(fs.readFileSync('drizzle/'+file,'utf8'));
const db={prepare(sql){const query=sqlite.prepare(sql);let args=[];const statement={bind(...values){args=values;return statement},async all(){return{results:query.all(...args)}},async first(){return query.get(...args)},async run(){return query.run(...args)}};return statement}};
const env={DB:db},origin='https://poll.example';
const getPoll=(request,e=env)=>worker.fetch(request,e),castVote=(request,e=env)=>worker.fetch(request,e);
const request=(cookie,team,override={})=>new Request(origin+'/api/vote',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{}),...override},body:JSON.stringify({team})});
const page=await worker.fetch(new Request(origin+'/'),env);assert.equal(page.status,200);assert.match(await page.text(),/const TEAMS=\[\{"id":1/);
const first=await getPoll(new Request(origin+'/api/poll')),a=first.headers.get('set-cookie').split(';')[0];
assert.equal(first.headers.get('cache-control'),'no-store');assert.match(first.headers.get('set-cookie'),/HttpOnly/);
let data=await first.json();assert.equal(data.total,0);assert.equal(data.myVote,null);assert.equal(data.teams.length,3);assert.ok(data.teams.every(t=>t.votes===0&&t.rank===null));
const oldVoter=crypto.randomUUID();sqlite.prepare('INSERT INTO fan_votes VALUES (?,5,?)').run(oldVoter,new Date().toISOString());
const oldView=await(await getPoll(new Request(origin+'/api/poll',{headers:{'X-Fan-Voter':oldVoter}}))).json();assert.equal(oldView.myVote,null);assert.equal(oldView.total,0);assert.equal(oldView.teams.length,3);
const second=await getPoll(new Request(origin+'/api/poll')),b=second.headers.get('set-cookie').split(';')[0];assert.notEqual(a,b);
for(const invalid of [0,4,5,6,1.5,'2',null])assert.equal((await castVote(request(a,invalid))).status,400);
assert.equal((await castVote(request(null,1))).status,401);assert.equal((await castVote(request(a,1,{Origin:'https://elsewhere.example'}))).status,403);
assert.equal((await castVote(request(a,3))).status,200);
data=await(await castVote(request(b,1))).json();assert.equal(data.total,2);assert.equal(data.myVote,1);assert.deepEqual(data.teams.slice(0,2).map(x=>[x.team,x.votes,x.rank,x.percentage]),[[1,1,1,50],[3,1,1,50]]);
data=await(await castVote(request(a,3))).json();assert.equal(data.total,2);
data=await(await castVote(request(a,1))).json();assert.equal(data.total,2);assert.equal(data.teams[0].team,1);assert.equal(data.teams[0].votes,2);assert.equal(data.teams.find(t=>t.team===3).votes,0);
const restored=await(await getPoll(new Request(origin+'/api/poll',{headers:{Cookie:a}}))).json();assert.equal(restored.myVote,1);assert.equal(restored.total,2);
const third=await getPoll(new Request(origin+'/api/poll')),c=third.headers.get('set-cookie').split(';')[0];await castVote(request(c,2));
data=await(await getPoll(new Request(origin+'/api/poll',{headers:{Cookie:b}}))).json();assert.equal(data.total,3);assert.deepEqual(data.teams.slice(0,2).map(t=>t.team),[1,2]);
// Requests must work when cookies are unavailable or filtered.
const d=crypto.randomUUID();
let withoutCookie=await(await getPoll(new Request(origin+'/api/poll',{headers:{'X-Fan-Voter':d}}))).json();assert.equal(withoutCookie.voterToken,d);assert.equal(withoutCookie.myVote,null);
assert.equal((await castVote(request(null,2,{'X-Fan-Voter':d}))).status,200);
withoutCookie=await(await getPoll(new Request(origin+'/api/poll',{headers:{'X-Fan-Voter':d}}))).json();assert.equal(withoutCookie.myVote,2);assert.equal(withoutCookie.total,4);
// Body fallback handles hosts that strip custom request headers as well.
assert.equal((await castVote(new Request(origin+'/api/vote',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({team:3,voterToken:d})}))).status,200);
const legacyBrowser=await(await getPoll(new Request(origin+'/api/poll',{headers:{Cookie:a,'X-Fan-Voter':d}}))).json();assert.equal(legacyBrowser.voterToken,a.split('=')[1]);assert.equal(legacyBrowser.myVote,1);
assert.equal((await castVote(request(null,1,{'X-Fan-Voter':'invalid'}))).status,401);
assert.equal((await getPoll(new Request(origin+'/api/poll'),{})).status,503);assert.equal((await castVote(request(a,2),{})).status,503);
assert.equal((await worker.fetch(new Request(origin+'/api/other'),env)).status,404);
console.log('Passed: page, shared vote totals, persistent choice, duplicate prevention, vote changes, ties, ranking, validation, cookie-free voting and retired-team vote exclusion.');
