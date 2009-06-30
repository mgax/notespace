from copy import deepcopy
import unittest
import json
from werkzeug import Client, BaseResponse

from grep.notespace import server, demo_db

class TestDb(demo_db.DemoDb):
    committed = False
    def commit(self):
        self.committed = True

class TestGetNotes(unittest.TestCase):
    def setUp(self):
        self.db = TestDb()
        self.db.create_note(0, {'desc': 'ROOT'}, [1, 2])
        self.db.create_note(1, {'desc': 'note 1'})
        self.db.create_note(2, {'desc': 'note 2'})
        self.app = server.NotespaceApp(self.db)
        self.client = Client(self.app, BaseResponse)

    def failUnlessJsonResponse(self, resp, json_data):
        self.failUnlessEqual(resp.status_code, 200)
        self.failUnlessEqual(resp.headers['Content-Type'], 'application/json')
        self.failUnlessEqual(json.loads(resp.data), json_data)

    def test_notes_listing(self):
        self.failUnlessJsonResponse(self.client.get('/notes'), [0, 1, 2])

    def test_get_note(self):
        self.failUnlessJsonResponse(self.client.get('/notes/0'), {'desc': 'ROOT'})
        self.failUnlessJsonResponse(self.client.get('/notes/0/children'), [1, 2])

    def test_change_note(self):
        test_props = {'desc': 'new content here', 'a': 'b'}
        resp = self.client.post('/notes/1', data={'props': json.dumps(test_props)})
        self.failUnless(self.db.committed)
        self.failUnlessEqual(self.db.notes[1].props, test_props)
        self.failUnlessJsonResponse(resp, test_props)

    def test_create_note(self):
        resp = self.client.post('/notes', data={'props': json.dumps({'f': 'g'})})
        self.failUnlessJsonResponse(resp, 3)
        self.failUnless(self.db.committed)
        self.failUnlessEqual(len(self.db.notes), 4)
        self.failUnlessEqual(self.db.notes[3].props, {'f': 'g'})

    def test_set_children(self):
        resp = self.client.post('/notes/1/children', data={'children': json.dumps([2])})
        self.failUnlessJsonResponse(resp, [2])
        self.failUnless(self.db.committed)
        self.failUnlessEqual(self.db.notes[1].children, [2])
        self.failUnlessEqual(self.db.notes[0].children, [1])

    def test_remove_note(self):
        self.client.post('/notes/1/children', data={'children': json.dumps([2]) })
        self.failUnless(1 in self.db.notes)
        self.failUnless(2 in self.db.notes[1].children)

        resp = self.client.delete('/notes/1')
        self.failUnlessJsonResponse(resp, 'ok')
        self.failIf(1 in self.db.notes)
        self.failIf(1 in self.db.notes[0].children)
        self.failIf(2 in self.db.notes)

if __name__ == '__main__':
    unittest.main()
