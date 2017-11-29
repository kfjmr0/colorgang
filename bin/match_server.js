'use strict';
const common = require('./common');

const BOMB_NUM = 3;
const FIRE_RANGE = 2;
const V_CELL_NUM = 11;
const H_CELL_NUM = 13;
const MOVE_SPEED = 1.0 / 3.0;
const TIME_TO_EXPLODE = 3000;
const PLAY_TIMEsec = 2 * 60;

const COLOR_LIST = ['deeppink', 'mediumblue', 'lime', 'orange'];
const STATE = {
    first_color: 0,
    second_color: 1,
    third_color: 2,
    forth_color: 3,
    plain: 4,
    hasFailed: 5
}

var matchStateList = [];

const isDev = false;
const dummyIdList = ['1', '2', '3'];
const dummyNameList = ['dummy1', 'dummy2', 'dummy3'];


function emitEnterMatch(io, socket, room, roomStateList, playerRoomList) {
    io.sockets.connected[socket.id].emit('enterMatch', {
      battle_mode: roomStateList[room.id].battle_mode,
      participatingList: roomStateList[room.id].participatingNameList
    });
    
    io.sockets.connected[socket.id].emit('modeChange', {
      battle_mode: roomStateList[room.id].battle_mode,
    });
    
    switch (roomStateList[room.id].battle_mode) {
        case 'fourMen':
        case 'oneOnOne':
            io.sockets.connected[socket.id].emit('participatingListChange', {
                battle_mode: roomStateList[room.id].battle_mode,
                participatingList: roomStateList[room.id].participatingNameList
            });
            break;
        case 'twoOnTwo':
            io.sockets.connected[socket.id].emit('participatingListChange', {
                battle_mode: roomStateList[room.id].battle_mode,
                teamAList: roomStateList[room.id].teamANameList,
                teamBList: roomStateList[room.id].teamBNameList
            });
            break;
        default:
            return false;
    }
    
    if (isDev) {
        roomStateList[room.id].participatingIdList = dummyIdList;
        roomStateList[room.id].participatingNameList = dummyNameList;
    }
}

