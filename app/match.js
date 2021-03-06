'use strict';
const $ = require('jquery');
const util = require('./utility');

const FIRE_RANGE = 2;
const V_CELL_NUM = 11;
const H_CELL_NUM = 13;
const ANIMATION_DT = 50;
const TIME_TO_EXPLODE = 3000;
const PLAY_TIMEsec = 2*60;
const r_TIME_TO_EXPLOSION = 1.0 / TIME_TO_EXPLODE;
const STATE = {
    first_color: 0,
    second_color: 1,
    third_color: 2,
    forth_color: 3,
    plain: 4,
}
const setBombSound = document.getElementById('setBombSound');
const explodeSound = document.getElementById('explodeSound');
const obtainSound = document.getElementById('obtainSound');

var cell_length;
var body_unit;
var canvas, ctx, canvas_width, canvas_height;
var renderer;
var countdownTimer;

var battle_mode;
var isRoomMaster;

var COLOR_LIST = [];//['deeppink', 'mediumblue', 'lime', 'orange', 'gray'];
var players = [];
var cellStates = [];
var bombs = {};

const $match = $('#match-target');
const $participate = $('#participate-target');

const mode_selector_html = '<form class="form-horizontal">'
                           +' <div class="form-group">'
                           +' 		<label class="col-sm-2 control-label" for="battle-mode-selector">モード選択</label>'
                           +' 		<div class="col-sm-10">'
                           +' 			<select id="battle-mode-selector" class="form-control">'
                           +' 				<option value="fourMen">4 men battle royal</option>'
                           +' 				<option value="twoOnTwo">2 on 2 tag-team match</option>'
                           +' 				<option value="oneOnOne">1 on 1 gachinko match</option>'
                           +' 			</select>'
                           +' 		</div>'
                           +' 	</div>'
                           +' </form>';
const match_start_html = '<button id="match-start-button" class="btn btn-primary">開戦する</button>';
const participate_button_html = '<span id="participate-button"></span>';
const participate_join_html = '<button id="participate-join-button" class="btn btn-success">参戦する</button>';
const participate_cancel_html = '<button id="participate-cancel-button" class="btn btn-danger">キャンセル</button>';
const participants_html = '<div id="participants-list"></div>';
const team_selector_html = '<form id="team-selector-form" class="form-horizontal">'
                           +' <div class="form-group">'
                           +' 		<label class="col-sm-2 control-label" for="team-selector">チーム選択</label>'
                           +' 		<div class="col-sm-10">'
                           +' 			<select id="team-selector" class="form-control">'
                           +' 				<option value="A">A</option>'
                           +' 				<option value="B">B</option>'
                           +' 			</select>'
                           +' 		</div>'
                           +' 	</div>'
                           +' </form>';



function init(socket) {
    isRoomMaster = false;
    setFieldSizeAndGetCanvas($match);
    emptyVariables();
}

function emptyVariables() {
    COLOR_LIST = [];
    players = [];
    cellStates = [];
    bombs = {};
}

function setEventHandler(socket) {
    // add event listner
    $(function () {
        $(window).on('resize', setFieldSizeAndGetCanvas);
        
        $('#battle-mode-selector').change(() => {
            let chosen_mode = $('#battle-mode-selector').val();
            //console.log('mode change ' + chosen_mode);
            socket.emit('askForModeChange', {
                battle_mode: chosen_mode
            })
        });
        
        //setJoinEvent(socket);
        
        if (isRoomMaster) {
            $('#match-start-button').click(() => {
                socket.emit('askForMatchStart', {});
            });
        }
        
    });
}

function setJoinEvent(socket) {
    if (battle_mode === 'twoOnTwo') {
        $('#participate-join-button').after(team_selector_html);
    } else {
        if ($('#team-selector-form')) {
            $('#team-selector-form').remove();
        }
    }
    // prevent binding multi event
    $('#participate-join-button').off('click');
    $('#participate-join-button').click(() => {
        //console.log('join-button clicked');
        if (battle_mode === 'twoOnTwo') {
            var team = $('#team-selector').val();
        }
        socket.emit('participateJoin', {
            team: team
        });
        
        $('#participate-button').html(participate_cancel_html);
        setCancelEvent(socket);
    });
}

