jQuery.fn.cork_shell = function(base_url) {

function key_j(evt) {
    //console.log('j');
    cork_ui.set_selection(current_selection.next());
}

function key_k(evt) {
    //console.log('k');
    cork_ui.set_selection(current_selection.prev());
}

function key_h(evt) {
    //console.log('h');
}

function key_l(evt) {
    //console.log('l');
}

function key_del(evt) {
    current_selection.each(function(i, note_dom) {
        var note = $(note_dom).data('note');
        note.model.delete(function() { note.jq.remove(); });
    });
}

var keyBindings_by_charcode = {
    '104': key_h,
    '106': key_j,
    '107': key_k,
    '108': key_l
};
var keyBindings_by_keycode = {
    '46': key_del,
};

var _html_elem = $('html')[0];

function on_keypress(evt) {
    if(evt.originalTarget != _html_elem)
        return;

    var handler;
    if(evt.charCode != 0)
        handler = keyBindings_by_charcode[evt.charCode.toString()];
    if(evt.keyCode != 0)
        handler = keyBindings_by_keycode[evt.keyCode.toString()];

    if(handler)
        handler(evt);
}

var current_selection = $([]);

cork_ui.set_selection = function(note_list) {
    current_selection.removeClass('selected');
    current_selection = $(note_list);
    current_selection.addClass('selected');
    note_selection_changed();
}

cork_ui.note_has_been_clicked = function(note) {
    if(shift_key == false) {
        current_selection.removeClass('selected');
        current_selection = $([]);
    }

    if(note != null) {
        var current_index = current_selection.index(note.jq[0]);
        if(shift_key == true && current_index > -1) {
            note.jq.removeClass('selected');
            current_selection.splice(current_index, 1);
        }
        else {
            note.jq.addClass('selected');
            current_selection.push(note.jq[0]);
        }
    }

    note_selection_changed();
}

function note_selection_changed() {
    var notes = [];
    current_selection.each(function() {
        notes.push($(this).data('note'));
    });
    props_box.update_note_selection(notes);
}

var root_note_jq = this;
root_note_jq.addClass('note');
root_note_jq.click(function(evt) {
    cork_ui.note_has_been_clicked(null);
});
cork_ui.load_root_note(root_note_jq);
var props_box = cork_ui.setup_props_box(root_note_jq);

var shift_key = false;

function update_shift_key(evt) {
    if(evt.charCode != 0 || evt.keyCode != 16)
        return;
    shift_key = evt.shiftKey;
}

$(document).keydown(update_shift_key).keyup(update_shift_key);
$(document).keypress(on_keypress);

};
