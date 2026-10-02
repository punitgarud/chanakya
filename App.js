import {Buffer} from 'buffer'; global.Buffer=Buffer;
import 'react-native-get-random-values';
import React,{useState,useEffect,useRef} from 'react';
import {View,Text,StyleSheet,ScrollView,TouchableOpacity} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import * as Notifications from 'expo-notifications';
const LOG_FILE = FileSystem.documentDirectory + 'mahadev_logs.txt';
const PAPER_FILE = FileSystem.documentDirectory + 'mahadev_paper_v26.json';
const TASK_NAME = 'MAHADEV_PAPER_V26';
const DEFAULTS = {
  wallet: 'Dy95ncLFPhJYeGSdSkvSADid7ncHu7EYtdDmhNAtxXsh',
  balance: 0.3110,
  minSolReal: 0.1,
  idealSol: 0.3110,
  perTradeSol: 0.01,
  paperDurationH: 10,
  scanInterval: 60,
  god: { robustMin:5.2, threshold:4.5, profitTarget:5.2, stopLoss:2.5 },
  volume: { spikeMin:120, minVolUsd:10000 },
  seeker: { maxAgeMin:5, minLiquidity:5000, snipeAmountSol:0.01, profitTarget:15, stopLoss:8 },
  usdt: { momentumMin:1.2, profitTarget:0.8, stopLoss:0.5 },
  sol: { momentumMin:3.5, profitTarget:2.5, stopLoss:1.5 },
};
Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowAlert:true, shouldPlaySound:true, shouldSetBadge:false }) });
TaskManager.defineTask(TASK_NAME, async () => {
 try{
  const paper = JSON.parse(await FileSystem.readAsStringAsync(PAPER_FILE).catch(()=> '{"trades":[]}'));
  const now = Date.now();
  if(now > paper.endTime) return BackgroundFetch.BackgroundFetchResult.NoData;
  const log = `[BG ${new Date().toISOString()}] ${((now-paper.startTime)/3600000).toFixed(1)}h PnL:${paper.totalPnL?.toFixed(4)||0}\n`;
  await FileSystem.writeAsStringAsync(LOG_FILE, (await FileSystem.readAsStringAsync(LOG_FILE).catch(()=>'')) + log);
  return BackgroundFetch.BackgroundFetchResult.NewData;
 }catch(e){ return BackgroundFetch.BackgroundFetchResult.Failed; }
});
const MODULES = [
  { id:'god', name:'GOD v15', color:'#FFD700', target: 5.2, sl: 2.5 },
  { id:'volume', name:'Volume Hunter', color:'#00FF88', target: 4.5, sl: 2.2 },
  { id:'seeker', name:'Sniper', color:'#00D4FF', target: 15, sl: 8 },
  { id:'usdt', name:'USDT Scalper', color:'#FF6B6B', target: 0.8, sl: 0.5 },
  { id:'sol', name:'SOL Pump', color:'#A78BFA', target: 2.5, sl: 1.5 },
  { id:'mickey', name:'MickeyScout', color:'#FFCC00', target: 1.0, sl: 0.5 },
];
export default function App(){
const [logs,setLogs]=useState([]);
const [fileLogs,setFileLogs]=useState('--- MAHADEV v26 PAPER LAB ---\n');
const [paper,setPaper]=useState({ startTime: Date.now(), endTime: Date.now()+36000000, trades:[], totalPnL:0, totalTrades:0, winRate:0, byModule:{}, activePositions:[] });
const [status,setStatus]=useState('Init...');
const timerRef=useRef(null);
const writeLog=async(msg)=>{
 const ts=new Date().toISOString();
 const line=`[${ts}] ${msg}\n`;
 setLogs(l=>[ts.slice(11,19)+' '+msg,...l].slice(0,80));
 const nf=fileLogs+line; setFileLogs(nf);
 try{ await FileSystem.writeAsStringAsync(LOG_FILE, nf); }catch(e){}
};
const savePaper=async(p)=>{ setPaper(p); try{ await FileSystem.writeAsStringAsync(PAPER_FILE, JSON.stringify(p)); }catch(e){} };
const shareLogs=async()=>{ try{ await FileSystem.writeAsStringAsync(LOG_FILE, fileLogs); await Sharing.shareAsync(LOG_FILE); }catch(e){} };
const sharePaperReport=async()=>{
 try{
  const report = `MAHADEV v26 PAPER ${new Date().toISOString()}\nWallet ${DEFAULTS.wallet}\nBalance ${DEFAULTS.balance} SOL MIN ${DEFAULTS.minSolReal} SOL\nPerTrade ${DEFAULTS.perTradeSol}\nTotal ${paper.totalTrades} PnL ${paper.totalPnL.toFixed(4)} WR ${paper.winRate}%\nByModule ${Object.entries(paper.byModule).map(([k,v])=> `${k}:${v.trades} ${v.pnl.toFixed(4)} WR${v.winRate}%`).join('\n')}`;
  const f = FileSystem.documentDirectory + 'report.txt';
  await FileSystem.writeAsStringAsync(f, report + '\n\n' + JSON.stringify(paper,null,2));
  await Sharing.shareAsync(f);
 }catch(e){}
};
const fetchPrice = async(sym)=>{
 try{
  if(sym==='SOL'){ const r=await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd&include_24hr_change=true'); const d=await r.json(); return { price:d.solana.usd, vol:0, change:d.solana.usd_24h_change||0 }; }
  const r=await fetch(`https://api.dexscreener.com/latest/dex/search/?q=${sym}`); const d=await r.json(); const p=d.pairs?.[0]; return p? { price: parseFloat(p.priceUsd), vol:p.volume?.h24||0, change:parseFloat(p.priceChange?.h24||0) } : { price:0, vol:0, change:0 };
 }catch(e){ return { price:0, vol:0, change:0 }; }
};
const simulateTradeCycle = async()=>{
 const now=Date.now();
 if(now > paper.endTime){ writeLog(`ENDED ${DEFAULTS.paperDurationH}h PnL ${paper.totalPnL.toFixed(4)} Trades ${paper.totalTrades}`); setStatus(`ENDED PnL ${paper.totalPnL.toFixed(4)}`); if(timerRef.current) clearInterval(timerRef.current); return; }
 const elapsedH = (now - paper.startTime)/3600000;
 setStatus(`PAPER ${elapsedH.toFixed(2)}h/${DEFAULTS.paperDurationH}h PnL ${paper.totalPnL.toFixed(4)}`);
 let newPaper = {...paper, activePositions:[...paper.activePositions], trades:[...paper.trades], byModule:{...paper.byModule}};
 for(let pos of [...newPaper.activePositions]){
  const cur = await fetchPrice(pos.sym); if(!cur.price) continue;
  const pnlPct = ((cur.price - pos.entryPrice)/pos.entryPrice)*100;
  const modDef = MODULES.find(m=>m.id===pos.module);
  if(pnlPct >= modDef.target || pnlPct <= -modDef.sl){
   const pnlSol = (pos.amountSol * pnlPct/100); newPaper.totalPnL += pnlSol;
   newPaper.trades.push({ time:new Date().toISOString().slice(11,19), module:pos.module, sym:pos.sym, action:'SELL', entry:pos.entryPrice, exit:cur.price, pnlPct:pnlPct.toFixed(2), pnl:pnlSol, reason: pnlPct>=modDef.target? `TP ${modDef.target}%` : `SL ${modDef.sl}%` });
   writeLog(`SELL ${pos.module} ${pos.sym} ${pnlPct.toFixed(2)}% ${pnlSol.toFixed(4)}`);
   if(!newPaper.byModule[pos.module]) newPaper.byModule[pos.module]={ trades:0, pnl:0, wins:0, winRate:0 };
   newPaper.byModule[pos.module].trades++; newPaper.byModule[pos.module].pnl+=pnlSol; if(pnlPct>=0) newPaper.byModule[pos.module].wins++;
   newPaper.byModule[pos.module].winRate = ((newPaper.byModule[pos.module].wins/newPaper.byModule[pos.module].trades)*100).toFixed(1);
   newPaper.activePositions = newPaper.activePositions.filter(p=>p.id!==pos.id); newPaper.totalTrades++;
  }
 }
 const candidates = [{ module:'god', sym:'WIF' }, { module:'volume', sym:'BONK' }, { module:'seeker', sym:'PEPE' }, { module:'usdt', sym:'USDT' }, { module:'sol', sym:'SOL' }, { module:'mickey', sym:'JUP' }];
 for(let cand of candidates){
  if(newPaper.activePositions.find(p=>p.module===cand.module)) continue;
  if(Math.random() < 0.15){
   const priceInfo = await fetchPrice(cand.sym); if(!priceInfo.price) continue;
   const pos={ id:Date.now()+Math.random(), module:cand.module, sym:cand.sym, entryPrice:priceInfo.price, amountSol:DEFAULTS.perTradeSol, entryTime:now };
   newPaper.activePositions.push(pos); writeLog(`BUY ${cand.module} ${cand.sym} @ ${priceInfo.price}`);
  }
 }
 newPaper.winRate = newPaper.totalTrades>0? ((newPaper.trades.filter(t=>t.pnl>0).length/newPaper.totalTrades)*100).toFixed(1) : 0;
 await savePaper(newPaper);
};
useEffect(()=>{
 (async()=>{
  try{
   const existing = await FileSystem.readAsStringAsync(PAPER_FILE); const p=JSON.parse(existing);
   if(Date.now() < p.endTime){ setPaper(p); writeLog(`Resume ${((Date.now()-p.startTime)/3600000).toFixed(2)}h PnL ${p.totalPnL.toFixed(4)}`); }
   else{ const fresh={ startTime:Date.now(), endTime:Date.now()+DEFAULTS.paperDurationH*3600000, trades:[], totalPnL:0, totalTrades:0, winRate:0, byModule:{}, activePositions:[] }; await savePaper(fresh); writeLog(`NEW ${DEFAULTS.paperDurationH}h MIN ${DEFAULTS.minSolReal}`); }
  }catch(e){ const fresh={ startTime:Date.now(), endTime:Date.now()+DEFAULTS.paperDurationH*3600000, trades:[], totalPnL:0, totalTrades:0, winRate:0, byModule:{}, activePositions:[] }; await savePaper(fresh); writeLog(`FRESH MIN ${DEFAULTS.minSolReal} Paper 0 Real 0.1 Your ${DEFAULTS.balance}`); }
  try{ await Notifications.requestPermissionsAsync(); await BackgroundFetch.registerTaskAsync(TASK_NAME, { minimumInterval:900, stopOnTerminate:false, startOnBoot:true }); }catch(err){}
  timerRef.current = setInterval(simulateTradeCycle, 60000); simulateTradeCycle();
 })();
 return ()=>{ if(timerRef.current) clearInterval(timerRef.current); };
},[]);
const remainingH = ((paper.endTime - Date.now())/3600000).toFixed(2);
const maxTrades = Math.floor(DEFAULTS.balance / DEFAULTS.perTradeSol);
return(
<View style={s.root}><ScrollView contentContainerStyle={{padding:16,paddingTop:50}}>
<Text style={s.title}>🔱 MAHADEV v26</Text><Text style={s.sub}>PAPER {DEFAULTS.paperDurationH}H MIN {DEFAULTS.minSolReal} SOL 0 PAPER IDEAL {DEFAULTS.idealSol}</Text>
<View style={s.card}><Text style={s.bigTitle}>Paper {paper.totalTrades} Trades {paper.totalPnL.toFixed(4)} SOL PnL MIN {DEFAULTS.minSolReal}</Text><Text style={{color:'#00FF94', fontSize:11, marginTop:4}}>BAL {DEFAULTS.balance} SOL OK Max {maxTrades} trades | {remainingH}h left WR {paper.winRate}%</Text><View style={s.row2}><TouchableOpacity style={s.smallBtn} onPress={shareLogs}><Text style={s.smallTxt}>Logs</Text></TouchableOpacity><TouchableOpacity style={[s.smallBtn,{backgroundColor:'#FFD700'}]} onPress={sharePaperReport}><Text style={[s.smallTxt,{color:'#000'}]}>PnL Report</Text></TouchableOpacity><TouchableOpacity style={[s.smallBtn,{backgroundColor:'#FF6B6B'}]} onPress={async()=>{ const fresh={ startTime:Date.now(), endTime:Date.now()+DEFAULTS.paperDurationH*3600000, trades:[], totalPnL:0, totalTrades:0, winRate:0, byModule:{}, activePositions:[] }; await savePaper(fresh); }}><Text style={s.smallTxt}>Reset</Text></TouchableOpacity></View></View>
<View style={[s.bigCard,{borderColor:'#FFD700'}]}><Text style={[s.bigTitle,{color:'#FFD700'}]}>SOL MIN {DEFAULTS.minSolReal} Your {DEFAULTS.balance}</Text>
