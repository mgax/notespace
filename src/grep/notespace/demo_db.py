class Note(object):
    def __init__(self, id, props={}, children=[]):
        self.id = id
        self.props = dict(props)
        self.children = list(children)

class DemoDb(object):
    def __init__(self, notes={}):
        self.notes = {}
    def create_note(self, id, props={}, children=[]):
        self.notes[id] = Note(id, props, children)
    def commit(self):
        pass

def demo_data(db):
    db.create_note(0, {'desc': 'ROOT'}, [1, 4])
    db.create_note(1, {'desc': 'note 1', 'x':'100', 'y':'100', 'w':'500', 'h':'300'}, [2, 3])
    db.create_note(2, {'desc': 'note 2', 'x':'10', 'y':'80'})
    db.create_note(3, {'desc': 'note 3', 'x':'240', 'y':'100'})
    db.create_note(4, {'desc': 'note 4', 'x':'150', 'y':'450'})
