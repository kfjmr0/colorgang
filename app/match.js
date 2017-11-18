'use strict';
const $ = require('jquery');

const match_start_html = '<button id="match-start-button" class="btn btn-primary">開戦する</button>';
const participate_join_html = '<button id="participate-join-button" class="btn btn-success">参戦する</button>';
const participate_cancel_html = '<button id="participate-cancel-button" class="btn btn-danger">キャンセル</button>';
const mode_selector_html = '<form class="form-horizontal">'
                           +' <div class="form-group">'
                           +' 		<label class="col-sm-2 control-label" for="InputSelect">バトルモード</label>'
                           +' 		<div class="col-sm-10">'
                           +' 			<select class="form-control" id="InputSelect">'
                           +' 				<option>4 men battle royal</option>'
                           +' 				<option>2 on 2 tag-team match(unimplemented)</option>'
                           +' 				<option>1 on 1 gachinko match(unimplemented)</option>'
                           +' 			</select>'
                           +' 		</div>'
                           +' 	</div>'
                           +' </form>';


function init($match, $participate, socket) {
    setFieldSize($match);

    
    $(window).resize(() => {
        setFieldSize($match);
    });
    
    
    
    setSocket(socket);
}

function setFieldSize($match) {
    var width = $match.width();
    width = (width > 500) ? 500 : width;
    $match.html('<canvas id="canvas" width="' + 0.9*width + 'px" height="' + 0.9*width + 'px">'
                    + 'ブラウザがCanvasに対応していません'
                + '</canvas>');
}

function setSocket(socket) {
    
}

function roomMasterProcess($participate) {
    $participate.append(mode_selector_html);
    $participate.append(match_start_html);
    $participate.append(participate_join_html);
}

function roomMemberProcess($participate) {
    //$participate.append();
}

module.exports = {
    init: init,
    roomMasterProcess: roomMasterProcess,
    roomMemberProcess: roomMemberProcess,
}