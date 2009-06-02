from copy import deepcopy
import unittest
import json
from werkzeug import Client, BaseResponse

import server

class TestGetNotes(unittest.TestCase):
    def setUp(self):
        server.the_notes = server.demo_data()
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
        self.failUnlessEqual(server.the_notes[1].props, test_props)
        self.failUnlessJsonResponse(resp, test_props)

if __name__ == '__main__':
    unittest.main()