function setCancelEvent(socket) {
    $('#participate-cancel-button').click(() => {
        socket.emit('participateCancel', {});
        $('#participate-button').html(participate_join_html);
        setJoinEvent(socket);
    });
}

function unbindResizeEvent() {
    $(window).off('resize');
}

function setSocketEvent(socket) {
    socket.on('enterMatch', (data) => {
        roomMemberProcess(socket, data.battle_mode, data.participatingList);
    });
    
    socket.on('modeChange', (data) => {
        //console.log('on mode change')
        battle_mode = data.battle_mode;
        setJoinEvent(socket);
        renderCurrentBattleMode();
    });
    
    socket.on('participatingListChange', (data) => {
        //console.log('participatingListChange');
        //console.log(data);
        battle_mode = data.battle_mode;
        renderCurrentParticipants(data);
    });
    
    socket.on('matchReady', (data) => {
        // prepare variables for each person's color and position 
        // and bombs and cells color
        for (let i = 0; i < H_CELL_NUM; i++) {
            cellStates[i] = [];
            for (let j = 0; j < V_CELL_NUM; j++) {
                let isBlock = false;
                if (i % 2 === 1 && j % 2 === 1) {
                    isBlock = true;
                }
                cellStates[i][j] = {
                    color: STATE.plain,
                    isBlock: isBlock,
                    flameCount: 0,
                    obtainedCount: 0,
                }
            }
        }
        
        //console.log(data.color_list);
        data.color_list.forEach((color, index) => {
            COLOR_LIST[index] = color;
        });
        
        //console.log(data.players);
        data.players.forEach((player) => {
            players.push({
                name: player.name,
                color: player.color,
                x: player.x,
                y: player.y,
                animation_count: 0,
                isDead: false,
                dead_animation_count: 3,
                direction: 'down'
            });
        });
        
        $('#match-start-button').prop("disabled", true);
        $('#participate-join-button').prop("disabled", true);
        $('#participate-cancel-button').prop("disabled", true);
        
        renderInitialMatchState();
        renderPlayerNamesAroundField();
        $('#match-messagebox').text(PLAY_TIMEsec);
        
        let readycount = 3;
        let readycountdown = setInterval(() => {
            renderInitialMatchState();
            ctx.fillStyle = 'black';
            ctx.font = "150px 'Impact'";
            ctx.fillText(readycount, 0.45*H_CELL_NUM*cell_length, 0.5*V_CELL_NUM*cell_length, 0.5*H_CELL_NUM*cell_length);
            readycount--;
            if (readycount <= 0) {
                clearInterval(readycountdown);
            }
        }, 1000);
        
    });
    
    socket.on('bindKeys', (data) => {
        bindMatchEvent(socket);
    });
    
    socket.on('matchStart', (data) => {
        bindMatchSocketEvent(socket);
        renderer = setInterval(renderField, ANIMATION_DT);
        
        let count = PLAY_TIMEsec;
        countdownTimer = setInterval(() => {
            count--;
            count = (count < 0) ? 0 : count;
            $('#match-messagebox').text(count);
        }, 1000);
    });
    
    socket.on('matchEnd', (data) => {
        unbindMatchEvent();
        clearInterval(countdownTimer);
        
        // time for players to be mentally prepared for result
        setTimeout(() => {
            clearInterval(renderer);
            $('#match-messagebox').empty();

            //console.log('match end');
            //console.log(data);
            if (data.hasWonByKill) {
                $('#match-messagebox').text(data.result_message);
            } else {
                switch (battle_mode) {
                        case 'fourMen':
                            data.points.forEach((point, index) => {
                                $('#match-messagebox').append('<span style="color:' + COLOR_LIST[index] + '";">' + util.escapeHTML(point) + '　</span>');
                            });
                            $('#match-messagebox').append('<span>' + util.escapeHTML(data.result_message) + '</span>');
                            break;
                        case 'oneOnOne':
                        case 'twoOnTwo':
                            $('#match-messagebox').append('<span style="color:' + COLOR_LIST[0] + '";">' + util.escapeHTML(data.points[0]) + '　</span>');
                            $('#match-messagebox').append('<span style="color:' + COLOR_LIST[1] + '";">' + util.escapeHTML(data.points[1]) + '　</span>');
                            $('#match-messagebox').append('<span>' + util.escapeHTML(data.result_message) + '</span>');
                            break;
                        default:
                            break;
                }
            }
            
            // restore button state
            $('#match-start-button').prop("disabled", false);
            $('#participate-join-button').prop("disabled", false);
            $('#participate-cancel-button').prop("disabled", false);
            
            $('#participate-button').html(participate_join_html);
            setJoinEvent(socket);
            
            $('#participants-list').empty();
            emptyVariables();
        }, 500);
    });
}

