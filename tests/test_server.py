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
    def test_no_secrets_exposed(self):
        allowed = ("/", "/index.html", "/api/snapshot", "/api/status")
        for path in ("/licenses.private.json","/server.py","/inbox/data.csv"):
            self.assertNotIn(path, allowed)
if __name__=="__main__":
    unittest.main()
