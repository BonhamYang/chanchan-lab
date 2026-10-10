"""Convert licensed aggregate placement histograms into Chanchan snapshot rows.
No network calls. Does not copy datasets from third-party projects.
Input JSON: {metadata:{status:'authorized',provider,license_reference,generated_at},
  comps:[{season,patch,name,places:[first..eighth]}],
  items:[{season,patch,name,unit,items:[a,b,c],places:[first..eighth]}]}.
"""
import argparse
import json
from pathlib import Path
from validate_snapshot import validate

def convert(rows):
    if not isinstance(rows,dict):
        raise ValueError("Root must be object")
    result={"metadata":rows.get("metadata"),"comps":[],"items":[]}
    for kind in ("comps","items"):
        entries=rows.get(kind)
        if not isinstance(entries,list):
            raise ValueError(kind+" array missing")
        for i,r in enumerate(entries):
            if not isinstance(r,dict):
                raise ValueError(f"{kind}[{i}] must be object")
            places=r.get("places")
            if not isinstance(places,list) or len(places)!=8 or any(type(v) is not int or v<0 for v in places):
                raise ValueError(f"{kind}[{i}] needs exactly eight nonnegative integer placements")
            n=sum(places)
            if n==0:
                raise ValueError(f"{kind}[{i}] zero samples")
            obj={key:r.get(key) for key in ("season","patch","name")}
            if kind=="items":
                obj.update({"unit":r.get("unit"),"items":r.get("items")})
            obj.update({"sample_count":n,"top4_count":sum(places[:4]),"win_count":places[0],
              "rank_sum":sum((rank+1)*count for rank,count in enumerate(places))})
            result[kind].append(obj)
    errors=validate(result)
    if errors:
        raise ValueError("; ".join(errors))
    return result

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--input",required=True)
    p.add_argument("--output",required=True)
    args=p.parse_args()
    source=json.loads(Path(args.input).read_text(encoding="utf8"))
    result=convert(source)
    path=Path(args.output)
    if path.resolve()==Path(args.input).resolve():
        raise ValueError("Refusing to overwrite input")
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n",encoding="utf8")
    print("PASS: computed",len(result["comps"]),"comps and",len(result["items"]),"item builds")

if __name__=="__main__":
    main()