function setSocket(io, socket, playerRoomList, roomStateList) {
    
    
    socket.on('askForModeChange', (data) => {
        if (!common.isValidSocketId(io, socket, playerRoomList, roomStateList)) { return false; }
        
        var room_id = playerRoomList[socket.id].room_id;
        if (socket.id !== roomStateList[room_id].room_master || roomStateList[room_id].hasStarted) {
            return false;
        }
        //console.log('mode change '+ data.battle_mode);
        emptyParticipatingList(room_id, roomStateList);
        switch(data.battle_mode) {
            case 'twoOnTwo':
                roomStateList[room_id].battle_mode = data.battle_mode;
                io.sockets.in(room_id).emit('modeChange', {battle_mode: data.battle_mode});
                io.sockets.in(room_id).emit('participatingListChange', {
                    battle_mode: roomStateList[room_id].battle_mode,
                    teamAList: roomStateList[room_id].teamANameList,
                    teamBList: roomStateList[room_id].teamBNameList
                });
                break;
            case 'fourMen':
            case 'oneOnOne':
                roomStateList[room_id].battle_mode = data.battle_mode;
                io.sockets.in(room_id).emit('modeChange', {battle_mode: data.battle_mode});
                emitParticipatingListChange(io, socket, roomStateList, room_id);
                break;
            default:
                return false;
        }
    });
    
    socket.on('participateJoin', (data) => {
        if (!common.isValidSocketId(io, socket, playerRoomList, roomStateList)) { return false; }
        
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
                if (data && data.team) { 
                    var team = data.team; 
                } else {
                    return false;
                }
                //console.log('team : ' + data.team);
                if (team === 'A') {
                    if (roomStateList[room_id].teamAIdList.length >=2 ||
                        roomStateList[room_id].teamAIdList.indexOf(socket.id) >= 0 ||
                        roomStateList[room_id].teamBIdList.indexOf(socket.id) >= 0 ) {return false;}
                            roomStateList[room_id].teamAIdList.push(socket.id);
                            roomStateList[room_id].teamANameList.push(playerRoomList[socket.id].name);
                            //roomStateList[room_id].participatingIdList.push(socket.id);
                            //roomStateList[room_id].participatingNameList.push(playerRoomList[socket.id].name);
                } else if (team ==='B') {
                    if (roomStateList[room_id].teamBIdList.length >=2 ||
                        roomStateList[room_id].teamAIdList.indexOf(socket.id) >= 0 ||
                        roomStateList[room_id].teamBIdList.indexOf(socket.id) >= 0 ) {return false;}
                            roomStateList[room_id].teamBIdList.push(socket.id);
                            roomStateList[room_id].teamBNameList.push(playerRoomList[socket.id].name);
                            //roomStateList[room_id].participatingIdList.push(socket.id);
                            //roomStateList[room_id].participatingNameList.push(playerRoomList[socket.id].name);
                } else {
                    return false;
                }
                io.sockets.in(room_id).emit('participatingListChange', {
                    battle_mode: roomStateList[room_id].battle_mode,
                    teamAList: roomStateList[room_id].teamANameList,
                    teamBList: roomStateList[room_id].teamBNameList
                });
                break;
            default:
                return false;
        }
    });
    
    socket.on('participateCancel', (data) => {
        if (!common.isValidSocketId(io, socket, playerRoomList, roomStateList)) { return false; }

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
                let a_index = roomStateList[room_id].teamAIdList.indexOf(socket.id);
                let b_index = roomStateList[room_id].teamBIdList.indexOf(socket.id);
                if (a_index >= 0) {
                    roomStateList[room_id].teamAIdList.splice(a_index, 1);
                    roomStateList[room_id].teamANameList.splice(a_index, 1);
                    //roomStateList[room_id].participatingIdList.splice(roomStateList[room_id].participatingIdList.indexOf(socket.id), 1);
                    //roomStateList[room_id].participatingNameList.splice(roomStateList[room_id].participatingIdList.indexOf(socket.id), 1);
                } else if (b_index >= 0) {
                    roomStateList[room_id].teamBIdList.splice(b_index, 1);
                    roomStateList[room_id].teamBNameList.splice(b_index, 1);
                    //roomStateList[room_id].participatingIdList.splice(roomStateList[room_id].participatingIdList.indexOf(socket.id), 1);
                    //roomStateList[room_id].participatingNameList.splice(roomStateList[room_id].participatingIdList.indexOf(socket.id), 1);
                } else {
                    return false;
                }
                
                io.sockets.in(room_id).emit('participatingListChange', {
                    battle_mode: roomStateList[room_id].battle_mode,
                    teamAList: roomStateList[room_id].teamANameList,
                    teamBList: roomStateList[room_id].teamBNameList
                });
                break;
            default:
                return false;
        }

    });
    
    // ----- socket.on askForMatchStart start ----- //
    socket.on('askForMatchStart', (data) => {
        //console.log('on askForMatchStart');
        if (!common.isValidSocketId(io, socket, playerRoomList, roomStateList)) { return false; }
        
        var room_id = playerRoomList[socket.id].room_id;
        if (socket.id !== roomStateList[room_id].room_master || roomStateList[room_id].hasStarted) {
            //console.log('hes not room master or game has alredy started');
            return false;
        }
        
        if (!isValidParticipantsNumber(room_id, roomStateList)) { 
            //console.log('participating number is illegal');
            return false;
        }
        
        matchStateList[room_id] = {
            players: [],
            cellState: [],
            bombs : {},
            bomb_count: 0,
            paintedCells: {},
            obtainedCells: {},
            tmpMatrix: []
        };
        
        //console.log('onAskForMatchStart');
        //console.log(matchStateList[room_id].players);
        
        switch (roomStateList[room_id].battle_mode) {
            case 'fourMen':
                setTopLeftPerson(matchStateList[room_id].players, STATE.first_color, roomStateList[room_id].participatingNameList[0]);
                setTopRightPerson(matchStateList[room_id].players, STATE.second_color, roomStateList[room_id].participatingNameList[1]);
                setDownLeftPerson(matchStateList[room_id].players, STATE.third_color, roomStateList[room_id].participatingNameList[2]);
                setDownRightPerson(matchStateList[room_id].players, STATE.forth_color, roomStateList[room_id].participatingNameList[3]);
                break;
            case 'oneOnOne':
                setTopLeftPerson(matchStateList[room_id].players, STATE.first_color, roomStateList[room_id].participatingNameList[0]);
                setDownRightPerson(matchStateList[room_id].players, STATE.second_color, roomStateList[room_id].participatingNameList[1]);
                break;
            case 'twoOnTwo':
                //teamA number one/top left
                roomStateList[room_id].participatingIdList[0] = roomStateList[room_id].teamAIdList[0];
                roomStateList[room_id].participatingNameList[0] = roomStateList[room_id].teamANameList[0];
                
                //teamB number one/top right
                roomStateList[room_id].participatingIdList[1] = roomStateList[room_id].teamBIdList[0];
                roomStateList[room_id].participatingNameList[1] = roomStateList[room_id].teamBNameList[0];
                
                //teamB number two/down left
                roomStateList[room_id].participatingIdList[2] = roomStateList[room_id].teamBIdList[1];
                roomStateList[room_id].participatingNameList[2] = roomStateList[room_id].teamBNameList[1];
                
                //teamA number two/down right
                roomStateList[room_id].participatingIdList[3] = roomStateList[room_id].teamAIdList[1];
                roomStateList[room_id].participatingNameList[3] = roomStateList[room_id].teamANameList[1];
                
                //console.log(roomStateList[room_id].participatingIdList);
                //console.log(roomStateList[room_id].participatingNameList);
                
                setTopLeftPerson(matchStateList[room_id].players, STATE.first_color, roomStateList[room_id].participatingNameList[0]);
                setTopRightPerson(matchStateList[room_id].players, STATE.second_color, roomStateList[room_id].participatingNameList[1]);
                setDownLeftPerson(matchStateList[room_id].players, STATE.second_color, roomStateList[room_id].participatingNameList[2]);
                setDownRightPerson(matchStateList[room_id].players, STATE.first_color, roomStateList[room_id].participatingNameList[3]);
                
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
                    bomb_id: null,
                }
            }
        }
        
        
        roomStateList[room_id].hasStarted = true;
        matchStateList[room_id].color_list = createShuffledArray(COLOR_LIST);
        matchStateList[room_id].color_list.push('gray');
        io.sockets.in(room_id).emit('matchReady', {
            players: matchStateList[room_id].players,
            color_list: matchStateList[room_id].color_list
        });
        
        
        setTimeout(() => {
            //bindDuringPlaySocket(io, socket, playerRoomList, roomStateList);
            roomStateList[room_id].participatingIdList.forEach((id) => {
                if (io.sockets.connected[id]) {
                    io.sockets.connected[id].emit('bindKeys', {});
                }
            });
            io.sockets.in(room_id).emit('matchStart', {});
            matchStateList[room_id].match_timer = setTimeout(() => {
                endMatch(io, socket, roomStateList, room_id, false, '');
            }, PLAY_TIMEsec * 1000);
        }, 4000);
        
    });
    // ----- socket.on askForMatchStart end ----- //
    
    
    socket.on('askForMove', onAskForMove);
    socket.on('askForSetBomb', onAskForSetBomb);

    function onAskForMove(data) {
        //console.log('onAskForMove');
        if (!common.isValidSocketId(io, socket, playerRoomList, roomStateList)) { return false; }
        
        var room_id = playerRoomList[socket.id].room_id;
        if (!isParticipants(socket, roomStateList, room_id)) { return false; }
        
        var player_index = roomStateList[room_id].participatingIdList.indexOf(socket.id);
        var player = matchStateList[room_id].players[player_index];
        if (player.isDead) { return false; }
        
        switch (data.direction) {
            case 'up':
                if (isMovable([0, -1], room_id, player_index)) {
                    matchStateList[room_id].players[player_index].y -= MOVE_SPEED;
                    matchStateList[room_id].players[player_index].j = Math.floor(matchStateList[room_id].players[player_index].y);
                    matchStateList[room_id].players[player_index].x = matchStateList[room_id].players[player_index].i + 0.5;
                }
                break;
            case 'down':
                if (isMovable([0, 1], room_id, player_index)) {
                    matchStateList[room_id].players[player_index].y += MOVE_SPEED;
                    matchStateList[room_id].players[player_index].j = Math.floor(matchStateList[room_id].players[player_index].y);
                    matchStateList[room_id].players[player_index].x = matchStateList[room_id].players[player_index].i + 0.5;
                }
                break;
            case 'left':
                if (isMovable([-1, 0], room_id, player_index)) {
                    matchStateList[room_id].players[player_index].x -= MOVE_SPEED;
                    matchStateList[room_id].players[player_index].i = Math.floor(matchStateList[room_id].players[player_index].x);
                    matchStateList[room_id].players[player_index].y = matchStateList[room_id].players[player_index].j + 0.5;
                }
                break;
            case 'right':
                if (isMovable([1, 0], room_id, player_index)) {
                    matchStateList[room_id].players[player_index].x += MOVE_SPEED;
                    matchStateList[room_id].players[player_index].i = Math.floor(matchStateList[room_id].players[player_index].x);
                    matchStateList[room_id].players[player_index].y = matchStateList[room_id].players[player_index].j + 0.5;
                }
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
        if (!common.isValidSocketId(io, socket, playerRoomList, roomStateList)) { return false; }
        
        var room_id = playerRoomList[socket.id].room_id;
        if (!isParticipants(socket, roomStateList, room_id)) { return false; }
        
        var player_index = roomStateList[room_id].participatingIdList.indexOf(socket.id);
        var player = matchStateList[room_id].players[player_index];
        var bomb_id;
        
        if (player.isDead) { return false; }
        if (player.bomb_num <= 0 ||
            matchStateList[room_id].cellState[player.i][player.j].bomb_id !== null) {
            return false;
        } else {
            bomb_id = matchStateList[room_id].bomb_count++;
            matchStateList[room_id].bombs[bomb_id] = {
                player_index: player_index,
                color: player.color,
                i: player.i,
                j: player.j
            };
            matchStateList[room_id].cellState[player.i][player.j].bomb_id = bomb_id;
            player.bomb_num--;
            
            io.sockets.in(room_id).emit('setBomb', {
                bomb_id: bomb_id,
                color: player.color,
                i: player.i,
                j: player.j
            });
            
            matchStateList[room_id].bombs[bomb_id].timer = setTimeout(() => {
                //console.log(room_id);
                explodeBomb(io, socket, roomStateList, room_id, player, bomb_id, false, 'dummy');

            }, TIME_TO_EXPLODE);
            
        }
    }
    
}

