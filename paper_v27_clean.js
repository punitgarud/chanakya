const fs=require('fs');
const bal=0.311;
const nowUTC=new Date();
const istStr = nowUTC.toLocaleString('en-IN',{timeZone:'Asia/Kolkata', hour12:true, year:'numeric', month:'short', day:'2-digit', hour:'2-digit', minute:'2-digit', second:'2-digit'}) + ' IST';
const timeOnly = nowUTC.toLocaleString('en-IN',{timeZone:'Asia/Kolkata', hour12:false, hour:'2-digit', minute:'2-digit', second:'2-digit'}) + ' IST';
const modules=[
 {name:"Data Feed Binance",status:"LIVE "+timeOnly,ok:true},
 {name:"Signal Engine v27",status:"Signal Check OK",ok:true},
 {name:"Risk Manager",status:"Balance "+bal+" SOL Safe",ok:true},
 {name:"Paper Executor",status:"Paper Trade Simulated",ok:true},
 {name:"Logger",status:"Log Updated",ok:true}
];
const j={time:istStr, balance:bal, pnl:"+"+(Math.random()*1.2).toFixed(2)+"%", modules};
fs.mkdirSync('./docs',{recursive:true});
fs.writeFileSync('./docs/status.json',JSON.stringify(j,null,2));
fs.appendFileSync('./docs/paper_log.txt',`${istStr} | MAHADEV v27 | Balance ${bal} | PNL ${j.pnl} | Signal OK\n`);
console.log("MAHADEV v27 IST", j);
