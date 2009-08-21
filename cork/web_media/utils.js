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
        function show_edit(evt) {
            evt.stopPropagation(); // to block handler in "shell"
            var input = $('<input size="6">').attr('value', view.text())
            input.keyup(function(evt) {
                if(evt.keyCode == 27)
                    on_cancel();
            })
            form = $('<form>').append(input);
            form.submit(cork_ui.callback_and_return_false(on_submit));
            view.hide().after(form);
            input.trigger('focus');
        }
        function show_view() {
            if(form != null) { form.remove(); form = null; }
            view.show();
        }
    });
    return this;
}

cork_ui.block_click_hack = false; // hack - block subsequent click events
cork_ui.do_block_click_hack = function() {
    setTimeout(function() { cork_ui.block_click_hack = false; }, 1);
    cork_ui.block_click_hack = true;
}

})();
