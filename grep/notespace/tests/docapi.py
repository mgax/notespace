import unittest
from os import path
from tempfile import mkdtemp
from shutil import rmtree
from durus.persistent import Persistent

from grep.notespace.document import open_document, Note

class TestSubscriber(Persistent):
    def __init__(self):
        self.events = []

    def prop_change(self, note, prop_name, prop_value):
        self.events.append("note: %d, prop_name: %s, value: %s"
            % (note.id, repr(prop_name), repr(prop_value)))
        self._p_note_change()

class DocumentApiTestCase(unittest.TestCase):
    def setUp(self):
        self.test_doc_path = mkdtemp()
        self.doc = open_document(path.join(self.test_doc_path, 'test_doc.db'))
        self.doc.create_note({'desc': 'note 1'})
        self.doc.create_note({'desc': 'note 2'})
        self.doc.commit()

    def tearDown(self):
        rmtree(self.test_doc_path)

    def test_get_note(self):
        note = self.doc.get_note(1)
        self.failUnlessEqual(note.id, 1)
        self.failUnlessEqual(note['desc'], 'note 1')

    def test_list_note_ids(self):
        self.failUnlessEqual(sorted(list(self.doc.list_note_ids())), [0, 1, 2])

    def test_list_notes(self):
        notes = {}
        for note in self.doc.list_notes():
            notes[note.id] = note
        self.failUnlessEqual(sorted(notes.keys()), [0, 1, 2])
        self.failUnlessEqual(notes[0]['desc'], 'ROOT')

    def test_create_note(self):
        note123 = self.doc.create_note(id=123)
        self.failUnlessEqual(note123.id, 123)
        self.failUnless(note123 is self.doc.get_note(123))
        self.failUnless(123 in self.doc.get_note(0).children_ids())

        self.failUnlessRaises(ValueError, lambda: self.doc.create_note(id=123))

    def test_remove_note(self):
        self.doc.create_note({'desc': 'note 3'})
        self.doc.get_note(2)._children.append(3)
        self.failUnless(2 in self.doc.list_note_ids())
        self.failUnless(3 in self.doc.list_note_ids())
        self.failUnless(2 in self.doc.get_note(0)._children)
        self.doc.del_note(2)
        self.failIf(2 in self.doc.list_note_ids())
        self.failIf(3 in self.doc.list_note_ids())
        self.failIf(2 in self.doc.get_note(0)._children)

    def test_link_to_document(self):
        self.failUnless(self.doc.get_note(1).document is self.doc)
        self.doc.close()
        self.doc2 = open_document(path.join(self.test_doc_path, 'test_doc.db'))
        self.failUnless(self.doc2.get_note(1).document is self.doc2)

    def test_note_dictlike(self):
        n = self.doc.get_note(1)
        n['x'] = 13
        self.failUnlessEqual(n['x'], 13)
        self.failUnlessEqual(n['x'], 13)
        self.failUnlessEqual(dict(n), {'x': 13, 'desc': 'note 1'})

    def test_prop_change_notify(self):
        subscriber = TestSubscriber()
        self.doc.subscribe(subscriber)
        self.doc.get_note(1)['x'] = 13
        self.failUnlessEqual(subscriber.events, ["note: 1, prop_name: 'x', value: 13"])

    def test_children_ids(self):
        self.failUnlessEqual(list(self.doc.get_note(0).children_ids()), [1, 2])

    def test_iter_children(self):
        child_ids = []
        for child in self.doc.get_note(0).children():
            self.failUnless(child is self.doc.get_note(child.id))
            child_ids.append(child.id)
        self.failUnlessEqual(child_ids, [1, 2])

if __name__ == '__main__':
    unittest.main()
