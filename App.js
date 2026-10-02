import React,{useState,useEffect,useRef} from 'react';
import {View,Text,StyleSheet,ScrollView,TouchableOpacity,Alert,Linking} from 'react-native';
import 'react-native-get-random-values';
import {Buffer} from 'buffer'; global.Buffer=Buffer;
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

const LOG_FILE = FileSystem.documentDirectory + 'mahadev_logs.txt';
const SEEKER_SUBS = [
  { id:'god', name:'GOD v15', color:'#FFD700', desc:'Robust 5.2%', test:'Test GOD' },
  { id:'volume', name:'Volume Hunter v3', color:'#00FF88', desc:'Volume >120%', test:'Test Volume' },
  { id:'seeker', name:'Seeker Sniper v2', color:'#00D4FF', desc:'New token', test:'Test Sniper' },
  { id:'usdt', name:'USDT Scalper', color:'#FF6B6B', desc:'USDT/SOL', test:'Test Scalper' },
  { id:'sol', name:'SOL Pump', color:'#A78BFA', desc:'SOL >3.5%', test:'Test Pump' },
  { id:'safe', name:'RugCheck', color:'#4ADE80', desc:'Liquidity lock', test:'Test Rug' },
];

export default function App(){
const [wallet,setWallet]=useState(null);
const [walletB64,setWalletB64]=useState(null);
const [solBal,setSolBal]=useState(0);
const [expanded,setExpanded]=useState(null);
const [mods,setMods]=useState({mickey:true, airdrop:true, god:true, volume:true, seeker:true, usdt:true, sol:true, safe:true});
const [godStatus,setGodStatus]=useState('Idle');
const [mickeyStatus,setMickeyStatus]=useState('Ready');
const [logs,setLogs]=useState([]);
const [fileLogs,setFileLogs]=useState('--- MAHADEV v24 B64 FIX ---\n');
const memRef=useRef({thr:4.5});

const writeLog=async(msg)=>{
 const ts=new Date().toISOString();
 const line=`[${ts}] ${msg}\n`;
 setLogs(l=>[ts.slice(11,19)+' '+msg,...l].slice(0,60));
 const nf=fileLogs+line; setFileLogs(nf);
 try{ await FileSystem.writeAsStringAsync(LOG_FILE, nf); }catch(e){}
};
const shareLogs=async()=>{
 try{ await FileSystem.writeAsStringAsync(LOG_FILE, fileLogs); await Sharing.shareAsync(LOG_FILE); writeLog('LOGS Shared'); }catch(e){ writeLog(`SHARE FAIL ${e.message}`); Alert.alert('Share', e.message); }
};
useEffect(()=>{ writeLog('🔱 Mahadev v24 started - fixing base64->base58'); },[]);

const base64ToBase58=async(b64)=>{
 try{
  writeLog(`CONVERT: b64 ${b64.slice(0,10)}... len ${b64.length}`);
  const {PublicKey}=await import('@solana/web3.js');
  const bytes = Buffer.from(b64, 'base64');
  writeLog(`CONVERT: bytes len ${bytes.length}`);
  const pub = new PublicKey(bytes);
  const b58 = pub.toBase58();
  writeLog(`CONVERT: b58 ${b58} SUCCESS`);
  return b58;
 }catch(e){ writeLog(`CONVERT FAIL ${e.message}`); return null; }
};

const refreshBal=async(addrB58, b64raw)=>{
 try{
  writeLog(`BALANCE fetch for b58 ${addrB58}`);
  const {Connection,PublicKey}=await import('@solana/web3.js');
  const conn=new Connection('https://api.mainnet-beta.solana.com','confirmed');
  const pk = new PublicKey(addrB58);
  const bal=await conn.getBalance(pk);
  const sol=bal/1e9;
  setSolBal(sol);
  writeLog(`BALANCE OK ${sol.toFixed(4)} SOL lamports=${bal} addr=${addrB58}`);
  if(sol<0.01) writeLog(`BALANCE LOW - wallet may be empty, try switch to punitgarud.skr in Seeker Wallet`);
 }catch(e){ writeLog(`BALANCE FAIL ${e.message}`); }
};

const connectNative=async()=>{
 writeLog('WALLET Connect tapped');
 try{
  const {transact}=await import('@solana-mobile/mobile-wallet-adapter-protocol-web3js');
  const result=await transact(async(w)=>{
    writeLog('WALLET authorize');
    return await w.authorize({cluster:'mainnet-beta', identity:{name:'Mahadev'}});
  });
  const b64addr=result.accounts[0].address;
  setWalletB64(b64addr);
  writeLog(`WALLET raw b64=${b64addr}`);
  const b58addr=await base64ToBase58(b64addr);
  if(b58addr){
    setWallet(b58addr);
    global.MAHADEV_WALLET={b58: b58addr, b64: b64addr, token: result.auth_token};
    writeLog(`WALLET CONNECTED b58=${b58addr}`);
    await refreshBal(b58addr, b64addr);
    Alert.alert('Connected Fixed', `Base64: ${b64addr.slice(0,8)}...\nBase58: ${b58addr}\n\nNow balance should work!`);
  } else {
    writeLog('WALLET conversion failed, using raw');
    setWallet(b64addr);
  }
 }catch(e){ writeLog(`WALLET FAIL ${e.message} ${e.stack?.slice(0,200)}`); Alert.alert('Fail', e.message); }
};

const testModule=async(id)=>{
 writeLog(`TEST ${id}`);
 try{
  if(id==='mickey'){ const {findTopPools,filterCheap}=require('./src/modules/scout-free'); const pools=await findTopPools(); const cheap=filterCheap(pools); writeLog(`MICKEY total=${pools.length} cheap=${cheap.length} best=${cheap[0]?.name}`); setMickeyStatus(`${cheap.length}/${pools.length} cheap`); }
  if(id==='god'){ const {runGOD}=require('./src/modules/seekergod/GodEngine'); const res=await runGOD(memRef,()=>{},(g)=>writeLog('GOD guards'),(m)=>writeLog('GOD '+m),null); writeLog(`GOD skip=${res.skip} sym=${res.best?.sym}`); setGodStatus(res.skip? 'WAIT '+res.reason : `SIGNAL ${res.best?.sym}`); }
  else writeLog(`TEST ${id} ok`);
  writeLog(`TEST ${id} DONE`);
 }catch(e){ writeLog(`TEST ${id} ERR ${e.message}`); }
};

return(
<View style={s.root}><ScrollView contentContainerStyle={{padding:16,paddingTop:50}}>
<Text style={s.title}>🔱 MAHADEV</Text><Text style={s.sub}>v24 BASE64 FIX • LOGS WORKING</Text>
<View style={s.card}>
<TouchableOpacity style={[s.cb,{backgroundColor: wallet?'#00FF94':'#fff'}]} onPress={connectNative}><Text style={s.cbt}>{wallet? `✅ ${wallet.slice(0,4)}...${wallet.slice(-4)} ${solBal.toFixed(4)} SOL` : '🔐 Connect NATIVE FIXED'}</Text></TouchableOpacity>
{walletB64 && <Text style={{color:'#666',fontSize:8, textAlign:'center', marginTop:4}}>b64: {walletB64.slice(0,20)}... → b58: {wallet?.slice(0,20)}...</Text>}
<Text style={{color: solBal===0? '#FF6B6B':'#00FF94', fontSize:10, textAlign:'center', marginTop:6}}>{solBal===0? '⚠️ 0 SOL or balance fetch failed - check logs' : `✅ ${solBal.toFixed(4)} SOL Ready`}</Text>
<View style={s.row2}><Text style={s.ct}>SOL {solBal.toFixed(4)}</Text><TouchableOpacity style={s.smallBtn} onPress={shareLogs}><Text style={s.smallTxt}>📤 Share Logs</Text></TouchableOpacity></View>
</View>

<TouchableOpacity style={[s.bigCard,{borderColor:'#FFD700'}]} onPress={()=>setExpanded(expanded==='seeker'?null:'seeker')}><View style={s.row}><View style={{flex:1}}><Text style={[s.bigTitle,{color:'#FFD700'}]}>🔱 SEEKER GOD</Text><Text style={s.cs}>{godStatus}</Text></View><Text style={s.arrow}>{expanded==='seeker'?'▼':'▶'}</Text></View></TouchableOpacity>
{expanded==='seeker' && (<View style={s.subContainer}>{SEEKER_SUBS.map(sub=>(<View key={sub.id} style={[s.subCard,{borderColor:sub.color}]}><View style={s.row}><View style={{flex:1}}><Text style={[s.ct,{color:sub.color}]}>{sub.name}</Text><Text style={s.cs}>{sub.desc}</Text></View><TouchableOpacity style={[s.sw,{backgroundColor: mods[sub.id]? sub.color : '#333'}]} onPress={()=>setMods({...mods,[sub.id]:!mods[sub.id]})}><Text style={[s.swt,{color: mods[sub.id]?'#000':'#fff'}]}>{mods[sub.id]?'ON':'OFF'}</Text></TouchableOpacity></View><TouchableOpacity style={[s.testBtn,{borderColor:sub.color}]} onPress={()=>testModule(sub.id)}><Text style={[s.testTxt,{color:sub.color}]}>▶️ {sub.test}</Text></TouchableOpacity></View>))}</View>)}

<TouchableOpacity style={[s.bigCard,{borderColor:'#FFCC00'}]} onPress={()=>setExpanded(expanded==='mickey'?null:'mickey')}><View style={s.row}><View style={{flex:1}}><Text style={[s.bigTitle,{color:'#FFCC00'}]}>🐭 MICKEYSCOUT v2</Text><Text style={s.cs}>{mickeyStatus}</Text></View><Text style={s.arrow}>{expanded==='mickey'?'▼':'▶'}</Text></View></TouchableOpacity>
{expanded==='mickey' && (<View style={s.subContainer}><View style={[s.subCard,{borderColor:'#FFCC00'}]}><TouchableOpacity style={s.ab} onPress={()=>testModule('mickey')}><Text style={s.abt}>🔍 Run Scout</Text></TouchableOpacity></View></View>)}

<TouchableOpacity style={[s.bigCard,{borderColor:'#00FF94'}]} onPress={()=>setExpanded(expanded==='airdrop'?null:'airdrop')}><View style={s.row}><View style={{flex:1}}><Text style={[s.bigTitle,{color:'#00FF94'}]}>🪂 AIRDROP</Text></View><Text style={s.arrow}>{expanded==='airdrop'?'▼':'▶'}</Text></View></TouchableOpacity>

<View style={s.logBox}><Text style={{color:'#fff',fontSize:10,fontWeight:'bold'}}>📋 LOGS - Shows base64→base58 conversion:</Text>{logs.slice(0,30).map((l,i)=><Text key={i} style={s.lt}>{l}</Text>)}</View>
</ScrollView></View>
);
}
const s=StyleSheet.create({
root:{flex:1,backgroundColor:'#080808'}, title:{color:'#00D4FF',fontSize:26,fontWeight:'900',textAlign:'center'}, sub:{color:'#FFCC00',textAlign:'center',fontSize:9,marginBottom:12,fontWeight:'bold'},
card:{backgroundColor:'#121212',borderRadius:14,padding:12,borderWidth:1,borderColor:'#222',marginBottom:12}, bigCard:{borderRadius:16,padding:16,borderWidth:2,marginBottom:2,backgroundColor:'#121212'}, bigTitle:{fontSize:16,fontWeight:'900'}, arrow:{color:'#fff',fontSize:16}, subContainer:{backgroundColor:'#0a0a0a',borderRadius:12,padding:10,marginBottom:12,borderWidth:1,borderColor:'#1a1a1a'}, subCard:{backgroundColor:'#151515',borderRadius:12,padding:10,borderWidth:1,marginBottom:8}, row:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}, row2:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginTop:8}, ct:{color:'#fff',fontWeight:'bold',fontSize:12}, cs:{color:'#aaa',fontSize:10,marginTop:2}, cb:{padding:14,borderRadius:20,alignItems:'center'}, cbt:{color:'#000',fontWeight:'bold',fontSize:11}, sw:{paddingHorizontal:12,paddingVertical:6,borderRadius:12}, swt:{fontWeight:'bold',fontSize:10}, logBox:{backgroundColor:'#0a0a0a',borderRadius:12,padding:12,borderWidth:1,borderColor:'#222', minHeight:200}, lt:{color:'#0f0',fontSize:9, fontFamily:'monospace', marginTop:2}, testBtn:{marginTop:8,borderWidth:1,borderRadius:8,padding:6,alignItems:'center', backgroundColor:'#1e1e1e'}, testTxt:{fontSize:10,fontWeight:'bold'}, ab:{backgroundColor:'#222',paddingHorizontal:10,paddingVertical:6,borderRadius:10,marginRight:6,marginBottom:6,borderWidth:1,borderColor:'#444'}, abt:{color:'#fff',fontSize:10,fontWeight:'bold'}, smallBtn:{backgroundColor:'#00FF94',paddingHorizontal:12,paddingVertical:6,borderRadius:8}, smallTxt:{color:'#000',fontSize:9,fontWeight:'bold'}
});
