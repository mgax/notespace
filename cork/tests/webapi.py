import unittest
from os import path
from tempfile import mkdtemp
from shutil import rmtree
import json
from werkzeug import Client, BaseResponse
from zope import component

from cork.interfaces import INote, INoteView
from cork import server
from cork.document import open_document, Note

class CustomView(object):
    def __init__(self, note):
        self.note = note

    def html(self):
        return '<em>hello custom!</em>'

    def ajax(self, request):
        args = json.loads(request.form.get('args'))
        return server.JsonResponse('-%s-' % str(args['token']))

class WebTestCase(unittest.TestCase):
    def setUp(self):
        self.test_doc_path = mkdtemp()
        self.doc = open_document(path.join(self.test_doc_path, 'test_doc.db'))
        self.doc.create_note({'desc': 'note 1'})
        self.doc.create_note({'desc': 'note 2'})
        self.app = server.NotespaceApp(self.doc)
        self.client = Client(self.app, BaseResponse)

    def tearDown(self):
        rmtree(self.test_doc_path)

    def failUnlessJsonResponse(self, resp, json_data):
        self.failUnlessEqual(resp.status_code, 200)
        self.failUnlessEqual(resp.headers['Content-Type'], 'application/json')
        self.failUnlessEqual(json.loads(resp.data), json_data)

    def test_notes_listing(self):
        self.failUnlessJsonResponse(self.client.get('/notes'), [0, 1, 2])

    def test_get_note(self):
        self.failUnlessJsonResponse(self.client.get('/notes/0'), {
            'props': {'desc': 'ROOT'},
            'children': [1, 2],
        })

    def test_change_note(self):
        test_props = {'desc': 'new content here', 'a': 'b'}
        resp = self.client.post('/notes/1', data={'props': json.dumps(test_props)})
        self.doc.abort() # checking if transaction was committed
        self.failUnlessEqual(dict(self.doc.notes[1]), test_props)
        self.failUnlessJsonResponse(resp, {'props': test_props, 'children': []})

    def test_create_note(self):
        resp = self.client.post('/notes', data={
            'parent_id': 1, 'props': json.dumps({'f': 'g'})})
        self.failUnlessJsonResponse(resp, 3)
        self.doc.abort() # checking if transaction was committed
        self.failUnlessEqual(len(self.doc.notes), 4)
        self.failUnlessEqual(dict(self.doc.notes[3]), {'f': 'g'})
        self.failUnlessEqual(list(self.doc.notes[1].children_ids()), [3])
        self.failUnlessEqual(list(self.doc.notes[0].children_ids()), [1, 2])

    def test_set_parent(self):
        resp = self.client.post('/notes/2/parent', data={'parent_id': 1})
        self.failUnlessEqual(resp.status_code, 200)
        self.doc.abort() # checking if transaction was committed
        self.failUnlessEqual(list(self.doc.notes[1].children_ids()), [2])
        self.failUnlessEqual(list(self.doc.notes[0].children_ids()), [1])

    def test_remove_note(self):
        self.client.post('/notes/2/parent', data={'parent_id': 1})

        self.failUnless(1 in self.doc.notes)
        self.failUnless(1 in list(self.doc.notes[0].children_ids()))
        self.failUnless(2 in self.doc.notes)
        self.failUnless(2 in list(self.doc.notes[1].children_ids()))

        resp = self.client.delete('/notes/1')
        self.failUnlessJsonResponse(resp, 'ok')
        self.failIf(1 in self.doc.notes)
        self.failIf(1 in list(self.doc.notes[0].children_ids()))
        self.failIf(2 in self.doc.notes)

    def test_custom_html(self):
        gsm = component.getGlobalSiteManager()
        def customViewAdapter(note):
            if note.id == test_note_id:
                return CustomView(note)
        gsm.registerAdapter(customViewAdapter, required=[INote], provided=INoteView)

        test_note_id = self.doc.create_note({'a': 'b'}).id
        self.failUnlessJsonResponse(self.client.get('/notes/%d' % test_note_id), {
            'props': {'a': 'b'},
            'children': [],
            'html': '<em>hello custom!</em>',
        })

        gsm.unregisterAdapter(customViewAdapter, required=[INote], provided=INoteView)

    def test_ajax(self):
        gsm = component.getGlobalSiteManager()
        def customViewAdapter(note):
            if note.id == test_note_id:
                return CustomView(note)
        gsm.registerAdapter(customViewAdapter, required=[INote], provided=INoteView)

        test_note_id = self.doc.create_note({}).id
        resp = self.client.post('/notes/3/ajax', data={'args': json.dumps({'token': 'asdf'})})
        self.failUnlessJsonResponse(resp, '-asdf-')

        gsm.unregisterAdapter(customViewAdapter, required=[INote], provided=INoteView)

if __name__ == '__main__':
    unittest.main()