function isValidParticipantsNumber(room_id, roomStateList) {
    switch (roomStateList[room_id].battle_mode) {
        case 'fourMen':
            if (roomStateList[room_id].participatingIdList.length === 4) {
                return true;
            } else {
                return false;
            }
        case 'oneOnOne':
            if (roomStateList[room_id].participatingIdList.length === 2) {
                return true;
            } else {
                return false;
            }
        case 'twoOnTwo':
            if (roomStateList[room_id].teamAIdList.length === 2 && roomStateList[room_id].teamBIdList.length === 2) {
                return true;
            } else {
                return false;
            }
        default:
            return false;
    }
}



function endMatch(io, socket, roomStateList, room_id, hasWonByKill, message) {
    clearTimeout(matchStateList[room_id].match_timer);
    // stop bombs timer
    Object.keys(matchStateList[room_id].bombs).forEach((id) => {
        if (matchStateList[room_id].bombs[id]) {
            clearTimeout(matchStateList[room_id].bombs[id].timer);
        }
    });
    
    let result_message = '';
    if (hasWonByKill) {
        result_message = message;
    } else {
        //count points
        matchStateList[room_id].result_points = [0, 0, 0, 0];
        for (let i = 0; i < H_CELL_NUM; i++) {
            for (let j = 0; j < V_CELL_NUM; j++) {
                let cell_color = matchStateList[room_id].cellState[i][j].color;
                if (cell_color === STATE.first_color || cell_color === STATE.second_color
                    || cell_color === STATE.third_color || cell_color === STATE.forth_color) {
                        matchStateList[room_id].result_points[cell_color] += 1;
                }
                //console.log(cell_color);
                //console.log(matchStateList[room_id].result_points);
            }
        }
        
        switch (roomStateList[room_id].battle_mode) {
            case 'fourMen':
                let max = 0;
                let max_point_winners = [];
                matchStateList[room_id].result_points.forEach((val, index) => {
                    if (val === max) {
                        max_point_winners.push(matchStateList[room_id].players[index].name);
                    } else if (val > max) {
                        max = val;
                        max_point_winners = [];
                        max_point_winners.push(matchStateList[room_id].players[index].name);
                    }
                });
                
                if (max_point_winners.length === 4) {
                    result_message = 'Draw !';
                } else {
                    max_point_winners.forEach((name, index) => {
                        result_message += name + ' '; 
                    });
                    result_message += ' Win !';
                }
                break;
            case 'oneOnOne':
                if (matchStateList[room_id].result_points[0] === matchStateList[room_id].result_points[1]) {
                    result_message = 'Draw !';
                } else if (matchStateList[room_id].result_points[0] > matchStateList[room_id].result_points[1]) {
                    result_message += matchStateList[room_id].players[0].name + ' Win !';
                } else {
                    result_message += matchStateList[room_id].players[1].name + ' Win !';
                }
                break;
            case 'twoOnTwo':
                if (matchStateList[room_id].result_points[0] > matchStateList[room_id].result_points[1]) {
                    result_message += 'team A Win !';
                } else if (matchStateList[room_id].result_points[0] < matchStateList[room_id].result_points[1]) {
                    result_message += 'team B Win !';
                } else {
                    result_message += 'Draw !';
                }
                break;
            default:
                break;
        }
    }
    


    io.sockets.in(room_id).emit('matchEnd', {
        hasWonByKill: hasWonByKill,
        result_message: result_message,
        points: matchStateList[room_id].result_points
    });
    
    emptyParticipatingList(room_id, roomStateList);
    
    roomStateList[room_id].hasStarted = false;
    
    //delete match related objects
    delete matchStateList[room_id];
    
}



