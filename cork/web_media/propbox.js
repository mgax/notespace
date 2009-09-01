cork_ui.setup_props_box = function(root_note_jq) {

var box_jq = $('<div class="props_box">').appendTo(root_note_jq);
function event_blocker(evt) { evt.stopPropagation(); }
box_jq.click(event_blocker).mousedown(event_blocker); // to block handlers in "shell"

box_jq.append($('<div class="buttons">').append(
    $('<a>[+]</a>').click(function() { dialog_jq.dialog('open'); })
));

var heading_jq = $('<h4>').appendTo(box_jq);
var props_jq = $('<dl>').appendTo(box_jq);

props_jq.append('<div class="new_prop_dialog">'
  + '  <label>name <input name="name" /></label><br />'
  + '  <label>value <input name="value" /></label>'
  + '</div>');

var dialog_jq = $('div.new_prop_dialog', box_jq).dialog({
    autoOpen: false,
    modal: true,
    buttons: {
        create: function() {
            var name = $('input[name=name]', dialog_jq).val();
            var value = $('input[name=value]', dialog_jq).val();
            set_prop(name, value, function() { add_prop_to_list(name, value); });
            $(this).dialog('close');
        },
        cancel: function() { $(this).dialog('close'); }
    }
});

function set_prop(name, new_value, callback) {
    // we must save the value to each selected note, using
    // callbacks. FUN!
    var note_queue = current_selected_notes.slice(0); // copy the array
    function save_chain() {
        D = note_queue;
        D2 = current_selected_notes;
        var note = note_queue.pop();
        if(note)
            note.model.set_prop(name, new_value, save_chain);
        else
            callback();
    }
    save_chain();
}

var several = Object(); // marker for multiple values
function add_prop_to_list(name, value) {
    var initial_value = value;
    if(value === several) {
        initial_value = '';
        value = '~~';
    }
    var dt = $('<dt>').text(name);
    var dd = $('<dd>').text(value).editable_field(function(new_value) {
        set_prop(name, new_value, function(){ dd.text(new_value); });
    }, initial_value);
    var del = $('<dd class="remove">').append('&#x2718;');
    del.click(function(evt) {
        set_prop(name, null, function() { entry.remove(); });
    });
    var entry = $(dt).add(del).add(dd).appendTo(props_jq);
    console.log(entry, dt, dd, del);
}

var current_selected_notes;
function update_note_selection(selected_notes) {
    props_jq.empty();
    current_selected_notes = selected_notes;
    if(selected_notes.length == 0) {
        heading_jq.text('nothing selected');
        return;
    }
    if(selected_notes.length > 1) {
        heading_jq.text('' + selected_notes.length + ' notes selected');
    }
    else {
        heading_jq.text('editing ' + selected_notes[0].model.get_id());
    }
    var all_values = {};
    $.each(selected_notes, function(i, note) {
        var note_props = note.model.get_all_props();
        $.each(note_props, function(name, value) {
            if(name in all_values) {
                if(value != all_values[name])
                    all_values[name] = several; // because our value differs from previous
            }
            else {
                if(i > 0)
                    all_values[name] = several; // because previous notes did not have it
                else
                    all_values[name] = value;
            }
        });
        $.each(all_values, function(name, value) {
            if(! (name in note_props))
                all_values[name] = several; // because this note doesn't have it
        });
    });
    $.each(all_values, add_prop_to_list);
}
update_note_selection([]);

return {
    update_note_selection: update_note_selection
};

};
