# encoding: utf-8

from os import path
import json
from werkzeug import Request, Response, SharedDataMiddleware
from werkzeug.routing import Map, Rule
from werkzeug.exceptions import NotFound

root_path = '/ZeStuff/proiecte/notespace'

demo_notes = {
    'one': {'x': 100, 'y': 50, 'content': 'ze first note'},
    'two': {'x': 500, 'y': 250, 'content': 'note two'},
}
the_notes = demo_notes

def index(request):
    response = Response(mimetype='text/html')
    response.data = open(path.join(root_path, 'index.html')).read()
    return response

def notes_index(request, note_id=None):
    if note_id is None:
        data = sorted(the_notes.keys())
    else:
        if note_id not in the_notes:
            raise NotFound
        if request.method == 'POST':
            the_notes[note_id].update(content=request.form['content'])
        data = the_notes[note_id]
    return Response(json.dumps(data), mimetype='application/json')

url_map = Map([
    Rule('/', endpoint=index),
    Rule('/notes', endpoint=notes_index),
    Rule('/notes/<note_id>', endpoint=notes_index),
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
