'use strict';
const $ = require('jquery');

const FIRE_RANGE = 2;
const V_CELL_NUM = 11;
const H_CELL_NUM = 13;
var cell_length;
var body_unit;
var canvas, ctx, canvas_width, canvas_height;

var battle_mode;
var isRoomMaster = false;

var players = [];
var cellColors = [];
var bombs = [];

const $match = $('#match-target');
const $participate = $('#participate-target');

const mode_selector_html = '<form class="form-horizontal">'
                           +' <div class="form-group">'
                           +' 		<label class="col-sm-2 control-label" for="InputSelect">モード選択</label>'
                           +' 		<div class="col-sm-10">'
                           +' 			<select id="battle-mode-selector" class="form-control">'
                           +' 				<option value="fourMen">4 men battle royal</option>'
                           +' 				<option value="twoOnTwo">2 on 2 tag-team match(unimplemented)</option>'
                           +' 				<option value="oneOnOne">1 on 1 gachinko match(unimplemented)</option>'
                           +' 			</select>'
                           +' 		</div>'
                           +' 	</div>'
                           +' </form>';
const match_start_html = '<button id="match-start-button" class="btn btn-primary">開戦する</button>';
const participate_button_html = '<span id="participate-button"></span>';
const participate_join_html = '<button id="participate-join-button" class="btn btn-success">参戦する</button>';
const participate_cancel_html = '<button id="participate-cancel-button" class="btn btn-danger">キャンセル</button>';
const participants_html = '<div id="participants-list"></div>';




function init(socket) {
    setFieldSizeAndGetCanvas($match);
    
}

function setEventHandler(socket) {
    // add event listner
    $(function () {
        $(window).resize(() => {
            setFieldSizeAndGetCanvas($match);
        });
        
        $('#battle-mode-selector').change(() => {
            let chosen_mode = $('#battle-mode-selector').val();
            //console.log('mode change ' + chosen_mode);
            socket.emit('askForModeChange', {
                battle_mode: chosen_mode
            })
        });
        
        setJoinEvent();
        
        if (isRoomMaster) {
            $('#match-start-button').click(() => {
                socket.emit('askForMatchStart', {});
            });
        }
        
        
        
        function setJoinEvent() {
            $('#participate-join-button').click(() => {
                console.log('join-button clicked');
                socket.emit('participateJoin', {
                    // TODO which team in case of tag-team match
                });
                $('#participate-button').html(participate_cancel_html);
                setCancelEvent();
            });
        }
        
        function setCancelEvent() {
            $('#participate-cancel-button').click(() => {
                socket.emit('participateCancel', {});
                $('#participate-button').html(participate_join_html);
                setJoinEvent();
            });
        }
    });
    
    
    
}

function setSocketEvent(socket) {
    socket.on('enterMatch', (data) => {
        battle_mode = data.battle_mode;
        roomMemberProcess(socket, data.battle_mode, data.participatingList);
    });
    
    socket.on('modeChange', (data) => {
        //console.log('on mode change')
        battle_mode = data.battle_mode;
        renderCurrentBattleMode();
    });
    
    socket.on('participatingListChange', (data) => {
        console.log('participatingListChange');
        renderCurrentParticipants(data.battle_mode, data.participatingList)
    });
    
    socket.on('matchReady', (data) => {
        // prepare variables for each person's color and position 
        // and bombs and cells color
        data.players.forEach((player) => {
            players.push({
                name: player.name,
                color: player.color,
                x: player.x,
                y: player.y,
                animation_count: 0,
                direction: 'down'
            });
        });
        
        renderInitialMatchState();
    });
    
    socket.on('matchStart', (data) => {
       //TODO key and socket bind 
       
    });
}

