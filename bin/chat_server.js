'use strict';
const common = require('./common');

const MAX_STORED_CHAT = 20;
const storedChatListMap = {};

function setSocket(io, socket, playerRoomList, roomStateList) {
    socket.on('speak', (data) => {
        // check socket.id and room_id/ implement isValidSocketId()??/make browser re-render top-page
        if (!common.isValidSocketId(io, socket, playerRoomList, roomStateList)) { return false; }
        
        var room_id = playerRoomList[socket.id].room_id;
        var name = playerRoomList[socket.id].name;
        var content;
        if (!data.content || typeof data.content !== "string") {
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
        //console.log(chat_message);
        io.sockets.in(room_id).emit('someoneSpeak', chat_message);
    });
}

function createChatStorage(room_id) {
    storedChatListMap[room_id] = [];
}

function deleteChatStorage(room_id) {
    delete storedChatListMap[room_id];
}

function emitEnterChat(io, socket, room, roomStateList, player_name) {
    //send room member list and stored chat to new comer
    var enter_message = { name: player_name, content: '入室しました' };
    pushChatList(enter_message, room.id);
    
    socket.emit('enterChat', {
        memberList: roomStateList[room.id].memberList,
        chatList: storedChatListMap[room.id]
    });
    
    //send message to room member noticing new comer
    socket.broadcast.in(room.id).emit('newComer', {
        member_name: player_name
    });
}

function emitLeaveRoom(io, socket, room_id, roomStateList, player_name) {
    //send message to room member noticing someone leave
    var leave_message = { name: player_name, content: '退室しました' };
    //console.log(leave_message + ' : ' + room_id);
    pushChatList(leave_message, room_id);
    socket.broadcast.in(room_id).emit('someoneLeave', {
        member_name: player_name,
        memberList: roomStateList[room_id].memberList
    });
}



function pushChatList(message, room_id) {
    if (!storedChatListMap[room_id]) {
        return false;
    }
    storedChatListMap[room_id].push(message);
    if (storedChatListMap[room_id].length > MAX_STORED_CHAT) {
        storedChatListMap[room_id].shift();
    }
}

module.exports = {
    setSocket: setSocket,
    createChatStorage: createChatStorage,
    deleteChatStorage: deleteChatStorage,
    emitEnterChat: emitEnterChat,
    emitLeaveRoom: emitLeaveRoom
};