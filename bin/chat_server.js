'use strict';
const MAX_STORED_CHAT = 20;
const storedChatListMap = {};

function setSocket(io, socket, playerRoomList, roomStateList) {
    socket.on('speak', (data) => {
        // TODO null check/ implement isValidSocketId()??/make browser re-render top-page
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
        pushChatList(chat_message, room_id);
        
        //console.log(room_id + ' ' + name);
        console.log(chat_message);
        io.sockets.in(room_id).emit('someoneSpeak', chat_message);
    });
}

function createChatStorage(room_id) {
    storedChatListMap[room_id] = [];
}

function emitEnterChat(io, socket, room, roomStateList, player_name) {
    //TODO send room member list and stored chat to new comer
    var enter_message = { name: player_name, content: '入室しました' };
    pushChatList(enter_message, room.id);
    
    socket.emit('enterChat', {
        memberList: roomStateList[room.id].memberList,
        chatList: storedChatListMap[room.id]
    });
    
    //TODO send message to room member noticing new comer
    socket.broadcast.to(room.id).emit('newComer', {
        member_name: player_name
    });
    
}

function pushChatList(message, room_id) {
    storedChatListMap[room_id].push(message);
    if (storedChatListMap[room_id].length > MAX_STORED_CHAT) {
        storedChatListMap[room_id].shift();
    }
}

module.exports = {
    setSocket: setSocket,
    createChatStorage: createChatStorage,
    emitEnterChat: emitEnterChat
};