function bindMatchEvent(socket) {
    //console.log('bindMatchEvent');
    $(window).on('keydown', onKeyDown);
    
    function onKeyDown(e) {
        var
            key = e.keyCode,
            direction = '';
        e.preventDefault();
        //console.log('onkeydown');
        switch (key) {
            case 37:
            case 65:
                direction = 'left';
                break;
            case 38:
            case 87:
                direction = 'up';
                break;
            case 39:
            case 68:
                direction = 'right';
                break;
            case 40:
            case 83:
                direction = 'down';
                break;
            case 66:
            case 74:
                socket.emit('askForSetBomb', {});
                break;
            default:
                return false;
        }
        
        if (direction) {
            socket.emit('askForMove', {direction: direction});
        }
    }
    
}

function unbindMatchEvent() {
    $(window).off('keydown');
}

function bindMatchSocketEvent(socket) {
    socket.on('moveCharacter', (data) => {
        var player = players[data.player_index];
        player.x = data.x;
        player.y = data.y;
        player.direction = data.direction;
        player.animation_count++;
    });
    
    socket.on('setBomb', (data) => {
        bombs[data.bomb_id] = {
            i: data.i,
            j: data.j,
            color: data.color,
            elapsed_time: 0
        }
        
        if(typeof(setBombSound.currentTime) != 'undefined') {
            setBombSound.currentTime = 0;
        }
        setBombSound.play();
    });
    
    socket.on('explodeBomb', (data) => {
        //console.log('bomb explode');
        let scanningDirections = [[1,0], [-1,0], [0,1], [0,-1]];
        let bomb = bombs[data.bomb_id];
        cellStates[bomb.i][bomb.j].flameCount = 3;
        scanningDirections.forEach((direction) => {
            for (let n = 1; n <= FIRE_RANGE; n++) {
                let ni = bomb.i + n * direction[0];
                let nj = bomb.j + n * direction[1];
                //console.log(ni,nj);
                if (ni < 0 || ni >= H_CELL_NUM || nj < 0 || nj >= V_CELL_NUM
                    || cellStates[ni][nj].isBlock) {
                        break;
                }
                cellStates[ni][nj].flameCount = 3;
            }
        });
        
        if(typeof(explodeSound.currentTime) != 'undefined') {
            explodeSound.currentTime = 0;
        }
        explodeSound.play();
        
        delete bombs[data.bomb_id];
    });
    
    socket.on('cellsPainted', (data) => {
        Object.keys(data.paintedCells).forEach((color) => {
           data.paintedCells[color].forEach((position) => {
               cellStates[position[0]][position[1]].color = color;
           });
        });
    });
    
    socket.on('cellsObtained', (data) => {
        //console.log('on cellsObtained');
        //console.log(data);
        data.obtainedCells.forEach((enclosedCells) => {
            enclosedCells.forEach((position) => {
                cellStates[position[0]][position[1]].color = data.color;
                cellStates[position[0]][position[1]].obtainedCount = 5;
            });
        });
        
        if(typeof(obtainSound.currentTime) != 'undefined') {
            obtainSound.currentTime = 0;
        }
        obtainSound.play();
        
    });
    
    socket.on('someoneDied', (data) => {
        //console.log('player ' + data.index + ' died');
        players[data.index].isDead = true;
        players[data.index].dead_animation_count = 5;
    });
    
    socket.on('youDied', (data) => {
        //console.log('you died!')
        unbindMatchEvent();
    });
}

