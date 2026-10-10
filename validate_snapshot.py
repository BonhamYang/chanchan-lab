"""Offline validator for authorized aggregate snapshots; does not fetch external data."""
import json, sys
from pathlib import Path
from datetime import datetime, timezone

def validate(d):
    errs=[]
    if not isinstance(d,dict): return ["root must be object"]
    m=d.get("metadata")
    if not isinstance(m,dict): return ["metadata missing"]
    for k in ("provider","license_reference","generated_at"):
        if not isinstance(m.get(k),str) or not m[k].strip(): errs.append("metadata."+k+" missing")
    if m.get("status")!="authorized": errs.append("source is not registered as authorized")
    try:
        dt=datetime.fromisoformat(m["generated_at"].replace("Z","+00:00"))
        if dt.tzinfo is None or dt>datetime.now(timezone.utc): errs.append("invalid timestamp")
    except (ValueError,KeyError,TypeError,AttributeError): errs.append("bad timestamp")
    for kind in ("comps","items"):
        rows=d.get(kind)
        if not isinstance(rows,list): errs.append(kind+" must be list"); continue
        keys=set()
        for i,r in enumerate(rows):
            p=f"{kind}[{i}]"
            if not isinstance(r,dict): errs.append(p+" not object"); continue
            if r.get("season") not in ("nature","ink") or not all(isinstance(r.get(k),str) and r[k] for k in ("patch","name")): errs.append(p+" invalid season/patch/name")
            n,t,w,rs=(r.get(k) for k in ("sample_count","top4_count","win_count","rank_sum"))
            valid_counts=all(type(v) is int and v>=0 for v in (n,t,w,rs))
            if not valid_counts or n<1 or t>n or w>t or rs<n or rs>8*n: errs.append(p+" invalid counts")
            gear=r.get("items") if kind=="items" else []
            if kind=="items" and (not isinstance(r.get("unit"),str) or not r["unit"].strip() or not isinstance(gear,list) or len(gear)!=3 or not all(isinstance(g,str) and g.strip() for g in gear)): errs.append(p+" invalid gear")
            normalized_gear=tuple(sorted(g.strip() for g in gear)) if isinstance(gear,list) and all(isinstance(g,str) for g in gear) else ()
            ident=(r.get("season") if isinstance(r.get("season"),str) else None,
                   r.get("patch") if isinstance(r.get("patch"),str) else None,
                   r.get("unit") if kind=="items" and isinstance(r.get("unit"),str) else r.get("name") if kind=="comps" and isinstance(r.get("name"),str) else None,
                   normalized_gear)
            if ident in keys: errs.append(p+" duplicate")
            keys.add(ident)
    return errs

if __name__=="__main__":
    try: issues=validate(json.loads(Path(sys.argv[1]).read_text(encoding="utf8")))
    except (IndexError,OSError,ValueError) as e: issues=[str(e)]
    print("PASS (schema only; permission requires independent verification)" if not issues else "REJECTED: "+"; ".join(issues))
    sys.exit(bool(issues))
