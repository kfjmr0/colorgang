'use strict';
const MAX_STORED_CHAT = 10;
const storedChatList = [];

function setSocket(io, socket, playerRoomList, roomStateList) {
    socket.on('speak', (data) => {
        // TODO null check/ implement isValidSocketId()??
        var room_id = playerRoomList[socket.id].room_id;
        var name = playerRoomList[socket.id].name;
        var content;
        if (!data.content) {
            console.log('content does not exist');
            return false;
        } else {
            content = data.content.trim();
            if (!content || content.length > 140) {
                return false;
            }
        }
        var chat_message = { name: name, content: content };
        pushChatList(chat_message);
        
        //console.log(room_id + ' ' + name);
        console.log(chat_message);
        io.sockets.in(room_id).emit('someoneSpeak', chat_message);
    });
}

function emitEnterRoom(room, player_name, socket, roomStateList, io) {
    //TODO send room member list and stored chat to new comer
    var enter_message = { name: player_name, content: '入室しました' };
    pushChatList(enter_message);
    
    socket.emit('enterRoom', {
        memberList: roomStateList[room.id].memberList,
        chatList: storedChatList
    });
    
    //TODO send message to room member noticing new comer
    socket.broadcast.to(room.id).emit('newComer', {
        member_name: player_name
    });
    
}

function pushChatList(message) {
    storedChatList.push(message);
    if (storedChatList.length > MAX_STORED_CHAT) {
        storedChatList.shift();
    }
}

module.exports = {
    setSocket: setSocket,
    emitEnterRoom: emitEnterRoom
}