function setFieldSizeAndGetCanvas() {
    $match.empty();
    $match.append('<div id="match-messagebox"></div>');
    $match.append('<div id="top-namespace"></div>');
    $match.append('<div id="canvas-box"></div>');
    $match.append('<div id="bottom-namespace"></div>');
    
    let $canvasbox = $('#canvas-box')
    let w = $canvasbox.width();
    w = (w > 550) ? 550 : w;
    canvas_width = 0.9*w;
    canvas_height = canvas_width * V_CELL_NUM / H_CELL_NUM;
    cell_length = canvas_width / H_CELL_NUM;
    body_unit = cell_length / 10;
    
    $canvasbox.html('<canvas id="canvas" width="' + canvas_width + 'px" height="' + canvas_height + 'px">'
                    + 'ブラウザがCanvasに対応していません'
                + '</canvas>');
    canvas = document.getElementById('canvas');
    if ( ! canvas || ! canvas.getContext ) { return false; }
    ctx = canvas.getContext('2d');
}

function renderPlayerNamesAroundField() {
    $('#top-namespace').empty();
    $('#bottom-namespace').empty();
    players.forEach((player, index) => {
        switch (index) {
            case 0:
                $('#top-namespace').append('<span style="color:' + COLOR_LIST[player.color] + '";">' + util.escapeHTML(player.name) + '</span>');
                break;
            case 1:
                $('#top-namespace').append('<span class="right-name" style="color:' + COLOR_LIST[player.color] + '";">' + util.escapeHTML(player.name) + '</span>');
                break;
            case 2:
                $('#bottom-namespace').append('<span style="color:' + COLOR_LIST[player.color] + '";">' + util.escapeHTML(player.name) + '</span>');
                break;
            case 3:
                $('#bottom-namespace').append('<span class="right-name" style="color:' + COLOR_LIST[player.color] + '";">' + util.escapeHTML(player.name) + '</span>');
                break;
            default:
                return false;
        }
    });
}

function roomMasterProcess() {
    isRoomMaster = true;
    $participate.append(mode_selector_html);
    $participate.append(match_start_html);
}

function roomMemberProcess(socket, battle_mode, participatingList) {
    
    renderCurrentBattleMode();
    $participate.append(participate_button_html);
    $('#participate-button').html(participate_join_html);
    $participate.append(participants_html);
    renderCurrentParticipants(battle_mode, participatingList);
    setEventHandler(socket);
}

function renderCurrentBattleMode() {
    var $current_mode = $('#current-battle-mode');
    if ($current_mode) {
        $current_mode.remove();
    }
    switch (battle_mode) {
        case 'fourMen':
            $participate.prepend('<div id="current-battle-mode">バトルモード：4 men battle royal</div>');
            break;
        case 'twoOnTwo':
            $participate.prepend('<div id="current-battle-mode">バトルモード：2 on 2 tag-team match</div>');
            break;
        case 'oneOnOne':
            $participate.prepend('<div id="current-battle-mode">バトルモード：1 on 1 gachinko match</div>');
            break;
        default:
            break;
    }
    
}

function renderCurrentParticipants(data) {
    const $participants = $('#participants-list');
    $participants.empty();
    $participants.append('<div>――参戦者――</div>');
    //console.log(data);
    switch (data.battle_mode) {
            case 'fourMen':
            case 'oneOnOne':
                data.participatingList.forEach((participants) => {
                    $participants.append('<div>' + util.escapeHTML(participants) + '</div>');
                });
                break;
            case 'twoOnTwo':
                $participants.append('<div id="teamA" class="col-xs-6">Aチーム</div>');
                $participants.append('<div id="teamB" class="col-xs-6">Bチーム</div>');
                data.teamAList.forEach((participants) => {
                    $('#teamA').append('<div>' + util.escapeHTML(participants) + '</div>');
                });
                data.teamBList.forEach((participants) => {
                    $('#teamB').append('<div>' + util.escapeHTML(participants) + '</div>');
                });
                break;
            default:
                return false;
    }
}




/**
  * canvas drawing
  */
function renderField() {
    clearField();
    fillCells();
    renderBlockBorder();
    renderBombs();
    drawCharacters();
}

function renderInitialMatchState() {
    clearField();
    fillCells();
    renderBlockBorder();
    drawCharacters();
}

