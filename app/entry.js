'use strict';
const $ = require('jquery');
const chat = require('./chat');


const $nav = $('#nav');
const $top = $('#top');
const $match_target = $('#match-target');
const $chat_target = $('#chat-target');
const $member_target = $('#member-target');
const top_html = '<h4>部屋一覧</h4><div id="room-list"></div><div id="make-room"><h4>新しい部屋を作る</h4><form id="make-room-form">'
              +'<div class="form-group">'
              +'  <label for="player-name">プレーヤー名（最大10文字）</label>'
              +'  <input type="text" class="form-control" id="player-name" maxlength="10">'
              +'</div>'
              +'<div class="form-group">'
              +'  <label for="room-name">部屋の名前（最大15文字）</label>'
              +'  <input type="text" class="form-control" id="room-name" maxlength="15">'
              +'</div>'
              +'<button type="submit" class="btn btn-primary">部屋を作る</button>'
              +'</form></div>';
var $roomList;

//TODO : replace url
const socket = require('socket.io-client')('https://node-study-kfjmr0.c9users.io:8080/');//, {'sync disconnect on unload': true });

socket.on('enterTopPage', (data) => {
    //$top.text('接続されました');
    //$top.text(data.loadavg.toString());
    //$top.text(data.roomList.toString());
    
    //$top.empty();
    $match_target.empty();
    $chat_target.empty();
    $member_target.empty();
    
    $top.html(top_html);
    
    $roomList = $('#room-list');
    if (data.roomMap) {
        // socket.io can't send Map?? so I try to use Object instead
        Object.keys(data.roomMap).forEach(function(key) {
          addRoom(data.roomMap[key]);
        });
    }
    $('#make-room-form').on('submit', (e) => {
        var player_name = $('#player-name').val();
        var room_name = $('#room-name').val();
        e.preventDefault();
        //console.log(player_name + ' ' + room_name);
        socket.emit('makeRoom', {
            player_name: player_name,
            room_name: room_name
        });
        
        $top.empty();
        chat.init($chat_target, $member_target, $match_target, socket);
        //TODO server-side 
    });

});

socket.on('addRoom', (data) => {
    addRoom(data.room);
});

chat.setSocket(socket);

function addRoom(room) {
    $roomList.prepend('<div class="panel panel-default"><div class="panel-heading">' + escapeHTML(room.name) + '</div><div class="panel-body">' 
      + room.number + '人　 RM:' + escapeHTML(room.rm) + '<button class="btn btn-primary join-room" data-room-id="' + room.id + '">部屋に入る</button></div></div>');
    
    //$roomList.prepend('<div class="panel panel-default"><div class="panel-heading">' + room.name + '</div><div class="panel-body">' 
    //  + room.number + '人　 RM:' + room.rm
    //  + '<form class="join-room-form"><input type="hidden" name="roomid" value="' + room.id + '"><button type="submit" class="btn btn-primary">部屋に入る</button></form></div></div>');
    
    // $(this) works only in function() description???
    $('.join-room').click(function (e) {
        e.preventDefault();
        var player_name = window.prompt('10文字以下でプレーヤー名を入力して下さい');
        player_name = player_name ? player_name.trim() : '';
        if (!player_name) {
            window.alert('プレーヤー名を入力して下さい');
            return false;
        } else if (player_name.length > 10) {
            window.alert('10文字以下で入力して下さい');
            return false;
        }
        console.log(player_name);
        //console.log($(this).data('room-id'));
        socket.emit('joinRoom', {
            room_id: $(this).data('room-id'),
            player_name: player_name
        });
        
        $top.empty();
        chat.init($chat_target, $member_target, $match_target, socket);
        
    });
}

function escapeHTML(val) {
    return $('<span>').text(val).html();
};