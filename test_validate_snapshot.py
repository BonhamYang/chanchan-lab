import unittest
from datetime import datetime, timezone
from validate_snapshot import validate

def sample():
    return {"metadata":{"status":"authorized","provider":"test","license_reference":"test-only","generated_at":datetime.now(timezone.utc).isoformat()},
      "comps":[{"season":"nature","patch":"18.3","mode":"mode-a","rank":"group-a","name":"sample","sample_count":20,"top4_count":10,"win_count":2,"rank_sum":90}],"items":[]}

class TestValidator(unittest.TestCase):
    def test_accepts_valid_schema(self): self.assertEqual(validate(sample()),[])
    def test_rejects_unlicensed(self):
        d=sample();d["metadata"]["status"]="unknown";self.assertTrue(validate(d))
    def test_rejects_impossible_counts(self):
        d=sample();d["comps"][0]["win_count"]=21;self.assertTrue(validate(d))
    def test_rejects_duplicate_gear_permutations(self):
        d=sample()
        row={"season":"nature","patch":"18.3","mode":"mode-a","rank":"group-a","name":"first","unit":"hero","items":["A","B","C"],"sample_count":20,"top4_count":10,"win_count":2,"rank_sum":90}
        d["items"]=[row,{**row,"name":"second","items":["C","A","B"]}]
        self.assertTrue(any("duplicate" in x for x in validate(d)))
    def test_rejects_malformed_counts_without_crashing(self):
        d=sample();d["comps"][0]["top4_count"]="invalid"
        self.assertTrue(validate(d))
    def test_rejects_invalid_gear_without_crashing(self):
        d=sample();d["items"]=[{"season":"ink","patch":"x","name":"x","unit":"u","items":[1,2,3],"sample_count":1,"top4_count":1,"win_count":1,"rank_sum":1}]
        self.assertTrue(validate(d))
    def test_rejects_null_time(self):
        d=sample();d["metadata"]["generated_at"]=None
        self.assertTrue(validate(d))
    def test_mode_and_rank_keep_records_distinct(self):
        d=sample();row=d["comps"][0]
        d["comps"].extend([{**row,"mode":"mode-b"},{**row,"rank":"group-b"}])
        self.assertEqual(validate(d),[])
    def test_missing_mode_or_rank_rejected(self):
        d=sample();del d["comps"][0]["mode"]
        self.assertTrue(any("missing mode" in e for e in validate(d)))
    def test_rejects_duplicate(self):
        d=sample();d["comps"].append(d["comps"][0].copy());self.assertTrue(validate(d))

if __name__=="__main__": unittest.main()
