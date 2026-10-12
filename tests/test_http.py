import unittest,threading,json
from http.server import ThreadingHTTPServer
from urllib.request import Request,urlopen
from urllib.error import HTTPError
from server import Handler

class HTTPTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.http=ThreadingHTTPServer(('127.0.0.1',0),Handler)
        cls.thread=threading.Thread(target=cls.http.serve_forever,daemon=True);cls.thread.start()
        cls.base='http://127.0.0.1:'+str(cls.http.server_port)
    @classmethod
    def tearDownClass(cls): cls.http.shutdown();cls.http.server_close();cls.thread.join()
    def test_private_files_blocked_for_get_and_head(self):
        for method in ('GET','HEAD'):
            for path in ('/server.py','/.git/config','/README.md','/data/snapshot.json','/%2e%2e/server.py','/licenses.private.json'):
                with self.assertRaises(HTTPError) as exc: urlopen(Request(self.base+path,method=method))
                self.assertEqual(exc.exception.code,404)
    def test_pages_and_catalogs(self):
        for path in ('/','/catalog.html','/item-analyzer.html','/import-stats.html','/api/catalog/nature','/api/catalog/ink'):
            with urlopen(self.base+path) as r:self.assertEqual(r.status,200)
    def test_head_api_has_no_body(self):
        with urlopen(Request(self.base+'/api/status',method='HEAD')) as r:
            self.assertEqual(r.status,200);self.assertEqual(r.read(),b'')
    def test_status_exposes_freshness(self):
        with urlopen(self.base+'/api/status') as r:d=json.load(r)
        self.assertIn('stale',d);self.assertIn('generated_at',d)
