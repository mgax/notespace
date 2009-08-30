def bootstrap():
    import sys
    from os import path
    from ConfigParser import ConfigParser, NoOptionError
    from document import open_document, demo_data
    from optparse import OptionParser

    global doc
    doc = None

    parser = OptionParser()
    parser.add_option('-q', '--quiet', action='store_true', dest='quiet')
    options, args = parser.parse_args()

    cfg_path = args[0]
    parser = ConfigParser()
    parser.read(cfg_path)
    dbfile = parser.get('cork', 'dbfile')

    raw_names = dict(parser.items('cork')).get('plugins', '').split('\n')
    for plugin_name in filter(None, (name.strip() for name in raw_names)):
        __import__(plugin_name)

    if len(args) > 1:
        cmd = args[1]
    else:
        cmd = 'serve'

    if cmd == 'init':
        doc = open_document(dbfile)
        demo_data(doc)

    elif cmd == 'serve':
        from werkzeug import run_simple, SharedDataMiddleware
        from server import CorkApp

        if options.quiet:
            from werkzeug.serving import BaseRequestHandler
            class QuietHandler(BaseRequestHandler):
                def log_request(self, *args, **kwargs):
                    pass
            handler = QuietHandler
        else:
            handler = None

        host = parser.get('testserver', 'host')
        port = parser.getint('testserver', 'port')

        def lazy_app(environ, start_response):
            """
            WSGI application that creates the real app in a lazy fashion,
            useful to prevent opening two DB connections when running
            with the Werkzeug reloader.
            """
            global doc, cork_app
            if doc is None:
                doc = open_document(dbfile)
                cork_app = CorkApp(doc)
            return cork_app(environ, start_response)

        run_simple(host, port, lazy_app, use_reloader=True, request_handler=handler)
        print # a blank line

    elif cmd == 'launchd':
        from wsginetd import serve
        from server import CorkApp
        sys.stderr = open('var/launchd.log', 'a')
        doc = open_document(dbfile)
        serve(CorkApp(doc))

    elif cmd == 'interact':
        import code
        doc = open_document(dbfile)
        code.interact(local={'doc': doc, '__name__': '__console__', '__doc__': None})

    else:
        print>>sys.stderr, "Unknown command \"%s\"" % cmd

    if doc is not None:
        doc.close()
