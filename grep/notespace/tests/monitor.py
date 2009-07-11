import unittest
import json

from werkzeug import Client, BaseResponse

from grep.notespace import server, demo_db

class TestDb(demo_db.DemoDb):
    committed = False
    def commit(self):
        self.committed = True

class TestSubscriber(object):
    def notify_props_change(self, app, note_id):
        app.db.notes[2].props['y'] = app.db.notes[note_id].props['x']

class MonitorTestCase(unittest.TestCase):
    def setUp(self):
        self.db = TestDb()
        self.db.create_note(0, {'desc': 'ROOT'}, [1, 2])
        self.db.create_note(1, {'desc': 'note 1'})
        self.db.create_note(2, {'desc': 'note 2', 'y': 0})
        self.app = server.NotespaceApp(self.db)
        self.client = Client(self.app, BaseResponse)
        self.app.db.subscribers.append(TestSubscriber())

    def test_notify(self):
        test_props = {'desc': 'new content here', 'x': 13}
        resp = self.client.post('/notes/1', data={'props': json.dumps(test_props)})
        self.failUnless(self.db.committed)
        self.failUnlessEqual(self.db.notes[2].props['y'], 13)
        # TODO: server should tell us what notes were affected

if __name__ == '__main__':
    unittest.main()
