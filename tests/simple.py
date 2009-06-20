from copy import deepcopy
import unittest
import json
from werkzeug import Client, BaseResponse

from grep.notespace import server

class TestGetNotes(unittest.TestCase):
    def setUp(self):
        test_db = server.DemoDb()
        test_db.create_note(0, {'desc': 'ROOT'}, [1, 2])
        test_db.create_note(1, {'desc': 'note 1'})
        test_db.create_note(2, {'desc': 'note 2'})
        server.the_notes = test_db
        self.test_notes = test_db.notes
        self.client = Client(server.application, BaseResponse)

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
        resp = self.client.post('/notes/1', data=test_props)
        self.failUnlessEqual(self.test_notes[1].props, test_props)
        self.failUnlessJsonResponse(resp, test_props)

    def test_create_note(self):
        resp = self.client.post('/notes', data={'f': 'g'})
        self.failUnlessJsonResponse(resp, 3)
        self.failUnlessEqual(len(self.test_notes), 4)
        self.failUnlessEqual(self.test_notes[3].props, {'f': 'g'})

    def test_set_children(self):
        resp = self.client.post('/notes/1/children', data={'children': json.dumps([2])})
        self.failUnlessJsonResponse(resp, [2])
        self.failUnlessEqual(self.test_notes[1].children, [2])
        #self.failUnlessEqual(self.test_notes[0].children, [1])

if __name__ == '__main__':
    unittest.main()