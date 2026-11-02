import fs from 'node:fs';
fs.rmSync('dist',{recursive:true,force:true});
fs.mkdirSync('dist/server',{recursive:true});
const teams=JSON.stringify(JSON.parse(fs.readFileSync('teams.json','utf8')));
const html=fs.readFileSync('public/index.html','utf8').replace('/*TEAMS*/[]',teams);
fs.writeFileSync('dist/server/index.js','const TEAMS='+teams+';\nconst HTML='+JSON.stringify(html)+';\n'+fs.readFileSync('worker/index.js','utf8'));
