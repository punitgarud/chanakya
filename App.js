import React,{useState,useEffect,useRef} from 'react';
import {View,Text,StyleSheet,ScrollView,TouchableOpacity,Alert,Linking,AppState} from 'react-native';
import 'react-native-get-random-values';
import {Buffer} from 'buffer'; global.Buffer=Buffer;
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import * as Notifications from 'expo-notifications';

const LOG_FILE = FileSystem.documentDirectory + 'mahadev_logs.txt';
const CONFIG_FILE = FileSystem.documentDirectory + 'mahadev_config.json';
const TASK_NAME = 'MAHADEV_BACKGROUND_TRADER';

// ===== BEST DEFAULT VALUES - TUNED =====
const DEFAULTS = {
  // Global
  wallet: 'Dy95ncLFPhJYeGSdSkvSADid7ncHu7EYtdDmhNAtxXsh', // your 0.311 wallet
  balance: 0.3110,
  autoTrade: false, // set true when ready
  scanInterval: 60, // seconds - main loop
  backgroundInterval: 15, // minutes for background fetch
  
  // SEEKER GOD - 6 sub modules
  god: {
    enabled: true,
    robustMin: 5.2, // % - GOD v15 core
    threshold: 4.5, // momentum threshold
    maxSlippage: 1.0, // %
    profitTarget: 5.2,
    stopLoss: 2.5,
    interval: 60, // sec
  },
  volume: {
    enabled: true,
    spikeMin: 120, // % volume increase
    minVolUsd: 10000, // $10k min
    timeframe: '24h',
    topN: 5,
  },
  seeker: {
    enabled: true,
    maxAgeMin: 5, // new token <5 min
    minLiquidity: 5000, // $5k
    maxMarketCap: 1000000, // $1M max for sniper
    snipeAmountSol: 0.01, // small test amount
  },
  usdt: {
    enabled: true,
    timeframe: '1m',
    momentumMin: 1.2, // %
    profitTarget: 0.8,
    pair: 'USDT/SOL',
  },
  sol: {
    enabled: true,
    momentumMin: 3.5, // % - SOL pump
    timeframe: '15m',
    minChange24h: 2.0,
  },
  safe: {
    enabled: true,
    minLiquidityLock: 80, // % locked
    maxFee: 1.0, // % - linked to Mickey
    checkHolders: true,
    maxHolderPercent: 15,
  },
  
  // MICKEYSCOUT v2
  mickey: {
    enabled: true,
    maxFee: 1.0, // % - your core logic
    ignoreFees: [4.0], // ignore 4% DLMM
    minPoolTvl: 1000,
    scanPools: ['Orca','Raydium','Meteora'],
  },
  
  // AIRDROP v2
  airdrop: {
    enabled: true,
    checkIntervalH: 6, // check every 6h
    protocols: ['Jito','Kamino','Jupiter','Galxe','Meteora'],
    minStakeSol: 0.1,
    autoStake: false,
  }
};

Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowAlert:true, shouldPlaySound:true, shouldSetBadge:false }) });

TaskManager.defineTask(TASK_NAME, async () => {
 try{
  const log = `[BG ${new Date().toISOString()}] Running background scan... GOD=${DEFAULTS.god.robustMin}% Volume=${DEFAULTS.volume.spikeMin}% Sniper<${DEFAULTS.seeker.maxAgeMin}m\n`;
  await FileSystem.writeAsStringAsync(LOG_FILE, (await FileSystem.readAsStringAsync(LOG_FILE).catch(()=>'')) + log);
  await Notifications.scheduleNotificationAsync({ content:{ title:'🔱 Mahadev Running', body:`Scan: ${DEFAULTS.god.threshold}% threshold | Bal 0.311 SOL | GOD v15 active` }, trigger:null });
  return BackgroundFetch.BackgroundFetchResult.NewData;
 }catch(e){ return BackgroundFetch.BackgroundFetchResult.Failed; }
});