function clearField() {
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas_width, canvas_height);
}

function fillCells() {
    // fill the all cells with gray
    for (let i = 0; i < H_CELL_NUM; i++) {
      for (let j = 0; j < V_CELL_NUM; j++) {
        if (cellStates[i][j].flameCount > 0) {
            ctx.beginPath();
            
            var grad  = ctx.createRadialGradient((i+0.5)*cell_length, (j+0.5)*cell_length, 0.15*cell_length, (i+0.5)*cell_length, (j+0.5)*cell_length, 0.45*cell_length);

            grad.addColorStop(0,'yellow');
            grad.addColorStop(0.7,'firebrick');
            grad.addColorStop(1,'dimgray');

            ctx.fillStyle = grad;

            ctx.rect(i*cell_length , j*cell_length, cell_length, cell_length);
            ctx.fill();
            cellStates[i][j].flameCount--;
        } else {
            ctx.fillStyle = COLOR_LIST[cellStates[i][j].color];
            //ctx.fillRect(i*cell_length + 0.04*cell_length , j*cell_length  + 0.04*cell_length, cell_length*0.92, cell_length*0.92);
            //ctx.fillRect(i*cell_length + 0.02*cell_length , j*cell_length  + 0.02*cell_length, cell_length*0.96, cell_length*0.96);
            ctx.fillRect(i*cell_length , j*cell_length, cell_length, cell_length);
            if (cellStates[i][j].obtainedCount > 0) {
                addObtainedEffect(i, j, cellStates[i][j].obtainedCount);
            }
        }
        if (cellStates[i][j].obtainedCount > 0) { cellStates[i][j].obtainedCount--; }
      }
    }
}

function addObtainedEffect(i, j, count) {
    let effectcount = count % 4;
    ctx.fillStyle = "white";
    ctx.fillRect(i*cell_length + 0.25*effectcount*cell_length , j*cell_length, 0.25*cell_length, cell_length);
}

function renderBlockBorder() {
    ctx.strokeStyle = "black";
    ctx.lineWidth = 5;
    for (let i = 0; i < H_CELL_NUM; i++) {
      for (let j = 0; j < V_CELL_NUM; j++) {
        if (i % 2 === 1 && j % 2 === 1) {
            ctx.strokeRect(i*cell_length + 0.05*cell_length, j*cell_length + 0.05*cell_length, cell_length*0.9, cell_length*0.9);
        }
      }
    }
}

function renderBombs() {
    Object.keys(bombs).forEach(function(id) {
        drawBomb(bombs[id].i, bombs[id].j, COLOR_LIST[bombs[id].color], bombs[id].elapsed_time);
        bombs[id].elapsed_time += ANIMATION_DT;
    });
}

function drawBomb(i, j, color, elapsed_time) {
    let xo = i*cell_length + 0.5*cell_length;
    let yo = j*cell_length + 0.5*cell_length;
    let radius = 0.15 * cell_length * (1 + 2 * elapsed_time * r_TIME_TO_EXPLOSION);
    radius = (radius > 0.45*cell_length) ? 0.45*cell_length : radius;
    
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 3;
    ctx.fillStyle = color;
    
    ctx.beginPath();
    ctx.arc(xo, yo, radius, 0, 2*Math.PI);
    ctx.fill();
    ctx.stroke();
}

function drawCharacters() {
    ctx.lineWidth = 1;
    players.forEach((player) => {
        if (player.isDead) {
            //process dead characters
            if (player.dead_animation_count > 0) {
                //console.log('draw dead character');
                drawDeadCharacter(player);
                player.dead_animation_count--;
            }

        } else {
            renderCharacter(player.x, player.y, COLOR_LIST[player.color], player.animation_count, player.direction);
        }
    });
}

function renderCharacter(x_raw, y_raw, color, animation_count, direction) {
    // modifiy x and y value for current canvas size
    let x = x_raw * cell_length;
    let y = y_raw * cell_length;
    
    //quick fix for difference between server's positon and client's position origin. TODO modify later
    x = x - 0.5 * cell_length;
    y = y - 0.5 * cell_length;
    
    switch (direction) {
      case 'right':
        animateRight(x, y, color, animation_count);
        break;
      case 'left':
        animateLeft(x, y, color, animation_count);
        break;
      case 'up':
        animateUp(x, y, color, animation_count);
        break;
      case 'down':
        animateDown(x, y, color, animation_count);
        break;
      default:
        return false;
    }
}

