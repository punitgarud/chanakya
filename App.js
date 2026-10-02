import React,{useState,useEffect,useRef} from 'react';
import {View,Text,StyleSheet,ScrollView,TouchableOpacity,Alert,Linking} from 'react-native';
import 'react-native-get-random-values';
import {Buffer} from 'buffer'; global.Buffer=Buffer;
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const LOG_FILE = FileSystem.documentDirectory + 'mahadev_logs.txt';

const SEEKER_SUBS = [
  { id:'god', name:'GOD v15', color:'#FFD700', desc:'Robust 5.2% core engine', test:'Test GOD' },
  { id:'volume', name:'Volume Hunter v3', color:'#00FF88', desc:'Volume spike >120%', test:'Test Volume' },
  { id:'seeker', name:'Seeker Sniper v2', color:'#00D4FF', desc:'New token sniper <5m', test:'Test Sniper' },
  { id:'usdt', name:'USDT Scalper', color:'#FF6B6B', desc:'USDT/SOL 1m scalp', test:'Test Scalper' },
  { id:'sol', name:'SOL Pump', color:'#A78BFA', desc:'SOL momentum >3.5%', test:'Test Pump' },
  { id:'safe', name:'RugCheck', color:'#4ADE80', desc:'Liquidity lock safety', test:'Test Rug' },
];

