'use strict';
const $ = require('jquery');
const util = require('./utility');

//const URL = 'https://node-study-kfjmr0.c9users.io:8080/';
const url = $('#url-data').data('url');
const socket = require('socket.io-client')(url);//, {'sync disconnect on unload': true });

const chat = require('./chat');
const match = require('./match');

const $nav = $('#nav');
const $top = $('#top');
const $match_target = $('#match-target');
const $participate_target = $('#participate-target');
const $chat_target = $('#chat-target');
const $member_target = $('#member-target');

const top_html = '<h4>部屋一覧</h4><div id="room-list"></div><div id="make-room"><h4>新しい部屋を作る</h4><form id="make-room-form">'
              +'<div class="form-group">'
              +'  <label for="room-name">部屋の名前（最大15文字）</label>'
              +'  <input type="text" class="form-control" id="room-name" maxlength="15">'
              +'</div>'
              +'<div class="form-group">'
              +'  <label for="player-name">プレーヤー名（最大10文字）</label>'
              +'  <input type="text" class="form-control" id="player-name" maxlength="10">'
              +'</div>'
              +'<button type="submit" class="btn btn-primary">部屋を作る</button>'
              +'</form></div>';
var $roomList;


socket.on('enterTopPage', (data) => {
    //clear gaming room element
    $match_target.empty();
    $participate_target.empty();
    $chat_target.empty();
    $member_target.empty();
    match.unbindResizeEvent();
    match.unbindMatchEvent();
    
    //console.log(data);
    if (data.hasFailedToValidate) {
        $top.text('部屋の取得に失敗しました');
        return false;
    }
    
    $top.html(top_html);
    
    
    $roomList = $('#room-list');
    if (data.roomMap) {
        // socket.io can't send Map?? so I try to use Object instead
        Object.keys(data.roomMap).forEach(function(key) {
          addRoom(data.roomMap[key]);
        });
    }
    
    $top.append('<div>アクセス中の人数:' + data.connected_number + '</div>');
    $top.append('<div>ロードアベレージ:' + data.loadavg + '</div>');
    $top.append('<div>メモリ使用率:' + data.memory_utilization + '</div>');
    
    
    $('#make-room-form').on('submit', (e) => {
        var player_name = $('#player-name').val();
        var room_name = $('#room-name').val();
        e.preventDefault();
        player_name = player_name.trim();
        room_name = room_name.trim();
        //console.log(player_name + ' ' + room_name);
        if (player_name.length === 0 || room_name.length === 0 || player_name.length > 10 || room_name.length > 15) {
            return false;
        }
        socket.emit('makeRoom', {
            player_name: player_name,
            room_name: room_name
        });
        
        $top.empty();
        chat.init(socket);
        match.init(socket);
        
        match.roomMasterProcess();
    });

});

socket.on('addRoom', (data) => {
    addRoom(data.room);
});

chat.setSocket(socket);

match.setSocketEvent(socket);




function addRoom(room) {
    $roomList.prepend('<div class="panel panel-default"><div class="panel-heading">' + util.escapeHTML(room.name) + '</div><div class="panel-body">人数　' 
      + room.number + '/10　 RM:' + util.escapeHTML(room.rm) + '<button class="btn btn-primary join-room" data-room-id="' + room.id + '">部屋に入る</button></div></div>');
    
    // $(this) works only in function() description???
    $('.join-room').click(function (e) {
        e.preventDefault();
        var player_name = window.prompt('10文字以下でプレーヤー名を入力して下さい');
        player_name = player_name ? player_name.trim() : '';
        if (player_name === null) { return false; }
        if (!player_name) {
            window.alert('プレーヤー名を入力して下さい');
            return false;
        } else if (player_name.length > 10) {
            window.alert('10文字以下で入力して下さい');
            return false;
        }
        //console.log(player_name);
        //console.log($(this).data('room-id'));
        socket.emit('joinRoom', {
            room_id: $(this).data('room-id'),
            player_name: player_name
        });
        
        $top.empty();
        chat.init(socket);
        match.init(socket);
    });
}
