from copy import deepcopy
import unittest
import json
from werkzeug import Client, BaseResponse

from grep.notespace import server
from grep.notespace.document import create_test_document, Note

class AjaxTestNote(Note):
    def ajax(self, request):
        args = json.loads(request.form.get('args'))
        return server.JsonResponse('-%s-' % str(args['token']))

class WebTestCase(unittest.TestCase):
    def setUp(self):
        self.doc = create_test_document()
        self.doc.create_note(0, {'desc': 'ROOT'}, [1, 2])
        self.doc.create_note(1, {'desc': 'note 1'})
        self.doc.create_note(2, {'desc': 'note 2'})
        self.app = server.NotespaceApp(self.doc)
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
        self.failUnless(self.doc.db_connection.committed)
        self.failUnlessEqual(dict(self.doc.notes[1].props), test_props)
        self.failUnlessJsonResponse(resp, test_props)

    def test_create_note(self):
        resp = self.client.post('/notes', data={'props': json.dumps({'f': 'g'})})
        self.failUnlessJsonResponse(resp, 3)
        self.failUnless(self.doc.db_connection.committed)
        self.failUnlessEqual(len(self.doc.notes), 4)
        self.failUnlessEqual(dict(self.doc.notes[3].props), {'f': 'g'})

    def test_set_children(self):
        resp = self.client.post('/notes/1/children', data={'children': json.dumps([2])})
        self.failUnlessJsonResponse(resp, [2])
        self.failUnless(self.doc.db_connection.committed)
        self.failUnlessEqual(self.doc.notes[1].children, [2])
        self.failUnlessEqual(self.doc.notes[0].children, [1])

    def test_remove_note(self):
        self.client.post('/notes/1/children', data={'children': json.dumps([2]) })
        self.failUnless(1 in self.doc.notes)
        self.failUnless(2 in self.doc.notes[1].children)

        resp = self.client.delete('/notes/1')
        self.failUnlessJsonResponse(resp, 'ok')
        self.failIf(1 in self.doc.notes)
        self.failIf(1 in self.doc.notes[0].children)
        self.failIf(2 in self.doc.notes)

    def test_ajax(self):
        self.doc.create_note(3, {'html': 'hello html'}, cls=AjaxTestNote)
        resp = self.client.post('/notes/3/ajax', data={'args': json.dumps({'token': 'asdf'})})
        self.failUnlessJsonResponse(resp, '-asdf-')

if __name__ == '__main__':
    unittest.main()
