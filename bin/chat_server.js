'use strict';
const MAX_STORED_CHAT = 10;
const storedChatList = [];

function setSocket(io, socket, playerRoomList, roomStateList) {
    socket.on('speak', (data) => {
        
    });
}

function emitEnterRoom(room, player_name, socket, roomStateList) {
    //TODO send room member list and stored chat to new comer
    socket.emit('enterRoom', {
        memberList: roomStateList[room.id].memberList
    });
    
    //TODO send message to room member noticing new comer
    
}
module.exports = {
    setSocket: setSocket,
    emitEnterRoom: emitEnterRoom
}