export const MICKEY_CONFIG={amountSol:0.04,tp:[0.5,1,2,5],sizes:[0.25,0.25,0.25,0.25],sl:-0.30,maxHoldMs:45*60*1000,slippageBps:300,mode:"PAPER_ONLY_24H"}
export async function mickeyBuyPaper(mint:string,symbol:string,score:number,inflow:number){
  console.log(`[PAPER 24H] BUY ${symbol} ${mint} score=${score} inflow=${inflow} amount=${MICKEY_CONFIG.amountSol} SOL`)
  return {tx:"paper_"+Date.now(),status:"PAPER"}
}
