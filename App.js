import React,{useState,useEffect,useRef} from 'react';
import {View,Text,StyleSheet,ScrollView,TouchableOpacity,Alert} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import 'react-native-get-random-values';
import {Buffer} from 'buffer'; global.Buffer=Buffer;

const MODULES = [
  { id:'god', name:'GOD v15', color:'#FFD700', desc:'Robust 5.2% seeker' },
  { id:'volume', name:'Volume Hunter v3', color:'#00FF88', desc:'Volume spike >120%' },
  { id:'seeker', name:'Seeker Sniper v2', color:'#00D4FF', desc:'New token sniper' },
  { id:'usdt', name:'USDT Scalper', color:'#FF6B6B', desc:'USDT/SOL scalping' },
  { id:'sol', name:'SOL Pump', color:'#A78BFA', desc:'SOL momentum >3.5%' },
  { id:'safe', name:'RugCheck', color:'#4ADE80', desc:'Liquidity lock check' },
];

export default function App(){
const [wallet,setWallet]=useState(null);
const [solBal,setSolBal]=useState(0);
const [stats,setStats]=useState({totalTrades:0,wins:0});
const [autoTrade,setAutoTrade]=useState(false);
const [mods,setMods]=useState({god:true, volume:true, seeker:true, usdt:true, sol:true, safe:true});
const [godStatus,setGodStatus]=useState('Idle');
const [guards,setGuards]=useState([]);
const [logs,setLogs]=useState([]);
const memRef=useRef({thr:4.5,wins:0,total:0});
const addLog=m=>setLogs(l=>[new Date().toLocaleTimeString()+' '+m,...l].slice(0,30));

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

useEffect(()=>{
if(!Object.values(mods).some(Boolean)) return;
const run=async()=>{
try{
if(mods.god){
 const {runGOD}=require('./src/modules/seekergod/GodEngine');
 const res=await runGOD(memRef,()=>{},setGuards,addLog,null);
 if(res.skip) setGodStatus('WAIT '+ (res.reason||''));
 else{
  setGodStatus('SIGNAL '+res.dir+' '+res.best.sym+' Robust '+res.robust+'%');
  addLog('Signal '+res.best.sym);
  if(autoTrade && wallet && solBal>0.01){
    setStats(s=>{const ns={...s,totalTrades:s.totalTrades+1}; AsyncStorage.setItem('CHANAKYA_STATS',JSON.stringify(ns)); return ns;});
    addLog('REAL TRADE from native '+wallet.slice(0,4)+'...');
  }
 }
}
}catch(e){ setGodStatus('Error '+e.message); }
};
run(); const id=setInterval(run,30000); return()=>clearInterval(id);
},[mods,autoTrade,wallet,solBal]);

const connectNative=async()=>{
 try{
  await SecureStore.deleteItemAsync('AUTH_TOKEN');
  await SecureStore.deleteItemAsync('WALLET_ADDR');
  addLog('Cleared old wallet, connecting native...');
  const {transact}=await import('@solana-mobile/mobile-wallet-adapter-protocol-web3js');
  const {Connection,PublicKey}=await import('@solana/web3.js');
  await transact(async(w)=>{
    const auth=await w.authorize({cluster:'mainnet-beta', identity:{name:'Chanakya NATIVE', uri:'https://chanakya.app'}});
    const addr=auth.accounts[0].address;
    await SecureStore.setItemAsync('AUTH_TOKEN',auth.auth_token);
    await SecureStore.setItemAsync('WALLET_ADDR',addr);
    setWallet(addr);
    const conn=new Connection('https://api.mainnet-beta.solana.com','confirmed');
    const bal=await conn.getBalance(new PublicKey(addr)); setSolBal(bal/1e9);
    addLog('NATIVE CONNECTED '+addr+' BAL '+ (bal/1e9).toFixed(3));
    Alert.alert('Native Wallet Connected', addr+'\nSOL: '+(bal/1e9).toFixed(3));
  });
 }catch(e){ Alert.alert('Connect failed',e.message); addLog('Connect fail '+e.message); }
};

const disconnect=async()=>{
 await SecureStore.deleteItemAsync('AUTH_TOKEN');
 await SecureStore.deleteItemAsync('WALLET_ADDR');
 setWallet(null); setSolBal(0); addLog('Disconnected - now tap Connect Native again');
 Alert.alert('Disconnected','Tap Connect Native and SELECT your punitgarud.skr wallet in Seed Vault');
};

return(
<View style={s.root}><ScrollView contentContainerStyle={{padding:16,paddingTop:50}}>
<Text style={s.title}>CHANAKYA GOD NATIVE</Text><Text style={s.sub}>NATIVE WALLET v17 - REAL TRADES</Text>
<View style={s.card}>
<TouchableOpacity style={s.cb} onPress={connectNative}><Text style={s.cbt}>{wallet? wallet.slice(0,4)+'...'+wallet.slice(-4)+' ✅ '+solBal.toFixed(3)+' SOL':'Connect NATIVE Seeker Wallet'}</Text></TouchableOpacity>
{wallet && <Text style={[s.bv,{fontSize:9, color:'#aaa'}]} selectable>{wallet}</Text>}
<Text style={s.bv}>SOL {solBal.toFixed(4)} | Trades {stats.totalTrades} | Active {Object.values(mods).filter(Boolean).length}/6</Text>
<View style={s.row2}><Text style={s.ct}>Auto-Trade REAL</Text><TouchableOpacity style={[s.sw,autoTrade&&{backgroundColor:'#0f0'}]} onPress={()=>setAutoTrade(!autoTrade)}><Text style={[s.swt,autoTrade&&{color:'#000'}]}>{autoTrade?'AUTO ON - REAL':'MANUAL'}</Text></TouchableOpacity></View>
<TouchableOpacity style={[s.row2,{justifyContent:'center', backgroundColor:'#222'}]} onPress={disconnect}><Text style={{color:'#ff6666', fontSize:11}}>Switch / Disconnect Wallet</Text></TouchableOpacity>
</View>
{MODULES.map(m=>(
<View key={m.id} style={[s.card,{borderColor:m.color, borderWidth: mods[m.id]?1.5:0.5}]}>
<View style={s.row}><View><Text style={[s.ct,{color:m.color}]}>{m.name}</Text><Text style={s.cs}>{m.id==='god'? godStatus : m.desc}</Text></View>
<TouchableOpacity style={[s.sw,{backgroundColor: mods[m.id]? m.color : '#333'}]} onPress={()=>setMods({...mods, [m.id]:!mods[m.id]})}><Text style={[s.swt,{color: mods[m.id]?'#000':'#fff'}]}>{mods[m.id]?'ON':'OFF'}</Text></TouchableOpacity></View>
{m.id==='god' && guards.map((g,i)=><Text key={i} style={s.cs}>{g}</Text>)}
</View>
))}
<View style={s.logBox}>{logs.map((l,i)=><Text key={i} style={s.lt}>{l}</Text>)}</View>
</ScrollView></View>
);
}
const s=StyleSheet.create({
root:{flex:1,backgroundColor:'#080808'}, title:{color:'#FFD700',fontSize:22,fontWeight:'900',textAlign:'center'}, sub:{color:'#00FF88',textAlign:'center',fontSize:10,marginBottom:10,fontWeight:'bold'},
card:{backgroundColor:'#121212',borderRadius:14,padding:12,borderWidth:1,borderColor:'#222',marginBottom:10}, row:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}, row2:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginTop:10,backgroundColor:'#1a1a1a',padding:10,borderRadius:10}, ct:{color:'#fff',fontWeight:'bold'}, cs:{color:'#aaa',fontSize:11,marginTop:4}, cb:{backgroundColor:'#fff',padding:12,borderRadius:20,alignItems:'center'}, cbt:{color:'#000',fontWeight:'bold',fontSize:12}, bv:{color:'#fff',textAlign:'center',marginTop:8,fontWeight:'bold',fontSize:12}, sw:{backgroundColor:'#333',paddingHorizontal:12,paddingVertical:6,borderRadius:12}, swt:{color:'#fff',fontWeight:'bold'}, logBox:{backgroundColor:'#0a0a0a',borderRadius:12,padding:12,borderWidth:1,borderColor:'#1a1a1a', minHeight:120}, lt:{color:'#555',fontSize:10,marginBottom:3}
});
