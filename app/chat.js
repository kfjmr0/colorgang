'use strict';
const $ = require('jquery');
const chat_html = '<form>'
        	    +'<div class="col-xs-10">'
        		+'    <input type="text" class="form-control" id="speak" maxlength="140">'
        	    +'</div>'
        	    +'<div class="col-xs-2"><button type="submit" class="btn btn-default">発言</button></div>'
                +'</form>'
                +'<div id="chat-content">aaaaaa</div>';


const member_html = '<ul id="member-list" class="list-group">'
                    +'	<li class="list-group-item" style="background-color:silver;">メンバー</li>'
                    +'</ul>';

function init($target, $member_target) {
    $target.html(chat_html);
    $member_target.html(member_html);
    console.log('chat start');
    
    
}

function setSocket(socket) {
    socket.on('enterRoom', (data) => {
        console.log(data.memberList);
        data.memberList.forEach((member_name) => {
            $('#member-list').append('<li class="list-group-item">'+ member_name +'</li>');
        })
    });
    
    socket.on('newComer', (data) => {
        $('#member-list').append('<li class="list-group-item">'+ data.member_name +'</li>');
        // TODO さんが入室しました
        $('#chat-content').append('<div>'+ data.member_name +'さんが入室しました</div>');
    });
}

module.exports = {
    init: init,
    setSocket: setSocket
}