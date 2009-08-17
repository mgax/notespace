(function(){

cork_ui.setup_root_note = function(root_note_jq) {
    cork_ui._get_note_model(0, function(root_note_model) {
        var notes_container = $('ul#notes');
        var root_note = make_basic_note(0, root_note_model, root_note_jq);
        setup_droppable(root_note);
        load_children(root_note);
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
    return note;
}

function make_note(note_id, note_model, note_jq) {
    var note = make_basic_note(note_id, note_model, note_jq);
    setup_display(note, note.model.get_html());
    setup_droppable(note);
    setup_props(note);
    setup_children(note);
    load_children(note);
    note.update_display();
    cork_ui.notes[note_id] = note;
    return note;
}

function setup_display(note, note_html) {
    note.update_display = function() {
        if($('ul.children.outline li.note').index(note.jq) == -1) {
            note.jq.css({
                width: note.model.get_prop('css-width'),
                height: note.model.get_prop('css-height'),
                left: note.model.get_prop('css-left'),
                top: note.model.get_prop('css-top')
            });
            note.jq.resizable({stop: after_resize});
        }
        else {
            note.jq.removeAttr('style');
            note.jq.resizable('destroy');
        }
        return false;
    }
    function switch_to_outline() {
        $('> ul', note.jq).addClass('outline');
        $('.note', note.jq).trigger('note_update_display');
    }
    function on_click_outline() {
        if(note.block_click_hack) return;
        note.model.set_prop('css-outline', true, switch_to_outline);
    }
    function on_click_box() {
        if(note.block_click_hack) return;
        note.model.set_prop('css-outline', false, function() {
            $('> ul', note.jq).removeClass('outline');
            $('.note', note.jq).trigger('note_update_display');
        });
    }
    function after_resize() {
        note.model.set_prop('css-width', parseInt(note.jq.css('width')));
        note.model.set_prop('css-height', parseInt(note.jq.css('height')));
    }
    note.block_click_hack = false; // hack - dragging causes spurious click event
    note.do_block_click_hack = function() {
        setTimeout(function() { note.block_click_hack = false; }, 1);
        note.block_click_hack = true;
    }
    note.after_drag = function() {
        note.model.set_prop('css-left', parseInt(note.jq.css('left')));
        note.model.set_prop('css-top', parseInt(note.jq.css('top')));
    }
    note.add_button = function(button_text, click_handler) {
        var button = $('<a>' + button_text + '</a>').click(click_handler);
        $('> div.buttons', note.jq).append(button);
    }

    note.jq.attr('id', note.id).attr('class', 'note');
    note.jq.data('note', note);

    note.jq.append($('<div class="buttons">'));
    note.jq.append($('<div class="contents">'));
    note.jq.append($('<ul class="children">'));

    if(note.model.get_prop('css-outline'))
        switch_to_outline();

    note.add_button('[o]', on_click_outline);
    note.add_button('[b]', on_click_box);

    note.jq.bind('note_update_display', note.update_display);

    note.jq.mousedown(function(evt) {
        if(cork_ui.disable_note_drag) {
            evt.stopImmediatePropagation();
            cork_ui.start_lasso(evt);
        }
        else {
            evt.stopPropagation();
        }
    });
    note.jq.draggable();
    note.jq.click(function(evt) {
        cork_ui.note_has_been_clicked(note);
        evt.stopPropagation();
    });

    if(note_html != null) {
        note.jq.addClass('custom_html');
        var html_container = $('<div class="custom_html_container">');
        html_container.html(note_html);
        note.jq.append(html_container);
    }
}

function setup_droppable(note) {
    function can_drop(draggable) {
        if($('.toolbar *').index(draggable) > -1)
            return true;
        if($(draggable).hasClass('note')) {
            if($('.note', draggable).index(note.jq) > -1)
                return false;
            return true;
        }
        return false;
    }
    function on_drag_drop(e, ui) {
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
                moving_note.model.set_prop('css-left', position.left);
                moving_note.model.set_prop('css-top', position.top);
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
    note.jq.droppable({greedy: true,
        hoverClass: 'drag_hover', activeClass: 'drag_active',
        accept: can_drop, drop: on_drag_drop});
}

function setup_props(note) {
    function edit_begin() {
        if(note.block_click_hack) return;
        var input = $('<textarea>').append(view.contents());
        view.replaceWith(input);
        var done_button = $('<a>').append('done').click(function() {
            done_button.remove();
            edit_done();
        });
        input.after(done_button);
    }
    function edit_done() {
        var input = $('textarea', note.jq);
        var value = input.val();
        input.replaceWith(view);
        view.text('-- saving --');
        note.model.set_prop('desc', value, function() {
            view.text(value).click(edit_begin);
        });
    }
    function show_props() {
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
    note.add_button('[e]', show_props);

    var view = $('<p>').append(note.model.get_prop('desc'));
    view.click(edit_begin);
    $('> div.contents', note.jq).append(view);
}

function setup_children(note) {
    function on_add_child() {
        if(note.block_click_hack) return;
        var children_container = $('> ul.children', note.jq);
        var child_jq = $('<li>').appendTo(children_container);
        create_new_note(note.model, child_jq);
    }
    note.add_button('[+]', on_add_child);
    function on_click_delete() {
        note.model.delete(function() { note.jq.remove(); });
    }
    note.add_button('[x]', on_click_delete);
}

function load_children(note) {
    var children_container = $('> ul.children', note.jq);
    $.each(note.model.get_children(), function(i, child_id) {
        var child_jq = $('<li>').appendTo(children_container);
        cork_ui.load_note(child_id, child_jq);
    });
}

})();
