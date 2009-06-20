# encoding: utf-8

from os import path
import json
from werkzeug import Request, Response, SharedDataMiddleware
from werkzeug.routing import Map, Rule
from werkzeug.exceptions import NotFound

root_path = path.normpath(path.join(path.dirname(__file__), '../../..'))

def JsonResponse(data):
    return Response(json.dumps(data), mimetype='application/json')

def index(request):
    response = Response(mimetype='text/html')
    response.data = open(path.join(root_path, 'src/templates/index.html')).read()
    return response

def notes_index(request, note_id=None):
    if request.method == 'POST':
        note_id = sorted(db.notes.keys())[-1] + 1
        db.create_note(note_id, dict( (key, value)
            for key, value in request.form.iteritems()))
        db.commit()
        return JsonResponse(note_id)
    else:
        return JsonResponse(sorted(db.notes.keys()))

def note_page(request, note_id):
    note_id = int(note_id)
    if note_id not in db.notes:
        raise NotFound
    if request.method == 'POST':
        db.notes[note_id].props = dict( (key, value)
            for key, value in request.form.iteritems())
        db.commit()
    return JsonResponse(dict(db.notes[note_id].props))

def note_children(request, note_id):
    note_id = int(note_id)
    if request.method == 'POST':
        # TODO: make sure we receive a list of valid note_ids
        db.notes[note_id].children = json.loads(request.form['children'])
        db.commit()
    return JsonResponse(list(db.notes[note_id].children))

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
    '/static':  path.join(root_path, 'web/static')
})

if __name__ == '__main__':
    from durus_db import open_durus_db
    db = open_durus_db(path.join(root_path, 'var/durus.db'))
    from werkzeug import run_simple
    run_simple('localhost', 8000, application)
else:
    from demo_db import DemoDb, demo_data
    db = DemoDb()
    demo_data(db)
