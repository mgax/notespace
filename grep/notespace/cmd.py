def bootstrap():
    import sys
    from os import path
    from ConfigParser import ConfigParser
    from document import open_document, demo_data
    from optparse import OptionParser

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

    doc = open_document(dbfile)

    if len(args) > 1:
        cmd = args[1]
    else:
        cmd = 'serve'

    if cmd == 'init':
        demo_data(doc)

    elif cmd == 'serve':
        from werkzeug import run_simple, SharedDataMiddleware
        from server import NotespaceApp

        if options.quiet:
            from werkzeug.serving import BaseRequestHandler
            class QuietHandler(BaseRequestHandler):
                def log_request(self, *args, **kwargs):
                    pass
            handler = QuietHandler
        else:
            handler = None

        app = NotespaceApp(doc)
        host = parser.get('testserver', 'host')
        port = parser.getint('testserver', 'port')
        media_section = parser.get('testserver', 'staticmedia')
        static_media = dict(parser.items(media_section))
        app = SharedDataMiddleware(app, static_media)
        run_simple(host, port, app, use_reloader=True, request_handler=handler)
        print # a blank line

    elif cmd == 'interact':
        import code
        code.interact(local={'doc': doc, '__name__': '__console__', '__doc__': None})

    else:
        print>>sys.stderr, "Unknown command \"%s\"" % cmd

    doc.close()
