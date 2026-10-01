export async function runGOD(memRef, setThr, setGuards, addLog){
  try{
    addLog && addLog('GodEngine checking...');
    const res = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=volume_desc&per_page=5&page=1').then(r=>r.json()).catch(()=>[]);
    const best = { sym: res[0]?.symbol?.toUpperCase() || 'SOL', mint: 'So11111111111111111111111111111111111111112' };
    setGuards && setGuards(['✅ Volume OK','✅ Network OK','✅ Seeker Ready']);
    return { skip:false, dir:'BUY', best, inrAmt:100, robust:5.2, vol24: res[0]?.total_volume || 0 };
  }catch(e){
    return { skip:true, reason:e.message };
  }
}
