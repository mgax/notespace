from os import path
from logging import getLogger, StreamHandler
from cStringIO import StringIO

durus_log = StringIO()
getLogger('durus').addHandler(StreamHandler(durus_log))

from durus.file_storage import FileStorage
from durus.connection import Connection
from durus.persistent import Persistent
from durus.persistent_list import PersistentList
from durus.btree import BTree

class NotesIndex(BTree):

class DurusDb(object):
    def __init__(self, db):
        self.db = db
        db_root = db.get_root()
        if notespace_db not in db_root:
            db_root['notespace_db'] = BTree()
        self.notes = db_root['notespace_db']
    def close(self):
        self.db.get_storage().close()

def durus_db(db_path):
    db = Connection(FileStorage(db_path))
