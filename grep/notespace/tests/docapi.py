import unittest
from os import path
from tempfile import mkdtemp
from shutil import rmtree

from grep.notespace.document import open_document, Note

class DocumentApiTestCase(unittest.TestCase):
    def setUp(self):
        self.test_doc_path = mkdtemp()
        self.doc = open_document(path.join(self.test_doc_path, 'test_doc.db'))
        self.doc.create_note(0, {'desc': 'ROOT'}, [1, 2])
        self.doc.create_note(1, {'desc': 'note 1'})
        self.doc.create_note(2, {'desc': 'note 2'})

    def tearDown(self):
        rmtree(self.test_doc_path)

    def test_get_note(self):
        note = self.doc.get_note(1)
        self.failUnlessEqual(note.id, 1)
        self.failUnlessEqual(note.props['desc'], 'note 1')

    def test_list_note_ids(self):
        self.failUnlessEqual(sorted(list(self.doc.list_note_ids())), [0, 1, 2])

    def test_list_notes(self):
        notes = {}
        for note in self.doc.list_notes():
            notes[note.id] = note
        self.failUnlessEqual(sorted(notes.keys()), [0, 1, 2])
        self.failUnlessEqual(notes[0].props['desc'], 'ROOT')

    def test_remove_note(self):
        self.doc.create_note(3, {'desc': 'note 3'})
        self.doc.get_note(2).children.append(3)
        self.failUnless(2 in self.doc.list_note_ids())
        self.failUnless(3 in self.doc.list_note_ids())
        self.failUnless(2 in self.doc.get_note(0).children)
        self.doc.del_note(2)
        self.failIf(2 in self.doc.list_note_ids())
        self.failIf(3 in self.doc.list_note_ids())
        self.failIf(2 in self.doc.get_note(0).children)

if __name__ == '__main__':
    unittest.main()
