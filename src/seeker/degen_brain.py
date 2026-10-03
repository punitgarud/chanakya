CONFIG={"name":"Degen God","size_sol_dlmm":0.5,"size_sol_damm":0.1,"max_pos_dlmm":2,"max_pos_damm":2,"mcap_max":100000,"venue":"DLMM+DAMM-v2","max_hold_h":48,"stop_pct":-90}
def screen(tokens): return [t for t in tokens if t.get("mcap",0)<=CONFIG["mcap_max"] and t.get("volume5m",0)>1000 and t.get("age_hours",100)<=24]
