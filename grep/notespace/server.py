# encoding: utf-8

import sys
from os import path
import json
from werkzeug import Request, Response, SharedDataMiddleware
from werkzeug.routing import Map, Rule
from werkzeug.exceptions import NotFound

templates_path = path.join(path.dirname(__file__), 'templates')
web_media_path = path.join(path.dirname(__file__), 'web_media')
def JsonResponse(data):
    return Response(json.dumps(data), mimetype='application/json')

class NotespaceApp(object):
    def __init__(self, db):
        self.db = db
        self.url_map = Map([
            Rule('/', endpoint=self.index),
            Rule('/media/<filename>', endpoint=self.static),
            Rule('/notes', endpoint=self.notes_index),
            Rule('/notes/<note_id>', endpoint=self.note_page),
            Rule('/notes/<note_id>/children', endpoint=self.note_children),
            Rule('/notes/<note_id>/ajax', endpoint=self.note_ajax),
        ])


    def static(self, request, filename):
        response = Response(open(path.join(web_media_path, filename)).read())
        if filename.endswith('.js'):
            response.mimetype = 'application/javascript'
        elif filename.endswith('.css'):
            response.mimetype = 'text/css'
        return response

    def index(self, request):
        data = open(path.join(templates_path, 'index.html')).read()
        return Response(data, mimetype='text/html')

    def notes_index(self, request, note_id=None):
        if request.method == 'POST':
            note_id = sorted(self.db.notes.keys())[-1] + 1
            self.db.create_note(note_id, json.loads(request.form['props']))
            self.db.commit()
            return JsonResponse(note_id)
        else:
            return JsonResponse(sorted(self.db.notes.keys()))

    def note_page(self, request, note_id):
        note_id = int(note_id)
        if note_id not in self.db.notes:
            raise NotFound
        if request.method == 'POST':
            props = self.db.notes[note_id].props
            props.clear()
            props.update(json.loads(request.form['props']))
            self.db.commit()
        if request.method == 'DELETE':
            self.remove_note(note_id)
            self.db.commit()
            return JsonResponse('ok')
        return JsonResponse(dict(self.db.notes[note_id].props))

    def remove_note(self, note_id):
        for kid in self.db.notes[note_id].children:
            self.remove_note(kid)
        self.cleanup_child_links(note_id)
        del self.db.notes[note_id]

    def cleanup_child_links(self, note_id):
        for note in self.db.notes.values():
            if note_id in note.children:
                note.children.remove(note_id)

    def note_children(self, request, note_id):
        note_id = int(note_id)
        if request.method == 'POST':
            # TODO: make sure we receive a list of valid note_ids
            children = json.loads(request.form['children'])
            for kid in children:
                self.cleanup_child_links(kid)
            self.db.notes[note_id].children = children
            self.db.commit()
        return JsonResponse(list(self.db.notes[note_id].children))

    def note_ajax(self, request, note_id):
        note_id = int(note_id)
        return self.db.notes[note_id].ajax(request)

    def dump_db(self):
        return json.dumps(dict(
            (note_id, {'props': dict(note.props), 'children': list(note.children)})
            for note_id, note in self.db.notes.iteritems()
        ))

    def load_db(self, import_data):
        self.db.notes.clear()
        for note_id, note_data in json.loads(import_data).iteritems():
            self.db.create_note(int(note_id), note_data['props'], note_data['children'])
        self.db.commit()

    @Request.application
    def __call__(self, request):
        return self.url_map.bind_to_environ(request.environ).dispatch(
            lambda view, params: view(request, **params),
            catch_http_exceptions=True)

def open_notespace_app(db_path):
    from durus_db import open_durus_db
    db = open_durus_db(db_path)
    app = NotespaceApp(db)
    return app

if __name__ == '__main__':
    db_path = path.join(sys.prefix, 'var/durus.db')
    ext_media_path = path.join(sys.prefix, '../web_ext_media')
    app = open_notespace_app(db_path)
    app = SharedDataMiddleware(app, {'/ext_media':  ext_media_path})

    from werkzeug import run_simple
    run_simple('localhost', 8000, app, use_reloader=True)
