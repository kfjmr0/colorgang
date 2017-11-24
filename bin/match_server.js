'use strict';
const BOMB_NUM = 3;
const FIRE_RANGE = 2;
const V_CELL_NUM = 11;
const H_CELL_NUM = 13;
const MOVE_SPEED = 1.0 / 3.0;
const TIME_TO_EXPLODE = 3000;
const PLAY_TIMEsec = 2 * 60;

//const COLOR_LIST = ['deeppink', 'mediumblue', 'lime', 'orange'];
const STATE = {
    first_color: 0,
    second_color: 1,
    third_color: 2,
    forth_color: 3,
    plain: 4,
    hasOwnProperty: 5
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
            bombs : {},
            bomb_count: 0,
            paintedCells: {},
            obtainedCells: {},
            tmpMatrix: []
        };
        
        switch (roomStateList[room_id].battle_mode) {
            case 'fourMen':
                //
                setTopLeftPerson(matchStateList[room_id].players, STATE.first_color, roomStateList[room_id].participatingNameList[0]);
                setTopRightPerson(matchStateList[room_id].players, STATE.second_color, roomStateList[room_id].participatingNameList[1]);
                setDownLeftPerson(matchStateList[room_id].players, STATE.third_color, roomStateList[room_id].participatingNameList[2]);
                setDownRightPerson(matchStateList[room_id].players, STATE.forth_color, roomStateList[room_id].participatingNameList[3]);
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
                    bomb_id: null,
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
        
        //TODO emit match end and postprocess
        
        
    });
    
    
}

function bindDuringPlaySocket(io, socket, playerRoomList, roomStateList) {
    socket.on('askForMove', onAskForMove);
    socket.on('askForSetBomb', onAskForSetBomb);
    //for remove
    //socket.removeListener('askForMove', onAskForMove);
    
    
    function onAskForMove(data) {
        //TODO null check
        //TODO room check
        
        var room_id = playerRoomList[socket.id].room_id;
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
        //TODO null check
        //TODO room check
        
        var room_id = playerRoomList[socket.id].room_id;
        var player_index = roomStateList[room_id].participatingIdList.indexOf(socket.id);
        var player = matchStateList[room_id].players[player_index];
        var bomb_id;
        
        if (player.isDead) { return false; }
        // TODO bomb number check
        // TODO check if bomb is already set
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
            
            //TODO after 3 seconds explode the bomb
            matchStateList[room_id].bombs[bomb_id].timer = setTimeout(() => {
                //console.log(room_id);
                explodeBomb(io, socket, roomStateList, room_id, player, bomb_id, false, 'dummy');

            }, TIME_TO_EXPLODE);
            
        }
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
    //console.log(room_id);
    //console.log(player);
    //console.log(bomb_id);
    let bomb = matchStateList[room_id].bombs[bomb_id];
    //let tmpMatrix = [];
    let color = player.color;
    let cellState = matchStateList[room_id].cellState;
    let scanningDirections = [[1,0], [-1,0], [0,1], [0,-1]];
    //TODO initialize painted cells
    let paintedCells = matchStateList[room_id].paintedCells;
    paintedCells = {};
    
    //increment bomb count
    player.bomb_num++;
    
    //clear bomb from cells and if exploded by other bombs clear timer
    //console.log(bomb.i);
    //console.log(bomb.j);
    //console.log(bomb_id);
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
    //tmpMatrix[bomb.i][bomb.j] = -1;
    
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
            
            // avoid infinite loop
            //if (tmpMatrix[ni][nj] < 0) { return false; }
            
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
            
            //tmpMatrix[ ni ][ nj ] = -1;
        }
        
    });
    
    io.sockets.in(room_id).emit('cellsPainted', {
        paintedCells: paintedCells
    });
    
    //TODO evaluate enclosed cells and emit those
    evaluateEnclosure(paintedCells, room_id);
    io.sockets.in(room_id).emit('cellsObtained', {
        //TODO
    });
    
    //TODO delete bomb object
    delete matchStateList[room_id].bombs[bomb_id];
    
}

function killPersonIn(ni, nj, io, socket, room_id, roomStateList) {
    matchStateList[room_id].players.forEach((player, index) => {
        if (ni === player.i && nj === player.j) {
            player.isDead = true;
            
            io.sockets.in(room_id).emit('someoneDied', {
                index: index
            });
            
            if (roomStateList[room_id].participatingIdList[index] === socket.id) {
                io.sockets.connected[socket.id].emit('youDied', {});
            }
            
            //TODO the only one person or team is left, he wins
            
        }
    });
}


