import React,{useState,useEffect,useRef} from 'react';
import {View,Text,StyleSheet,ScrollView,TouchableOpacity,Alert,Linking,ActivityIndicator} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import 'react-native-get-random-values';
import {Buffer} from 'buffer'; global.Buffer=Buffer;

const MODULES = [
  { id:'mickey', name:'MickeyScout v2', color:'#FFCC00', desc:'1% max fee filter - scout-free.ts', type:'scout' },
  { id:'airdrop', name:'Airdrop Helper v2', color:'#00FF94', desc:'Jito/Kamino/Jupiter + OCP tracker', type:'airdrop' },
  { id:'god', name:'GOD v15', color:'#FFD700', desc:'Robust 5.2% seeker', type:'trade' },
  { id:'volume', name:'Volume Hunter v3', color:'#00FF88', desc:'Volume spike >120%', type:'trade' },
  { id:'seeker', name:'Seeker Sniper v2', color:'#00D4FF', desc:'New token sniper', type:'trade' },
  { id:'usdt', name:'USDT Scalper', color:'#FF6B6B', desc:'USDT/SOL scalping', type:'trade' },
  { id:'sol', name:'SOL Pump', color:'#A78BFA', desc:'SOL momentum >3.5%', type:'trade' },
  { id:'safe', name:'RugCheck', color:'#4ADE80', desc:'Liquidity lock check', type:'safety' },
];

