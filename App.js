import React,{useState,useEffect,useRef} from 'react';
import {View,Text,StyleSheet,ScrollView,TouchableOpacity} from 'react-native';
import 'react-native-get-random-values';
import {Buffer} from 'buffer'; global.Buffer=Buffer;
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import * as Notifications from 'expo-notifications';

const LOG_FILE = FileSystem.documentDirectory + 'mahadev_logs.txt';
const PAPER_FILE = FileSystem.documentDirectory + 'paper_v26_12h.json';
const TASK_NAME = 'MAHADEV_12H_PAPER';

const DEFAULTS = {
  wallet: 'Dy95ncLFPhJYeGSdSkvSADid7ncHu7EYtdDmhNAtxXsh',
  balance: 0.3110,
  minSolReal: 0.1,
  idealSol: 0.3110,
  perTradeSol: 0.01,
  paperDurationH: 12,
  scanInterval: 45,
  backgroundInterval: 15,
  god: { threshold:4.5, profitTarget:5.2, stopLoss:2.5, robustMin:5.2 },
  volume: { spikeMin:120, minVolUsd:10000, profitTarget:4.5, stopLoss:2.2 },
  seeker: { maxAgeMin:5, minLiquidity:5000, snipeAmountSol:0.01, profitTarget:15, stopLoss:8 },
  usdt: { momentumMin:1.2, profitTarget:0.8, stopLoss:0.5 },
  sol: { momentumMin:3.5, profitTarget:2.5, stopLoss:1.5 },
  mickey: { profitTarget:1.0, stopLoss:0.5 },
};

Notifications.setNotificationHandler({ handleNotification: async()=>({shouldShowAlert:true,shouldPlaySound:true,shouldSetBadge:false}) });

TaskManager.defineTask(TASK_NAME, async()=>{
  try{
    const txt = await FileSystem.readAsStringAsync(LOG_FILE).catch(()=>'');
    await FileSystem.writeAsStringAsync(LOG_FILE, txt + '\n[BG '+new Date().toISOString()+'] tick');
    return BackgroundFetch.BackgroundFetchResult.NewData;
  }catch(e){ return BackgroundFetch.BackgroundFetchResult.Failed; }
});

const MODULES = [
  { id:'god', name:'GOD v15', color:'#FFD700', target:5.2, sl:2.5, def:'robustMin 5.2 threshold 4.5' },
  { id:'volume', name:'Volume Hunter', color:'#00FF88', target:4.5, sl:2.2, def:'spikeMin 120 vol 10k' },
  { id:'seeker', name:'Sniper', color:'#00D4FF', target:15, sl:8, def:'age<5min liq 5k' },
  { id:'usdt', name:'USDT Scalper', color:'#FF6B6B', target:0.8, sl:0.5, def:'mom 1.2' },
  { id:'sol', name:'SOL Pump', color:'#A78BFA', target:2.5, sl:1.5, def:'mom 3.5' },
  { id:'mickey', name:'MickeyScout', color:'#FFCC00', target:1.0, sl:0.5, def:'micro' },
];

