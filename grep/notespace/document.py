from os import path
from cStringIO import StringIO
import json
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
    def __init__(self, doc, id, props={}, children=[]):
        self.document = doc
        self.id = id
        self.props = PersistentDict(props)
        self.children = PersistentList(children)

    def __setitem__(self, key, value):
        self.props[key] = value
        for subscriber in self.document.subscribers:
            if hasattr(subscriber, 'prop_change'):
                subscriber.prop_change(self, key, value)

    def __getitem__(self, key):
        return self.props[key]

_handler_index = {}
class DocumentHandler(object):
    def __init__(self, db_connection):
        self.db_connection = db_connection
        self.doc = db_connection.get_root()['doc']
        _handler_index[id(self.doc)] = self

    def close(self):
        del _handler_index[id(self.doc)]
        self.db_connection.get_storage().close()

    def commit(self): self.db_connection.commit()
    def abort(self): self.db_connection.abort()

class Document(Persistent):
    @property
    def handler(self):
        return _handler_index[id(self)]

    def __init__(self):
        self.notes = BTree()
        self.subscribers = PersistentList()

    def create_note(self, id, props={}, children=[], cls=Note):
        note = cls(self, id, props, children)
        self.notes[id] = note
        return note

    def get_note(self, note_id):
        return self.notes[note_id]

    def list_note_ids(self):
        return self.notes.iterkeys()

    def list_notes(self):
        return self.notes.itervalues()

    def del_note(self, note_id):
        for child_note_id in self.get_note(note_id).children:
            self.del_note(child_note_id)
        self._cleanup_child_links(note_id)
        del self.notes[note_id]

    def subscribe(self, subscriber):
        self.subscribers.append(subscriber)

    def dump_db(self):
        return json.dumps(dict(
            (note.id, {'props': dict(note.props), 'children': list(note.children)})
            for note in self.list_notes()
        ))

    def load_db(self, import_data):
        self.notes.clear()
        for note_id, note_data in json.loads(import_data).iteritems():
            self.create_note(int(note_id), note_data['props'], note_data['children'])
        self.handler.commit()

    def _cleanup_child_links(self, note_id):
        for note in self.list_notes():
            if note_id in note.children:
                note.children.remove(note_id)

    # TODO: deprecate these methods
    def abort(self): self.handler.abort()
    def commit(self): self.handler.commit()
    def close(self): self.handler.close()

def open_document(db_path, demo_data=False):
    conn = Connection(FileStorage(db_path))
    if 'doc' not in conn.get_root():
        new_db = True
        conn.get_root()['doc'] = Document()
        conn.commit()
    else:
        new_db = False
    h = DocumentHandler(conn)
    if demo_data and new_db:
        demo_data(h.doc)
    return h.doc

def demo_data(doc):
    doc.create_note(0, {'desc': 'ROOT'}, [1, 4])
    doc.create_note(1, {'desc': 'note 1', 'left':100, 'top':100, 'width':500, 'height':300}, [2, 3])
    doc.create_note(2, {'desc': 'note 2', 'left':10, 'top':80, 'width': 150, 'height': 100})
    doc.create_note(3, {'desc': 'note 3', 'left':240, 'top':100, 'width': 150, 'height': 100})
    doc.create_note(4, {'desc': 'note 4', 'left':150, 'top':450, 'width': 150, 'height': 100})
    doc.commit()
