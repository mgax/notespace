from zope import interface

class INote(interface.Interface):
    """ a Note :) """

class INoteView(interface.Interface):
    """ a Note's custom view """

    def html():
        """ get a piece of custom HTML to display as the note UI """

    def ajax(request):
        """ process an AJAX request on behalf of this note """
