# encoding: utf-8

import sys
from os import path
import json
from werkzeug import Request, Response
from werkzeug.routing import Map, Rule
from werkzeug.exceptions import NotFound

templates_path = path.join(path.dirname(__file__), 'templates')
web_media_path = path.join(path.dirname(__file__), 'web_media')
def JsonResponse(data):
    return Response(json.dumps(data), mimetype='application/json')

class NotespaceApp(object):
    def __init__(self, doc):
        self.doc = doc
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
            note_id = sorted(self.doc.list_note_ids())[-1] + 1
            self.doc.create_note(note_id, json.loads(request.form['props']))
            self.doc.commit()
            return JsonResponse(note_id)
        else:
            return JsonResponse(sorted(self.doc.list_note_ids()))

    def note_page(self, request, note_id):
        note_id = int(note_id)
        try:
            note = self.doc.get_note(note_id)
        except KeyError, e:
            raise NotFound

        if request.method == 'POST':
            props = note.props
            props.clear()
            props.update(json.loads(request.form['props']))
            self.doc.commit()
        if request.method == 'DELETE':
            self.doc.del_note(note_id)
            self.doc.commit()
            return JsonResponse('ok')
        note_data = {
            'props': dict(note.props),
            'children': list(note.children),
        }
        if hasattr(note, 'html'):
            note_data['html'] = note.html
        return JsonResponse(note_data)

    def cleanup_child_links(self, note_id):
        for note in self.doc.list_notes():
            if note_id in note.children:
                note.children.remove(note_id)

    def note_children(self, request, note_id):
        note_id = int(note_id)
        if request.method == 'POST':
            # TODO: make sure we receive a list of valid note_ids
            children = json.loads(request.form['children'])
            for kid in children:
                self.cleanup_child_links(kid)
            self.doc.get_note(note_id).children[:] = children # todo: test the [:] thing
            self.doc.commit()
        return JsonResponse(list(self.doc.get_note(note_id).children))

    def note_ajax(self, request, note_id):
        note_id = int(note_id)
        return self.doc.get_note(note_id).ajax(request)

    @Request.application
    def __call__(self, request):
        return self.url_map.bind_to_environ(request.environ).dispatch(
            lambda view, params: view(request, **params),
            catch_http_exceptions=True)
