import unittest
from unittest.mock import patch
from datetime import datetime, timezone, timedelta
import refresh_authorized_snapshot as refresh
from test_validate_snapshot import sample

class RefreshTests(unittest.TestCase):
    def setUp(self):
        self.config=patch.multiple(refresh,EXPECTED_PROVIDER='test',EXPECTED_LICENSE='test-only')
        self.config.start();self.addCleanup(self.config.stop)
    def test_accepts_approved_snapshot(self): refresh.check_update(sample())
    def test_rejects_tft(self):
        d=sample();d['metadata']['game']='tft'
        with self.assertRaises(ValueError): refresh.check_update(d)
    def test_rejects_unapproved_license(self):
        d=sample();d['metadata']['license_reference']='another'
        with self.assertRaises(ValueError): refresh.check_update(d)
    def test_rejects_old_and_empty_snapshot(self):
        d=sample();d['metadata']['generated_at']=(datetime.now(timezone.utc)-timedelta(days=3)).isoformat()
        with self.assertRaises(ValueError): refresh.check_update(d)
        d=sample();d['comps']=[]
        with self.assertRaises(ValueError): refresh.check_update(d)
    def test_rejects_rollback(self):
        d=sample();old=sample()
        d['metadata']['generated_at']=(datetime.now(timezone.utc)-timedelta(hours=1)).isoformat()
        with self.assertRaises(ValueError): refresh.check_update(d,old)
