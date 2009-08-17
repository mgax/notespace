(function(){

$(document).keydown(on_keydown);
$(document).keyup(on_keyup);
var root_elem;
$(function(){
    root_elem = $('ul#notes');
    root_elem.click(function() { cork_ui.note_has_been_clicked(null); });
    root_elem.mousedown(cork_ui.start_lasso);
});

cork_ui.disable_note_drag = false;
var shift_key = false;

function on_keydown(evt) {
    if(evt.shiftKey && evt.keyCode == 16) {
        shift_key = true;
        cork_ui.disable_note_drag = true;
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

    var ix = evt.pageX, iy = evt.pageY; /* initial X, Y */
    var lasso_box = $('<div class="lasso">').appendTo(root_elem);
    lasso_box.css({top: iy, left: ix});

    var move_handler = function(evt) {
        var cx = evt.pageX, cy = evt.pageY; /* current X, Y */
        var lx, rx, ty, by; /* left,right X; top,bottom Y */

        // make sure width and height will not come out negative
        if(cx > ix) { rx = cx; lx = ix } else { rx = ix; lx = cx }
        if(cy > iy) { ty = iy; by = cy } else { ty = cy; by = iy }
        lasso_box.css({top: ty, left: lx, width: rx - lx, height: by - ty});

        // look for notes within the lasso
        $('.note').each(function() {
            var note_jq = $(this), offset = note_jq.offset();
            var selection_index = current_selection.index(this);
            var selected = (selection_index > -1);

            var nl = offset.left, nr = note_jq.width() + nl; /* note X left, right */
            var nt = offset.top, nb = note_jq.height() + nt; /* note Y top, bottom */

            if(nl > lx && nr < rx && nt > ty && nb < by) {
                if(! selected) {
                    note_jq.addClass('selected');
                    current_selection.push(this);
                }
            }
            else {
                if(selected) {
                    note_jq.removeClass('selected');
                    current_selection.splice(selection_index, 1);
                }
            }
        });
    }

    root_elem.bind('mousemove', move_handler);
    root_elem.one('mouseup', function() {
        root_elem.unbind('mousemove', move_handler);
        lasso_box.remove();
    });
}

})();