function isParticipants(socket, roomStateList, room_id) {
    if (roomStateList[room_id].participatingIdList.indexOf(socket.id) < 0) {
        return false;
    } else {
        return true;
    }
}

function isMovable(direction, room_id, index) {
    let new_i = matchStateList[room_id].players[index].i + direction[0];
    let new_j = matchStateList[room_id].players[index].j + direction[1];
    let new_x = matchStateList[room_id].players[index].x + MOVE_SPEED * direction[0];
    let new_y = matchStateList[room_id].players[index].y + MOVE_SPEED * direction[1];
    //console.log(new_i, new_j, new_x, new_y);
    
    if (new_x < 0.4 || new_x > H_CELL_NUM - 0.4 || new_y < 0.4 || new_y > V_CELL_NUM - 0.4) {
        return false;
    }
    
    if (matchStateList[room_id].cellState[new_i] &&
        matchStateList[room_id].cellState[new_i][new_j] &&
        (matchStateList[room_id].cellState[new_i][new_j].isBlock ||
        matchStateList[room_id].cellState[new_i][new_j].bomb_id)) {
            //console.log('can't move!');
            return false;
    }
    
    return true;
}

function explodeBomb(io, socket, roomStateList, room_id, player, bomb_id, isTriggeredByOther, triggeredDirection) {
    let bomb = matchStateList[room_id].bombs[bomb_id];
    let color = player.color;
    let cellState = matchStateList[room_id].cellState;
    let scanningDirections = [[1,0], [-1,0], [0,1], [0,-1]];
    //initialize painted cells
    let paintedCells = matchStateList[room_id].paintedCells;
    paintedCells = {};
    
    //increment bomb count
    player.bomb_num++;
    
    //clear bomb from cells and if exploded by other bombs clear timer
    if (isTriggeredByOther) { clearTimeout(bomb.timer); }
    cellState[bomb.i][bomb.j].bomb_id = null;
    
    io.sockets.in(room_id).emit('explodeBomb', {
        bomb_id: bomb_id,
        //color: player.color
    });
    
    
    //paint cells and check other bomb existence and emit painted cells
    //createTmpMatrix(cellState, matchStateList[room_id].tmpMatrix);
    cellState[bomb.i][bomb.j].color = color;
    if (!paintedCells[color]) { paintedCells[color] = []; }
    paintedCells[color].push([bomb.i, bomb.j]);
    killPersonIn(bomb.i, bomb.j, io, socket, room_id, roomStateList);
    
    scanningDirections.forEach((direction) => {
        if ( isTriggeredByOther
          && direction[0] === - triggeredDirection[0]
          && direction[1] === - triggeredDirection[1]) {
            return false;
        }
        
        for (let n = 1; n <= FIRE_RANGE; n++) {
            let ni = bomb.i + n * direction[0];
            let nj = bomb.j + n * direction[1];
            //console.log(ni,nj);
            if (ni < 0 || ni >= H_CELL_NUM || nj < 0 || nj >= V_CELL_NUM) {
                break;
            }
            
            
            // if the other bombs exist in the explosion range, detonate it
            if (cellState[ni][nj].bomb_id) {
                let bomb_id = cellState[ni][nj].bomb_id;
                let player_index = matchStateList[room_id].bombs[bomb_id].player_index;
                explodeBomb(io, socket, roomStateList, room_id, matchStateList[room_id].players[player_index], bomb_id, true, [direction[0], direction[1]]);
                break;
            }
            
            killPersonIn(ni, nj, io, socket, room_id, roomStateList);

            cellState[ni][nj].color = color;
            paintedCells[color].push([ni, nj]);
            
            //fire stop at block
            if (cellState[ni][nj].isBlock) { return false; }
        }
        
    });
    
    io.sockets.in(room_id).emit('cellsPainted', {
        paintedCells: paintedCells
    });
    
    //evaluate enclosed cells and emit those
    evaluateEnclosure(paintedCells, room_id);
    
    //console.log('haaa?' + matchStateList[room_id].obtainedCells);
    Object.keys(matchStateList[room_id].obtainedCells).forEach((color) => {
        //console.log(matchStateList[room_id].obtainedCells[color]);
        if (matchStateList[room_id].obtainedCells[color].length > 0) {
            matchStateList[room_id].obtainedCells[color].forEach((enclosedCells) => {
                enclosedCells.forEach((position) => {
                    // keys from object is string type??
                    matchStateList[room_id].cellState[position[0]][position[1]].color = parseInt(color, 10);
                });
            });
            
            io.sockets.in(room_id).emit('cellsObtained', {
                color: color,
                obtainedCells: matchStateList[room_id].obtainedCells[color]
            });
        }
    });
    
    
    //delete bomb object
    delete matchStateList[room_id].bombs[bomb_id];
    
    // judge after a series of explosion
    if (!isTriggeredByOther) {
        // end match if the only one person or team is left, or no one is left
        judgeWhetherEndMatch(io, socket, room_id, roomStateList);
    }
    
}

