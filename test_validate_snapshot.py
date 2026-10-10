import unittest
from datetime import datetime, timezone
from validate_snapshot import validate

def sample():
    return {"metadata":{"status":"authorized","provider":"test","license_reference":"test-only","generated_at":datetime.now(timezone.utc).isoformat()},
      "comps":[{"season":"nature","patch":"18.3","name":"sample","sample_count":20,"top4_count":10,"win_count":2,"rank_sum":90}],"items":[]}

class TestValidator(unittest.TestCase):
    def test_accepts_valid_schema(self): self.assertEqual(validate(sample()),[])
    def test_rejects_unlicensed(self):
        d=sample();d["metadata"]["status"]="unknown";self.assertTrue(validate(d))
    def test_rejects_impossible_counts(self):
        d=sample();d["comps"][0]["win_count"]=21;self.assertTrue(validate(d))
    def test_rejects_duplicate(self):
        d=sample();d["comps"].append(d["comps"][0].copy());self.assertTrue(validate(d))

if __name__=="__main__": unittest.main()
