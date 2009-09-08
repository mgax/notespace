from os import path
from cStringIO import StringIO
import json
from collections import MutableMapping
import logging
from logs import null_log
null_log('durus')

from durus.file_storage import FileStorage
from durus.connection import Connection
from durus.persistent import Persistent
from durus.persistent_list import PersistentList
from durus.persistent_dict import PersistentDict
from durus.btree import BTree

from zope import interface

from interfaces import INote
import updates

class Note(Persistent, MutableMapping):
    interface.implements(INote)

    def __init__(self, doc, id, props={}):
        self.document = doc
        self.id = id
        self._props = PersistentDict(props)
        self._children = PersistentList()

    def __setitem__(self, key, value):
        if value is None:
            del self._props[key]
        else:
            self._props[key] = value
        for subscriber in self.document.subscribers:
            if hasattr(subscriber, 'prop_change'):
                subscriber.prop_change(self, key, value)

    def __getitem__(self, key):
        return self._props[key]

    def __delitem__(self, key):
        raise NotImplementedError

    def keys(self):
        return self._props.keys()

    def children_ids(self):
        for child_id in self._children:
            yield child_id

    def children(self):
        for child_id in self._children:
            yield self.document.get_note(child_id)

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
        self.notes[0] = Note(self, 0, {'desc': 'ROOT'})

    def create_note(self, props={}, cls=Note, parent_id=0, id=None):
        if id is None:
            if self.notes:
                id = max(self.list_note_ids()) + 1
            else:
                id = 0
        if id in self.notes:
            raise ValueError('Note id "%s" already in use' % id)
        note = cls(self, id, props)
        self.notes[id] = note
        self.notes[parent_id]._children.append(note.id)
        return note

    def get_note(self, note_id):
        return self.notes[note_id]

    def list_note_ids(self):
        return self.notes.iterkeys()

    def list_notes(self):
        return self.notes.itervalues()

    def del_note(self, note_id):
        for child_note_id in self.get_note(note_id)._children:
            self.del_note(child_note_id)
        self._cleanup_child_links(note_id)
        del self.notes[note_id]

    def subscribe(self, subscriber):
        self.subscribers.append(subscriber)

    def _cleanup_child_links(self, note_id):
        for note in self.list_notes():
            if note_id in note._children:
                note._children.remove(note_id)

    def dump_notes(self):
        def generate():
            for note in self.list_notes():
                note_data = {
                    'props': dict(note._props),
                    'children': list(note._children),
                }
                yield note.id, note_data
        return json.dumps(dict(generate()))

    # TODO: deprecate these methods
    def abort(self): self.handler.abort()
    def commit(self): self.handler.commit()
    def close(self): self.handler.close()

def open_document(db_path):
    conn = Connection(FileStorage(db_path))
    db_root = conn.get_root()
    if 'doc' not in db_root:
        db_root['doc'] = Document()
        db_root['version'] = updates.current_version
        conn.commit()
    updates.do_updates(conn)
    h = DocumentHandler(conn)
    return h.doc

def demo_data(doc):
    # TODO: clear the document
    doc.create_note({'desc': 'note 1',
        'css-left':'100px', 'css-top':'100px', 'css-width':'500px', 'css-height':'300px'})
    doc.create_note({'desc': 'note 2',
        'css-left':'10px', 'css-top':'80px', 'css-width': '150px', 'css-height': '100px'},
        parent_id=1)
    doc.create_note({'desc': 'note 3',
        'css-left':'240px', 'css-top':'100px', 'css-width': '150px', 'css-height': '100px'},
        parent_id=1)
    doc.create_note({'desc': 'note 4',
        'css-left':'150px', 'css-top':'450px', 'css-width': '150px', 'css-height': '100px'})
    doc.commit()
