import os, requests, json
RISK_API=os.getenv("METEORA_RISK_API_URL","http://127.0.0.1:8787")
MIN_MCAP=30000; MAX_MCAP=300000; MIN_LIQ=8; MAX_TOP10=35; MIN_INFLOW=0.60; MIN_SCORE=65
def fetch():
  try:
    r=requests.get(f"{RISK_API}/feed/mickey", timeout=5)
    return r.json().get("tokens",[])
  except: return []
def gate(t):
  from src.lpcore.screening import security_gate
  if not security_gate(t): return False
  if t.get("holders",0)<40: return False
  if t.get("security",{}).get("bundlePct",0)>25: return False
  return True
def score(t):
  s=0; liq=t.get("liquidity",0)
  if 10<=liq<=50: s+=30
  if t.get("volume5m",0)>liq*0.2: s+=25
  if t.get("smartInflow",0)>=0.6: s+=20
  if t.get("dexPaid"): s+=10
  if t.get("holders",0)>100: s+=10
  return s
def screen():
  cands=[]
  for t in fetch():
    if not MIN_MCAP<=t.get("mcap",0)<=MAX_MCAP: continue
    if not gate(t): continue
    sc=score(t)
    if sc<MIN_SCORE: continue
    if t.get("smartInflow",0)<MIN_INFLOW: continue
    cands.append({**t,"score":sc})
  return sorted(cands, key=lambda x: x.get("smartInflow",0), reverse=True)[:5]
if __name__=="__main__":
  c=screen()
  print(f"[MickeyScout] {len(c)} candidates")
  for x in c: print(x.get("symbol"), x.get("mcap"), x.get("smartInflow"), x.get("score"))