function evaluateEnclosure(paintedCells, room_id) {
    let obtainedCells = matchStateList[room_id].obtainedCells;
    obtainedCells = {};
    
    //console.log(paintedCells);
    Object.keys(paintedCells).forEach((color) => {
        obtainedCells[color] = [];
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
                        console.log(matchStateList[room_id].cellState[next_i][next_j].color);
                        //console.log(typeof matchStateList[room_id].cellState[next_i][next_j].color);
                        console.log(color);
                        //console.log(typeof color)
                        
                        //let tmpObtainedCells = [];
                        //tmpObtainedCells.push([]);
                        
                        obtainedCells[color].push([]);
                        checkPeriphery(next_i, next_j, obtainedCells[color], matchStateList[room_id].cellState, matchStateList[room_id].tmpMatrix, parseInt(color, 10));
                        /*
                        checkPeriphery(next_i, next_j, tmpObtainedCells, matchStateList[room_id].cellState, matchStateList[room_id].tmpMatrix, parseInt(color, 10));
                        if (tmpObtainedCells.length > 0) {
                            obtainedCells[color].push([]);
                            console.log(tmpObtainedCells[0]);
                            tmpObtainedCells[0].forEach((position) => {
                                console.log(position);
                                obtainedCells[color][obtainedCells[color].length - 1].push([position[0], position[1]]);
                                console.log(obtainedCells[color]);
                            });
                            //obtainedCells[color].push(tmpObtainedCells[0].slice());
                        }
                        */
                    }
                }
            }
        });
    });
    
    Object.keys(obtainedCells).forEach((color) => {
        console.log(color);
        console.log(obtainedCells[color]);
        obtainedCells[color].forEach((cells) => {
            cells.forEach((position) => {
                console.log(position);
            });
        });
    });
    
    
    
/*    
  var
    i, j, ki, kj, ip, jp,
    lastObtainedCellsLength = 0,
    obtainedCells = {};
    
  if ( paintedCells.length === 0 ) { return false; }
  //copyMatrix( currentMatrix, ownTmpMatrix );
  //copyMatrix( currentMatrix, enemyTmpMatrix );
  paintedCells.forEach( function( val ) {
    i = val[0];
    j = val[1];
    
    for( ki = -1; ki < 2; ki++ ) {
      for( kj = -1; kj < 2; kj++ ) {
        if ( Math.abs(ki) + Math.abs(kj) !== 1 ) { continue; }
        ip = i + ki;
        jp = j + kj;
        //if ( ip < 0 || ip >= CELL_NUM || jp < 0 || jp >= CELL_NUM ) {
        if ( ip <= 0 || ip >= CELL_NUM -1 || jp <= 0 || jp >= CELL_NUM -1 ) {
          continue;
        }
        
        if ( currentMatrix[i][j] === STATE.OWN_COLOR 
          && currentMatrix[ip][jp] !== STATE.OWN_COLOR ) 
        {
          ownObtainedCells.push([]);
          checkPeriphery( ip, jp, ownObtainedCells, ownTmpMatrix, STATE.OWN_COLOR );
          
          // reflect obtained cells in the matrix
          if (ownObtainedCells.length > lastObtainedCellsLength) {
            lastObtainedCellsLength++;
            ownObtainedCells[ownObtainedCells.length-1].forEach( function (v) {
              currentMatrix[v[0]][v[1]] = STATE.OWN_COLOR;
            });
          }
        }
        
      }
    }
    
  });

  //console.log(ownObtainedCells);
  
  if (ownObtainedCells.length > 0) {
    return ownObtainedCells;
  } else if (enemyObtainedCells.length > 0) {
    return enemyObtainedCells;
  } else {
    return null;
  }
  */

};

function checkPeriphery(n, m, obtainedCells, cellState, tmpMatrix, color) {
    //TODO should use hasChecked flag instead of tmpMatrix?
    if (tmpMatrix[n][m] === STATE.hasFailed
        || (cellState[n][m].color !== color && (n - 1 < 0 || n + 1 >= H_CELL_NUM || m - 1 < 0 || m + 1 >= V_CELL_NUM))) {
            obtainedCells[obtainedCells.length - 1].forEach((position) => {
                tmpMatrix[position[0]][position[1]] = STATE.hasFailed;
                
            });
            obtainedCells.pop();
            console.log('fail ' + n +' '+ m);
            console.log(obtainedCells);
            return false;
    }
    
    obtainedCells[obtainedCells.length - 1].push([n, m]);
    console.log('push ' + n +' '+ m);
    console.log(obtainedCells);
    tmpMatrix[n][m] = -1;
    
    for (let i = -1; i < 2; i++) {
        for (let j = -1; j < 2; j++) {
            if ( Math.abs(i) + Math.abs(j) !== 1 ) { continue; }
            console.log('debug0: i' + i + ' j '+ j + ' tmpMatrix[n + i][m + j] ' + tmpMatrix[n + i][m + j] + ' cellState[n + i][m + j].color ' +  cellState[n + i][m + j].color);
            if (tmpMatrix[n + i][m + j] >= 0
                && cellState[n + i][m + j].color !== color) {
                    if (!checkPeriphery(n + i, m + j, obtainedCells, cellState, tmpMatrix, color)) {
                        //console.log('debug1: checkPeriphery false');
                        return false;
                    }
            }
        }
    }
    console.log("return true");
    return true;
};



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


module.exports = {
    setSocket: setSocket,
    emitEnterMatch: emitEnterMatch
}