function killPersonIn(ni, nj, io, socket, room_id, roomStateList) {
    matchStateList[room_id].players.forEach((player, index) => {
        if (ni === player.i && nj === player.j) {
            player.isDead = true;
            
            io.sockets.in(room_id).emit('someoneDied', {
                index: index
            });
            
            if (roomStateList[room_id].participatingIdList[index]) {
                io.sockets.connected[roomStateList[room_id].participatingIdList[index]].emit('youDied', {});
            }
            
        }
    });

}

function judgeWhetherEndMatch(io, socket, room_id, roomStateList) {
    switch (roomStateList[room_id].battle_mode) {
        case 'fourMen':
        case 'oneOnOne':
            let number = 0;
            let last_index;
            matchStateList[room_id].players.forEach((player, index) => {
                if (!player.isDead) {
                    number++;
                    last_index = index;
                }
            });
            if (number === 1) {
                let result_message = matchStateList[room_id].players[last_index].name + ' Win !';
                endMatch(io, socket, roomStateList, room_id, true, result_message);
            }
            if (number === 0) {
                endMatch(io, socket, roomStateList, room_id, false, '');
            }
            break;
        case 'twoOnTwo':
            let teamAnumber = 0;
            let teamBnumber = 0;
            matchStateList[room_id].players.forEach((player) => {
                if (!player.isDead) {
                    if (player.color === STATE.first_color) {
                        teamAnumber++;
                    } else if (player.color === STATE.second_color) {
                        teamBnumber++;
                    }
                }
            });
            if (teamAnumber !== 0 && teamBnumber === 0) {
                endMatch(io, socket, roomStateList, room_id, true, 'team A Win !');
            } else if (teamAnumber === 0 && teamBnumber !== 0) {
                endMatch(io, socket, roomStateList, room_id, true, 'team B Win !');
            } else if (teamAnumber === 0 && teamBnumber === 0) {
                endMatch(io, socket, roomStateList, room_id, false, '');
            }
            break;
        default:
            return false;
    }
}

