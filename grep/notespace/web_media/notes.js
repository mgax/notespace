(function(){

$.fn.editable_field = function(on_save) {
    $.each(this, function() {
        var view = $(this);
        view.click(show_edit);
        var form = null;

        function on_submit() {
            on_save($('input', form).val());
            show_view();
        }
        function on_cancel() {
            show_view();
        }
        function show_edit() {
            form = $('<form>').append(
                $('<input size="6">')
                    .attr('value', view.text())
                    .keyup(function(e) {
                        if(e.keyCode == 27) on_cancel();
                    })
                )
                .submit(function() { try{ on_submit(); } catch(e){} return false; });
            view.hide().after(form);
        }
        function show_view() {
            if(form != null) { form.remove(); form = null; }
            view.show();
        }
    });
    return this;
}

$.new_note = function(note_id, note_data, parent_note) {
    var note = {id: note_id, props: note_data['props']};
    setup_display(note, note_data['html'], parent_note);
    setup_move_and_resize(note);
    setup_props(note);
    setup_children(note);
    note.update_display();
    return note;
}

function setup_display(note, note_html, parent_note) {
    note.update_display = function() {
        if($('ul.children.outline li.note').index(note.jq) == -1) {
            note.jq.css({width: note.props['width'], height: note.props['height'],
                left: note.props['left'], top: note.props['top']});
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

    note.jq = $('<li>');
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

    $(parent_note).append(note.jq);
}

function setup_move_and_resize(note) {
    note.after_resize = function() {
        note.props['width'] = parseInt(note.jq.css('width'));
        note.props['height'] = parseInt(note.jq.css('height'));
        $.post('notes/' + note.id, {props: $.toJSON(note.props)});
    }
    note.block_click_hack = false; // hack - dragging causes spurious click event
    note.do_block_click_hack = function() {
        setTimeout(function() { note.block_click_hack = false; }, 1);
        note.block_click_hack = true;
    }
    note.after_drag = function() {
        note.props['left'] = parseInt(note.jq.css('left'));
        note.props['top'] = parseInt(note.jq.css('top'));
        $.post('notes/' + note.id, {props: $.toJSON(note.props)});
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
                var note_children = note.list_children();
                $.post('notes/' + note.id + '/children',
                    {children: '['+note_children+']'},
                    function(data) {
                        $.extend(moving_note.props,
                            {left: position.left, top: position.top});
                        $.post('notes/' + moving_note.id,
                            {props: $.toJSON(moving_note.props)});
                    },
                    'json');
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
        note.props['desc'] = value;
        $.post('notes/' + note.id, {props: $.toJSON(note.props)}, function(data) { var view = $('<p>').append(value);
            view.click(note.edit_begin);
            input.replaceWith(view);
        }, 'json');
    }
    note.show_props = function() {
        var dl = $('<dl class="props">');
        $.each(note.props, function(key) {
            var dd = $('<dd>').text(note.props[key]).editable_field(function(value) {
                console.log('saving:', key, 'value=', value);
            });
            dl.append($('<dt>').text(key), dd);
        });
        note.jq.append(dl);
    }
    note.add_button('[e]', note.show_props);

    note.jq.append( $('<p>').append(note.props['desc']) );
    $('p:first', note.jq).click(note.edit_begin);
}

function setup_children(note) {
    note.list_children = function() {
        return $('> ul > li.note', note.jq).map(function(){return this.id;}).get();
    }
    note.on_add_child = function() {
        if(note.block_click_hack) return;
        var child_note_props = {desc: 'kid'};
        $.post('notes', {props: $.toJSON(child_note_props)}, function(data) {
            var child_note_id = data;
            var note_children = note.list_children();
            note_children.push(child_note_id);
            $.post('notes/' + note.id + '/children',
                {children: '['+note_children+']'},
                function(data) {
                    $.new_note(child_note_id, {props: child_note_props},
                        $('ul.children', note.jq)[0]); },
                'json');
        }, 'json');
    }
    note.add_button('[+]', note.on_add_child);
    note.on_click_delete = function() {
        $.ajax({type: 'DELETE', url: 'notes/' + note.id, dataType: "json",
            success: function(data) { note.jq.remove(); }});
    }
    note.add_button('[x]', note.on_click_delete);

    $.getJSON('notes/' + note.id + '/children', function(data) {
        var children_ul = $('<ul class="children">')[0];
        note.jq.append(children_ul);
        $.each(data, function(item) {
            var child_note_id = this;
            $.getJSON('notes/' + child_note_id, function(data) {
                $.new_note(child_note_id, data, children_ul);
            });
        });
    });
}

})();
