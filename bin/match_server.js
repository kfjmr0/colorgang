'use strict';
const BOMB_NUM = 3;
const FIRE_RANGE = 2;
const V_CELL_NUM = 11;
const H_CELL_NUM = 13;
const MOVE_SPEED = 1.0 / 3.0;
const COLOR_LIST = ['deeppink', 'mediumblue', 'lime', 'orange'];
const STATE = {
    plain: 0,
    first_color: 1,
    second_color: 2,
    third_color: 3,
    forth_color: 4
}

var matchStateList = [];
const isDev = true;
const dummyIdList = ['1', '2', '3'];
const dummyNameList = ['dummy1', 'dummy2', 'dummy3'];

function emitEnterMatch(io, socket, room, roomStateList) {
    io.sockets.connected[socket.id].emit('enterMatch', {
      // TODO null check
      battle_mode: roomStateList[room.id].battle_mode,
      participatingList: roomStateList[room.id].participatingNameList
    });
    
    if (isDev) {
        roomStateList[room.id].participatingIdList = dummyIdList;
        roomStateList[room.id].participatingNameList = dummyNameList;
    }
}

function setSocket(io, socket, playerRoomList, roomStateList) {
    
    
    socket.on('askForModeChange', (data) => {
        // TODO null check
        var room_id = playerRoomList[socket.id].room_id;
        
        if (socket.id !== roomStateList[room_id].room_master || roomStateList[room_id].hasStarted) {
            return false;
        }
        //console.log('mode change '+ data.battle_mode);
        switch(data.battle_mode) {
            case 'twoOnTwo':
                //TODO process for tag-team
                roomStateList[room_id].teamAIdList = [];
            case 'fourMen':
            case 'oneOnOne':
                roomStateList[room_id].battle_mode = data.battle_mode;
                io.sockets.in(room_id).emit('modeChange', {battle_mode: data.battle_mode});
                break;
            default:
                return false;
        }
    });
    
    socket.on('participateJoin', (data) => {
        // TODO null check
        
        var room_id = playerRoomList[socket.id].room_id;
        if (roomStateList[room_id].hasStarted) { return false; }
        var battle_mode = roomStateList[room_id].battle_mode;
        
        // add member to list
        switch(battle_mode) {
            case 'fourMen':
                if (roomStateList[room_id].participatingIdList.length >= 4 ||
                    roomStateList[room_id].participatingIdList.indexOf(socket.id) >= 0) { return false; }
                roomStateList[room_id].participatingIdList.push(socket.id);
                roomStateList[room_id].participatingNameList.push(playerRoomList[socket.id].name);
                
                emitParticipatingListChange(io, socket, roomStateList, room_id);
                break;
            case 'oneOnOne':
                if (roomStateList[room_id].participatingIdList.length >= 2 ||
                    roomStateList[room_id].participatingIdList.indexOf(socket.id) >= 0) { return false; }
                roomStateList[room_id].participatingIdList.push(socket.id);
                roomStateList[room_id].participatingNameList.push(playerRoomList[socket.id].name);
                
                emitParticipatingListChange(io, socket, roomStateList, room_id);
                break;
            case 'twoOnTwo':
                //TODO
                
                io.sockets.in(room_id).emit('participatingListChange', {
                    
                    // teamA list and teamB list
                });
                break;
            default:
                return false;
        }
    });
    
    socket.on('participateCancel', (data) => {
        //TODO null check

        var room_id = playerRoomList[socket.id].room_id;
        if (roomStateList[room_id].hasStarted) { return false; }
        var battle_mode = roomStateList[room_id].battle_mode;
        
        // remove member from list
        switch(battle_mode) {
            case 'fourMen':
                var index = roomStateList[room_id].participatingIdList.indexOf(socket.id);
                if (index < 0) { return false; }
                roomStateList[room_id].participatingIdList.splice(index, 1);
                roomStateList[room_id].participatingNameList.splice(index, 1);
                
                emitParticipatingListChange(io, socket, roomStateList, room_id);
                break;
            case 'oneOnOne':
                var index = roomStateList[room_id].participatingIdList.indexOf(socket.id);
                if (index < 0) { return false; }
                roomStateList[room_id].participatingIdList.splice(index, 1);
                roomStateList[room_id].participatingNameList.splice(index, 1);
                
                emitParticipatingListChange(io, socket, roomStateList, room_id);
                break;
            case 'twoOnTwo':
                //TODO
                
                io.sockets.in(room_id).emit('participatingListChange', {
                    
                    // teamA list and teamB list
                    
                });
                break;
            default:
                return false;
        }

    });
    
    socket.on('askForMatchStart', (data) => {
        //TODO null check
        
        //TODO check if valid participants numbers
        
        var room_id = playerRoomList[socket.id].room_id;
        if (socket.id !== roomStateList[room_id].room_master || roomStateList[room_id].hasStarted) {
            return false;
        }
        
        
        //TODO prepare variables for match
        matchStateList[room_id] = {
            players: [],
            cellState: [],
            bombs : [],
        };
        
        switch (roomStateList[room_id].battle_mode) {
            case 'fourMen':
                setTopLeftPerson(matchStateList[room_id].players, COLOR_LIST[0], roomStateList[room_id].participatingNameList[0]);
                setTopRightPerson(matchStateList[room_id].players, COLOR_LIST[1], roomStateList[room_id].participatingNameList[1]);
                setDownLeftPerson(matchStateList[room_id].players, COLOR_LIST[2], roomStateList[room_id].participatingNameList[2]);
                setDownRightPerson(matchStateList[room_id].players, COLOR_LIST[3], roomStateList[room_id].participatingNameList[3]);
                break;
            case 'oneOnOne':
                 
                break;
            case 'twoOnTwo':
                 
                break;
            default:
                return false;
        }
        
        
        for (let i = 0; i < H_CELL_NUM; i++) {
            matchStateList[room_id].cellState[i] = [];
            for (let j = 0; j < V_CELL_NUM; j++) {
                let isBlock = false;
                if (i % 2 === 1 && j % 2 === 1) {
                    isBlock = true;
                }
                matchStateList[room_id].cellState[i][j] = {
                    color : STATE.plain,
                    isBlock: isBlock,
                    bomb_index: null
                }
            }
        }
        
        
        
        
        io.sockets.in(room_id).emit('matchReady', {
            // eash player's color and position
            players: matchStateList[room_id].players
        });
        
        //TODO 3 seconds later and make hasStarted true
        io.sockets.in(room_id).emit('matchStart', {});
        bindDuringPlaySocket(io, socket, playerRoomList, roomStateList);
    });
    
    
}

