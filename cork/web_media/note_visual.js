(function(){

cork_ui.setup_note_dom = function(note) {
    note.update_display = function() {
        if($('ul.children.outline li.note').index(note.jq) == -1) {
            note.jq.css({
                width: note.model.get_prop('css-width'),
                height: note.model.get_prop('css-height'),
                left: note.model.get_prop('css-left'),
                top: note.model.get_prop('css-top')
            });
        }
        else {
            note.jq.removeAttr('style');
        }
        return false;
    }
    function switch_to_outline() {
        $('> ul', note.jq).addClass('outline');
        $('.note', note.jq).trigger('note_update_display');
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

    note.jq.bind('note_update_display', note.update_display);

    note.jq.click(function(evt) {
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

})();