function evaluateEnclosure(paintedCells, room_id) {
    matchStateList[room_id].obtainedCells = {};
    
    //console.log(paintedCells);
    Object.keys(paintedCells).forEach((color) => {
        matchStateList[room_id].obtainedCells[color] = [];
        createTmpMatrix(matchStateList[room_id].cellState, matchStateList[room_id].tmpMatrix);
        
        paintedCells[color].forEach((position) => {
            for (let i = -1; i < 2; i++) {
                for (let j = -1; j < 2; j++) {
                    if (Math.abs(i) + Math.abs(j) !== 1) { continue; }
                    let next_i = position[0] + i;
                    let next_j = position[1] + j;
                    if (next_i <= 0 || next_i >= H_CELL_NUM -1 || next_j <= 0 || next_j >= V_CELL_NUM -1) { continue; }
                    if (matchStateList[room_id].cellState[next_i][next_j].color !== parseInt(color, 10)
                        && matchStateList[room_id].tmpMatrix[next_i][next_j] >= 0) {
                        //console.log(matchStateList[room_id].cellState[next_i][next_j].color);
                        //console.log(typeof matchStateList[room_id].cellState[next_i][next_j].color);
                        //console.log(color);
                        //console.log(typeof color)
                        
                        matchStateList[room_id].obtainedCells[color].push([]);
                        checkPeriphery(next_i, next_j, matchStateList[room_id].obtainedCells[color], matchStateList[room_id].cellState, matchStateList[room_id].tmpMatrix, parseInt(color, 10));
                    }
                }
            }
        });
    });
    
    /*
    Object.keys(matchStateList[room_id].obtainedCells).forEach((color) => {
        //console.log(color);
        //console.log(matchStateList[room_id].obtainedCells[color]);
        matchStateList[room_id].obtainedCells[color].forEach((cells) => {
            cells.forEach((position) => {
                //console.log(position);
            });
        });
    });
    */
};

