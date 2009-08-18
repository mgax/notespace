(function() {

var TICKER_ITEM_LIFETIME = 5000;

var ticker = $('<ol id="ticker">');

cork_ui.add_to_ticker = function(msg, cls) {
    var item = $('<li>').addClass(cls).append(msg);
    ticker.append(item);
    setTimeout(function() {
        item.fadeOut(1000, function() { item.remove(); });
    }, TICKER_ITEM_LIFETIME);
}

$(function() { $('body').append(ticker); });

})();
