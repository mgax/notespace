import unittest
from os import path
from tempfile import mkdtemp
from shutil import rmtree
import json

from grep.notespace import server
from grep.notespace.document import open_document

class ExportTestCase(unittest.TestCase):
    def setUp(self):
        self.test_doc_path = mkdtemp()
        self.doc = open_document(path.join(self.test_doc_path, 'test_doc.db'))
        self.doc.create_note(0, {'desc': 'ROOT'}, [1, 2])
        self.doc.create_note(1, {'desc': 'note 1'})
        self.doc.create_note(2, {'desc': 'note 2'})

    def tearDown(self):
        rmtree(self.test_doc_path)

    def test_export(self):
        reference_dump = {
            '0': {'props': {'desc': 'ROOT'}, 'children': [1, 2]},
            '1': {'props': {'desc': 'note 1'}, 'children': []},
            '2': {'props': {'desc': 'note 2'}, 'children': []},
        }
        dump = json.loads(self.doc.dump_db())
        self.failUnlessEqual(dump, reference_dump)

    def test_import(self):
        import_data = json.dumps({
            '0': {'props': {'desc': 'ROOT'}, 'children': [1]},
            '1': {'props': {'desc': 'one', 'x': 'a'}, 'children': [2]},
            '2': {'props': {'desc': 'two', 'x': 'b'}, 'children': []},
        })
        self.doc.load_db(import_data)
        self.doc.db_connection.abort() # checking if transaction was committed
        db_notes = self.doc.notes
        self.failUnlessEqual(set(db_notes.keys()), set([0, 1, 2]))
        self.failUnlessEqual(dict(db_notes[0].props), {'desc': 'ROOT'})
        self.failUnlessEqual(list(db_notes[0].children), [1])
        self.failUnlessEqual(dict(db_notes[1].props), {'desc': 'one', 'x': 'a'})
        self.failUnlessEqual(list(db_notes[1].children), [2])
        self.failUnlessEqual(dict(db_notes[2].props), {'desc': 'two', 'x': 'b'})
        self.failUnlessEqual(list(db_notes[2].children), [])

if __name__ == '__main__':
    unittest.main()
