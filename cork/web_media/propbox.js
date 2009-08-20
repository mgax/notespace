cork_ui.setup_props_box = function(root_note_jq) {
var jq = $('<dl class="props">');
root_note_jq.append(jq);
jq.append('<div class="new_prop_dialog">'
  + '  <label>name <input name="name" /></label><br />'
  + '  <label>value <input name="value" /></label>'
  + '</div>');
jq.append($('<div class="buttons">').append(
    $('<a>[+]</a>').click(function() { dialog.dialog('open'); })
));

var dialog = $('div.new_prop_dialog', jq).dialog({
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

function set_prop(name, new_value, callback) {
    var note = current_selected_notes[0];
    if(typeof(note.model.get_prop(name)) == "number") {
        // coerce `value` to int
        new_value = new_value - 0;
    }
    note.model.set_prop(name, new_value, callback);
}

function add_prop_to_list(name, value) {
    var dd = $('<dd>').text(value).editable_field(function(new_value) {
        set_prop(name, new_value, function(){ dd.text(new_value); });
    });
    jq.append($('<dt>').text(name), dd);
}

var current_selected_notes = [];
function update_note_selection(selected_notes) {
    jq.empty();
    current_selected_notes = selected_notes;
    if(selected_notes.length == 0)
        return;
    var note_props = selected_notes[0].model.get_all_props();
    $.each(note_props, function(key) { add_prop_to_list(key, note_props[key]); });
}

return {
    update_note_selection: update_note_selection
};

};