function checkPeriphery(n, m, obtainedCells, cellState, tmpMatrix, color) {
    if (tmpMatrix[n][m] === STATE.hasFailed
        || (cellState[n][m].color !== color && (n - 1 < 0 || n + 1 >= H_CELL_NUM || m - 1 < 0 || m + 1 >= V_CELL_NUM))) {
            obtainedCells[obtainedCells.length - 1].forEach((position) => {
                tmpMatrix[position[0]][position[1]] = STATE.hasFailed;
                
            });
            obtainedCells.pop();
            //console.log('fail ' + n +' '+ m);
            //console.log(obtainedCells);
            return false;
    }
    
    obtainedCells[obtainedCells.length - 1].push([n, m]);
    tmpMatrix[n][m] = -1;
    //console.log('push ' + n +' '+ m);
    //console.log(obtainedCells);
    
    for (let i = -1; i < 2; i++) {
        for (let j = -1; j < 2; j++) {
            if ( Math.abs(i) + Math.abs(j) !== 1 ) { continue; }
            //console.log('debug0: i' + i + ' j '+ j + ' tmpMatrix[n + i][m + j] ' + tmpMatrix[n + i][m + j] + ' cellState[n + i][m + j].color ' +  cellState[n + i][m + j].color);
            if (tmpMatrix[n + i][m + j] >= 0
                && cellState[n + i][m + j].color !== color) {
                    if (!checkPeriphery(n + i, m + j, obtainedCells, cellState, tmpMatrix, color)) {
                        //console.log('debug1: checkPeriphery false');
                        return false;
                    }
            }
        }
    }
    //console.log("return true");
    return true;
};


