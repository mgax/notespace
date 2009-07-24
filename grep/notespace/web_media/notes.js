(function(){

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

function make_note(note_id, note_model, jq) {
    var note = {id: note_id, model: note_model};
    setup_display(note, note.model.get_html(), jq);
    setup_move_and_resize(note);
    setup_props(note);
    setup_children(note);
    note.update_display();
    return note;
}

function setup_display(note, note_html, jq) {
    note.update_display = function() {
        if($('ul.children.outline li.note').index(note.jq) == -1) {
            note.jq.css({
                width: note.model.get_prop('width'),
                height: note.model.get_prop('height'),
                left: note.model.get_prop('left'),
                top: note.model.get_prop('top')
            });
            note.jq.resizable({stop: note.after_resize});
        }
        else {
            note.jq.removeAttr('style');
            note.jq.resizable('destroy');
        }
        return false;
    }
    note.on_click_outline = function() {
        if(note.block_click_hack) return;
        $('> ul', note.jq).addClass('outline');
        $('.note', note.jq).trigger('note_update_display');
    }
    note.on_click_box = function() {
        if(note.block_click_hack) return;
        $('> ul', note.jq).removeClass('outline');
        $('.note', note.jq).trigger('note_update_display');
    }

    note.jq = jq; // TODO: check that jq is [<li>]
    note.jq.attr('id', note.id).attr('class', 'note');
    note.jq.data('note', note);
    note.jq.append($('<div class="buttons">'));
    note.add_button = function(button_text, click_handler) {
        var button = $('<a>' + button_text + '</a>').click(click_handler);
        $('> div.buttons', note.jq).append(button);
    }
    note.add_button('[o]', note.on_click_outline);
    note.add_button('[b]', note.on_click_box);

    note.jq.bind('note_update_display', note.update_display);

    if(note_html != null) {
        note.jq.addClass('custom_html');
        var html_container = $('<div class="custom_html_container">');
        html_container.html(note_html);
        note.jq.append(html_container);
    }
}

function setup_move_and_resize(note) {
    note.after_resize = function() {
        note.model.set_prop('width', parseInt(note.jq.css('width')));
        note.model.set_prop('height', parseInt(note.jq.css('height')));
    }
    note.block_click_hack = false; // hack - dragging causes spurious click event
    note.do_block_click_hack = function() {
        setTimeout(function() { note.block_click_hack = false; }, 1);
        note.block_click_hack = true;
    }
    note.after_drag = function() {
        note.model.set_prop('left', parseInt(note.jq.css('left')));
        note.model.set_prop('top', parseInt(note.jq.css('top')));
    }
    note.can_drop = function(draggable) {
        if($('.toolbar *').index(draggable) > -1)
            return true;
        if($(draggable).hasClass('note')) {
            if($('.note', draggable).index(note.jq) > -1)
                return false;
            return true;
        }
        return false;
    }
    note.on_drag_drop = function(e, ui) {
        if(ui.draggable.hasClass('note')) {
            // dropped a note
            var moving_note = ui.draggable.data('note');
            moving_note.do_block_click_hack();
            if($('> ul > li.note', note.jq).index(ui.draggable[0]) > -1) {
                // just repositioned note
                moving_note.after_drag();
            }
            else {
                // changing parent of note
                var parent_offset = ui.draggable.parent().closest('li.note').offset();
                var here_offset = note.jq.offset();
                var position = {
                    top: ui.position.top - here_offset.top + parent_offset.top,
                    left: ui.position.left - here_offset.left + parent_offset.left
                }
                $('> ul', note.jq).append(ui.draggable.css(position));
                note.model.add_child(moving_note.model);
                moving_note.model.set_prop('left', position.left);
                moving_note.model.set_prop('top', position.top);
            }
        }
        else {
            // dropped a button
            var note_offset = note.jq.offset();
            note.jq.append($(ui.draggable).clone().css({
                left: ui.offset.left - note_offset.left,
                top: ui.offset.top - note_offset.top
            }));
        }
    }

    note.jq.draggable();
    note.jq.droppable({greedy: true,
        hoverClass: 'drag_hover', activeClass: 'drag_active',
        accept: note.can_drop, drop: note.on_drag_drop});
}

function setup_props(note) {
    note.edit_begin = function() {
        if(note.block_click_hack) return;
        var view = $('p:first', note.jq);
        var input = $('<textarea>').append(view.contents());
        view.replaceWith(input);
        var done_button = $('<a>').append('done').click(function() {
            done_button.remove();
            note.edit_done();
        });
        input.after(done_button);
    }
    note.edit_done = function() {
        var input = $('textarea', note.jq);
        var value = input.val();
        input.val('saving');
        note.model.set_prop('desc', value, function() {
            view.click(note.edit_begin);
            input.replaceWith(view);
        });
    }
    note.show_props = function() {
        var dl = $('<dl class="props">');
        note.jq.append(dl);
        dl.append('<div class="new_prop_dialog">'
          + '  <label>name <input name="name" /></label><br />'
          + '  <label>value <input name="value" /></label>'
          + '</div>');
        dl.append($('<div class="buttons">').append(
            $('<a>[x]</a>').click(function() { dl.remove(); }),
            $('<a>[+]</a>').click(function() { dialog.dialog('open'); })
        ));
        var note_props = note.model.get_all_props();
        $.each(note_props, function(key) { add_prop_to_list(key, note_props[key]); });

        var dialog = $('div.new_prop_dialog', note.jq).dialog({
            autoOpen: false,
            modal: true,
            buttons: {
                create: function() {
                    var name = $('input[name=name]', dialog).val();
                    var value = $('input[name=value]', dialog).val();
                    set_prop(name, value, function() { add_prop_to_list(name, value); });
                    $(this).dialog('close');
                },
                cancel: function() { $(this).dialog('close'); }
            }
        });

        function add_prop_to_list(name, value) {
            var dd = $('<dd>').text(value).editable_field(function(new_value) {
                set_prop(name, new_value, function(){ dd.text(new_value); });
            });
            dl.append($('<dt>').text(name), dd);
        }

        function set_prop(name, new_value, callback) {
            if(typeof(note.model.get_prop(name)) == "number") {
                // coerce `value` to int
                new_value = new_value - 0;
            }
            note.model.set_prop(name, new_value, callback);
        }
    }
    note.add_button('[e]', note.show_props);

    note.jq.append( $('<p>').append(note.model.get_prop('desc')) );
    $('p:first', note.jq).click(note.edit_begin);
}

function setup_children(note) {
    note.on_add_child = function() {
        if(note.block_click_hack) return;
        var child_jq = $('<li>').appendTo(children_container);
        create_new_note(note.model, child_jq);
    }
    note.add_button('[+]', note.on_add_child);
    note.on_click_delete = function() {
        note.model.delete(function() { note.jq.remove(); });
    }
    note.add_button('[x]', note.on_click_delete);

    var children_container = $('<ul class="children">').appendTo(note.jq);
    $.each(note.model.get_children(), function(i, child_id) {
        var child_jq = $('<li>').appendTo(children_container);
        cork_ui.load_note(child_id, child_jq);
    });
}

})();