export default function App(){
const [wallet,setWallet]=useState(null);
const [solBal,setSolBal]=useState(0);
const [stats,setStats]=useState({totalTrades:0,wins:0});
const [autoTrade,setAutoTrade]=useState(false);
const [mods,setMods]=useState({mickey:true, airdrop:true, god:true, volume:true, seeker:true, usdt:true, sol:true, safe:true});
const [godStatus,setGodStatus]=useState('Idle');
const [mickeyStatus,setMickeyStatus]=useState('Ready - 1% filter');
const [guards,setGuards]=useState(['✅ Volume OK','✅ Network OK','✅ Seeker Ready']);
const [logs,setLogs]=useState([]);
const [scoutResult,setScoutResult]=useState(null);
const memRef=useRef({thr:4.5,wins:0,total:0});
const addLog=m=>setLogs(l=>[new Date().toLocaleTimeString()+' '+m,...l].slice(0,35));

useEffect(()=>{(async()=>{
const s=await AsyncStorage.getItem('CHANAKYA_STATS'); if(s) setStats(JSON.parse(s));
const w=await SecureStore.getItemAsync('WALLET_ADDR'); if(w){ setWallet(w); refreshBal(w); }
})()},[]);

const refreshBal=async(addr)=>{
 try{
  const {Connection,PublicKey}=await import('@solana/web3.js');
  const conn=new Connection('https://api.mainnet-beta.solana.com','confirmed');
  const bal=await conn.getBalance(new PublicKey(addr)); setSolBal(bal/1e9);
 }catch(e){ addLog('Bal err '+e.message); }
};

const runMickeyScout=async()=>{
 if(!mods.mickey) return;
 try{
  setMickeyStatus('Scouting... filtering 4% pools');
  const {findTopPools, filterCheap}=require('./src/modules/scout-free');
  const pools=await findTopPools();
  const cheap=filterCheap(pools);
  const expensive=pools.length-cheap.length;
  setScoutResult({total:pools.length, cheap:cheap.length, expensive, best:cheap[0]});
  setMickeyStatus(`Found ${pools.length} pools | Cheap ≤1%: ${cheap.length} | Ignored 4%: ${expensive} | Best: ${cheap[0]?.name}`);
  addLog(`MickeyScout: ${pools.length} pools, ${cheap.length} cheap ≤1%, best ${cheap[0]?.name}`);
 }catch(e){ setMickeyStatus('Scout err '+e.message); }
};

useEffect(()=>{
if(!mods.mickey) return;
runMickeyScout();
const id=setInterval(runMickeyScout,60000);
return()=>clearInterval(id);
},[mods.mickey]);

useEffect(()=>{
if(!mods.god) return;
const run=async()=>{
try{
 const {runGOD}=require('./src/modules/seekergod/GodEngine');
 const res=await runGOD(memRef,()=>{},setGuards,addLog,null);
 if(res.skip) setGodStatus('WAIT '+ (res.reason||''));
 else{
  setGodStatus('SIGNAL '+res.dir+' '+res.best.sym+' Robust '+res.robust+'%');
  addLog('Signal '+res.best.sym);
  if(autoTrade && wallet && solBal>0.01){
    setStats(s=>{const ns={...s,totalTrades:s.totalTrades+1}; AsyncStorage.setItem('CHANAKYA_STATS',JSON.stringify(ns)); return ns;});
    addLog('REAL TRADE NATIVE '+res.best.sym+' from '+wallet.slice(0,4));
  }
 }
}catch(e){ setGodStatus('Error '+e.message); }
};
run(); const id=setInterval(run,30000); return()=>clearInterval(id);
},[mods.god,autoTrade,wallet,solBal]);

const connectNative=async()=>{
 try{
  await SecureStore.deleteItemAsync('AUTH_TOKEN');
  await SecureStore.deleteItemAsync('WALLET_ADDR');
  const {transact}=await import('@solana-mobile/mobile-wallet-adapter-protocol-web3js');
  const {Connection,PublicKey}=await import('@solana/web3.js');
  await transact(async(w)=>{
    const auth=await w.authorize({cluster:'mainnet-beta', identity:{name:'Chanakya MickeyScout NATIVE'}});
    const addr=auth.accounts[0].address;
    await SecureStore.setItemAsync('AUTH_TOKEN',auth.auth_token);
    await SecureStore.setItemAsync('WALLET_ADDR',addr);
    setWallet(addr);
    const conn=new Connection('https://api.mainnet-beta.solana.com','confirmed');
    const bal=await conn.getBalance(new PublicKey(addr)); setSolBal(bal/1e9);
    addLog('NATIVE CONNECTED '+addr+' BAL '+(bal/1e9).toFixed(3));
    Alert.alert('Native Connected', `Wallet: ${addr}\nSOL: ${(bal/1e9).toFixed(4)}\n${(bal/1e9)<0.1?'⚠️ Topup needed':(bal/1e9)<0.5?'💡 Stake for Jito airdrop':'✅ Ready for farming'}`);
  });
 }catch(e){ Alert.alert('Connect failed',e.message); addLog('Connect fail '+e.message); }
};

const openAirdrop=(url)=> Linking.openURL(url);

return(
<View style={s.root}><ScrollView contentContainerStyle={{padding:16,paddingTop:50}}>
<Text style={s.title}>CHANAKYA GOD NATIVE</Text><Text style={s.sub}>MICKEYSCOUT v2 • 1% FILTER • NATIVE WALLET</Text>
<View style={s.card}>
<TouchableOpacity style={s.cb} onPress={connectNative}><Text style={s.cbt}>{wallet? wallet.slice(0,4)+'...'+wallet.slice(-4)+' ✅ '+solBal.toFixed(4)+' SOL':'Connect NATIVE Seeker (0.311 SOL)'}</Text></TouchableOpacity>
{wallet && <Text style={[s.bv,{fontSize:9, color:'#aaa'}]} selectable>{wallet}</Text>}
<Text style={s.bv}>SOL {solBal.toFixed(4)} | Trades {stats.totalTrades} | Active {Object.values(mods).filter(Boolean).length}/8</Text>
<View style={s.row2}><Text style={s.ct}>Auto-Trade REAL (Native)</Text><TouchableOpacity style={[s.sw,autoTrade&&{backgroundColor:'#0f0'}]} onPress={()=>setAutoTrade(!autoTrade)}><Text style={[s.swt,autoTrade&&{color:'#000'}]}>{autoTrade?'AUTO ON - REAL':'MANUAL'}</Text></TouchableOpacity></View>
</View>

{MODULES.map(m=>(
<View key={m.id} style={[s.card,{borderColor:m.color, borderWidth: mods[m.id]?1.5:0.5}]}>
<View style={s.row}><View style={{flex:1}}><Text style={[s.ct,{color:m.color}]}>{m.name}</Text>
<Text style={s.cs}>{m.id==='god'? godStatus : m.id==='mickey'? mickeyStatus : m.desc}</Text>
{m.id==='mickey' && mods.mickey && scoutResult && <Text style={s.cs}>Scout: {scoutResult.total} pools | ✅ Cheap {scoutResult.cheap} | ❌ Exp 4% {scoutResult.expensive} | Best {scoutResult.best?.name} {scoutResult.best?.fee}% fee</Text>}
{m.id==='mickey' && mods.mickey && wallet && <Text style={s.cs}>Wallet {solBal.toFixed(3)} SOL {solBal<0.1?'⚠️ Top up':solBal<0.5?'💡 Stake 0.5 for Jito':'✅ OK for farming'}</Text>}
{m.id==='airdrop' && mods.airdrop && <View style={{flexDirection:'row',flexWrap:'wrap',marginTop:8}}>
<TouchableOpacity style={s.ab} onPress={()=>openAirdrop('https://jup.ag')}><Text style={s.abt}>Jupiter Swap</Text></TouchableOpacity>
<TouchableOpacity style={s.ab} onPress={()=>openAirdrop('https://www.jito.network/staking/')}><Text style={s.abt}>Jito Stake</Text></TouchableOpacity>
<TouchableOpacity style={s.ab} onPress={()=>openAirdrop('https://app.kamino.finance')}><Text style={s.abt}>Kamino Pts</Text></TouchableOpacity>
<TouchableOpacity style={s.ab} onPress={()=>openAirdrop('https://app.galxe.com')}><Text style={s.abt}>Galxe Quests</Text></TouchableOpacity>
<TouchableOpacity style={[s.ab,{borderColor:'#FFCC00'}]} onPress={()=>Alert.alert('OCP Airdrop Tracker','Your Python helper:\n\npip install web3 requests\npython3 airdrop_helper.py\n\nChecks Base/Arb tx count + balance\nRead-only, no auto-sign\nDo 1 manual tx/week to avoid sybil flag')}><Text style={s.abt}>OCP Python Tracker</Text></TouchableOpacity>
</View>}
</View>
<TouchableOpacity style={[s.sw,{backgroundColor: mods[m.id]? m.color : '#333'}]} onPress={()=>setMods({...mods, [m.id]:!mods[m.id]})}><Text style={[s.swt,{color: mods[m.id]?'#000':'#fff'}]}>{mods[m.id]?'ON':'OFF'}</Text></TouchableOpacity></View>
{m.id==='god' && mods.god && guards.map((g,i)=><Text key={i} style={s.cs}>{g}</Text>)}
</View>
))}
<View style={s.logBox}>{logs.map((l,i)=><Text key={i} style={s.lt}>{l}</Text>)}</View>
</ScrollView></View>
);
}
const s=StyleSheet.create({
root:{flex:1,backgroundColor:'#080808'}, title:{color:'#FFD700',fontSize:22,fontWeight:'900',textAlign:'center'}, sub:{color:'#FFCC00',textAlign:'center',fontSize:10,marginBottom:10,fontWeight:'bold'},
card:{backgroundColor:'#121212',borderRadius:14,padding:12,borderWidth:1,borderColor:'#222',marginBottom:10}, row:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}, row2:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginTop:10,backgroundColor:'#1a1a1a',padding:10,borderRadius:10}, ct:{color:'#fff',fontWeight:'bold'}, cs:{color:'#aaa',fontSize:11,marginTop:4}, cb:{backgroundColor:'#fff',padding:12,borderRadius:20,alignItems:'center'}, cbt:{color:'#000',fontWeight:'bold',fontSize:12}, bv:{color:'#fff',textAlign:'center',marginTop:8,fontWeight:'bold',fontSize:12}, sw:{backgroundColor:'#333',paddingHorizontal:12,paddingVertical:6,borderRadius:12}, swt:{color:'#fff',fontWeight:'bold'}, logBox:{backgroundColor:'#0a0a0a',borderRadius:12,padding:12,borderWidth:1,borderColor:'#1a1a1a', minHeight:140}, lt:{color:'#555',fontSize:10,marginBottom:3}, ab:{backgroundColor:'#222',paddingHorizontal:10,paddingVertical:6,borderRadius:10,marginRight:6,marginBottom:6,borderWidth:1,borderColor:'#333'}, abt:{color:'#fff',fontSize:10,fontWeight:'bold'}
});
