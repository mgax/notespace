# encoding: utf-8

from os import path
import json
from werkzeug import Request, Response, SharedDataMiddleware
from werkzeug.routing import Map, Rule
from werkzeug.exceptions import NotFound

root_path = '/ZeStuff/proiecte/notespace/repo'

def JsonResponse(data):
    return Response(json.dumps(data), mimetype='application/json')

class Note(object):
    def __init__(self, id, props={}, children=[]):
        self.id = id
        self.props = dict(props)
        self.children = list(children)

def demo_data():
    return {
        0: Note(0, {'desc': 'ROOT'}, [1, 4]),
        1: Note(1, {'desc': 'note 1', 'x':100, 'y':100, 'w':500, 'h':300}, [2, 3]),
        2: Note(2, {'desc': 'note 2', 'x':10, 'y':80}),
        3: Note(3, {'desc': 'note 3', 'x':240, 'y':100}),
        4: Note(4, {'desc': 'note 4', 'x':150, 'y':450}),
    }
the_notes = demo_data()

def index(request):
    response = Response(mimetype='text/html')
    response.data = open(path.join(root_path, 'index.html')).read()
    return response

def notes_index(request, note_id=None):
    if request.method == 'POST':
        note_id = sorted(the_notes.keys())[-1] + 1
        the_notes[note_id] = Note(note_id, dict( (key, value)
            for key, value in request.form.iteritems()))
        return JsonResponse(note_id)
    else:
        return JsonResponse(sorted(the_notes.keys()))

def note_page(request, note_id):
    note_id = int(note_id)
    if note_id not in the_notes:
        raise NotFound
    if request.method == 'POST':
        the_notes[note_id].props = dict( (key, value)
            for key, value in request.form.iteritems())
    return JsonResponse(the_notes[note_id].props)

def note_children(request, note_id):
    note_id = int(note_id)
    if request.method == 'POST':
        # TODO: make sure we receive a list of valid note_ids
        the_notes[note_id].children = json.loads(request.form['children'])
    return JsonResponse(the_notes[note_id].children)

url_map = Map([
    Rule('/', endpoint=index),
    Rule('/notes', endpoint=notes_index),
    Rule('/notes/<note_id>', endpoint=note_page),
    Rule('/notes/<note_id>/children', endpoint=note_children),
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
