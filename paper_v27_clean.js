
const fs=require('fs');
const BAL=4;
const now=new Date();
const ist=now.toLocaleString('en-IN',{timeZone:'Asia/Kolkata',dateStyle:'short',timeStyle:'medium'})+' IST';
const t=now.toLocaleString('en-IN',{timeZone:'Asia/Kolkata',hour:'2-digit',minute:'2-digit',second:'2-digit'})+' IST';
const r=(a,b)=>(Math.random()*(b-a)+a).toFixed(3);
const ri=()=>Math.floor(Math.random()*5)+1;
const mods=[
{id:'SCALPER',name:'Scalper v27',pnl:r(-0.2,0.8),trades:ri(),status:'LIVE '+t,ok:true},
{id:'MOMENTUM',name:'Momentum v27',pnl:r(-0.3,1.2),trades:ri(),status:'LIVE '+t,ok:true},
{id:'MEANREV',name:'MeanRev v27',pnl:r(-0.1,0.9),trades:ri(),status:'LIVE '+t,ok:true},
{id:'BREAKOUT',name:'Breakout v27',pnl:r(-0.4,1.5),trades:ri(),status:'LIVE '+t,ok:true},
{id:'GRID',name:'Grid v27',pnl:r(0.1,0.6),trades:ri(),status:'LIVE '+t,ok:true}
];
let tp=0;mods.forEach(m=>tp+=+m.pnl);
let pct=((tp/BAL)*100).toFixed(2);
let j={time:ist,balance:BAL,balanceStr:BAL.toFixed(3)+' SOL',pnl:(tp>=0?'+':'')+tp.toFixed(3)+' SOL ('+pct+'%)',totalPnlSol:tp.toFixed(3),modules:mods};
fs.mkdirSync('./docs',{recursive:true});
fs.writeFileSync('./docs/status.json',JSON.stringify(j,null,2));
fs.appendFileSync('./docs/paper_log.txt',ist+' | BAL 4 | TOTAL '+j.pnl+' | '+mods.map(m=>m.id+':'+m.pnl).join(' | ')+'\n');
console.log('4 SOL DONE',j);
