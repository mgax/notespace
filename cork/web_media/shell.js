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
    if(evt.type != 'mousedown' || evt.which != 1)
        return;

    var ix = evt.pageX, iy = evt.pageY;
    var lasso_box = $('<div class="lasso">').appendTo(root_elem);
    lasso_box.css({top: iy, left: ix});
    evt.preventDefault(); // FIXME: this prevents the document from receiving focus

    var move_handler = function(evt) {
        var cx = evt.pageX, cy = evt.pageY;
        var tx, xy, bx, by;
        if(cx > ix) { tx = ix; bx = cx } else { tx = cx; bx = ix }
        if(cy > iy) { ty = iy; by = cy } else { ty = cy; by = iy }
        lasso_box.css({top: ty, left: tx, width: bx - tx, height: by - ty});
        /*$('.note').each(function() {
            console.log(this);
        });*/
    }

    root_elem.bind('mousemove', move_handler);
    root_elem.one('mouseup', function() {
        root_elem.unbind('mousemove', move_handler);
        lasso_box.remove();
    });
}

})();
