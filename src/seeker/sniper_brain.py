CONFIG={"name":"Sniper God","size_sol":0.3,"max_pos":2,"mcap_min":50000,"mcap_max":500000,"inflow":0.60,"venue":"DLMM"}
def screen(tokens):
  from src.lpcore.screening import security_gate, inflow_gate
  return [t for t in tokens if CONFIG["mcap_min"]<=t.get("mcap",0)<=CONFIG["mcap_max"] and security_gate(t) and inflow_gate(t,0.60,0.80,0.95)]