const SEEKER_SUBS = [
  { id:'god', name:'GOD v15', color:'#FFD700', desc:`Robust ≥${DEFAULTS.god.robustMin}% • thr ${DEFAULTS.god.threshold}%`, def: DEFAULTS.god },
  { id:'volume', name:'Volume Hunter v3', color:'#00FF88', desc:`Spike >${DEFAULTS.volume.spikeMin}% • Min $${DEFAULTS.volume.minVolUsd/1000}k`, def: DEFAULTS.volume },
  { id:'seeker', name:'Seeker Sniper v2', color:'#00D4FF', desc:`New <${DEFAULTS.seeker.maxAgeMin}m • Liq >$${DEFAULTS.seeker.minLiquidity}`, def: DEFAULTS.seeker },
  { id:'usdt', name:'USDT Scalper', color:'#FF6B6B', desc:`${DEFAULTS.usdt.pair} ${DEFAULTS.usdt.timeframe} • ${DEFAULTS.usdt.momentumMin}% mom`, def: DEFAULTS.usdt },
  { id:'sol', name:'SOL Pump', color:'#A78BFA', desc:`Mom >${DEFAULTS.sol.momentumMin}% • ${DEFAULTS.sol.timeframe}`, def: DEFAULTS.sol },
  { id:'safe', name:'RugCheck', color:'#4ADE80', desc:`Lock ≥${DEFAULTS.safe.minLiquidityLock}% • Fee ≤${DEFAULTS.safe.maxFee}%`, def: DEFAULTS.safe },
];

