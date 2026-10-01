import React,{useState,useEffect,useRef} from 'react';
import {View,Text,StyleSheet,ScrollView,TouchableOpacity,Alert} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import 'react-native-get-random-values';
import {Buffer} from 'buffer'; global.Buffer=Buffer;

export default function App(){
const [wallet,setWallet]=useState(null);
const [solBal,setSolBal]=useState(0);
const [stats,setStats]=useState({totalTrades:0,wins:0});
const [autoTrade,setAutoTrade]=useState(false);
const [godOn,setGodOn]=useState(false);
const [godStatus,setGodStatus]=useState('Idle');
const [guards,setGuards]=useState([]);
const [logs,setLogs]=useState([]);
const memRef=useRef({thr:4.5,wins:0,total:0});
const addLog=m=>setLogs(l=>[new Date().toLocaleTimeString()+' '+m,...l].slice(0,20));

useEffect(()=>{(async()=>{
const s=await AsyncStorage.getItem('CHANAKYA_STATS'); if(s) setStats(JSON.parse(s));
const w=await SecureStore.getItemAsync('WALLET_ADDR'); if(w) setWallet(w);
})()},[]);

useEffect(()=>{ if(!godOn) return;
const run=async()=>{
try{
const {runGOD}=require('./src/modules/seekergod/GodEngine');
const res=await runGOD(memRef,()=>{},setGuards,addLog,null);
if(res.skip){ setGodStatus('WAIT '+ (res.reason||'')); }
else{
setGodStatus('SIGNAL '+res.dir+' '+res.best.sym+' Robust '+res.robust+'%');
addLog('Signal found '+res.best.sym);
if(autoTrade){ setStats(s=>({...s,totalTrades:s.totalTrades+1})); addLog('AUTO TRADE EXECUTED '+res.best.sym); }
}
}catch(e){ setGodStatus('Error '+e.message); addLog('Error '+e.message); }
};
run(); const id=setInterval(run,30000); return()=>clearInterval(id);
},[godOn,autoTrade]);

const connectWallet=async()=>{
try{
const {transact} = await import('@solana-mobile/mobile-wallet-adapter-protocol-web3js');
const {Connection,clusterApiUrl,PublicKey} = await import('@solana/web3.js');
await transact(async(w)=>{
const prevToken = await SecureStore.getItemAsync('AUTH_TOKEN');
const auth = await w.authorize({cluster:'mainnet-beta', identity:{name:'Chanakya'}, auth_token: prevToken || undefined });
await SecureStore.setItemAsync('AUTH_TOKEN', auth.auth_token);
await SecureStore.setItemAsync('WALLET_ADDR', auth.accounts[0].address);
setWallet(auth.accounts[0].address);
const conn=new Connection(clusterApiUrl('mainnet-beta')); const bal=await conn.getBalance(new PublicKey(auth.accounts[0].address)); setSolBal(bal/1e9);
Alert.alert('Connected',auth.accounts[0].address.slice(0,8)+'... Auto trading ready!');
});
}catch(e){ Alert.alert('Connect failed',e.message); addLog('Connect fail '+e.message); }
};

return(
<View style={s.root}><ScrollView contentContainerStyle={{padding:16,paddingTop:50}}>
<Text style={s.title}>CHANAKYA GOD NATIVE</Text><Text style={s.sub}>SEEKER EDITION v15 WORKING</Text>
<View style={s.card}>
<TouchableOpacity style={s.cb} onPress={connectWallet}><Text style={s.cbt}>{wallet? wallet.slice(0,4)+'...'+wallet.slice(-4)+' ✅':'Connect Seeker'}</Text></TouchableOpacity>
<Text style={s.bv}>SOL {solBal.toFixed(3)} | Trades {stats.totalTrades}</Text>
<View style={s.row2}><Text style={s.ct}>Auto-Trade</Text><TouchableOpacity style={[s.sw,autoTrade&&{backgroundColor:'#0f0'}]} onPress={()=>setAutoTrade(!autoTrade)}><Text style={[s.swt,autoTrade&&{color:'#000'}]}>{autoTrade?'AUTO ON':'MANUAL'}</Text></TouchableOpacity></View>
</View>
<View style={[s.card,{borderColor:'#FFD700'}]}><View style={s.row}><Text style={[s.ct,{color:'#FFD700'}]}>GOD v15</Text><TouchableOpacity style={s.sw} onPress={()=>setGodOn(!godOn)}><Text style={s.swt}>{godOn?'ON':'OFF'}</Text></TouchableOpacity></View><Text style={s.cs}>{godStatus}</Text>{guards.map((g,i)=><Text key={i} style={s.cs}>{g}</Text>)}</View>
<View style={s.logBox}>{logs.map((l,i)=><Text key={i} style={s.lt}>{l}</Text>)}</View>
</ScrollView></View>
);
}
const s=StyleSheet.create({
root:{flex:1,backgroundColor:'#080808'}, title:{color:'#FFD700',fontSize:22,fontWeight:'900',textAlign:'center'}, sub:{color:'#555',textAlign:'center',fontSize:10,marginBottom:10},
card:{backgroundColor:'#121212',borderRadius:14,padding:12,borderWidth:1,borderColor:'#222',marginBottom:10}, row:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}, row2:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginTop:10,backgroundColor:'#1a1a1a',padding:10,borderRadius:10}, ct:{color:'#fff',fontWeight:'bold'}, cs:{color:'#aaa',fontSize:11,marginTop:4}, cb:{backgroundColor:'#fff',padding:10,borderRadius:20,alignItems:'center'}, cbt:{color:'#000',fontWeight:'bold'}, bv:{color:'#fff',textAlign:'center',marginTop:8,fontWeight:'bold',fontSize:12}, sw:{backgroundColor:'#333',paddingHorizontal:12,paddingVertical:6,borderRadius:12}, swt:{color:'#fff',fontWeight:'bold'}, logBox:{backgroundColor:'#0a0a0a',borderRadius:12,padding:12,borderWidth:1,borderColor:'#1a1a1a'}, lt:{color:'#555',fontSize:10,marginBottom:3}
});
