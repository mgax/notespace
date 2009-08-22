jQuery.fn.cork_shell = function(base_url) {

var _html_elem = $('html')[0];
function on_keydown(evt) {
    if(evt.shiftKey && evt.keyCode == 16) {
        shift_key = true;
        cork_ui.disable_note_drag = true;
    }
    var _target_is_root = (evt.originalTarget == _html_elem);
    if(evt.keyCode == 46 && _target_is_root) { // keyCode 46 - delete
        current_selection.each(function(i, note_dom) {
            var note = $(note_dom).data('note');
            note.model.delete(function() { note.jq.remove(); });
        });
    }
}

function on_keyup(evt) {
    if(evt.keyCode == 16) {
        shift_key = false;
        cork_ui.disable_note_drag = false;
    }
}

var current_selection = $([]);

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

cork_ui.start_lasso = function(evt) {
    if(evt.type != 'mousedown' || evt.which != 1) {
        return; // not a left-click event
    }

    if(! document.hasFocus()) {
        // this click event will reach the document and focus it; we will
        // handle subsequent clicks as lasso selections
        return;
    }
    else {
        evt.preventDefault();
    }

    var lasso_with_shift_key = shift_key;

    var ix = evt.pageX, iy = evt.pageY; /* initial X, Y */
    var lasso_box = $('<div class="lasso">').appendTo(root_note_jq);
    lasso_box.css({top: iy, left: ix});
    var lx = ix, rx = ix, ty = iy, by = iy; /* left,right X; top,bottom Y */
    var mousemoved = false;

    root_note_jq.bind('mousemove', mousemove_handler);
    root_note_jq.one('mouseup', mouseup_handler);

    function mousemove_handler(evt) {
        mousemoved = true;
        var cx = evt.pageX, cy = evt.pageY; /* current X, Y */

        // make sure width and height will not come out negative
        if(cx > ix) { rx = cx; lx = ix } else { rx = ix; lx = cx }
        if(cy > iy) { ty = iy; by = cy } else { ty = cy; by = iy }
        lasso_box.css({top: ty, left: lx, width: rx - lx, height: by - ty});
    }

    function mouseup_handler(evt) {
        root_note_jq.unbind('mousemove', mousemove_handler);
        lasso_box.remove();

        if(mousemoved)
            cork_ui.do_block_click_hack();
        else
            return; // so we don't miss the click event

        // update selection - look for notes within the lasso
        if(! lasso_with_shift_key) {
            current_selection.removeClass('selected');
            current_selection = $([]);
        }
        $('.note').each(function() {
            if(current_selection.index(this) > -1)
                return; // already selected
            var note_jq = $(this), offset = note_jq.offset();

            var nl = offset.left, nr = note_jq.width() + nl; /* note X left, right */
            var nt = offset.top, nb = note_jq.height() + nt; /* note Y top, bottom */

            if(nl > lx && nr < rx && nt > ty && nb < by) {
                note_jq.addClass('selected');
                current_selection.push(this);
            }
        });
        note_selection_changed();
    };
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
    if(cork_ui.block_click_hack) return;
    cork_ui.note_has_been_clicked(null);
});
root_note_jq.mousedown(cork_ui.start_lasso);
cork_ui.load_root_note(root_note_jq);
var props_box = cork_ui.setup_props_box(root_note_jq);

cork_ui.disable_note_drag = false;
var shift_key = false;

$(document).keydown(on_keydown);
$(document).keyup(on_keyup);

};