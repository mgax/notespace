(function(){

cork_ui.load_root_note = function(jq) {
    cork_ui._get_note_model(0, function(note_model) {
         make_root_note(0, note_model, jq);
    });
}

cork_ui.load_note = function(note_id, jq, callback) {
    cork_ui._get_note_model(note_id, function(note_model) {
        var note = make_note(note_id, note_model, jq);
        if(callback) callback(note.jq);
    });
}

function create_new_note(parent_note_model, jq, callback) {
    var note_model = cork_ui._new_note_model(parent_note_model, function(note_model) {
        var note = make_note(note_model.get_id(), note_model, jq)
        if(callback) callback(note.jq);
    });
}

cork_ui.notes = {}

function make_basic_note(note_id, note_model, note_jq) {
    var note = {id: note_id, model: note_model, jq: note_jq};
    note_jq.addClass('note').data('note', note);
    cork_ui.notes[note_id] = note;
    return note;
}

function make_root_note(note_id, note_model, note_jq) {
    var note = make_basic_note(note_id, note_model, note_jq);
    $('<ul class="children">').appendTo(note_jq);
    load_children(note);
    return note;
}

function make_note(note_id, note_model, note_jq) {
    var note = make_basic_note(note_id, note_model, note_jq);
    note_jq.attr('id', note_id);
    cork_ui.setup_note_dom(note);
    setup_children(note);
    load_children(note);
    return note;
}

function setup_children(note) {
    note.append_child = function(evt, callback) {
        var children_container = $('> ul.children', note.jq);
        var child_jq = $('<li>').appendTo(children_container);
        create_new_note(note.model, child_jq, callback);
    }
    note.add_button('[+]', note.append_child);
}

function load_children(note) {
    var children_container = $('> ul.children', note.jq);
    $.each(note.model.get_children(), function(i, child_id) {
        var child_jq = $('<li>').appendTo(children_container);
        cork_ui.load_note(child_id, child_jq);
    });
}

})();
