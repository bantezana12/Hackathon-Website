import fs from 'node:fs';
fs.rmSync('dist',{recursive:true,force:true});
fs.mkdirSync('dist/server',{recursive:true});
const html=fs.readFileSync('public/index.html','utf8');
const favicon=fs.readFileSync('public/favicon.svg','utf8');
fs.writeFileSync('dist/server/index.js','const HTML='+JSON.stringify(html)+';\nconst FAVICON='+JSON.stringify(favicon)+';\n'+fs.readFileSync('worker/index.js','utf8'));
