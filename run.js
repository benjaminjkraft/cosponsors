var congress = require('./index');
var $ = require('jquery');

// http://stackoverflow.com/questions/901115/how-can-i-get-query-string-values-in-javascript
function urlParam(name) {
    var match = RegExp('[?&]' + name + '=([^&]*)').exec(window.location.search);
    return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
}

congress.drawCosponsorGraph(
        urlParam("chamber") || "senate",
        urlParam("congress") || 114,
        urlParam("bills") || 500);
