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

    def test_export(self):
        reference_dump = {
            '0': {'props': {'desc': 'ROOT'}, 'children': [1, 2]},
            '1': {'props': {'desc': 'note 1'}, 'children': []},
            '2': {'props': {'desc': 'note 2'}, 'children': []},
        }
        dump = json.loads(self.app.dump_db())
        self.failUnlessEqual(dump, reference_dump)

    def test_import(self):
        import_data = json.dumps({
            '0': {'props': {'desc': 'ROOT'}, 'children': [1]},
            '1': {'props': {'desc': 'one', 'x': 'a'}, 'children': [2]},
            '2': {'props': {'desc': 'two', 'x': 'b'}, 'children': []},
        })
        self.failIf(self.db.committed)
        self.app.load_db(import_data)
        self.failUnless(self.db.committed)
        db_notes = self.db.notes
        self.failUnlessEqual(set(db_notes.keys()), set([0, 1, 2]))
        self.failUnlessEqual(db_notes[0].props, {'desc': 'ROOT'})
        self.failUnlessEqual(db_notes[0].children, [1])
        self.failUnlessEqual(db_notes[1].props, {'desc': 'one', 'x': 'a'})
        self.failUnlessEqual(db_notes[1].children, [2])
        self.failUnlessEqual(db_notes[2].props, {'desc': 'two', 'x': 'b'})
        self.failUnlessEqual(db_notes[2].children, [])

if __name__ == '__main__':
    unittest.main()
