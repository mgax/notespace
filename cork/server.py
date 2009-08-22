# encoding: utf-8

import sys
from os import path
import json
from werkzeug import Request, Response
from werkzeug.routing import Map, Rule
from werkzeug.exceptions import NotFound
from zope import component

from interfaces import INote, INoteView

templates_path = path.join(path.dirname(__file__), 'templates')
web_media_path = path.join(path.dirname(__file__), 'web_media')
def JsonResponse(data):
    return Response(json.dumps(data), mimetype='application/json')

class CorkApp(object):
    def __init__(self, doc):
        self.doc = doc
        self.url_map = Map([
            Rule('/', endpoint=self.index),
            Rule('/media/<path:filename>', endpoint=self.static),
            Rule('/notes', endpoint=self.notes_index),
            Rule('/notes/<note_id>', endpoint=self.note_page),
            Rule('/notes/<note_id>/parent', endpoint=self.note_parent),
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
            parent_id = int(request.form['parent_id'])
            note = self.doc.create_note(json.loads(request.form['props']),
                parent_id=parent_id)
            note_id = note.id
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
            props = note._props
            props.clear()
            props.update(json.loads(request.form['props']))
            self.doc.commit()
        if request.method == 'DELETE':
            self.doc.del_note(note_id)
            self.doc.commit()
            return JsonResponse('ok')
        note_data = {
            'props': dict(note),
            'children': list(note.children_ids()),
        }
        view = self._get_custom_view(note)
        if view is not None:
            note_data['html'] = view.html()
        return JsonResponse(note_data)

    def cleanup_child_links(self, note_id):
        for note in self.doc.list_notes():
            if note_id in note.children_ids():
                note._children.remove(note_id)

    def note_parent(self, request, note_id):
        note_id = int(note_id)
        if request.method == 'POST':
            # TODO: make sure we receive a list of valid note_ids
            parent_id = int(request.form['parent_id'])
            if parent_id not in self.doc.notes:
                raise NotImplementedError
            self.cleanup_child_links(note_id)
            self.doc.get_note(parent_id)._children.append(note_id)
            self.doc.commit()
        return JsonResponse(list())

    def note_ajax(self, request, note_id):
        note = self.doc.get_note(int(note_id))
        view = self._get_custom_view(note)
        if view is None:
            raise ValueError('could not find custom view for note %s' % note_id)
        return view.ajax(request)

    def _get_custom_view(self, note):
        try:
            return component.subscribers([note], INoteView).pop()
        except IndexError:
            return None

    @Request.application
    def __call__(self, request):
        return self.url_map.bind_to_environ(request.environ).dispatch(
            lambda view, params: view(request, **params),
            catch_http_exceptions=True)
