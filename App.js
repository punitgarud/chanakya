import React,{useState,useEffect,useRef} from 'react';
import {View,Text,StyleSheet,ScrollView,TouchableOpacity,Alert,Linking} from 'react-native';
import 'react-native-get-random-values';
import {Buffer} from 'buffer'; global.Buffer=Buffer;
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const LOG_FILE = FileSystem.documentDirectory + 'mahadev_logs.txt';

const MODULES = [
  { id:'mickey', name:'MickeyScout v2', color:'#FFCC00', desc:'1% fee filter', type:'scout', test:'Test Scout' },
  { id:'airdrop', name:'Airdrop Helper v2', color:'#00FF94', desc:'Jito/Kamino', type:'airdrop', test:'Test Airdrop Links' },
  { id:'god', name:'GOD v15', color:'#FFD700', desc:'Robust 5.2%', type:'trade', test:'Test GOD Engine' },
  { id:'volume', name:'Volume Hunter v3', color:'#00FF88', desc:'Volume >120%', type:'trade', test:'Test Volume Scan' },
  { id:'seeker', name:'Seeker Sniper v2', color:'#00D4FF', desc:'New token sniper', type:'trade', test:'Test Sniper' },
  { id:'usdt', name:'USDT Scalper', color:'#FF6B6B', desc:'USDT/SOL', type:'trade', test:'Test Scalper' },
  { id:'sol', name:'SOL Pump', color:'#A78BFA', desc:'SOL >3.5%', type:'trade', test:'Test SOL Pump' },
  { id:'safe', name:'RugCheck', color:'#4ADE80', desc:'Liquidity lock', type:'safety', test:'Test RugCheck' },
];

