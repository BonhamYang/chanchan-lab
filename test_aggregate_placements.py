import unittest
from datetime import datetime,timezone
from tools.aggregate_placements import convert

def source():
    return {"metadata":{"status":"authorized","provider":"test-fixture-only","license_reference":"unit-test","generated_at":datetime.now(timezone.utc).isoformat()},
       "comps":[{"season":"nature","patch":"example","name":"example","places":[2,1,1,0,0,0,0,0]}],
       "items":[{"season":"ink","patch":"example","name":"example","unit":"example","items":["a","b","c"],"places":[1,0,0,1,0,0,0,1]}]}

class AggregationTests(unittest.TestCase):
    def test_counts_from_histogram(self):
        result=convert(source());c=result["comps"][0]
        self.assertEqual((c["sample_count"],c["win_count"],c["top4_count"],c["rank_sum"]),(4,2,4,7))
        item=result["items"][0];self.assertEqual((item["sample_count"],item["win_count"],item["top4_count"],item["rank_sum"]),(3,1,2,13))
    def test_rejects_missing_or_negative_histogram(self):
        d=source();d["comps"][0]["places"]=[1,-1,0,0,0,0,0,0]
        with self.assertRaises(ValueError):convert(d)
    def test_rejects_unlicensed_flag(self):
        d=source();d["metadata"]["status"]="unknown"
        with self.assertRaises(ValueError):convert(d)
    def test_rejects_zero_samples(self):
        d=source();d["items"][0]["places"]=[0]*8
        with self.assertRaises(ValueError):convert(d)

if __name__=="__main__":unittest.main()