function animateRight(x, y, color, animation_count) {

  drawHeadAndBody(x, y);
  drawVerticalPostureLimbs(x, y, animation_count);
  // scarf
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x+body_unit*7, y+body_unit*2);
  ctx.lineTo(x+body_unit*3, y+body_unit*2);
  ctx.lineTo(x+body_unit*7, y+body_unit*5);
  ctx.closePath();
  ctx.fill();
  // glass
  ctx.fillStyle = 'black';
  ctx.beginPath();
  ctx.moveTo(x+body_unit*7, y+body_unit*1);
  ctx.lineTo(x+body_unit*4, y+body_unit*0);
  ctx.lineTo(x+body_unit*6, y+body_unit*2);
  ctx.closePath();
  ctx.fill();
}

function animateLeft(x, y, color, animation_count) {

  drawHeadAndBody(x, y);
  drawVerticalPostureLimbs(x, y, animation_count);
  // scarf
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x+body_unit*3, y+body_unit*2);
  ctx.lineTo(x+body_unit*7, y+body_unit*2);
  ctx.lineTo(x+body_unit*3, y+body_unit*5);
  ctx.closePath();
  ctx.fill();
  // glass
  ctx.fillStyle = 'black';
  ctx.beginPath();
  ctx.moveTo(x+body_unit*3, y+body_unit*1);
  ctx.lineTo(x+body_unit*6, y+body_unit*0);
  ctx.lineTo(x+body_unit*4, y+body_unit*2);
  ctx.closePath();
  ctx.fill();
}

function animateUp(x, y, color, animation_count) {
  drawHeadAndBody(x, y);
  drawHorizontalPostureLimbs(x, y, animation_count);
  drawHorizontalPostureScarf(x, y, color);

}

function animateDown(x, y, color, animation_count) {
  drawHeadAndBody(x, y);
  drawHorizontalPostureLimbs(x, y, animation_count);
  drawHorizontalPostureScarf(x, y, color);

  // draw glass
  ctx.fillStyle = 'black';
  ctx.beginPath();
  ctx.moveTo(x+body_unit*2.5, y+body_unit*0);
  ctx.lineTo(x+body_unit*5, y+body_unit*1);
  ctx.lineTo(x+body_unit*4, y+body_unit*2);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x+body_unit*7.5, y+body_unit*0);
  ctx.lineTo(x+body_unit*5, y+body_unit*1);
  ctx.lineTo(x+body_unit*6, y+body_unit*2);
  ctx.closePath();
  ctx.fill();

}

function drawDeadCharacter(player) {
    //quick fix for difference between server's positon and client's position origin. TODO modify later
    let x = (player.x - 0.5) * cell_length;
    let y = (player.y - 0.5) * cell_length;
    drawHeadAndBody(x, y);
    drawHorizontalPostureLimbs(x, y, 0);
    drawDeadMansFace(x, y);
}

function drawHeadAndBody(x, y) {
  ctx.fillStyle = 'white';
  ctx.strokeStyle = 'black';
  //body
  ctx.beginPath();
  ctx.ellipse(x + body_unit*5, y + body_unit*5, body_unit*1.5, body_unit*2, 0, 0, 2*Math.PI);
  ctx.fill();
  ctx.stroke();
  //head
  ctx.beginPath();
  ctx.arc( x + body_unit*5, y + body_unit*2, body_unit * 2, 0, 2*Math.PI );
  ctx.fill();
  ctx.stroke();
}

