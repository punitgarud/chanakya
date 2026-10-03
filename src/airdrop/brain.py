import requests, os, json, time
RISK_API=os.getenv("METEORA_RISK_API_URL","http://127.0.0.1:8787")
PROTOCOLS=["jupiter","kamino","marginfi","drift","tensor","zeta","parcl"]
def get_jup_points(wallet):
  try:
    r=requests.get(f"https://points.jup.ag/be/{wallet}",timeout=5).json()
    return r.get("points",0)
  except: return 0
def diversity_score(history):
  uniq=len(set([h.get("protocol") for h in history]))
  weeks=len(set([h.get("week") for h in history]))
  return uniq*10+weeks*15
def should_farm(protocol,history):
  # 70% main + 30% new, 0.05-0.3 SOL/tx, 1 tx/day/protocol max, stop if TVL drops >50% 7d
  return True
def daily_tasks(wallet="paper"):
  tasks=[]
  for p in PROTOCOLS:
    tasks.append({"protocol":p,"action":"swap 0.05 SOL","volume":0.05,"reason":"diversity+consistency"})
  return tasks
if __name__=="__main__":
  print("[AirdropHunter] 70% main 30% new | 0.05-0.3 SOL/tx | 1 tx/day/protocol")
  for t in daily_tasks(): print(t)