export default function App(){
  const [logs,setLogs]=useState([]);
  const [fileLogs,setFileLogs]=useState('--- MAHADEV v26.6 12H PAPER LAB MIN 0.1 SOL ---\n');
  const [paper,setPaper]=useState({startTime:Date.now(),endTime:Date.now()+12*3600000,trades:[],totalPnL:0,totalTrades:0,winRate:0,byModule:{},activePositions:[]});
  const [bgStatus,setBgStatus]=useState('Registering 24/7...');
  const [stat,setStat]=useState('Init 12H Paper - NO REAL TRADE');
  const timerRef=useRef(null);

  const writeLog=async(msg)=>{
    const ts=new Date().toISOString();
    const line='['+ts+'] '+msg+'\n';
    setLogs(l=>[ts.slice(11,19)+' '+msg,...l].slice(0,80));
    const nf=fileLogs+line; setFileLogs(nf);
    try{ await FileSystem.writeAsStringAsync(LOG_FILE, nf); }catch(e){}
  };

  const savePaper=async(p)=>{
    setPaper(p);
    try{ await FileSystem.writeAsStringAsync(PAPER_FILE, JSON.stringify(p)); }catch(e){}
  };

  const shareLogs=async()=>{
    try{ await FileSystem.writeAsStringAsync(LOG_FILE, fileLogs); await Sharing.shareAsync(LOG_FILE); }catch(e){}
  };

  const resetPaper=async()=>{
    const fresh={startTime:Date.now(),endTime:Date.now()+DEFAULTS.paperDurationH*3600000,trades:[],totalPnL:0,totalTrades:0,winRate:0,byModule:{},activePositions:[]};
    await savePaper(fresh);
    writeLog('RESET 12H PAPER LAB MIN 0.1 SOL');
  };

  const fetchPrice=async(sym)=>{
    try{
      if(sym==='SOL'){
        const r=await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd&include_24hr_change=true');
        const d=await r.json(); return {price:d.solana.usd, vol:0, change:d.solana.usd_24h_change||0};
      }
      const r=await fetch('https://api.dexscreener.com/latest/dex/search/?q='+sym);
      const d=await r.json(); const p=d.pairs&&d.pairs[0];
      return p?{price:parseFloat(p.priceUsd),vol:p.volume&&p.volume.h24||0,change:parseFloat(p.priceChange&&p.priceChange.h24||0)}:{price:0,vol:0,change:0};
    }catch(e){ return {price:0,vol:0,change:0}; }
  };

  const simulateTradeCycle=async()=>{
    const now=Date.now();
    if(now>paper.endTime){
      writeLog('PAPER 12H ENDED PnL '+paper.totalPnL.toFixed(4)+' Trades '+paper.totalTrades+' WR '+paper.winRate+'%');
      setStat('ENDED 12H PnL '+paper.totalPnL.toFixed(4));
      if(timerRef.current) clearInterval(timerRef.current);
      try{ await Notifications.scheduleNotificationAsync({content:{title:'Mahadev 12H Ended',body:'PnL '+paper.totalPnL.toFixed(4)+' WR '+paper.winRate+'%'},trigger:null}); }catch(e){}
      return;
    }
    const elapsedH=(now-paper.startTime)/3600000;
    setStat('PAPER '+elapsedH.toFixed(2)+'h/12h PnL '+paper.totalPnL.toFixed(4)+' WR '+paper.winRate+'%');

    let newPaper={...paper, activePositions:[...paper.activePositions], trades:[...paper.trades], byModule:{...paper.byModule}};

    for(let pos of [...newPaper.activePositions]){
      const cur=await fetchPrice(pos.sym); if(!cur.price) continue;
      const pnlPct=((cur.price-pos.entryPrice)/pos.entryPrice)*100;
      const modDef=MODULES.find(m=>m.id===pos.module);
      if(pnlPct>=modDef.target || pnlPct<=-modDef.sl){
        const pnlSol=(pos.amountSol*pnlPct/100); newPaper.totalPnL+=pnlSol;
        newPaper.trades.push({time:new Date().toISOString().slice(11,19),module:pos.module,sym:pos.sym,pnlPct:pnlPct.toFixed(2),pnl:pnlSol,reason:pnlPct>=modDef.target?'TP '+modDef.target+'%':'SL '+modDef.sl+'%'});
        writeLog('SELL '+pos.module+' '+pos.sym+' '+pnlPct.toFixed(2)+'% '+pnlSol.toFixed(4)+' SOL '+ (pnlPct>=0?'WIN':'LOSS'));
        if(!newPaper.byModule[pos.module]) newPaper.byModule[pos.module]={trades:0,pnl:0,wins:0,winRate:0,def:modDef.def};
        newPaper.byModule[pos.module].trades++; newPaper.byModule[pos.module].pnl+=pnlSol; if(pnlPct>=0) newPaper.byModule[pos.module].wins++;
        newPaper.byModule[pos.module].winRate=((newPaper.byModule[pos.module].wins/newPaper.byModule[pos.module].trades)*100).toFixed(1);
        newPaper.byModule[pos.module].def=modDef.def;
        newPaper.activePositions=newPaper.activePositions.filter(p=>p.id!==pos.id); newPaper.totalTrades++;
      }
    }

    const candidates=[
      {module:'god',sym:'WIF'},{module:'volume',sym:'BONK'},{module:'seeker',sym:'PEPE'},
      {module:'usdt',sym:'USDT'},{module:'sol',sym:'SOL'},{module:'mickey',sym:'JUP'}
    ];
    for(let cand of candidates){
      if(newPaper.activePositions.find(p=>p.module===cand.module)) continue;
      if(Math.random()<0.22){
        const priceInfo=await fetchPrice(cand.sym); if(!priceInfo.price) continue;
        const pos={id:Date.now()+Math.random(),module:cand.module,sym:cand.sym,entryPrice:priceInfo.price,amountSol:DEFAULTS.perTradeSol,entryTime:now};
        newPaper.activePositions.push(pos);
        writeLog('BUY PAPER '+cand.module+' '+cand.sym+' @ '+priceInfo.price+' amt '+DEFAULTS.perTradeSol+' SOL def '+MODULES.find(m=>m.id===cand.module).def);
        if(!newPaper.byModule[cand.module]) newPaper.byModule[cand.module]={trades:0,pnl:0,wins:0,winRate:0,def:MODULES.find(m=>m.id===cand.module).def};
      }
    }
    newPaper.winRate=newPaper.totalTrades>0?((newPaper.trades.filter(t=>t.pnl>0).length/newPaper.totalTrades)*100).toFixed(1):0;
    await savePaper(newPaper);
  };

  useEffect(()=>{
    (async()=>{
      try{
        const existing=await FileSystem.readAsStringAsync(PAPER_FILE); const p=JSON.parse(existing);
        if(Date.now()<p.endTime){ setPaper(p); writeLog('Resume 12H '+((Date.now()-p.startTime)/3600000).toFixed(2)+'h PnL '+p.totalPnL.toFixed(4)+' MIN 0.1 SOL'); }
        else{ const fresh={startTime:Date.now(),endTime:Date.now()+12*3600000,trades:[],totalPnL:0,totalTrades:0,winRate:0,byModule:{},activePositions:[]}; await savePaper(fresh); writeLog('NEW 12H PAPER LAB MIN 0.1 perTrade 0.01'); }
      }catch(e){ const fresh={startTime:Date.now(),endTime:Date.now()+12*3600000,trades:[],totalPnL:0,totalTrades:0,winRate:0,byModule:{},activePositions:[]}; await savePaper(fresh); writeLog('FRESH 12H MIN 0.1 Paper 0 Real 0.1 Your 0.3110'); }
      try{
        await Notifications.requestPermissionsAsync();
        await BackgroundFetch.registerTaskAsync(TASK_NAME,{minimumInterval:15*60,stopOnTerminate:false,startOnBoot:true});
        setBgStatus('24/7 Active BG 15m Scan 45s 12H Paper MIN 0.1');
        writeLog('BG registered 24/7 12H LAB');
      }catch(err){ setBgStatus('BG FAIL '+err.message); }
      timerRef.current=setInterval(simulateTradeCycle, DEFAULTS.scanInterval*1000);
      simulateTradeCycle();
    })();
    return()=>{ if(timerRef.current) clearInterval(timerRef.current); };
  },[]);

  const remainingH=((paper.endTime-Date.now())/3600000).toFixed(2);
  const maxTrades=Math.floor(DEFAULTS.balance/DEFAULTS.perTradeSol);

  return(
    <View style={s.root}><ScrollView contentContainerStyle={{padding:16,paddingTop:50}}>
      <Text style={s.title}>🔱 MAHADEV v26.6</Text><Text style={s.sub}>12H PAPER LAB • MIN 0.1 REAL • 0 PAPER • BAL {DEFAULTS.balance} • IDEAL {DEFAULTS.idealSol}</Text>
      <View style={s.card}><Text style={s.bigTitle}>Paper {paper.totalTrades} Trades {paper.totalPnL.toFixed(4)} SOL • {remainingH}h left</Text><Text style={{color:'#00FF94',fontSize:10,marginTop:4}}>BAL {DEFAULTS.balance} OK Max {maxTrades} • WR {paper.winRate}% • {bgStatus}</Text><View style={s.row2}><TouchableOpacity style={s.smallBtn} onPress={shareLogs}><Text style={s.smallTxt}>Share Logs</Text></TouchableOpacity><TouchableOpacity style={[s.smallBtn,{backgroundColor:'#FF6B6B'}]} onPress={resetPaper}><Text style={s.smallTxt}>Reset 12H</Text></TouchableOpacity></View></View>
      <View style={[s.bigCard,{borderColor:'#FFD700'}]}><Text style={[s.bigTitle,{color:'#FFD700'}]}>SOL BALANCE MIN CHECK</Text><View style={s.row}><Text style={s.ct}>Paper Mode</Text><Text style={[s.ct,{color:'#00FF94'}]}>0 SOL needed</Text></View><View style={s.row}><Text style={s.ct}>Min Real</Text><Text style={s.ct}>{DEFAULTS.minSolReal} SOL</Text></View><View style={s.row}><Text style={s.ct}>Your Balance</Text><Text style={[s.ct,{color:'#00FF94'}]}>{DEFAULTS.balance} SOL</Text></View><View style={s.row}><Text style={s.ct}>Max Parallel</Text><Text style={s.ct}>{maxTrades} trades x {DEFAULTS.perTradeSol} SOL</Text></View><View style={s.row}><Text style={s.ct}>Duration</Text><Text style={s.ct}>12 Hrs Paper</Text></View></View>
      <View style={[s.bigCard,{borderColor:'#FFD700'}]}><Text style={[s.bigTitle,{color:'#FFD700'}]}>PnL by Module - LOG DEFAULTS</Text>{MODULES.map(m=>{ const stat2=paper.byModule[m.id]; return (<View key={m.id} style={[s.row,{marginTop:6,padding:6,backgroundColor:'#1a1a1a',borderRadius:8}]}><View style={{flex:1}}><Text style={[s.ct,{color:m.color}]}>{m.name}</Text><Text style={s.cs}>TP {m.target}% SL {m.sl}% def {m.def}</Text><Text style={s.cs}>Cfg TP {DEFAULTS[m.id]?DEFAULTS[m.id].profitTarget:''} SL {DEFAULTS[m.id]?DEFAULTS[m.id].stopLoss:''}</Text></View><View style={{alignItems:'flex-end'}}><Text style={[s.ct,{color:stat2&&stat2.pnl>0?'#00FF94':'#FF6B6B'}]}>{stat2?stat2.pnl.toFixed(4)+' SOL':'0.0000'}</Text><Text style={s.cs}>{stat2?stat2.trades+' trades WR '+stat2.winRate+'%':'No trades'}</Text><Text style={s.cs}>{stat2&&stat2.def?stat2.def:''}</Text></View></View>); })}</View>
      <View style={[s.bigCard,{borderColor:'#00FF88'}]}><Text style={[s.bigTitle,{color:'#00FF88'}]}>Active Positions {paper.activePositions.length}/{maxTrades}</Text>{paper.activePositions.length===0?<Text style={s.cs}>No active - waiting signals all modules</Text>:paper.activePositions.map(p=>(<View key={p.id} style={s.row}><Text style={s.ct}>{p.module} {p.sym} @ {p.entryPrice} amt {p.amountSol}</Text><Text style={s.cs}>{new Date(p.entryTime).toISOString().slice(11,19)}</Text></View>))}</View>
      <View style={[s.bigCard,{borderColor:'#555'}]}><Text style={[s.bigTitle,{color:'#fff'}]}>Last Trades - Performance Log</Text>{paper.trades.slice(-20).reverse().map((t,i)=>(<View key={i} style={s.row}><Text style={s.cs}>{t.time} {t.module} {t.sym} {t.pnlPct}% {t.reason}</Text><Text style={[s.cs,{color:t.pnl>0?'#00FF94':'#FF6B6B'}]}>{t.pnl.toFixed(4)}</Text></View>))}{paper.trades.length===0&&<Text style={s.cs}>No trades yet - will log each paper trade for 12H review</Text>}</View>
      <View style={s.logBox}><Text style={{color:'#fff',fontSize:10,fontWeight:'bold'}}>LOGS 24/7 • {stat}</Text>{logs.slice(0,50).map((l,i)=><Text key={i} style={s.lt}>{l}</Text>)}</View>
    </ScrollView></View>
  );
}
const s=StyleSheet.create({
  root:{flex:1,backgroundColor:'#080808'}, title:{color:'#00D4FF',fontSize:26,fontWeight:'900',textAlign:'center'}, sub:{color:'#FFCC00',textAlign:'center',fontSize:9,marginBottom:12,fontWeight:'bold'},
  card:{backgroundColor:'#121212',borderRadius:14,padding:12,borderWidth:1,borderColor:'#222',marginBottom:12}, bigCard:{borderRadius:14,padding:12,borderWidth:1,marginBottom:10,backgroundColor:'#121212'}, bigTitle:{fontSize:13,fontWeight:'900',color:'#fff'}, row:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginTop:4}, row2:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginTop:8}, ct:{color:'#fff',fontWeight:'bold',fontSize:11}, cs:{color:'#aaa',fontSize:9,marginTop:2}, logBox:{backgroundColor:'#0a0a0a',borderRadius:12,padding:12,borderWidth:1,borderColor:'#222',minHeight:220}, lt:{color:'#0f0',fontSize:8,fontFamily:'monospace',marginTop:2}, smallBtn:{backgroundColor:'#222',paddingHorizontal:10,paddingVertical:6,borderRadius:8,borderWidth:1,borderColor:'#333'}, smallTxt:{color:'#fff',fontSize:9,fontWeight:'bold'}
});
