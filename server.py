# encoding: utf-8

from os import path
import json
from werkzeug import Request, Response, SharedDataMiddleware
from werkzeug.routing import Map, Rule
from werkzeug.exceptions import NotFound

root_path = '/ZeStuff/proiecte/notespace/repo'

class Note(object):
    _next_id = 0
    def __init__(self, id, props={}, children=[]):
        self.id = id
        self.props = dict(props)
        self.children = list(children)
        #self.id = Note._next_id; Note._next_id += 1

def demo_data():
    return {
        0: Note(0, {'desc': 'ROOT'}, [1, 2]),
        1: Note(1, {'desc': 'note 1'}),
        2: Note(2, {'desc': 'note 2'}),
    }
the_notes = demo_data()

def index(request):
    response = Response(mimetype='text/html')
    response.data = open(path.join(root_path, 'index.html')).read()
    return response

def notes_index(request, note_id=None):
    if note_id is None:
        data = sorted(the_notes.keys())
    else:
        note_id = int(note_id)
        if note_id not in the_notes:
            raise NotFound
        if request.method == 'POST':
            the_notes[note_id].props = dict( (key, value)
                for key, value in request.form.iteritems())
        data = the_notes[note_id].props
    return Response(json.dumps(data), mimetype='application/json')

def notes_children(request, note_id):
    return Response(json.dumps(the_notes[int(note_id)].children), mimetype='application/json')

url_map = Map([
    Rule('/', endpoint=index),
    Rule('/notes', endpoint=notes_index),
    Rule('/notes/<note_id>', endpoint=notes_index),
    Rule('/notes/<note_id>/children', endpoint=notes_children),
    Rule('/static/<file>', endpoint='static', build_only=True),
])

@Request.application
def application(request):
    return url_map.bind_to_environ(request.environ).dispatch(
        lambda view, params: view(request, **params),
        catch_http_exceptions=True)

application = SharedDataMiddleware(application, {
    '/static':  path.join(root_path, 'static')
})

if __name__ == '__main__':
    from werkzeug import run_simple
    run_simple('localhost', 8000, application)
