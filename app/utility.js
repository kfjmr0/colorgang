'use strict';
const $ = require('jquery');

function escapeHTML(val) {
    return $('<span>').text(val).html();
};

module.exports = {
    escapeHTML: escapeHTML
}