export default function App(){
const [wallet,setWallet]=useState(null);
const [solBal,setSolBal]=useState(0);
const [mods,setMods]=useState({mickey:true, airdrop:true, god:true, volume:true, seeker:true, usdt:true, sol:true, safe:true});
const [godStatus,setGodStatus]=useState('Idle');
const [logs,setLogs]=useState([]);
const [fileLogs,setFileLogs]=useState('--- MAHADEV LOG START ---\n');
const memRef=useRef({thr:4.5});

const writeLog=async(msg)=>{
 const ts = new Date().toISOString();
 const line = `[${ts}] ${msg}\n`;
 setLogs(l=>[ts.slice(11,19)+' '+msg,...l].slice(0,50));
 const newFile = fileLogs + line;
 setFileLogs(newFile);
 try{ await FileSystem.writeAsStringAsync(LOG_FILE, newFile); }catch(e){ console.log('file write err',e); }
};

const loadLogs=async()=>{
 try{ const f = await FileSystem.readAsStringAsync(LOG_FILE); setFileLogs(f); const lines = f.split('\n').slice(-50).reverse(); setLogs(lines); }catch(e){ writeLog('No previous log file, starting fresh'); }
};

const shareLogs=async()=>{
 try{
  await FileSystem.writeAsStringAsync(LOG_FILE, fileLogs);
  if(await Sharing.isAvailableAsync()){
    await Sharing.shareAsync(LOG_FILE, { mimeType:'text/plain', dialogTitle:'Share Mahadev Logs' });
    writeLog('Logs shared');
  } else {
    Alert.alert('Log file location', LOG_FILE + '\n\n' + fileLogs.slice(-2000));
  }
 }catch(e){ Alert.alert('Share failed', e.message); writeLog('Share err '+e.message); }
};

const clearLogs=async()=>{
 try{ await FileSystem.deleteAsync(LOG_FILE, {idempotent:true}); setFileLogs('--- LOG CLEARED ---\n'); setLogs([]); writeLog('Logs cleared'); }catch(e){ writeLog('Clear err '+e.message); }
};

useEffect(()=>{ loadLogs(); writeLog('🔱 Mahadev v21 started - Logger active'); },[]);

const refreshBal=async(addr)=>{
 try{
  writeLog(`BALANCE: Fetching for ${addr}`);
  const {Connection,PublicKey}=await import('@solana/web3.js');
  const conn=new Connection('https://api.mainnet-beta.solana.com','confirmed');
  const bal=await conn.getBalance(new PublicKey(addr)); setSolBal(bal/1e9);
  writeLog(`BALANCE: SUCCESS ${ (bal/1e9).toFixed(4)} SOL for ${addr.slice(0,6)}...`);
 }catch(e){ writeLog(`BALANCE: FAIL ${e.message}`); }
};

const connectNative=async()=>{
 writeLog('WALLET: Connect tapped');
 try{
  const {transact}=await import('@solana-mobile/mobile-wallet-adapter-protocol-web3js');
  writeLog('WALLET: MWA imported, calling transact.authorize');
  const result = await transact(async(w)=>{
    writeLog('WALLET: Inside transact, calling authorize mainnet-beta Mahadev');
    const auth = await w.authorize({ cluster:'mainnet-beta', identity:{name:'Mahadev', uri:'https://mahadev.app'}});
    writeLog(`WALLET: Authorize success accounts=${auth.accounts.length}`);
    return auth;
  });
  const addr = result.accounts[0].address;
  setWallet(addr);
  global.MAHADEV_WALLET = { address:addr, authToken: result.auth_token };
  writeLog(`WALLET: CONNECTED addr=${addr} token_len=${result.auth_token?.length||0}`);
  await refreshBal(addr);
  Alert.alert('Connected', addr);
 }catch(e){
  writeLog(`WALLET: FAIL ${e.message} stack=${e.stack||''}`);
  Alert.alert('Connect failed', e.message);
 }
};

const testModule=async(id)=>{
 writeLog(`TEST: ${id} tapped, mods[${id}]=${mods[id]}`);
 try{
  if(id==='mickey'){
    writeLog('TEST MICKEY: Importing scout-free');
    const {findTopPools, filterCheap}=require('./src/modules/scout-free');
    writeLog('TEST MICKEY: findTopPools() calling');
    const pools=await findTopPools();
    writeLog(`TEST MICKEY: Got ${pools.length} pools`);
    const cheap=filterCheap(pools);
    writeLog(`TEST MICKEY: Cheap ≤1% = ${cheap.length}, expensive 4% = ${pools.length-cheap.length}, best=${cheap[0]?.name} fee=${cheap[0]?.fee}`);
    setGodStatus(`Mickey: ${cheap.length}/${pools.length} cheap`);
  }
  if(id==='god'){
    writeLog('TEST GOD: Importing GodEngine');
    const {runGOD}=require('./src/modules/seekergod/GodEngine');
    writeLog('TEST GOD: runGOD() calling');
    const res=await runGOD(memRef,()=>{},(g)=>writeLog('TEST GOD: Guards '+JSON.stringify(g)), (m)=>writeLog('TEST GOD: Log '+m), null);
    writeLog(`TEST GOD: Result skip=${res.skip} reason=${res.reason||''} robust=${res.robust||''} sym=${res.best?.sym||''}`);
    setGodStatus(res.skip? 'WAIT '+res.reason : `SIGNAL ${res.best.sym} ${res.robust}%`);
  }
  if(id==='volume'){ writeLog('TEST VOLUME: Scanning (placeholder) - would call Raydium volume API'); }
  if(id==='seeker'){ writeLog('TEST SEEKER: Sniper check (placeholder) - would scan new tokens <5m'); }
  if(id==='usdt'){ writeLog('TEST USDT: Scalper check (placeholder) - would check USDT/SOL 1m'); }
  if(id==='sol'){ writeLog('TEST SOL: Pump check (placeholder) - would check SOL momentum'); }
  if(id==='safe'){ writeLog('TEST SAFE: RugCheck (placeholder) - would check liquidity lock'); }
  if(id==='airdrop'){
    writeLog('TEST AIRDROP: Links available - Jupiter, Jito, Kamino, Galxe');
    writeLog('TEST AIRDROP: Opening Jupiter would be next');
  }
  writeLog(`TEST: ${id} DONE`);
 }catch(e){
  writeLog(`TEST: ${id} ERROR ${e.message} ${e.stack||''}`);
 }
};

return(
<View style={s.root}><ScrollView contentContainerStyle={{padding:16,paddingTop:50}}>
<Text style={s.title}>🔱 MAHADEV TRISHUL v21</Text><Text style={s.sub}>LOGGER + 8 MODULES • NATIVE FIX</Text>

<View style={s.card}>
<TouchableOpacity style={[s.cb,{backgroundColor: wallet?'#00FF94':'#fff'}]} onPress={connectNative}><Text style={s.cbt}>{wallet? '✅ '+wallet.slice(0,6)+'... '+solBal.toFixed(4)+' SOL' : '🔐 Connect NATIVE'}</Text></TouchableOpacity>
<Text style={s.bv}>SOL {solBal.toFixed(4)} | Active {Object.values(mods).filter(Boolean).length}/8</Text>
<View style={s.row2}>
<TouchableOpacity style={s.smallBtn} onPress={shareLogs}><Text style={s.smallTxt}>📤 Share Logs</Text></TouchableOpacity>
<TouchableOpacity style={s.smallBtn} onPress={clearLogs}><Text style={s.smallTxt}>🗑️ Clear Logs</Text></TouchableOpacity>
<TouchableOpacity style={s.smallBtn} onPress={loadLogs}><Text style={s.smallTxt}>🔄 Reload</Text></TouchableOpacity>
</View>
<Text style={{color:'#666',fontSize:8,marginTop:6}}>Log file: {LOG_FILE}</Text>
</View>

{MODULES.map(m=>(
<View key={m.id} style={[s.card,{borderColor:m.color, borderWidth: mods[m.id]?1.5:0.5}]}>
<View style={s.row}><View style={{flex:1}}><Text style={[s.ct,{color:m.color}]}>{m.name}</Text><Text style={s.cs}>{m.id==='god'? godStatus : m.desc}</Text></View>
<TouchableOpacity style={[s.sw,{backgroundColor: mods[m.id]? m.color : '#333'}]} onPress={()=>{ writeLog(`TOGGLE: ${m.id} ${mods[m.id]}->${!mods[m.id]}`); setMods({...mods, [m.id]:!mods[m.id]}); }}><Text style={[s.swt,{color: mods[m.id]?'#000':'#fff'}]}>{mods[m.id]?'ON':'OFF'}</Text></TouchableOpacity></View>
<TouchableOpacity style={[s.testBtn,{borderColor:m.color}]} onPress={()=>testModule(m.id)}><Text style={[s.testTxt,{color:m.color}]}>▶️ {m.test} - Log it</Text></TouchableOpacity>
</View>
))}

<View style={s.logBox}>
<Text style={{color:'#fff',fontSize:10,fontWeight:'bold',marginBottom:6}}>📋 LIVE LOGS (last 50) - Share button to send me full file:</Text>
{logs.map((l,i)=><Text key={i} style={s.lt}>{l}</Text>)}
</View>

</ScrollView></View>
);
}
const s=StyleSheet.create({
root:{flex:1,backgroundColor:'#080808'}, title:{color:'#00D4FF',fontSize:20,fontWeight:'900',textAlign:'center'}, sub:{color:'#FFCC00',textAlign:'center',fontSize:9,marginBottom:10,fontWeight:'bold'},
card:{backgroundColor:'#121212',borderRadius:14,padding:12,borderWidth:1,borderColor:'#222',marginBottom:10}, row:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}, row2:{flexDirection:'row',justifyContent:'space-between',marginTop:10}, ct:{color:'#fff',fontWeight:'bold',fontSize:13}, cs:{color:'#aaa',fontSize:10,marginTop:3}, cb:{backgroundColor:'#fff',padding:14,borderRadius:20,alignItems:'center'}, cbt:{color:'#000',fontWeight:'bold',fontSize:12}, bv:{color:'#fff',textAlign:'center',marginTop:8,fontWeight:'bold',fontSize:11}, sw:{backgroundColor:'#333',paddingHorizontal:12,paddingVertical:6,borderRadius:12}, swt:{color:'#fff',fontWeight:'bold',fontSize:11}, logBox:{backgroundColor:'#0a0a0a',borderRadius:12,padding:12,borderWidth:1,borderColor:'#1a1a1a', minHeight:200, marginBottom:30}, lt:{color:'#0f0',fontSize:9,marginBottom:2, fontFamily:'monospace'}, testBtn:{marginTop:8,borderWidth:1,borderRadius:8,padding:8,alignItems:'center', backgroundColor:'#1a1a1a'}, testTxt:{fontSize:10,fontWeight:'bold'}, smallBtn:{backgroundColor:'#222',paddingHorizontal:10,paddingVertical:6,borderRadius:8,borderWidth:1,borderColor:'#333'}, smallTxt:{color:'#fff',fontSize:9,fontWeight:'bold'}
});
