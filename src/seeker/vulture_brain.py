CONFIG={"name":"Vulture God","size_sol":0.25,"max_pos":2,"venue":"DLMM"}
def screen(tokens):
  c=[]
  for t in tokens:
    ath=t.get("ath_mcap",t.get("mcap",0)*3)
    if t.get("mcap",0)/(ath+1)>0.3: continue
    if t.get("smartInflow",0)<0.55: continue
    c.append(t)
  return c
