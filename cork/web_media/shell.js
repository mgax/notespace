jQuery.fn.cork_shell = function(base_url) {

function key_esc(evt) {
    cork_ui.set_selection([]);
}

function key_del(evt) {
    current_selection.each(function(i, note_dom) {
        var note = $(note_dom).data('note');
        note.model.remove(function() { note.jq.remove(); });
    });
}

function key_A(evt) {
    if(current_selection.length) {
        var note = current_selection.data('note');
        note.append_child(evt, function(new_note_jq) {
            cork_ui.set_selection(new_note_jq);
        });
    }
}

function key_e(evt) {
    evt.preventDefault();
    if(current_selection.length)
        current_selection.data('note').edit_in_place();
}

function key_j(evt) {
    var next = current_selection.next('.note');
    if(next.length)
        cork_ui.set_selection(next);
}

function key_k(evt) {
    var prev = current_selection.prev('.note');
    if(prev.length)
        cork_ui.set_selection(prev);
}

function key_h(evt) {
    var parent = current_selection.parent().closest('.note');
    if(parent.length)
        cork_ui.set_selection(parent);
}

function key_l(evt) {
    var firstchild = $('.note', current_selection).slice(0,1);
    if(firstchild.length)
        cork_ui.set_selection(firstchild)
}

var keyBindings_by_keycode = {
    '27': key_esc,
    '46': key_del,
    '65': key_A,
    '69': key_e,
    '72': key_h,
    '74': key_j,
    '75': key_k,
    '76': key_l
};

var _html_elem = $('html')[0];
var _html_body_elem = $('body')[0];

function on_keydown(evt) {
    if(evt.target != _html_elem && evt.target != _html_body_elem)
        return;

    var handler = keyBindings_by_keycode[evt.keyCode.toString()];
    if(handler)
        handler(evt);
//    else
//        console.log(evt.keyCode);
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
$(document).keydown(on_keydown);

};
