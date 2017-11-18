'use strict';
const $ = require('jquery');
const chat_html = '<form id="speak-form">'
        	    +''
        		+'    <input type="text" class="form-control" id="speak-content" maxlength="140">'
        	    +''
        	    +'<button type="submit" class="btn btn-default">発言</button>'
                +'</form>'
                +'<div id="chat-content"></div>';


const member_html = '<ul id="member-list" class="list-group">'
                    +'	<li class="list-group-item" style="background-color:silver;">メンバー</li>'
                    +'</ul>';

function init($chat, $member, socket) {
    $chat.html(chat_html);
    $member.html(member_html);
    console.log('chat start');
    
    //TODO add event to speak form
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
    
    setSocket(socket);
    
}

function setSocket(socket) {
    socket.on('enterRoom', (data) => {
        console.log(data.memberList);
        data.memberList.forEach((member_name) => {
            $('#member-list').append('<li class="list-group-item">'+ escapeHTML(member_name) +'</li>');
            
        });
        
        data.chatList.forEach((message) => {
            $('#chat-content').prepend('<div class="chat-message">'+ escapeHTML(message.name) + '：' + escapeHTML(message.content) +'</div>');
        });
    });
    
    socket.on('newComer', (data) => {
        $('#member-list').append('<li class="list-group-item">'+ escapeHTML(data.member_name) +'</li>');
        // TODO さんが入室しました
        $('#chat-content').prepend('<div class="chat-message">'+ escapeHTML(data.member_name) +'：入室しました</div>');
    });
    
    socket.on('someoneSpeak', (data) => {
        console.log('someoneSpeak');
        $('#chat-content').prepend('<div class="chat-message">'+ escapeHTML(data.name) + '：' + escapeHTML(data.content) +'</div>');
        
    });
}

function escapeHTML(val) {
    return $('<span>').text(val).html();
};
    
module.exports = {
    init: init
}