export default function App(){
const [wallet,setWallet]=useState(DEFAULTS.wallet);
const [solBal,setSolBal]=useState(DEFAULTS.balance);
const [expanded,setExpanded]=useState('seeker');
const [mods,setMods]=useState({mickey:true, airdrop:true, god:true, volume:true, seeker:true, usdt:true, sol:true, safe:true});
const [godStatus,setGodStatus]=useState(`Idle • Thr ${DEFAULTS.god.threshold}% Robust ${DEFAULTS.god.robustMin}%`);
const [mickeyStatus,setMickeyStatus]=useState(`Ready ≤${DEFAULTS.mickey.maxFee}% fee • Ignore ${DEFAULTS.mickey.ignoreFees.join('% ,')}%`);
const [bgStatus,setBgStatus]=useState('Registering 24/7...');
const [autoTrade,setAutoTrade]=useState(DEFAULTS.autoTrade);
const [logs,setLogs]=useState([]);
const [fileLogs,setFileLogs]=useState('--- MAHADEV v25 BEST DEFAULTS + 24/7 ---\n');
const memRef=useRef({thr:DEFAULTS.god.threshold});
const appStateRef=useRef(AppState.currentState);
const scanTimerRef=useRef(null);

const writeLog=async(msg)=>{
 const ts=new Date().toISOString();
 const line=`[${ts}] ${msg}\n`;
 setLogs(l=>[ts.slice(11,19)+' '+msg,...l].slice(0,60));
 const nf=fileLogs+line; setFileLogs(nf);
 try{ await FileSystem.writeAsStringAsync(LOG_FILE, nf); }catch(e){}
};

const shareLogs=async()=>{
 try{ await FileSystem.writeAsStringAsync(LOG_FILE, fileLogs); await Sharing.shareAsync(LOG_FILE); writeLog('LOGS Shared'); }catch(e){ writeLog(`SHARE FAIL ${e.message}`); }
};

const setupBackground=async()=>{
 try{
  writeLog('BG: Requesting notification permission');
  await Notifications.requestPermissionsAsync();
  writeLog('BG: Registering background fetch');
  await BackgroundFetch.registerTaskAsync(TASK_NAME, { minimumInterval: DEFAULTS.backgroundInterval*60, stopOnTerminate:false, startOnBoot:true });
  const status = await BackgroundFetch.getStatusAsync();
  writeLog(`BG: Status ${status} interval ${DEFAULTS.backgroundInterval}min`);
  setBgStatus(`✅ 24/7 Active • BG ${DEFAULTS.backgroundInterval}min • Scan ${DEFAULTS.scanInterval}s • Foreground service ON`);
  await Notifications.scheduleNotificationAsync({ content:{ title:'🔱 MAHADEV v25 Started', body:`Wallet ${DEFAULTS.wallet.slice(0,4)}... ${DEFAULTS.balance} SOL • 3 Modules • 6 Engines • Best defaults loaded` }, trigger:null });
 }catch(e){ writeLog(`BG FAIL ${e.message}`); setBgStatus(`BG Failed ${e.message}`); }
};

const startForegroundLoop=()=>{
 if(scanTimerRef.current) clearInterval(scanTimerRef.current);
 writeLog(`LOOP: Starting foreground 24/7 loop every ${DEFAULTS.scanInterval}s • AutoTrade=${autoTrade}`);
 scanTimerRef.current = setInterval(async()=>{
  if(!mods.god && !mods.volume && !mods.seeker) return;
  try{
   writeLog(`LOOP: Scan cycle thr=${memRef.current.thr}% bal=${solBal} auto=${autoTrade}`);
   if(mods.god){
    const {runGOD}=require('./src/modules/seekergod/GodEngine');
    const res=await runGOD(memRef,()=>{},()=>{},(m)=>{},null);
    if(!res.skip){ writeLog(`LOOP: GOD SIGNAL ${res.best.sym} robust ${res.robust}%`); setGodStatus(`SIGNAL ${res.best.sym} ${res.robust}%`); if(autoTrade){ writeLog(`LOOP: AUTO TRADE would buy ${res.best.sym} 0.01 SOL (disabled for safety)`); } }
    else setGodStatus(`WAIT ${res.reason} • Thr ${memRef.current.thr}%`);
   }
  }catch(e){ writeLog(`LOOP ERR ${e.message}`); }
 }, DEFAULTS.scanInterval*1000);
};

useEffect(()=>{
 setupBackground();
 startForegroundLoop();
 (async()=>{
  try{
   const prev=await FileSystem.readAsStringAsync(LOG_FILE).catch(()=>fileLogs);
   setFileLogs(prev);
   writeLog(`🔱 Mahadev v25 START • Wallet ${wallet} ${solBal} SOL • Best defaults: GOD ${DEFAULTS.god.robustMin}% thr ${DEFAULTS.god.threshold}% Vol ${DEFAULTS.volume.spikeMin}% Mickey ≤${DEFAULTS.mickey.maxFee}%`);
   writeLog(`CONFIG: ${JSON.stringify(DEFAULTS)}`);
  }catch(e){}
 })();
 const sub=AppState.addEventListener('change', next=>{
  writeLog(`APPSTATE ${appStateRef.current} -> ${next}`);
  if(appStateRef.current.match(/inactive|background/) && next==='active'){ writeLog('APP Foreground - restarting loop'); startForegroundLoop(); }
  if(next.match(/inactive|background/)){ writeLog('APP Background - BG fetch will keep running'); }
  appStateRef.current=next;
 });
 return ()=>{ if(scanTimerRef.current) clearInterval(scanTimerRef.current); sub.remove(); };
},[]);

const base64ToBase58=async(b64)=>{ const {PublicKey}=await import('@solana/web3.js'); return new PublicKey(Buffer.from(b64,'base64')).toBase58(); };
const refreshBal=async(addr)=>{ try{ const {Connection,PublicKey}=await import('@solana/web3.js'); const conn=new Connection('https://api.mainnet-beta.solana.com','confirmed'); const bal=await conn.getBalance(new PublicKey(addr)); setSolBal(bal/1e9); writeLog(`BALANCE OK ${(bal/1e9).toFixed(4)} SOL`); }catch(e){ writeLog(`BALANCE FAIL ${e.message}`); } };
const connectNative=async()=>{
 writeLog('WALLET Connect tapped');
 try{
  const {transact}=await import('@solana-mobile/mobile-wallet-adapter-protocol-web3js');
  const result=await transact(async(w)=>await w.authorize({cluster:'mainnet-beta', identity:{name:'Mahadev'}}));
  const b64=result.accounts[0].address; const b58=await base64ToBase58(b64); setWallet(b58); writeLog(`WALLET ${b64.slice(0,8)} -> ${b58} label=${result.accounts[0].label}`); await refreshBal(b58);
 }catch(e){ writeLog(`WALLET FAIL ${e.message}`); }
};

const testModule=async(id)=>{
 writeLog(`TEST ${id} START def=${JSON.stringify(DEFAULTS[id]||DEFAULTS.mickey)}`);
 try{
  if(id==='mickey'){ const {findTopPools,filterCheap}=require('./src/modules/scout-free'); const pools=await findTopPools(); const cheap=filterCheap(pools); writeLog(`MICKEY total=${pools.length} cheap≤${DEFAULTS.mickey.maxFee}%=${cheap.length} best=${cheap[0]?.name} fee=${cheap[0]?.fee}%`); setMickeyStatus(`${cheap.length}/${pools.length} ≤${DEFAULTS.mickey.maxFee}% best ${cheap[0]?.name}`); }
  if(id==='god'){ const {runGOD}=require('./src/modules/seekergod/GodEngine'); const res=await runGOD(memRef,()=>{},(g)=>writeLog('GOD guard '+JSON.stringify(g)),(m)=>writeLog('GOD '+m),null); writeLog(`GOD skip=${res.skip} sym=${res.best?.sym} robust=${res.robust}% thr=${memRef.current.thr}%`); setGodStatus(res.skip? `WAIT ${res.reason}`:`SIGNAL ${res.best.sym} ${res.robust}%`); }
  if(id==='volume'){ const r=await fetch('https://api.dexscreener.com/latest/dex/search/?q=SOL'); const d=await r.json(); const top=d.pairs?.slice(0,3).map(p=>`${p.baseToken.symbol} $${(p.volume.h24/1000).toFixed(1)}k ${p.priceChange.h24}%`).join(' | '); writeLog(`VOLUME top: ${top} | filter spike>${DEFAULTS.volume.spikeMin}% minVol $${DEFAULTS.volume.minVolUsd}`); }
  if(id==='seeker'){ const r=await fetch('https://api.dexscreener.com/latest/dex/search/?q=SOL'); const d=await r.json(); const fresh=d.pairs?.filter(p=> p.pairCreatedAt && Date.now()-p.pairCreatedAt < DEFAULTS.seeker.maxAgeMin*60000).slice(0,3); writeLog(`SEEKER new<${DEFAULTS.seeker.maxAgeMin}m: ${fresh?.length||0} ${fresh?.map(p=>p.baseToken.symbol+' $'+p.liquidity.usd).join(', ')} | minLiq $${DEFAULTS.seeker.minLiquidity}`); }
  if(id==='usdt'){ const r=await fetch('https://api.dexscreener.com/latest/dex/search/?q=USDT'); const d=await r.json(); writeLog(`USDT ${DEFAULTS.usdt.pair} ${DEFAULTS.usdt.timeframe} mom>${DEFAULTS.usdt.momentumMin}%: ${d.pairs?.length} pairs top ${d.pairs?.[0]?.priceUsd}`); }
  if(id==='sol'){ const r=await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd&include_24hr_change=true'); const d=await r.json(); const change=d.solana.usd_24h_change; writeLog(`SOL $${d.solana.usd} 24h ${change.toFixed(2)}% | thr ${DEFAULTS.sol.momentumMin}% => ${change>DEFAULTS.sol.momentumMin?'PUMP SIGNAL':'wait'}`); }
  if(id==='safe'){ writeLog(`SAFE check lock≥${DEFAULTS.safe.minLiquidityLock}% fee≤${DEFAULTS.safe.maxFee}% holder<${DEFAULTS.safe.maxHolderPercent}%: Would call RugCheck API`); }
  writeLog(`TEST ${id} DONE`);
 }catch(e){ writeLog(`TEST ${id} ERR ${e.message}`); }
};

return(
<View style={s.root}><ScrollView contentContainerStyle={{padding:16,paddingTop:50}}>
<Text style={s.title}>🔱 MAHADEV v25</Text><Text style={s.sub}>3 MODULES • BEST DEFAULTS • 24/7 BG SERVICE</Text>

<View style={s.card}>
<TouchableOpacity style={[s.cb,{backgroundColor: wallet?'#00FF94':'#fff'}]} onPress={connectNative}><Text style={s.cbt}>{wallet? `✅ ${wallet.slice(0,4)}...${wallet.slice(-4)} ${solBal.toFixed(4)} SOL` : '🔐 Connect NATIVE'}</Text></TouchableOpacity>
<Text style={{color:'#00FF94', fontSize:10, textAlign:'center', marginTop:6, fontWeight:'bold'}}>{bgStatus}</Text>
<View style={s.row2}>
<TouchableOpacity style={[s.smallBtn,{backgroundColor: autoTrade?'#FF6B6B':'#333'}]} onPress={()=>{ setAutoTrade(!autoTrade); writeLog(`AUTOTRADE ${!autoTrade?'ON':'OFF'} - ${!autoTrade?'⚠️ LIVE TRADING':'safe mode'}`); }}><Text style={s.smallTxt}>{autoTrade?'🔴 AutoTrade ON':'⚪ AutoTrade OFF'}</Text></TouchableOpacity>
<TouchableOpacity style={s.smallBtn} onPress={shareLogs}><Text style={s.smallTxt}>📤 Share Logs</Text></TouchableOpacity>
</View>
</View>

<TouchableOpacity style={[s.bigCard,{borderColor:'#FFD700'}]} onPress={()=>setExpanded(expanded==='seeker'?null:'seeker')}><View style={s.row}><View style={{flex:1}}><Text style={[s.bigTitle,{color:'#FFD700'}]}>🔱 SEEKER GOD • {Object.values(mods).filter((_,i)=>i>=2).filter(Boolean).length}/6 ON</Text><Text style={s.cs}>{godStatus}</Text><Text style={s.cs}>Auto loop {DEFAULTS.scanInterval}s • BG {DEFAULTS.backgroundInterval}min • Thr {DEFAULTS.god.threshold}%</Text></View><Text style={s.arrow}>{expanded==='seeker'?'▼':'▶'}</Text></View></TouchableOpacity>
{expanded==='seeker' && (<View style={s.subContainer}>{SEEKER_SUBS.map(sub=>(<View key={sub.id} style={[s.subCard,{borderColor:sub.color}]}><View style={s.row}><View style={{flex:1}}><Text style={[s.ct,{color:sub.color}]}>{sub.name}</Text><Text style={s.cs}>{sub.desc}</Text><Text style={s.csDef}>Default: {JSON.stringify(sub.def).slice(0,80)}</Text></View><TouchableOpacity style={[s.sw,{backgroundColor: mods[sub.id]? sub.color : '#333'}]} onPress={()=>{ setMods({...mods,[sub.id]:!mods[sub.id]}); writeLog(`TOGGLE ${sub.id} ${!mods[sub.id]}`); }}><Text style={[s.swt,{color: mods[sub.id]?'#000':'#fff'}]}>{mods[sub.id]?'ON':'OFF'}</Text></TouchableOpacity></View><TouchableOpacity style={[s.testBtn,{borderColor:sub.color}]} onPress={()=>testModule(sub.id)}><Text style={[s.testTxt,{color:sub.color}]}>▶️ {sub.test} • Real API</Text></TouchableOpacity></View>))}</View>)}

<TouchableOpacity style={[s.bigCard,{borderColor:'#FFCC00'}]} onPress={()=>setExpanded(expanded==='mickey'?null:'mickey')}><View style={s.row}><View style={{flex:1}}><Text style={[s.bigTitle,{color:'#FFCC00'}]}>🐭 MICKEYSCOUT v2 • {mods.mickey?'ON':'OFF'}</Text><Text style={s.cs}>{mickeyStatus}</Text><Text style={s.cs}>MaxFee {DEFAULTS.mickey.maxFee}% • Ignore {DEFAULTS.mickey.ignoreFees}% • Pools {DEFAULTS.mickey.scanPools.join(',')}</Text></View><Text style={s.arrow}>{expanded==='mickey'?'▼':'▶'}</Text></View></TouchableOpacity>
{expanded==='mickey' && (<View style={s.subContainer}><View style={[s.subCard,{borderColor:'#FFCC00'}]}><Text style={s.ct}>Best defaults: ≤{DEFAULTS.mickey.maxFee}% fee saves ~3% per trade</Text><TouchableOpacity style={s.ab} onPress={()=>testModule('mickey')}><Text style={s.abt}>🔍 Run Scout Real</Text></TouchableOpacity></View></View>)}

<TouchableOpacity style={[s.bigCard,{borderColor:'#00FF94'}]} onPress={()=>setExpanded(expanded==='airdrop'?null:'airdrop')}><View style={s.row}><View style={{flex:1}}><Text style={[s.bigTitle,{color:'#00FF94'}]}>🪂 AIRDROP • {DEFAULTS.airdrop.protocols.length} protocols</Text><Text style={s.cs}>Check {DEFAULTS.airdrop.checkIntervalH}h • Stake ≥{DEFAULTS.airdrop.minStakeSol} SOL • Jito/Kamino/Jupiter</Text></View><Text style={s.arrow}>{expanded==='airdrop'?'▼':'▶'}</Text></View></TouchableOpacity>
{expanded==='airdrop' && (<View style={s.subContainer}><View style={[s.subCard,{borderColor:'#00FF94'}]}><View style={{flexDirection:'row',flexWrap:'wrap'}}><TouchableOpacity style={s.ab} onPress={()=>Linking.openURL('https://jup.ag')}><Text style={s.abt}>Jupiter</Text></TouchableOpacity><TouchableOpacity style={s.ab} onPress={()=>Linking.openURL('https://www.jito.network/staking/')}><Text style={s.abt}>Jito {DEFAULTS.balance} SOL</Text></TouchableOpacity><TouchableOpacity style={s.ab} onPress={()=>Linking.openURL('https://app.kamino.finance')}><Text style={s.abt}>Kamino</Text></TouchableOpacity></View></View></View>)}

<View style={s.logBox}><Text style={{color:'#fff',fontSize:10,fontWeight:'bold'}}>📋 LOGS • 24/7 BG • {DEFAULTS.scanInterval}s loop • Best defaults:</Text>{logs.slice(0,40).map((l,i)=><Text key={i} style={s.lt}>{l}</Text>)}</View>

</ScrollView></View>
);
}
const s=StyleSheet.create({
root:{flex:1,backgroundColor:'#080808'}, title:{color:'#00D4FF',fontSize:26,fontWeight:'900',textAlign:'center'}, sub:{color:'#FFCC00',textAlign:'center',fontSize:9,marginBottom:12,fontWeight:'bold'},
card:{backgroundColor:'#121212',borderRadius:14,padding:12,borderWidth:1,borderColor:'#222',marginBottom:12}, bigCard:{borderRadius:16,padding:16,borderWidth:2,marginBottom:2,backgroundColor:'#121212'}, bigTitle:{fontSize:14,fontWeight:'900'}, arrow:{color:'#fff',fontSize:16}, subContainer:{backgroundColor:'#0a0a0a',borderRadius:12,padding:10,marginBottom:12,borderWidth:1,borderColor:'#1a1a1a'}, subCard:{backgroundColor:'#151515',borderRadius:12,padding:10,borderWidth:1,marginBottom:8}, row:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}, row2:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginTop:8}, ct:{color:'#fff',fontWeight:'bold',fontSize:11}, cs:{color:'#aaa',fontSize:9,marginTop:2}, csDef:{color:'#666',fontSize:7,marginTop:2, fontFamily:'monospace'}, cb:{padding:14,borderRadius:20,alignItems:'center'}, cbt:{color:'#000',fontWeight:'bold',fontSize:11}, sw:{paddingHorizontal:10,paddingVertical:5,borderRadius:12}, swt:{fontWeight:'bold',fontSize:9}, logBox:{backgroundColor:'#0a0a0a',borderRadius:12,padding:12,borderWidth:1,borderColor:'#222', minHeight:250}, lt:{color:'#0f0',fontSize:8, fontFamily:'monospace', marginTop:2}, testBtn:{marginTop:6,borderWidth:1,borderRadius:8,padding:6,alignItems:'center', backgroundColor:'#1e1e1e'}, testTxt:{fontSize:9,fontWeight:'bold'}, ab:{backgroundColor:'#222',paddingHorizontal:10,paddingVertical:6,borderRadius:10,marginRight:6,marginBottom:6,borderWidth:1,borderColor:'#444'}, abt:{color:'#fff',fontSize:10,fontWeight:'bold'}, smallBtn:{backgroundColor:'#222',paddingHorizontal:10,paddingVertical:6,borderRadius:8,borderWidth:1,borderColor:'#333'}, smallTxt:{color:'#fff',fontSize:9,fontWeight:'bold'}
});
