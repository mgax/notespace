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
    props_jq.append($('<dt>').text(name), dd);
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
        heading_jq.text('multiple selection');
        return;
    }
    var note_model = selected_notes[0].model;
    heading_jq.text('editing ' + note_model.get_id());
    $.each(note_model.get_all_props(), add_prop_to_list);
}
update_note_selection([]);

return {
    update_note_selection: update_note_selection
};

};
