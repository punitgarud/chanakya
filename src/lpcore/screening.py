import os
def security_gate(t):
  sec=t.get("security",{})
  if sec.get("hasMintAuthority"): return False
  if sec.get("hasFreezeAuthority"): return False
  if t.get("top10Holders",100) > 40: return False
  if t.get("liquidity",0) < 5: return False
  return True
def inflow_gate(t, low=0.50, high=0.60, reentry=0.95):
  iv=t.get("smartInflow",0)
  return low <= iv <= high or iv >= reentry
