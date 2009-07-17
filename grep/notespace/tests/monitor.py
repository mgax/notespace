import unittest
from os import path
from tempfile import mkdtemp
from shutil import rmtree
import json

from werkzeug import Client, BaseResponse

from grep.notespace import server
from grep.notespace.document import open_document

class TestSubscriber(object):
    def notify_props_change(self, app, note_id):
        app.doc.get_note(2).props['y'] = app.doc.get_note(note_id).props['x']

class MonitorTestCase(unittest.TestCase):
    def setUp(self):
        self.test_doc_path = mkdtemp()
        self.doc = open_document(path.join(self.test_doc_path, 'test_doc.db'))
        self.doc.create_note(0, {'desc': 'ROOT'}, [1, 2])
        self.doc.create_note(1, {'desc': 'note 1'})
        self.doc.create_note(2, {'desc': 'note 2', 'y': 0})
        self.app = server.NotespaceApp(self.doc)
        self.client = Client(self.app, BaseResponse)
        self.app.doc.subscribers.append(TestSubscriber())

    def tearDown(self):
        rmtree(self.test_doc_path)

    def test_notify(self):
        test_props = {'desc': 'new content here', 'x': 13}
        resp = self.client.post('/notes/1', data={'props': json.dumps(test_props)})
        self.doc.abort() # checking if transaction was committed
        self.failUnlessEqual(self.doc.get_note(2).props['y'], 13)
        # TODO: server should tell us what notes were affected

if __name__ == '__main__':
    unittest.main()
