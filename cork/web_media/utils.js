(function(){

window.cork_ui = {};

cork_ui.report_exception = function(e) {
    setTimeout(function() {
        console.log('cork_ui reporting exception');
        throw e;
    }, 0);
}

cork_ui.report_error = function(msg) {
    //console.log('cork_ui reporting error');
    //console.log(msg);
    cork_ui.add_to_ticker(msg, 'error');
}

cork_ui.report_info = function(msg) {
    //console.log('cork_ui reporting info');
    //console.log(msg);
    cork_ui.add_to_ticker(msg, 'info');
}

cork_ui.callback_and_return_false = function(callable) {
    return function() {
        try{
            callable();
        }
        catch(e){
            cork_ui.report_exception(e);
        }
        return false;
    };
}

$.fn.instant_input = function(initial_value, on_change, on_cancel) {
    var original_element = this;
    var input = $('<input>').attr('value', initial_value);
    var edit = $('<form>').append(input);

    input.keyup(function(evt) {
        if(evt.keyCode != 27) return;
        restore_original_element();
        if(on_cancel) on_cancel();
    });
    edit.submit(function(evt) {
        evt.preventDefault();
        var value = input.val();
        restore_original_element();
        if(on_change) on_change(value);
    });
    function restore_original_element() {
        edit.remove()
        original_element.show();
    }

    original_element.after(edit).hide();
    input.trigger('focus');
}

})();
