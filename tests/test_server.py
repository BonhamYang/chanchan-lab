import unittest
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from server import Handler

class ServerTests(unittest.TestCase):
    def test_snapshot_shape(self):
        result=Handler.snapshot(None)
        self.assertIn("comps",result)
        self.assertIn("items",result)
        self.assertIsInstance(result["comps"],list)
    def test_status_is_empty(self):
        result=Handler.status(None)
        self.assertEqual(result["counts"]["comps"],0)
        self.assertEqual(result["counts"]["items"],0)
if __name__=="__main__":
    unittest.main()
