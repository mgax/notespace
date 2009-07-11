from os import path
from cStringIO import StringIO
import logging
from logs import null_log
null_log('durus')

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
        new_db = 'notespace_db' not in db_root
        if new_db:
            db_root['notespace_db'] = BTree()
            db_root['subscribers'] = PersistentList()
            self.commit()
        self.notes = db_root['notespace_db']
        self.subscribers = db_root['subscribers']
        if new_db:
            from demo_db import demo_data
            demo_data(self)
            self.commit()
    def create_note(self, id, props={}, children=[], cls=Note):
        note = cls(id, props, children)
        self.notes[id] = note
        return note
    #def close(self):
    #    self.db_connection.get_storage().close()
    def commit(self):
        self.db_connection.commit()

def open_durus_db(db_path):
    return DurusDb(Connection(FileStorage(db_path)))
