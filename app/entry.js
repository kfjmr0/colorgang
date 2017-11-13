'use strict';
const $ = require('jquery');
const $nav = $('#nav');
const $top = $('#top');
const $match_target = $('#match-target');
const $chat_target = $('#chat-target');
const top_html = '<h4>部屋一覧</h4><div id="room-list"></div><div id="make-room"><h4>新しい部屋を作る</h4><form>'
              +'<div class="form-group">'
              +'  <label for="player-name">プレーヤー名（最大10文字）</label>'
              +'  <input type="text" class="form-control" id="player-name" maxlength="10">'
              +'</div>'
              +'<div class="form-group">'
              +'  <label for="room-name">部屋の名前（最大15文字）</label>'
              +'  <input type="text" class="form-control" id="room-name" maxlength="15">'
              +'</div>'
              +'<button class="btn btn-primary" id="make-room-button">部屋を作る</button>'
              +'</form></div>';

//TODO : replace url
const socket = require('socket.io-client')('https://node-study-kfjmr0.c9users.io:8080/');//, {'sync disconnect on unload': true });

socket.on('roomList', (data) => {
    //$top.text('接続されました');
    //$top.text(data.loadavg.toString());
    //$top.text(data.roomList.toString());
    
    $top.html(top_html);
    
    var $roomList = $('#room-list');
    if (data.roomList) {
        data.roomList.forEach((room) => {
            $roomList.prepend('<div class="panel panel-default"><div class="panel-heading">' + room.name + '</div><div class="panel-body">' 
                + room.number + '人　 RM:' + room.rm + '</div><button class="btn btn-primary enter-room-button" data-id="123">部屋に入る</button></div>');
        });
    }
    //$('#make-room-button').click();

});

/*
socket.on('server-status', (data) => {
  $top.text(data.loadavg.toString());
});
*/

socket.on('a', (data) => {
    
});