function setFieldSizeAndGetCanvas($match) {
    var w = $match.width();
    w = (w > 550) ? 550 : w;
    canvas_width = 0.9*w;
    canvas_height = canvas_width * V_CELL_NUM / H_CELL_NUM;
    cell_length = canvas_width / H_CELL_NUM;
    body_unit = cell_length / 10;
    
    $match.html('<canvas id="canvas" width="' + canvas_width + 'px" height="' + canvas_height + 'px">'
                    + 'ブラウザがCanvasに対応していません'
                + '</canvas>');
    canvas = document.getElementById('canvas');
    if ( ! canvas || ! canvas.getContext ) { return false; }
    ctx = canvas.getContext('2d');
}

function roomMasterProcess() {
    isRoomMaster = true;
    $participate.append(mode_selector_html);
    $participate.append(match_start_html);
}

function roomMemberProcess(socket, battle_mode, participatingList) {
    /*
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
    */
    
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

function renderCurrentParticipants(battle_mode, participatingList) {
    const $participants = $('#participants-list');
    $participants.empty();
    $participants.append('<div>――参戦者――</div>');
    
    switch (battle_mode) {
            case 'fourMen':
            case 'oneOnOne':
                participatingList.forEach((participants) => {
                    $participants.append('<div>' + escapeHTML(participants) + '</div>');
                });
                break;
            case 'twoOnTwo':
                // TODO
                break;
            default:
                break;
        }
}

function renderInitialMatchState() {
    clearField();

    // fill the all cells with gray
    for (let i = 0; i < H_CELL_NUM; i++) {
      for (let j = 0; j < V_CELL_NUM; j++) {
        ctx.fillStyle = "gray";
        //ctx.fillRect(i*cell_length + 0.04*cell_length , j*cell_length  + 0.04*cell_length, cell_length*0.92, cell_length*0.92);
        //ctx.fillRect(i*cell_length + 0.02*cell_length , j*cell_length  + 0.02*cell_length, cell_length*0.96, cell_length*0.96);
        ctx.fillRect(i*cell_length , j*cell_length, cell_length, cell_length);
      }
    }
    
    renderBlockBorder();
    
    drawCharacters();
}

function clearField() {
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas_width, canvas_height);
}

function renderBlockBorder() {
    for (let i = 0; i < H_CELL_NUM; i++) {
      for (let j = 0; j < V_CELL_NUM; j++) {
        if (i % 2 === 1 && j % 2 === 1) {
            ctx.strokeStyle = "black";
            ctx.lineWidth = 5;
            ctx.strokeRect(i*cell_length + 0.05*cell_length, j*cell_length + 0.05*cell_length, cell_length*0.9, cell_length*0.9);
        }
      }
    }
}

function drawCharacters() {
    ctx.lineWidth = 1;
    players.forEach((player) => {
        renderCharacter(player.x, player.y, player.color, player.animation_count, player.direction);
    });
}

function renderCharacter(x, y, color, animation_count, direction) {
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
  console.log('animateRight position:');
  ctx.fillStyle = 'white';
  ctx.strokeStyle = 'black';

  drawHeadAndBody(x, y);
  drawVerticalPostureLimbs(x, y, animation_count);
  // scarf
  ctx.fillStyle = 'blue';
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
  console.log('left position :');
  ctx.fillStyle = 'white';
  ctx.strokeStyle = 'black';

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
  console.log('up position :');
  ctx.fillStyle = 'white';
  ctx.strokeStyle = 'black';
  drawHeadAndBody(x, y);
  drawHorizontalPostureLimbs(x, y, animation_count);
  drawHorizontalPostureScarf(x, y, color);

}

function animateDown(x, y, color, animation_count) {
  console.log('down position :');
  ctx.fillStyle = 'white';
  ctx.strokeStyle = 'black';
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

function drawHeadAndBody(x, y) {
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






function escapeHTML(val) {
    return $('<span>').text(val).html();
};

module.exports = {
    init: init,
    setSocketEvent: setSocketEvent,
    //setEventHandler: setEventHandler,
    roomMasterProcess: roomMasterProcess,
    //roomMemberProcess: roomMemberProcess,
}