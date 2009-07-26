def bootstrap():
    import sys
    from os import path
    from ConfigParser import ConfigParser
    from document import open_document, demo_data

    cfg_path = sys.argv[1]
    parser = ConfigParser()
    parser.read(cfg_path)
    dbfile = parser.get('cork', 'dbfile')

    doc = open_document(dbfile)

    if len(sys.argv) > 2:
        cmd = sys.argv[2]
    else:
        cmd = 'serve'

    if cmd == 'init':
        demo_data(doc)

    elif cmd == 'serve':
        from werkzeug import run_simple, SharedDataMiddleware
        from server import NotespaceApp

        app = NotespaceApp(doc)
        host = parser.get('testserver', 'host')
        port = parser.getint('testserver', 'port')
        media_section = parser.get('testserver', 'staticmedia')
        static_media = dict(parser.items(media_section))
        app = SharedDataMiddleware(app, static_media)
        run_simple(host, port, app, use_reloader=True)
        print # a blank line

    elif cmd == 'interact':
        import code
        code.interact(local={'doc': doc, '__name__': '__console__', '__doc__': None})

    else:
        print>>sys.stderr, "Unknown command \"%s\"" % cmd

    doc.close()
