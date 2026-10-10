import unittest
from pathlib import Path
from server import ROOT

class ItemAnalyzerTests(unittest.TestCase):
    def test_assets_are_present(self):
        html=(ROOT/"item-analyzer.html").read_text(encoding="utf8")
        js=(ROOT/"item-analyzer.js").read_text(encoding="utf8")
        for marker in ('id="season"','id="unit"','id="patch"','id="item1"','id="item2"','id="minimum"'):
            self.assertIn(marker,html)
        for field in ("top4_count","win_count","rank_sum","sample_count","validRow"):
            self.assertIn(field,js)
    def test_routes_explicitly_allowed(self):
        server=(ROOT/"server.py").read_text(encoding="utf8")
        self.assertIn('"/item-analyzer.html"',server)
        self.assertIn('"/item-analyzer.js"',server)

if __name__=="__main__":
    unittest.main()
