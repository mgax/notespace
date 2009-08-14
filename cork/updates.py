updates = {}

def update_from(func):
    updates[func.__name__] = func

def do_updates(conn):
    def get_version():
        return conn.get_root().get('version', 'v2009_08_13')
    while True:
        version = get_version()
        if version not in updates:
            return
        updates[version](conn)
        conn.abort() # to make sure updates do their own commits
        if version == get_version():
            raise ValueError('the update script "%s" forgot to change db version')

@update_from
def v2009_08_13(conn):
    for note in conn.get_root()['doc'].list_notes():
        for key in 'top', 'left', 'width', 'height':
            if key in note:
                note['css-' + key] = note._props.pop(key)
    conn.get_root()['version'] = 'v2009_08_14'
    conn.commit()
