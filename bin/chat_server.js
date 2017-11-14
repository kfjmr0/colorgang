'use strict';
var io;
const MAX_STORED_CHAT = 10;
const storedChatList = [];

function setSocket(io, socket, playerRoomList, roomStateList) {
    io = io;
    socket.on('speak', (data) => {
        
    });
}

function emitEnterRoom(room, player_name, socket, roomStateList) {
    //TODO send room member list and stored chat to new comer
    socket.emit('enterRoom', {
        memberList: roomStateList[room.id].memberList
    });
    
    //TODO send message to room member noticing new comer
    io.sockets.to(room.id).emit('newComer', (data) => {
        member_name: player_name
    });
    
}
module.exports = {
    setSocket: setSocket,
    emitEnterRoom: emitEnterRoom
}