function drawHorizontalPostureLimbs(x, y, animation_count) {
  ctx.fillStyle = 'white';
  ctx.strokeStyle = 'black';
  //left arm
  ctx.beginPath();
  ctx.ellipse(x + body_unit*2.5, y + body_unit*5.5, body_unit*0.9, body_unit * (1.7 - 0.4*Math.sin(animation_count*Math.PI/ 5)), 0, 0, 2 * Math.PI);
  ctx.fill();
  ctx.stroke();
  //right arm
  ctx.beginPath();
  ctx.ellipse(x + body_unit*7.5, y + body_unit*5.5, body_unit*0.9, body_unit * (1.7 + 0.4*Math.sin(animation_count*Math.PI/ 5)), 0, 0, 2 * Math.PI);
  ctx.fill();
  ctx.stroke();
  //left leg
  ctx.beginPath();
  ctx.ellipse(x + body_unit*4, y + body_unit*8, body_unit*0.8, body_unit * (1.5 + 0.3*Math.sin(animation_count*Math.PI/ 5)), 0, 0, 2 * Math.PI);
  ctx.fill();
  ctx.stroke();
  //right leg
  ctx.beginPath();
  ctx.ellipse(x + body_unit*6, y + body_unit*8, body_unit*0.8, body_unit * (1.5 - 0.3*Math.sin(animation_count*Math.PI/ 5)), 0, 0, 2 * Math.PI);
  ctx.fill();
  ctx.stroke();
}

function drawHorizontalPostureScarf(x, y, color) {
  //scarf
  ctx.beginPath();
  ctx.moveTo(x+body_unit*2.5, y+body_unit*2);
  ctx.lineTo(x+body_unit*7.5, y+body_unit*2);
  ctx.lineTo(x+body_unit*5, y+body_unit*5);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function drawVerticalPostureLimbs(x, y, animation_count) {
  ctx.fillStyle = 'white';
  ctx.strokeStyle = 'black';
  var modification = Math.cos(animation_count*Math.PI / 5);
  //back leg
  ctx.beginPath();
  ctx.ellipse(x + body_unit*(5 - 0.5*modification), y + body_unit*8, body_unit*0.8, body_unit * 1.5, 0.25 * modification * Math.PI, 0, 2 * Math.PI);
  ctx.fill();
  ctx.stroke();
  //front leg
  ctx.beginPath();
  ctx.ellipse(x + body_unit*(5 + 0.5*modification), y + body_unit*8, body_unit*0.8, body_unit * 1.5, - 0.25 * modification * Math.PI, 0, 2 * Math.PI);
  ctx.fill();
  ctx.stroke();
  //front arm
  ctx.beginPath();
  ctx.ellipse(x + body_unit*(5 - 0.5*modification), y + body_unit*5.5, body_unit*0.9, body_unit * 1.7, 0.25 * modification * Math.PI, 0, 2 * Math.PI);
  ctx.fill();
  ctx.stroke();
}

function drawDeadMansFace(x, y) {
    ctx.strokeStyle = 'black';
    let eye_upperbound = 1;
    let eye_lowerbound = 2;
    let eye_space = 1.3;
    // eyes
    ctx.beginPath();
    ctx.moveTo(x+body_unit*(5-eye_space), y+body_unit*eye_upperbound);
    ctx.lineTo(x+body_unit*(5-eye_space + 1), y+body_unit*eye_lowerbound);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x+body_unit*(5-eye_space + 1), y+body_unit*eye_upperbound);
    ctx.lineTo(x+body_unit*(5-eye_space), y+body_unit*eye_lowerbound);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x+body_unit*(5+eye_space), y+body_unit*eye_upperbound);
    ctx.lineTo(x+body_unit*(5+eye_space - 1), y+body_unit*eye_lowerbound);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x+body_unit*(5+eye_space - 1), y+body_unit*eye_upperbound);
    ctx.lineTo(x+body_unit*(5+eye_space), y+body_unit*eye_lowerbound);
    ctx.stroke();

    // mouth
    ctx.beginPath();
    ctx.arc( x + body_unit*4.4, y + body_unit*2.5, body_unit * 0.6, 0, Math.PI );
    ctx.stroke();
    ctx.beginPath();
    ctx.arc( x + body_unit*5.6, y + body_unit*2.5, body_unit * 0.6, 0, Math.PI );
    ctx.stroke();
}


module.exports = {
    init: init,
    setSocketEvent: setSocketEvent,
    roomMasterProcess: roomMasterProcess,
    unbindResizeEvent: unbindResizeEvent,
    unbindMatchEvent: unbindMatchEvent
};