from os import path
from cStringIO import StringIO

from durus.file_storage import FileStorage
from durus.connection import Connection
from durus.persistent import Persistent
from durus.persistent_list import PersistentList
from durus.persistent_dict import PersistentDict
from durus.btree import BTree

class Note(Persistent):
    def __init__(self, id, props={}, children=[]):
        self.id = id
        self.props = PersistentDict(props)
        self.children = PersistentList(children)

class DurusDb(object):
    def __init__(self, db_connection):
        self.db_connection = db_connection
        db_root = db_connection.get_root()
        if 'notespace_db' not in db_root:
            db_root['notespace_db'] = BTree()
        self.notes = db_root['notespace_db']
    def create_note(self, id, props={}, children=[]):
        self.notes[id] = Note(id, props, children)
    #def close(self):
    #    self.db_connection.get_storage().close()
    def commit(self):
        self.db_connection.commit()

def open_durus_db(db_path):
    new_db = not path.isfile(db_path)
    db_connection = Connection(FileStorage(db_path))
    db = DurusDb(db_connection)
    if new_db:
        from demo_db import demo_data
        demo_data(db)
        db.commit()
    return db
