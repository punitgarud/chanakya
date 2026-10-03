CONFIG={"name":"Scalper God","size_sol":0.2,"max_pos":3,"mcap_min":200000,"mcap_max":2000000,"venue":"DLMM"}
def screen(tokens): return [t for t in tokens if 200000<=t.get("mcap",0)<=2000000]
