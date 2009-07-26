(function(){

cork_ui.verbose_model = false;

cork_ui._new_note_model = function(parent_note_model, callback) {
    var props = {desc: 'kid'};
    $.post('notes', {props: $.toJSON(props)}, function(note_id) {
        var child_model = make_note_model(note_id, props, null, []);
        if(cork_ui.verbose_model)
            console.log('new note model', child_model.get_id());
        var note_children = parent_note_model.add_child(child_model, function() {
            if(callback) callback(child_model);
        });
    }, 'json');
}
cork_ui._get_note_model = function(note_id, callback) {
    $.getJSON('notes/' + note_id, function(data) {
        $.getJSON('notes/' + note_id + '/children', function(children) {
            if(callback) callback(make_note_model(note_id,
                data['props'], data['html'], children));
        });
    });
}

function make_note_model(id, props, html, children) {
    return {
        set_prop: function(key, value, callback) {
            if(cork_ui.verbose_model)
                console.log('note', id, 'setting property', key, 'to', value);
            props[key] = value;
            $.post('notes/' + id, {props: $.toJSON(props)},
                function(data) { if(callback) callback(); });
        },
        // TODO: set_props method
        get_prop: function(key) {
            return props[key];
        },
        get_html: function() {
            return html;
        },
        get_all_props: function() {
            // TODO: return a copy of props
            return props;
        },
        get_id: function() {
            return id;
        },
        add_child: function(child_model, callback) {
            // TODO: make sure we remove the child from where it came from
            var child_id = child_model.get_id();
            if(cork_ui.verbose_model)
                console.log('note', id, 'appending child', child_id);
            children.push(child_id);
            $.post('notes/' + id + '/children', {children: '[' + children + ']'},
                function(data) { if(callback) callback(); }, 'json');
        },
        get_children: function() {
            return children;
        },
        delete: function(callback) {
            if(cork_ui.verbose_model)
                console.log('deleting note', id);
            $.ajax({type: 'DELETE', url: 'notes/' + id, dataType: "json",
                success: function(data) { if(callback) callback(); }});
        }
    };
}

})();
