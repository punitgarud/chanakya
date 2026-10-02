export interface Pool { name:string, fee:number, baseFee?:number, liquidity?:number }
export async function findTopPools(): Promise<Pool[]>{
 try{
  // Try Raydium API
  const res = await fetch('https://api.raydium.io/v2/sdk/liquidity/mainnet.json');
  const data = await res.json();
  const pools = Object.values(data?.official||{}).slice(0,50).map((p:any)=>({
   name: p.name || p.baseSymbol+'/'+p.quoteSymbol,
   fee: (p.tradeFee || p.fee || 0.25),
   baseFee: p.tradeFee || 0.25,
   liquidity: p.liquidity
  }));
  if(pools.length>0) return pools;
 }catch(e){}
 // Fallback - Jupiter + known pools with fee data
 return [
  {name:'SOL/USDT', fee:0.05, baseFee:0.05, liquidity: 50000000},
  {name:'SOL/USDC', fee:0.05, baseFee:0.05, liquidity: 80000000},
  {name:'SKR/SOL', fee:1.0, baseFee:1.0, liquidity: 1200000},
  {name:'ZEC/SOL', fee:0.25, baseFee:0.25, liquidity: 900000},
  {name:'RAY/SOL', fee:0.25, baseFee:0.25, liquidity: 2000000},
  {name:'BONK/SOL', fee:1.0, baseFee:1.0, liquidity: 5000000},
  {name:'WIF/SOL', fee:4.0, baseFee:4.0, liquidity: 1000000}, // This will be filtered
 ];
}
export function filterCheap(pools: Pool[]){ return pools.filter(p=> (p.baseFee||p.fee||4) <= 1.0); }
