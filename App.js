import React,{useState,useEffect,useRef} from 'react';
import {View,Text,StyleSheet,ScrollView,TouchableOpacity,Alert,Linking} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-get-random-values';
import {Buffer} from 'buffer'; global.Buffer=Buffer;

const MODULES = [
  { id:'mickey', name:'MickeyScout v2', color:'#FFCC00', desc:'1% max fee - scout-free', type:'scout' },
  { id:'airdrop', name:'Airdrop Helper v2', color:'#00FF94', desc:'Jito/Kamino/Jupiter', type:'airdrop' },
  { id:'god', name:'GOD v15', color:'#FFD700', desc:'Robust 5.2%', type:'trade' },
  { id:'volume', name:'Volume Hunter v3', color:'#00FF88', desc:'Volume spike >120%', type:'trade' },
  { id:'seeker', name:'Seeker Sniper v2', color:'#00D4FF', desc:'New token sniper', type:'trade' },
  { id:'usdt', name:'USDT Scalper', color:'#FF6B6B', desc:'USDT/SOL scalping', type:'trade' },
  { id:'sol', name:'SOL Pump', color:'#A78BFA', desc:'SOL momentum >3.5%', type:'trade' },
  { id:'safe', name:'RugCheck', color:'#4ADE80', desc:'Liquidity lock', type:'safety' },
];

