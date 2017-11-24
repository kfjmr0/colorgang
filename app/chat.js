'use strict';
const $ = require('jquery');
const util = require('./utility');
const $chat = $('#chat-target');
const $member = $('#member-target');

const chat_html = '<form id="speak-form">'
        		+'    <input type="text" class="form-control" id="speak-content" maxlength="140">'
        	    +'    <button type="submit" class="btn btn-default">発言</button>'
                +'</form>'
                +'<div id="chat-content"></div>';

const member_html = '<ul id="member-list" class="list-group">'
                    +'	<li class="list-group-item" style="background-color:silver;">メンバー</li>'
                    +'</ul>';

function init(socket) {
    $chat.html(chat_html);
    $member.html(member_html);
    console.log('chat start');
    
    
    
    
    //TODO add event to speak form
    // event listener
    $('#speak-form').on('submit', (e) => {
        var content = $('#speak-content').val();
        e.preventDefault();
        $('#speak-content').val('');
        content = content.trim();
        if (!content) {
            return false;
        }
        socket.emit('speak', {
            content: content
        });
    });
    
    
}

function setSocket(socket) {
    socket.on('enterChat', (data) => {
        console.log(data.memberList);
        data.memberList.forEach((member_name) => {
            $('#member-list').append('<li class="list-group-item">'+ util.escapeHTML(member_name) +'</li>');
            
        });
        
        data.chatList.forEach((message) => {
            $('#chat-content').prepend('<div class="chat-message">'+ util.escapeHTML(message.name) + '：' + util.escapeHTML(message.content) +'</div>');
        });
    });
    
    socket.on('newComer', (data) => {
        $('#member-list').append('<li class="list-group-item">'+ util.escapeHTML(data.member_name) +'</li>');
        // TODO さんが入室しました
        $('#chat-content').prepend('<div class="chat-message">'+ util.escapeHTML(data.member_name) +'：入室しました</div>');
    });
    
    socket.on('someoneSpeak', (data) => {
        console.log('someoneSpeak');
        $('#chat-content').prepend('<div class="chat-message">'+ util.escapeHTML(data.name) + '：' + util.escapeHTML(data.content) +'</div>');
        
    });
}

module.exports = {
    init: init,
    setSocket: setSocket
}