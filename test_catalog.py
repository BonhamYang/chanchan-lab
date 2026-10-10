import json
import unittest
from pathlib import Path
from server import ROOT

class CatalogFilesTests(unittest.TestCase):
    def test_seasons_are_isolated(self):
        for season in ("nature", "ink"):
            content = json.loads((ROOT / "data" / "catalog" / (season + ".json")).read_text(encoding="utf-8"))
            self.assertEqual(content["season"], season)
            self.assertIsInstance(content["champions"], list)
            self.assertIsInstance(content["items"], list)

    def test_catalog_ui_exists(self):
        html=(ROOT / "catalog.html").read_text(encoding="utf-8")
        js=(ROOT / "catalog.js").read_text(encoding="utf-8")
        for marker in ('id="season"', 'id="filter"', 'id="synergy"'):
            self.assertIn(marker,html)
        self.assertIn("updateFilter",js)
        self.assertIn("已选棋子的羁绊计数",js)

if __name__=="__main__":
    unittest.main()