function emitParticipatingListChange(io, socket, roomStateList, room_id) {
    //console.log('participating battle mode ' +roomStateList[room_id].battle_mode+ ' participatingList '+ roomStateList[room_id].participatingNameList);
    io.sockets.in(room_id).emit('participatingListChange', {
        battle_mode: roomStateList[room_id].battle_mode,
        participatingList: roomStateList[room_id].participatingNameList
    });
}

function emptyParticipatingList(room_id, roomStateList) {
    roomStateList[room_id].teamAIdList = [];
    roomStateList[room_id].teamANameList = [];
    roomStateList[room_id].teamBIdList = [];
    roomStateList[room_id].teamBNameList = [];
    roomStateList[room_id].participatingIdList = [];
    roomStateList[room_id].participatingNameList = [];
}

function setTopLeftPerson (players, color, name) {
    players.push({
        name: name,
        color: color,
        x: 0.5,
        y: 0.5,
        i: 0,
        j: 0,
        bomb_num: 3,
        isDead: false,
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
        bomb_num: 3,
        isDead: false,
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
        bomb_num: 3,
        isDead: false,
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
        bomb_num: 3,
        isDead: false,
    });
}

function createTmpMatrix(cellState, tmpMatrix) {
    for (let i = 0; i < H_CELL_NUM; i++) {
        tmpMatrix[i] = [];
        for (let j = 0; j < V_CELL_NUM; j++) {
            tmpMatrix[i][j] = cellState[i][j].color;
        }
    }
}

function createShuffledArray(array) {
    let new_array = [];
    new_array = array.slice();
    for(let i = new_array.length - 1; i > 0; i--){
        let r = Math.floor(Math.random() * (i + 1));
        let tmp = new_array[i];
        new_array[i] = new_array[r];
        new_array[r] = tmp;
    }
    return new_array;
}

function postprocessMemberLeaveRoom(io, socket, room_id, roomStateList, playerRoomList) {
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
            let a_index = roomStateList[room_id].teamAIdList.indexOf(socket.id);
            let b_index = roomStateList[room_id].teamBIdList.indexOf(socket.id);
            if (a_index >= 0) {
                roomStateList[room_id].teamAIdList.splice(a_index, 1);
                roomStateList[room_id].teamANameList.splice(a_index, 1);
                //roomStateList[room_id].participatingIdList.splice(roomStateList[room_id].participatingIdList.indexOf(socket.id), 1);
                //roomStateList[room_id].participatingNameList.splice(roomStateList[room_id].participatingIdList.indexOf(socket.id), 1);
            } else if (b_index >= 0) {
                roomStateList[room_id].teamBIdList.splice(b_index, 1);
                roomStateList[room_id].teamBNameList.splice(b_index, 1);
                //roomStateList[room_id].participatingIdList.splice(roomStateList[room_id].participatingIdList.indexOf(socket.id), 1);
                //roomStateList[room_id].participatingNameList.splice(roomStateList[room_id].participatingIdList.indexOf(socket.id), 1);
            } else {
                return false;
            }
            
            io.sockets.in(room_id).emit('participatingListChange', {
                battle_mode: roomStateList[room_id].battle_mode,
                teamAList: roomStateList[room_id].teamANameList,
                teamBList: roomStateList[room_id].teamBNameList
            });
            break;
        default:
            return false;
    }
}

function postprocessRoomMasterLeaveRoom(io, socket, room_id, roomStateList, playerRoomList) {
    if (roomStateList[room_id].hasStarted) {
        if (matchStateList[room_id]) {
            clearTimeout(matchStateList[room_id].match_timer);
            
            Object.keys(matchStateList[room_id].bombs).forEach((id) => {
                if (matchStateList[room_id].bombs[id]) {
                    clearTimeout(matchStateList[room_id].bombs[id].timer);
                }
            });
        }
    }
    
    delete matchStateList[room_id];
}

module.exports = {
    setSocket: setSocket,
    emitEnterMatch: emitEnterMatch,
    postprocessMemberLeaveRoom: postprocessMemberLeaveRoom,
    postprocessRoomMasterLeaveRoom: postprocessRoomMasterLeaveRoom
};