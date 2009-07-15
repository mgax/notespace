$.Note = function(note_id, note_data, parent_note) {
    var note_props = note_data['props']
    var note_this = this;

    this.list_children = function() {
        return $('> ul > li.note', note).map(function(){return this.id;}).get();
    }
    this.update_display = function() {
        if($('ul.children.outline li.note').index(note) == -1) {
            note.css({width: note_props['width'], height: note_props['height'],
                left: note_props['left'], top: note_props['top']});
            note.resizable({stop: note_this.after_resize});
        }
        else {
            note.removeAttr('style');
            note.resizable('destroy');
        }
        return false;
    }
    this.on_add_child = function() {
        if(block_click_hack) return;
        var child_note_props = {desc: 'kid'};
        $.post('notes', {props: $.toJSON(child_note_props)}, function(data) {
            var child_note_id = data;
            var note_children = note_this.list_children();
            note_children.push(child_note_id);
            $.post('notes/' + note_id + '/children',
                {children: '['+note_children+']'},
                function(data) {
                    new $.Note(child_note_id, {props: child_note_props},
                        $('ul.children', note)[0]); },
                'json');
        }, 'json');
    }
    this.edit_begin = function() {
        if(block_click_hack) return;
        var view = $('p:first', note);
        var input = $('<textarea>').append(view.contents());
        view.replaceWith(input);
        var done_button = $('<a>').append('done').click(function() {
            done_button.remove();
            note_this.edit_done();
        });
        input.after(done_button);
    }
    this.edit_done = function() {
        var input = $('textarea', note);
        var value = input.val();
        input.val('saving');
        note_props['desc'] = value;
        $.post('notes/' + note_id, {props: $.toJSON(note_props)}, function(data) { var view = $('<p>').append(value);
            view.click(note_this.edit_begin);
            input.replaceWith(view);
        }, 'json');
    }
    this.after_resize = function() {
        note_props['width'] = parseInt(note.css('width'));
        note_props['height'] = parseInt(note.css('height'));
        $.post('notes/' + note_id, {props: $.toJSON(note_props)});
    }
    var block_click_hack = false; // hack - dragging causes spurious click event
    this.do_block_click_hack = function() {
        setTimeout(function() { block_click_hack = false; }, 1);
        block_click_hack = true;
    }
    this.after_drag = function() {
        note_props['left'] = parseInt(note.css('left'));
        note_props['top'] = parseInt(note.css('top'));
        $.post('notes/' + note_id, {props: $.toJSON(note_props)});
    }
    this.can_drop = function(draggable) {
        if($('.toolbar *').index(draggable) > -1)
            return true;
        if($(draggable).hasClass('note')) {
            if($('.note', draggable).index(note) > -1)
                return false;
            return true;
        }
        return false;
    }
    this.on_drag_drop = function(e, ui) {
        if(ui.draggable.hasClass('note')) {
            // dropped a note
            var moving_note = ui.draggable.data('this');
            moving_note.do_block_click_hack();
            if($('> ul > li.note', note).index(ui.draggable[0]) > -1) {
                // just repositioned note
                moving_note.after_drag();
            }
            else {
                // changing parent of note
                parent_offset = ui.draggable.parent().closest('li.note').offset();
                here_offset = note.offset();
                var position = {
                    top: ui.position.top - here_offset.top + parent_offset.top,
                    left: ui.position.left - here_offset.left + parent_offset.left
                }
                $('> ul', note).append(ui.draggable.css(position));
                var note_children = note_this.list_children();
                $.post('notes/' + note_id + '/children',
                    {children: '['+note_children+']'},
                    function(data) {
                        $.extend(moving_note.note_props,
                            {x: position.left, y: position.top});
                        $.post('notes/' + moving_note.note_id,
                            {props: $.toJSON(moving_note.note_props)});
                    },
                    'json');
            }
        }
        else {
            // dropped a button
            var note_offset = note.offset();
            note.append($(ui.draggable).clone().css({
                left: ui.offset.left - note_offset.left,
                top: ui.offset.top - note_offset.top
            }));
        }
    }
    this.on_click_outline = function() {
        if(block_click_hack) return;
        $('> ul', note).addClass('outline');
        $('.note', note).trigger('note_update_display');
    }
    this.on_click_box = function() {
        if(block_click_hack) return;
        $('> ul', note).removeClass('outline');
        $('.note', note).trigger('note_update_display');
    }
    this.on_click_delete = function() {
        $.ajax({type: 'DELETE', url: 'notes/' + note_id, dataType: "json",
            success: function(data) { note.remove(); }});
    }

    var note = $('<li>');
    note.attr('id', note_id).attr('class', 'note');

    this.note = note;
    this.note_id = note_id;
    note.data('this', this);

    note.append($('<div class="buttons">').append(
        $('<a>[+]</a>').click(this.on_add_child),
        $('<a>[o]</a>').click(this.on_click_outline),
        $('<a>[b]</a>').click(this.on_click_box),
        $('<a>[x]</a>').click(this.on_click_delete)
    ));

    this.note_props = note_props;
    note.append( $('<p>').append(note_props['desc']) );
    $('p:first', note).click(this.edit_begin);

    this.update_display();
    note.bind('note_update_display', this.update_display)
    note.draggable();
    note.droppable({greedy: true,
        hoverClass: 'drag_hover', activeClass: 'drag_active',
        accept: this.can_drop, drop: this.on_drag_drop});

    $(parent_note).append(note);

    var note_children;
    $.getJSON('notes/' + note_id + '/children', function(data) {
        note_children = data;
        var children_ul = $('<ul class="children">')[0];
        note.append(children_ul);
        $.each(data, function(item) {
            var child_note_id = this
            $.getJSON('notes/' + child_note_id, function(data) {
                new $.Note(child_note_id, data, children_ul);
            });
        });
    });

    if(note_data['html'] != null) {
        note.addClass('custom_html');
        var html_container = $('<div class="custom_html_container">');
        html_container.html(note_data['html'])
        note.append(html_container);
    }

}