export default function App(){
const [wallet,setWallet]=useState(null);
const [solBal,setSolBal]=useState(0);
const [stats,setStats]=useState({totalTrades:0});
const [autoTrade,setAutoTrade]=useState(false);
const [mods,setMods]=useState({mickey:true, airdrop:true, god:true, volume:true, seeker:true, usdt:true, sol:true, safe:true});
const [godStatus,setGodStatus]=useState('Idle');
const [mickeyStatus,setMickeyStatus]=useState('Ready');
const [guards,setGuards]=useState(['✅ Volume OK','✅ Network OK','✅ Seeker Ready']);
const [logs,setLogs]=useState([]);
const [connError,setConnError]=useState('');
const memRef=useRef({thr:4.5});
const addLog=m=>setLogs(l=>[new Date().toLocaleTimeString()+' '+m,...l].slice(0,40));

const refreshBal=async(addr)=>{
 try{
  const {Connection,PublicKey}=await import('@solana/web3.js');
  const conn=new Connection('https://rpc.helius.xyz/?api-key=YOUR_KEY || https://api.mainnet-beta.solana.com','confirmed');
  const bal=await conn.getBalance(new PublicKey(addr)); setSolBal(bal/1e9); addLog('BAL '+ (bal/1e9).toFixed(4)+' SOL');
 }catch(e){ addLog('Bal err '+e.message); }
};

useEffect(()=>{(async()=>{
  try{
   const {transact}=await import('@solana-mobile/mobile-wallet-adapter-protocol-web3js');
   addLog('MWA Ready - Seeker detected');
  }catch(e){ addLog('MWA not ready: '+e.message); setConnError('Install Phantom or Seeker Wallet'); }
})()},[]);

// FIXED NATIVE CONNECT - no SecureStore, direct
const connectNative=async()=>{
 setConnError('');
 addLog('Connecting Seeker...');
 try{
  const {transact}=await import('@solana-mobile/mobile-wallet-adapter-protocol-web3js');
  const result = await transact(async(wallet)=>{
    const auth = await wallet.authorize({
      cluster: 'mainnet-beta',
      identity: { name: 'Mahadev', uri: 'https://mahadev.app', icon: 'favicon.ico' }
    });
    return auth;
  });
  const addr = result.accounts[0].address;
  const authToken = result.auth_token;
  setWallet(addr);
  addLog('✅ CONNECTED '+addr.slice(0,6)+'...'+addr.slice(-4));
  addLog('Auth token saved, fetching balance...');
  // Save for later signing
  global.MAHADEV_WALLET = { address: addr, authToken };
  await refreshBal(addr);
  Alert.alert('🔱 Mahadev Connected', `Wallet:\n${addr}\n\nThis is your NATIVE Seeker wallet\nWill show 0.311 SOL if selected correctly`);
 }catch(e){
  const msg = e.message || JSON.stringify(e);
  setConnError(msg);
  addLog('❌ Connect failed: '+msg);
  Alert.alert('Connect Failed', msg + '\n\n1. Open Seeker Wallet app first\n2. Make sure Seed Vault unlocked\n3. Try again\n\nOr install Phantom and select punitgarud.skr');
 }
};

const runMickeyScout=async()=>{
 try{
  const {findTopPools, filterCheap}=require('./src/modules/scout-free');
  const pools=await findTopPools();
  const cheap=filterCheap(pools);
  setMickeyStatus(`${pools.length} pools | Cheap ≤1%: ${cheap.length} | Best: ${cheap[0]?.name} ${cheap[0]?.fee}%`);
  addLog(`Scout: ${cheap.length}/${pools.length} cheap`);
 }catch(e){ setMickeyStatus('Scout err '+e.message); }
};

useEffect(()=>{ if(mods.mickey){ runMickeyScout(); const id=setInterval(runMickeyScout,60000); return()=>clearInterval(id);} },[mods.mickey]);

useEffect(()=>{
 if(!mods.god) return;
 const run=async()=>{
  try{
   const {runGOD}=require('./src/modules/seekergod/GodEngine');
   const res=await runGOD(memRef,()=>{},setGuards,addLog,null);
   setGodStatus(res.skip? 'WAIT '+res.reason : `SIGNAL ${res.dir} ${res.best.sym} ${res.robust}%`);
  }catch(e){ setGodStatus('Error '+e.message); }
 };
 run(); const id=setInterval(run,30000); return()=>clearInterval(id);
},[mods.god]);

return(
<View style={s.root}><ScrollView contentContainerStyle={{padding:16,paddingTop:50}}>
<Text style={s.title}>🔱 MAHADEV TRISHUL</Text><Text style={s.sub}>MICKEYSCOUT 1% • NATIVE • v20 FIX</Text>

<View style={s.card}>
<TouchableOpacity style={[s.cb,{backgroundColor: wallet?'#00FF94':'#fff'}]} onPress={connectNative}>
<Text style={s.cbt}>{wallet? '✅ '+wallet.slice(0,4)+'...'+wallet.slice(-4)+' '+solBal.toFixed(4)+' SOL' : '🔐 Connect NATIVE Seeker Wallet'}</Text>
</TouchableOpacity>
{wallet && <Text selectable style={{color:'#00FF94',fontSize:9,marginTop:6,textAlign:'center'}}>{wallet}</Text>}
{connError? <Text style={{color:'#FF6B6B',fontSize:10,marginTop:6}}>{connError}</Text>:null}
<Text style={s.bv}>SOL {solBal.toFixed(4)} | Trades {stats.totalTrades} | {Object.values(mods).filter(Boolean).length}/8 ON</Text>
<View style={s.row2}><Text style={s.ct}>Real Auto-Trade (Native)</Text><TouchableOpacity style={[s.sw,autoTrade&&{backgroundColor:'#0f0'}]} onPress={()=>setAutoTrade(!autoTrade)}><Text style={[s.swt,autoTrade&&{color:'#000'}]}>{autoTrade?'ON':'OFF'}</Text></TouchableOpacity></View>
</View>

{MODULES.map(m=>(
<View key={m.id} style={[s.card,{borderColor:m.color, borderWidth: mods[m.id]?1.5:0.5}]}>
<View style={s.row}><View style={{flex:1}}><Text style={[s.ct,{color:m.color}]}>{m.name}</Text><Text style={s.cs}>{m.id==='god'? godStatus : m.id==='mickey'? mickeyStatus : m.desc}</Text></View>
<TouchableOpacity style={[s.sw,{backgroundColor: mods[m.id]? m.color : '#333'}]} onPress={()=>setMods({...mods, [m.id]:!mods[m.id]})}><Text style={[s.swt,{color: mods[m.id]?'#000':'#fff'}]}>{mods[m.id]?'ON':'OFF'}</Text></TouchableOpacity></View>
{m.id==='god' && guards.map((g,i)=><Text key={i} style={s.cs}>{g}</Text>)}
{m.id==='airdrop' && mods.airdrop && <View style={{flexDirection:'row',flexWrap:'wrap',marginTop:6}}>
<TouchableOpacity style={s.ab} onPress={()=>Linking.openURL('https://jup.ag')}><Text style={s.abt}>Jupiter</Text></TouchableOpacity>
<TouchableOpacity style={s.ab} onPress={()=>Linking.openURL('https://www.jito.network/staking/')}><Text style={s.abt}>Jito</Text></TouchableOpacity>
</View>}
</View>
))}
<View style={s.logBox}>{logs.map((l,i)=><Text key={i} style={s.lt}>{l}</Text>)}</View>
<Text style={{color:'#333',fontSize:9,textAlign:'center',marginTop:10}}>Fix: No SecureStore, direct transact. Make sure Seeker Wallet unlocked before tap.</Text>
</ScrollView></View>
);
}
const s=StyleSheet.create({
root:{flex:1,backgroundColor:'#080808'}, title:{color:'#00D4FF',fontSize:22,fontWeight:'900',textAlign:'center'}, sub:{color:'#FFCC00',textAlign:'center',fontSize:10,marginBottom:10,fontWeight:'bold'},
card:{backgroundColor:'#121212',borderRadius:14,padding:12,borderWidth:1,borderColor:'#222',marginBottom:10}, row:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}, row2:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginTop:10,backgroundColor:'#1a1a1a',padding:10,borderRadius:10}, ct:{color:'#fff',fontWeight:'bold'}, cs:{color:'#aaa',fontSize:11,marginTop:4}, cb:{backgroundColor:'#fff',padding:14,borderRadius:20,alignItems:'center'}, cbt:{color:'#000',fontWeight:'bold',fontSize:12}, bv:{color:'#fff',textAlign:'center',marginTop:8,fontWeight:'bold',fontSize:12}, sw:{backgroundColor:'#333',paddingHorizontal:12,paddingVertical:6,borderRadius:12}, swt:{color:'#fff',fontWeight:'bold'}, logBox:{backgroundColor:'#0a0a0a',borderRadius:12,padding:12,borderWidth:1,borderColor:'#1a1a1a', minHeight:150}, lt:{color:'#aaa',fontSize:10,marginBottom:3}, ab:{backgroundColor:'#222',paddingHorizontal:10,paddingVertical:5,borderRadius:10,marginRight:6,marginBottom:6,borderWidth:1,borderColor:'#333'}, abt:{color:'#fff',fontSize:10,fontWeight:'bold'}
});
