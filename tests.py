from copy import deepcopy
import unittest
import json
from werkzeug import Client, BaseResponse

import server

class TestGetNotes(unittest.TestCase):
    def setUp(self):
        server.the_notes = deepcopy(server.demo_notes)
        self.client = Client(server.application, BaseResponse)

    def failUnlessJsonResponse(self, resp, json_data):
        self.failUnlessEqual(resp.status_code, 200)
        self.failUnlessEqual(resp.headers['Content-Type'], 'application/json')
        self.failUnlessEqual(json.loads(resp.data), json_data)

    def test_notes_listing(self):
        self.failUnlessJsonResponse(self.client.get('/notes'), ['one', 'two'])

    def test_get_note(self):
        self.failUnlessJsonResponse(self.client.get('/notes/one'),
            {'x': 100, 'y': 50, 'content': 'ze first note'})

    def test_change_note(self):
        resp = self.client.post('/notes/one', data={'content': 'new content here'})
        self.failUnlessJsonResponse(resp,
            {'x': 100, 'y': 50, 'content': 'new content here'})

if __name__ == '__main__':
    unittest.main()
