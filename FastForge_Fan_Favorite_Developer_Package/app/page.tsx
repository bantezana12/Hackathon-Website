'use client';
import { TEAMS, teamName } from '../lib/teams';
import { useCallback, useEffect, useRef, useState } from 'react';
type Team={team:number;name:string;votes:number;rank:number|null;percentage:number};
type Poll={voterToken?:string;teams:Team[];total:number;myVote:number|null};
const empty: Poll={teams:TEAMS.map(({id,name})=>({team:id,name,votes:0,rank:null,percentage:0})),total:0,myVote:null};
function Trophy(){return <svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M10 5h12v9a6 6 0 0 1-12 0V5Z" stroke="currentColor" strokeWidth="2.4"/><path d="M10 8H5v4a6 6 0 0 0 6 6M22 8h5v4a6 6 0 0 1-6 6M16 20v6m-6 1h12" stroke="currentColor" strokeWidth="2.4" strokeLinecap="square"/></svg>}
export default function Home(){
  const [poll,setPoll]=useState<Poll>(empty),[ready,setReady]=useState(false),[saving,setSaving]=useState<number|null>(null),[showResults,setShowResults]=useState(false),[error,setError]=useState(''),[updating,setUpdating]=useState(false);
  const busy=useRef(false),token=useRef<string|null>(null),revision=useRef(0);
  function votingHeaders(){
    if(!token.current){try{token.current=localStorage.getItem('fastforge-fan-voter')}catch{}}
    if(!token.current||!/^[a-f0-9-]{36}$/.test(token.current)){token.current=crypto.randomUUID();try{localStorage.setItem('fastforge-fan-voter',token.current)}catch{}}
    return {'X-Fan-Voter':token.current};
  }
  function rememberVoter(data:Poll){if(data.voterToken){token.current=data.voterToken;try{localStorage.setItem('fastforge-fan-voter',data.voterToken)}catch{}}}

  const refresh=useCallback(async(initial=false)=>{
    if(busy.current)return;busy.current=true;setUpdating(true);const version=revision.current;
    try{const r=await fetch('/api/poll',{cache:'no-store',credentials:'same-origin',headers:votingHeaders()});const data=await r.json();if(!r.ok)throw new Error(data.error);rememberVoter(data);if(version===revision.current)setPoll(data);setReady(true);if(initial&&data.myVote)setShowResults(true);setError('');}
    catch(e){setError(e instanceof Error?e.message:'Could not refresh the results. Please try again.');}
    finally{busy.current=false;setUpdating(false);}
  },[]);
  useEffect(()=>{void refresh(true)},[refresh]);
  useEffect(()=>{if(!showResults)return;const timer=setInterval(()=>{if(document.visibilityState==='visible')void refresh()},3000);return()=>clearInterval(timer)},[showResults,refresh]);
  async function vote(team:number){
    if(!ready||saving!==null)return;revision.current++;setSaving(team);setError('');
    try{const r=await fetch('/api/vote',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json',...votingHeaders()},body:JSON.stringify({team,voterToken:token.current})});const data=await r.json();if(!r.ok)throw new Error(data.error);rememberVoter(data);setPoll(data);setShowResults(true);}
    catch(e){setError(e instanceof Error?e.message:'Could not save your vote. Please try again.');}
    finally{setSaving(null);}
  }
  return <main>
    <header><a className="brand" href="/" aria-label="FastForge fan favorite">FAST<span>FORGE</span><i aria-hidden="true">✳</i></a><span className="event-tag">THE AUDIENCE GETS A SAY</span></header>
    <section className="intro"><div className="eyebrow"><span className="tiny-star" aria-hidden="true">✦</span> THE PEOPLE’S PICK</div><h1>FAN <span>FAVORITE.</span></h1><p>Three teams. One crowd favorite. You decide.</p></section>
    {error&&<div className="error" role="alert"><span>{error}</span><button type="button" onClick={()=>void refresh()} disabled={updating}>Try again</button></div>}
    {!showResults?<section className="vote-panel" aria-labelledby="vote-title"><div className="panel-top"><h2 id="vote-title">Which team did you like the most?</h2><p>Tap your favorite to cast your vote.</p></div><div className="team-options">{TEAMS.map(({id:team,name})=><button className={'team-option'+(poll.myVote===team?' selected':'')} key={team} onClick={()=>void vote(team)} disabled={!ready||saving!==null} aria-label={`Vote for ${name}`} aria-pressed={poll.myVote===team}><span className="team-label">{name===`Team ${team}`?'TEAM':name}</span><strong>{team}</strong><span className="vote-label">{saving===team?'SAVING…':poll.myVote===team?'YOUR PICK ✓':'VOTE ↗'}</span></button>)}</div><div className="panel-foot"><span>{ready?'One vote per browser. You can change your pick.':'Connecting to the poll…'}</span><button className="text-button" type="button" disabled={!ready||saving!==null} onClick={()=>setShowResults(true)}>View live results <span aria-hidden="true">↗</span></button></div></section>:<section className="results-panel" aria-labelledby="results-title">
      {poll.myVote&&<div className="voted-banner" role="status"><div className="check" aria-hidden="true">✓</div><p>YOU PICKED <strong>{teamName(poll.myVote)}.</strong><span>Your vote is in. Thanks for cheering them on!</span></p><button className="text-button" type="button" onClick={()=>setShowResults(false)}>Change vote</button></div>}
      <div className="results-head"><div className="title-with-icon"><div className="trophy"><Trophy/></div><div><div className="eyebrow small">THE CROWD HAS SPOKEN{poll.total===0?'…':' (SO FAR)'}</div><h2 id="results-title">Live leaderboard</h2></div></div><div className="live"><span aria-hidden="true"/>{error?'RECONNECTING':'LIVE'}</div></div>
      <div className="board-summary"><p><strong>{poll.total.toLocaleString()}</strong> {poll.total===1?'vote':'votes'} cast</p><span>Updates automatically every 3 seconds</span></div>
      {poll.total===0&&<p className="empty">The crowd favorite is still up for grabs. Cast the first vote!</p>}
      <ol className="leaderboard" aria-label="Teams ranked by total votes">{poll.teams.map((team,index)=>{
        const tied=team.votes>0&&poll.teams.filter(t=>t.votes===team.votes).length>1;
        return <li key={team.team} className={(index===0&&team.votes>0?'leading ':'')+(team.team===poll.myVote?'my-pick':'')}><div className="rank" aria-label={team.rank?`Rank ${team.rank}${tied?', tied':''}`:'No votes yet'}>{team.rank??'—'}</div><div className="team-result"><div className="result-line"><div className="team-name">{team.name}{team.team===poll.myVote&&<span className="pick-badge">YOUR PICK</span>}{tied&&<span className="tie">TIED</span>}</div><div className="vote-count"><strong>{team.votes.toLocaleString()}</strong><span>{team.votes===1?'vote':'votes'} · {team.percentage}%</span></div></div><div className="bar-track"><div className="bar-fill" style={{width:`${team.percentage}%`}}/></div></div></li>
      })}</ol>
      <div className="results-foot"><span>Highest votes first. Tied teams share a rank.</span><div>{!poll.myVote&&<button className="small-button" type="button" onClick={()=>setShowResults(false)}>Cast your vote ↗</button>}<button className="text-button" type="button" disabled={updating} onClick={()=>void refresh()}>Refresh <span aria-hidden="true">↻</span></button></div></div>
    </section>}
    <footer><span>BIG IDEAS. REAL BUILDS. <strong>YOUR FAVORITE.</strong></span><span>FASTFORGE FAN VOTE</span></footer>
  </main>;
}