export default function App(){
const [wallet,setWallet]=useState(null);
const [solBal,setSolBal]=useState(0);
const [expanded,setExpanded]=useState(null); // 'seeker' | 'mickey' | 'airdrop' | null
const [mods,setMods]=useState({mickey:true, airdrop:true, god:true, volume:true, seeker:true, usdt:true, sol:true, safe:true});
const [godStatus,setGodStatus]=useState('Idle');
const [mickeyStatus,setMickeyStatus]=useState('Ready 1% filter');
const [logs,setLogs]=useState([]);
const [fileLogs,setFileLogs]=useState('--- MAHADEV v22 3-MODULE ---\n');
const memRef=useRef({thr:4.5});

const writeLog=async(msg)=>{
 const ts=new Date().toISOString();
 const line=`[${ts}] ${msg}\n`;
 setLogs(l=>[ts.slice(11,19)+' '+msg,...l].slice(0,50));
 const nf=fileLogs+line; setFileLogs(nf);
 try{ await FileSystem.writeAsStringAsync(LOG_FILE, nf); }catch(e){}
};
const shareLogs=async()=>{
 try{ await FileSystem.writeAsStringAsync(LOG_FILE, fileLogs); if(await Sharing.isAvailableAsync()) await Sharing.shareAsync(LOG_FILE); }catch(e){ Alert.alert('Share err', e.message); }
};

useEffect(()=>{ writeLog('🔱 Mahadev v22 3-module started'); },[]);

const refreshBal=async(addr)=>{
 try{
  const {Connection,PublicKey}=await import('@solana/web3.js');
  const conn=new Connection('https://api.mainnet-beta.solana.com','confirmed');
  const bal=await conn.getBalance(new PublicKey(addr)); setSolBal(bal/1e9);
  writeLog(`BALANCE SUCCESS ${(bal/1e9).toFixed(4)} SOL`);
 }catch(e){ writeLog(`BALANCE FAIL ${e.message}`); }
};

const connectNative=async()=>{
 writeLog('WALLET: Connect tapped');
 try{
  const {transact}=await import('@solana-mobile/mobile-wallet-adapter-protocol-web3js');
  const result=await transact(async(w)=>{ writeLog('WALLET: authorize'); return await w.authorize({cluster:'mainnet-beta', identity:{name:'Mahadev'}}); });
  setWallet(result.accounts[0].address);
  global.MAHADEV_WALLET={address:result.accounts[0].address, token:result.auth_token};
  writeLog(`WALLET CONNECTED ${result.accounts[0].address}`);
  await refreshBal(result.accounts[0].address);
 }catch(e){ writeLog(`WALLET FAIL ${e.message}`); Alert.alert('Fail', e.message); }
};

const testModule=async(id)=>{
 writeLog(`TEST ${id}`);
 try{
  if(id==='mickey'){ const {findTopPools,filterCheap}=require('./src/modules/scout-free'); const pools=await findTopPools(); const cheap=filterCheap(pools); writeLog(`MICKEY ${pools.length} pools, cheap ${cheap.length} best ${cheap[0]?.name}`); setMickeyStatus(`${cheap.length}/${pools.length} cheap best ${cheap[0]?.name}`); }
  if(id==='god'){ const {runGOD}=require('./src/modules/seekergod/GodEngine'); const res=await runGOD(memRef,()=>{},(g)=>writeLog('GOD guards '+JSON.stringify(g)),(m)=>writeLog('GOD '+m),null); writeLog(`GOD res skip=${res.skip} robust=${res.robust} sym=${res.best?.sym}`); setGodStatus(res.skip? 'WAIT '+res.reason : `SIGNAL ${res.best.sym} ${res.robust}%`); }
  if(id!=='mickey' && id!=='god') writeLog(`TEST ${id} placeholder - will add real logic`);
 }catch(e){ writeLog(`TEST ${id} ERR ${e.message}`); }
};

const toggleExpand=(id)=>{ const n= expanded===id? null : id; setExpanded(n); writeLog(`EXPAND ${id} -> ${n}`); };

return(
<View style={s.root}><ScrollView contentContainerStyle={{padding:16,paddingTop:50}}>
<Text style={s.title}>🔱 MAHADEV</Text><Text style={s.sub}>3 MODULES • TRISHUL EDITION v22</Text>

<View style={s.card}>
<TouchableOpacity style={[s.cb,{backgroundColor: wallet?'#00FF94':'#fff'}]} onPress={connectNative}><Text style={s.cbt}>{wallet? `✅ ${wallet.slice(0,4)}...${wallet.slice(-4)} ${solBal.toFixed(4)} SOL` : '🔐 Connect NATIVE Seeker (0.311)'}</Text></TouchableOpacity>
<View style={s.row2}><Text style={s.ct}>SOL {solBal.toFixed(4)}</Text><TouchableOpacity style={s.smallBtn} onPress={shareLogs}><Text style={s.smallTxt}>📤 Share Logs</Text></TouchableOpacity></View>
</View>

{/* 1. SEEKER GOD */}
<TouchableOpacity style={[s.bigCard,{borderColor:'#FFD700', backgroundColor: expanded==='seeker'? '#1a1500':'#121212'}]} onPress={()=>toggleExpand('seeker')}>
<View style={s.row}><View style={{flex:1}}><Text style={[s.bigTitle,{color:'#FFD700'}]}>🔱 SEEKER GOD</Text><Text style={s.cs}>6 internal engines • Tap to expand</Text><Text style={s.cs}>{godStatus}</Text></View><Text style={s.arrow}>{expanded==='seeker'?'▼':'▶'}</Text></View>
</TouchableOpacity>
{expanded==='seeker' && (
<View style={s.subContainer}>
{SEEKER_SUBS.map(sub=>(
<View key={sub.id} style={[s.subCard,{borderColor:sub.color}]}>
<View style={s.row}><View style={{flex:1}}><Text style={[s.ct,{color:sub.color}]}>{sub.name}</Text><Text style={s.cs}>{sub.desc}</Text></View>
<TouchableOpacity style={[s.sw,{backgroundColor: mods[sub.id]? sub.color : '#333'}]} onPress={()=>{ setMods({...mods,[sub.id]:!mods[sub.id]}); writeLog(`TOGGLE ${sub.id} ${!mods[sub.id]}`); }}><Text style={[s.swt,{color: mods[sub.id]?'#000':'#fff'}]}>{mods[sub.id]?'ON':'OFF'}</Text></TouchableOpacity></View>
<TouchableOpacity style={[s.testBtn,{borderColor:sub.color}]} onPress={()=>testModule(sub.id)}><Text style={[s.testTxt,{color:sub.color}]}>▶️ {sub.test}</Text></TouchableOpacity>
</View>
))}
</View>
)}

{/* 2. MICKEYSCOUT */}
<TouchableOpacity style={[s.bigCard,{borderColor:'#FFCC00', backgroundColor: expanded==='mickey'? '#1a1a00':'#121212'}]} onPress={()=>toggleExpand('mickey')}>
<View style={s.row}><View style={{flex:1}}><Text style={[s.bigTitle,{color:'#FFCC00'}]}>🐭 MICKEYSCOUT v2</Text><Text style={s.cs}>1% max fee filter • scout-free.ts</Text><Text style={s.cs}>{mickeyStatus}</Text></View><Text style={s.arrow}>{expanded==='mickey'?'▼':'▶'}</Text></View>
</TouchableOpacity>
{expanded==='mickey' && (
<View style={s.subContainer}>
<View style={[s.subCard,{borderColor:'#FFCC00'}]}>
<Text style={s.ct}>Mickey Logic: findTopPools() → filter ≤1% → ignore 4% DLMM</Text>
<Text style={s.cs}>Your original v5 logic from Sept 29</Text>
<View style={s.row2}><TouchableOpacity style={s.ab} onPress={()=>testModule('mickey')}><Text style={s.abt}>🔍 Run Scout Now</Text></TouchableOpacity><TouchableOpacity style={[s.sw,{backgroundColor: mods.mickey? '#FFCC00':'#333'}]} onPress={()=>setMods({...mods,mickey:!mods.mickey})}><Text style={[s.swt,{color: mods.mickey?'#000':'#fff'}]}>{mods.mickey?'ON':'OFF'}</Text></TouchableOpacity></View>
</View>
</View>
)}

{/* 3. AIRDROP */}
<TouchableOpacity style={[s.bigCard,{borderColor:'#00FF94', backgroundColor: expanded==='airdrop'? '#001a0f':'#121212'}]} onPress={()=>toggleExpand('airdrop')}>
<View style={s.row}><View style={{flex:1}}><Text style={[s.bigTitle,{color:'#00FF94'}]}>🪂 AIRDROP HELPER v2</Text><Text style={s.cs}>Jito / Kamino / Jupiter / Galxe + OCP Tracker</Text><Text style={s.cs}>{wallet? `Ready ${solBal.toFixed(3)} SOL ${solBal<0.5?'💡 Stake for airdrop':''}`:'Connect wallet'}</Text></View><Text style={s.arrow}>{expanded==='airdrop'?'▼':'▶'}</Text></View>
</TouchableOpacity>
{expanded==='airdrop' && (
<View style={s.subContainer}>
<View style={[s.subCard,{borderColor:'#00FF94'}]}>
<Text style={s.ct}>Solana Airdrop Farming</Text>
<View style={{flexDirection:'row',flexWrap:'wrap',marginTop:8}}>
<TouchableOpacity style={s.ab} onPress={()=>{ writeLog('AIRDROP open Jupiter'); Linking.openURL('https://jup.ag'); }}><Text style={s.abt}>Jupiter</Text></TouchableOpacity>
<TouchableOpacity style={s.ab} onPress={()=>{ writeLog('AIRDROP open Jito'); Linking.openURL('https://www.jito.network/staking/'); }}><Text style={s.abt}>Jito Stake</Text></TouchableOpacity>
<TouchableOpacity style={s.ab} onPress={()=>{ writeLog('AIRDROP open Kamino'); Linking.openURL('https://app.kamino.finance'); }}><Text style={s.abt}>Kamino</Text></TouchableOpacity>
<TouchableOpacity style={s.ab} onPress={()=>{ writeLog('AIRDROP open Galxe'); Linking.openURL('https://app.galxe.com'); }}><Text style={s.abt}>Galxe</Text></TouchableOpacity>
</View>
<Text style={[s.ct,{marginTop:10}]}>OCP Python Tracker (read-only)</Text><Text style={s.cs}>Base/Arb tx count checker, 1 tx/week manual to avoid sybil</Text>
<TouchableOpacity style={[s.ab,{marginTop:6}]} onPress={()=>{ writeLog('AIRDROP OCP tracker tapped'); Alert.alert('OCP Tracker','pip install web3\npython3 airdrop_helper.py\nChecks txs + balance\nManual tx only'); }}><Text style={s.abt}>View OCP Logic</Text></TouchableOpacity>
</View>
</View>
)}

<View style={s.logBox}><Text style={{color:'#fff',fontSize:10,fontWeight:'bold'}}>📋 LOGS - Share to debug:</Text>{logs.slice(0,20).map((l,i)=><Text key={i} style={s.lt}>{l}</Text>)}</View>

</ScrollView></View>
);
}
const s=StyleSheet.create({
root:{flex:1,backgroundColor:'#080808'}, title:{color:'#00D4FF',fontSize:28,fontWeight:'900',textAlign:'center'}, sub:{color:'#FFCC00',textAlign:'center',fontSize:9,marginBottom:14,fontWeight:'bold'},
card:{backgroundColor:'#121212',borderRadius:14,padding:12,borderWidth:1,borderColor:'#222',marginBottom:12}, bigCard:{borderRadius:16,padding:16,borderWidth:2,marginBottom:2}, bigTitle:{fontSize:18,fontWeight:'900'}, arrow:{color:'#fff',fontSize:18,marginLeft:10}, subContainer:{backgroundColor:'#0a0a0a',borderRadius:12,padding:10,marginBottom:14,borderWidth:1,borderColor:'#1a1a1a'}, subCard:{backgroundColor:'#151515',borderRadius:12,padding:10,borderWidth:1,marginBottom:8}, row:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}, row2:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginTop:8}, ct:{color:'#fff',fontWeight:'bold',fontSize:12}, cs:{color:'#aaa',fontSize:10,marginTop:2}, cb:{padding:14,borderRadius:20,alignItems:'center'}, cbt:{color:'#000',fontWeight:'bold',fontSize:12}, sw:{paddingHorizontal:12,paddingVertical:6,borderRadius:12}, swt:{fontWeight:'bold',fontSize:10}, logBox:{backgroundColor:'#0a0a0a',borderRadius:12,padding:12,borderWidth:1,borderColor:'#222', minHeight:150}, lt:{color:'#0f0',fontSize:9, fontFamily:'monospace', marginTop:2}, testBtn:{marginTop:8,borderWidth:1,borderRadius:8,padding:6,alignItems:'center', backgroundColor:'#1e1e1e'}, testTxt:{fontSize:10,fontWeight:'bold'}, ab:{backgroundColor:'#222',paddingHorizontal:10,paddingVertical:6,borderRadius:10,marginRight:6,marginBottom:6,borderWidth:1,borderColor:'#444'}, abt:{color:'#fff',fontSize:10,fontWeight:'bold'}, smallBtn:{backgroundColor:'#222',paddingHorizontal:10,paddingVertical:6,borderRadius:8,borderWidth:1,borderColor:'#333'}, smallTxt:{color:'#fff',fontSize:9,fontWeight:'bold'}
});
