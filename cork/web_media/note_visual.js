(function(){

cork_ui.setup_note_dom = function(note) {
    setup_display(note);
    setup_drag_drop(note);
}

function setup_display(note) {
    note.jq.bind('note_update_display', function(evt) {
        evt.stopPropagation();
        if($('ul.children.outline li.note#'+note.id).index(note.jq) == -1) {
            note.jq.css({
                width: note.model.get_prop('css-width'),
                height: note.model.get_prop('css-height'),
                left: note.model.get_prop('css-left'),
                top: note.model.get_prop('css-top')
            });
        }
        else {
            note.jq.css({width: null, height: null, left: null, top: null});
        }
    });
    note.jq.triggerHandler('note_update_display');
    function switch_to_outline() {
        $('> ul', note.jq).addClass('outline');
        $('.note', note.jq).trigger('note_update_display');
    }
    note.add_button = function(button_text, click_handler) {
        var button = $('<a>' + button_text + '</a>').click(click_handler);
        $('> div.buttons', note.jq).append(button);
    }

    note.jq.append($('<div class="buttons">'));
    note.jq.append($('<div class="contents">'));
    note.jq.append($('<ul class="children">'));

    if(note.model.get_prop('css-outline'))
        switch_to_outline();

    note.add_button('[o]', function(evt) {
        evt.stopPropagation();
        note.model.set_prop('css-outline', true, switch_to_outline);
    });
    note.add_button('[b]', function(evt) {
        evt.stopPropagation();
        note.model.set_prop('css-outline', false, function() {
            $('> ul', note.jq).removeClass('outline');
            $('.note', note.jq).trigger('note_update_display');
        });
    });

    var _prevent_click = false;
    note._do_prevent_click = function() {
        _prevent_click = true;
        setTimeout(function() {_prevent_click = false;}, 0);
    }
    note.jq.click(function(evt) {
        if(_prevent_click) return;
        cork_ui.note_has_been_clicked(note);
        evt.stopPropagation();
    });

    var view = $('<p>').text(note.model.get_prop('desc'));
    $('> div.contents', note.jq).append(view);

    note.model.propchange_bind(function(evt) {
        $.each(['width', 'height', 'top', 'left'], function(i, name) {
            if(evt.name == 'css-'+name)
                note.jq.css(name, evt.value);
        });
        if(evt.name == 'desc')
            view.text(evt.value);
    });

    var note_html = note.model.get_html();
    if(note_html != null) {
        note.jq.addClass('custom_html');
        var html_container = $('<div class="custom_html_container">');
        html_container.html(note_html);
        note.jq.append(html_container);
    }
}

function setup_drag_drop(note) {
    var drag_target = null;
    note.jq.draggable({
        helper: function(evt) {
            return note.jq.clone().appendTo($('body')).removeAttr('id').css('opacity', 0.7);
        },
        drag: function(evt, ui) {
            var t = get_current_hover_target(evt, ui, note.jq);
            if(drag_target === t) return;
            //console.log(t);
            $([drag_target]).removeClass('drag_hover');
            drag_target = t;
            $([drag_target]).addClass('drag_hover');
        },
        stop: function(evt, ui) {
            note._do_prevent_click();
            parent_jq = note.jq.parent().closest('.note');
            var drag_target_jq = $([drag_target]);

            if(parent_jq.index(drag_target) == -1) {
                var new_parent = drag_target_jq.data('note');
                new_parent.model.add_child(note.model, function() {
                    $('> ul', new_parent.jq).append(note.jq);
                });
            }

            var new_offset = calculate_offset_px(drag_target_jq, ui.helper);
            note.model.set_prop('css-top', new_offset.top);
            note.model.set_prop('css-left', new_offset.left);
            drag_target_jq.removeClass('drag_hover');
            drag_target = null;
        }
    });
}

function get_current_hover_target(evt, ui, note_jq) {
    var candidates = [];
    $('.note').each(function() {
        if(this === ui.helper[0]) return;
        if(this === note_jq[0]) return;
        var offset = $(this).offset();
        var t = offset.top;
        var l = offset.left;
        var b = t + $(this).height();
        var r = l + $(this).width();
        if(t > evt.pageY || b < evt.pageY) return;
        if(l > evt.pageX || r < evt.pageX) return;
        candidates.push(this);
    });
    return candidates.pop();
}

function calculate_offset_px(parent_jq, child_jq) {
    var parent_offset = parent_jq.offset();
    var child_offset = child_jq.offset();
    return {
        top: (child_offset.top - parent_offset.top) + 'px',
        left: (child_offset.left - parent_offset.left) + 'px'
    };
}

})();