function bindDuringPlaySocket(io, socket, playerRoomList, roomStateList) {
    socket.on('askForMove', onAskForMove);
    //for remove
    //socket.removeListener('askForMove', onAskForMove);
    
    
    function onAskForMove(data) {
        //TODO null check
        //TODO room check
        
        var room_id = playerRoomList[socket.id].room_id;
        var player_index = roomStateList[room_id].participatingIdList.indexOf(socket.id);
        
        switch (data.direction) {
            case 'up':
                if (!isMovable([0, -1], room_id, player_index)) { return false; }
                matchStateList[room_id].players[player_index].y -= MOVE_SPEED;
                matchStateList[room_id].players[player_index].j = Math.floor(matchStateList[room_id].players[player_index].y);
                matchStateList[room_id].players[player_index].x = matchStateList[room_id].players[player_index].i + 0.5;
                break;
            case 'down':
                if (!isMovable([0, 1], room_id, player_index)) { return false; }
                matchStateList[room_id].players[player_index].y += MOVE_SPEED;
                matchStateList[room_id].players[player_index].j = Math.floor(matchStateList[room_id].players[player_index].y);
                matchStateList[room_id].players[player_index].x = matchStateList[room_id].players[player_index].i + 0.5;
                break;
            case 'left':
                if (!isMovable([-1, 0], room_id, player_index)) { return false; }
                matchStateList[room_id].players[player_index].x -= MOVE_SPEED;
                matchStateList[room_id].players[player_index].i = Math.floor(matchStateList[room_id].players[player_index].x);
                matchStateList[room_id].players[player_index].y = matchStateList[room_id].players[player_index].j + 0.5;
                break;
            case 'right':
                if (!isMovable([1, 0], room_id, player_index)) { return false; }
                matchStateList[room_id].players[player_index].x += MOVE_SPEED;
                matchStateList[room_id].players[player_index].i = Math.floor(matchStateList[room_id].players[player_index].x);
                matchStateList[room_id].players[player_index].y = matchStateList[room_id].players[player_index].j + 0.5;
                break;
            default:
                return false;
        }
        
        io.sockets.in(room_id).emit('moveCharacter', {
            player_index: player_index,
            x: matchStateList[room_id].players[player_index].x,
            y: matchStateList[room_id].players[player_index].y,
            direction: data.direction
        });
        
        
        
    }

    
    function onAskForSetBomb(data) {
        
    }
}

function isMovable(direction, room_id, index) {
    let new_i = matchStateList[room_id].players[index].i + direction[0];
    let new_j = matchStateList[room_id].players[index].j + direction[1];
    if (new_i < 0 || new_i >= H_CELL_NUM || new_j < 0 || new_j >= V_CELL_NUM ||
        matchStateList[room_id].cellState[new_i][new_j].isBlock) {
        return false;
    }
    
    // TODO check bomb existence
    return true;
}

function emitParticipatingListChange(io, socket, roomStateList, room_id) {
    console.log('participating battle mode ' +roomStateList[room_id].battle_mode+ ' participatingList '+ roomStateList[room_id].participatingNameList);
    io.sockets.in(room_id).emit('participatingListChange', {
        battle_mode: roomStateList[room_id].battle_mode,
        participatingList: roomStateList[room_id].participatingNameList
    });
}

function setTopLeftPerson (players, color, name) {
    players.push({
        name: name,
        color: color,
        x: 0.5,
        y: 0.5,
        i: 0,
        j: 0,
        bomb_num: 3
    });
}

function setTopRightPerson(players, color, name) {
    players.push({
        name: name,
        color: color,
        x: H_CELL_NUM - 0.5,
        y: 0.5,
        i: H_CELL_NUM - 1,
        j: 0,
        bomb_num: 3
    });
}

function setDownLeftPerson(players, color, name) {
    players.push({
        name: name,
        color: color,
        x: 0.5,
        y: V_CELL_NUM - 0.5,
        i: 0,
        j: V_CELL_NUM - 1,
        bomb_num: 3
    });
}

function setDownRightPerson(players, color, name) {
    players.push({
        name: name,
        color: color,
        x: H_CELL_NUM - 0.5,
        y: V_CELL_NUM - 0.5,
        i: H_CELL_NUM - 1,
        j: V_CELL_NUM - 1,
        bomb_num: 3
    });
}


module.exports = {
    setSocket: setSocket,
    emitEnterMatch: emitEnterMatch
}