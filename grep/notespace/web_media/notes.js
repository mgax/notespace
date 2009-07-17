(function(){

$.new_note = function(note_id, note_data, parent_note) {
    return new $.Note(note_id, note_data, parent_note);
}

$.Note = function(note_id, note_data, parent_note) {
    var props = note_data['props'];
    var note = this;
    note.id = note_id;

    note.list_children = function() {
        return $('> ul > li.note', note.jq).map(function(){return this.id;}).get();
    }
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
    note.on_add_child = function() {
        if(block_click_hack) return;
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
    note.edit_begin = function() {
        if(block_click_hack) return;
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
    note.after_resize = function() {
        note.props['width'] = parseInt(note.jq.css('width'));
        note.props['height'] = parseInt(note.jq.css('height'));
        $.post('notes/' + note.id, {props: $.toJSON(note.props)});
    }
    var block_click_hack = false; // hack - dragging causes spurious click event
    note.do_block_click_hack = function() {
        setTimeout(function() { block_click_hack = false; }, 1);
        block_click_hack = true;
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
    note.on_click_outline = function() {
        if(block_click_hack) return;
        $('> ul', note.jq).addClass('outline');
        $('.note', note.jq).trigger('note_update_display');
    }
    note.on_click_box = function() {
        if(block_click_hack) return;
        $('> ul', note.jq).removeClass('outline');
        $('.note', note.jq).trigger('note_update_display');
    }
    note.on_click_delete = function() {
        $.ajax({type: 'DELETE', url: 'notes/' + note.id, dataType: "json",
            success: function(data) { note.jq.remove(); }});
    }

    note.jq = $('<li>');
    note.jq.attr('id', note.id).attr('class', 'note');

    note.jq.data('note', note);

    note.jq.append($('<div class="buttons">').append(
        $('<a>[+]</a>').click(note.on_add_child),
        $('<a>[o]</a>').click(note.on_click_outline),
        $('<a>[b]</a>').click(note.on_click_box),
        $('<a>[x]</a>').click(note.on_click_delete)
    ));

    note.props = props;
    note.jq.append( $('<p>').append(note.props['desc']) );
    $('p:first', note.jq).click(note.edit_begin);

    note.update_display();
    note.jq.bind('note_update_display', note.update_display)
    note.jq.draggable();
    note.jq.droppable({greedy: true,
        hoverClass: 'drag_hover', activeClass: 'drag_active',
        accept: note.can_drop, drop: note.on_drag_drop});

    $(parent_note).append(note.jq);

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

    if(note_data['html'] != null) {
        note.jq.addClass('custom_html');
        var html_container = $('<div class="custom_html_container">');
        html_container.html(note_data['html'])
        note.jq.append(html_container);
    }
}

})()
