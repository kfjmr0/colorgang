'use strict';

function isValidSocketId(io, socket, playerRoomList, roomStateList) {
    if (playerRoomList[socket.id]) {
      let room_id = playerRoomList[socket.id].room_id;
      if (!roomStateList[room_id]) {
          redirectTopPage(socket);
          return false;
      }
    } else {
        redirectTopPage(socket);
        return false;
    }
    
    return true;
}

function redirectTopPage(socket) {
  socket.emit('enterTopPage', {
    hasFailedToValidate: true,
    roomMap: {},
    loadavg: '',
    memory_utilization: ''
  });
}

module.exports = {
    isValidSocketId: isValidSocketId
};