class Note(object):
    def __init__(self, id, props={}, children=[]):
        self.id = id
        self.props = dict(props)
        self.children = list(children)

class DemoDb(object):
    def __init__(self, notes={}):
        self.notes = {}
    def create_note(self, id, props={}, children=[], cls=Note):
        self.notes[id] = cls(id, props, children)
    def commit(self):
        pass

def demo_data(db):
    db.create_note(0, {'desc': 'ROOT'}, [1, 4])
    db.create_note(1, {'desc': 'note 1', 'left':100, 'top':100, 'width':500, 'height':300}, [2, 3])
    db.create_note(2, {'desc': 'note 2', 'left':10, 'top':80, 'width': 150, 'height': 100})
    db.create_note(3, {'desc': 'note 3', 'left':240, 'top':100, 'width': 150, 'height': 100})
    db.create_note(4, {'desc': 'note 4', 'left':150, 'top':450, 'width': 150, 'height': 100})
