"""Convert an explicitly selected CommunityDragon TFT set into a local catalog candidate.
Does NOT imply the set is equivalent to Golden Spatula and does NOT publish.
Input: downloaded JSON from a permitted source. Requires explicit setData index.
Usage: python tools/convert_cdragon.py --input source.json --set-index 0 --season nature --output candidate.json
"""
import argparse
import json
from pathlib import Path

def convert(source, set_index, season):
    if season not in ("nature","ink"):
        raise ValueError("Unsupported target season")
    sets = source.get("setData")
    if not isinstance(sets,list) or not (0 <= set_index < len(sets)):
        raise ValueError("Explicit setData index not found")
    selected = sets[set_index]
    if not isinstance(selected,dict) or not isinstance(selected.get("champions"),list):
        raise ValueError("Set must include champions")
    champions=[]
    known=set()
    for record in selected["champions"]:
        if not isinstance(record,dict):
            continue
        name=record.get("name")
        identifier=record.get("apiName") or record.get("characterName")
        cost=record.get("cost")
        traits=record.get("traits")
        if record.get("isSpawn") or not isinstance(name,str) or not name.strip():
            continue
        if not isinstance(identifier,str) or not identifier.strip():
            continue
        if type(cost) is not int or not 1<=cost<=5 or not isinstance(traits,list):
            continue
        if not all(isinstance(t,str) for t in traits):
            continue
        if identifier in known:
            continue
        champions.append({"id":identifier,"name":name.strip(),"cost":cost,"traits":traits})
        known.add(identifier)
    if not champions:
        raise ValueError("Selected set contains no valid playable champions")
    # Item membership varies among sets and is not always safely joinable.
    # Never attach all global items to a specific Golden Spatula season.
    return {
      "season":season,
      "metadata":{
        "status":"candidate-unverified",
        "provider":"CommunityDragon TFT",
        "source_set_name":str(selected.get("name","")),
        "source_set_number":str(selected.get("number","")),
        "source_set_index":set_index,
        "patch":None,
        "warning":"TFT source only; manual equivalence and redistribution approval required"
      },
      "champions":sorted(champions,key=lambda x:(x["cost"],x["name"])),
      "items":[]
    }

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input",required=True)
    parser.add_argument("--set-index",type=int,required=True)
    parser.add_argument("--season",choices=["nature","ink"],required=True)
    parser.add_argument("--output",required=True)
    args=parser.parse_args()
    data=json.loads(Path(args.input).read_text(encoding="utf-8"))
    result=convert(data,args.set_index,args.season)
    dest=Path(args.output)
    if dest.resolve() in [Path("data/catalog/nature.json").resolve(),Path("data/catalog/ink.json").resolve()]:
        raise ValueError("Refusing to overwrite public catalog with unverified candidate")
    dest.parent.mkdir(parents=True,exist_ok=True)
    dest.write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print("Candidate only:",len(result["champions"]),"champions; manual validation required")

if __name__=="__main__":
    main()
