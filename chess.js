//
//
// Constants
//
//

//Char set used to code URL
const CHARS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_.~";

//Pieces
const WHITE = 0;
const BLACK = 1;

const KING = 0;
const QUEEN = 1;
const BISHOP = 2;
const KNIGHT = 3;
const ROOK = 4;
const PAWN = 5;

const PIECE_NAMES = {
	"0": "king",
	"1": "queen",
	"2": "bishop",
	"3": "knight",
	"4": "rook", 
	"5": "pawn"
}

//Operations
const MOVE = 0;
const ADD = 64;			//Special case for URL encoding 8x8 board
const DELETE = 65;      //Special case for URL encoding 8x8 board

//Size of sprites!
const SPRITE_DIM = 200;

//
// !GLOBAL STATE!
//
var COMPONENTS = {
	spritesLoaded: false,
	clearArmed : null,
};

var STATE = {
	"armed" : null,   // Currently armed tool
	"activeTouch" : false,
	"pieces" : [],   //n x n array of pieces to display
	"fromSquare" : -1,
	"mouse" : {offsetx:0, offsety:0},
	"n" : 8,
	"inHand" : null,
	"squarePixels" : 0,
	"current" : WHITE,

	// These are filled with an array of "operations". These can be
	// moves, additions, or deletions. They're stored as objects of the
	// form:
	// {type: MOVE, from: x, to: x}
	// {type: ADD/DELETE, target: x}
	//
	//  where x is the coordinate of some square.
	//
	"thisTurn" : [],   // Operations made this turn!
	"lastTurn" : [],   // Operations made LAST turn!

	"indexToCoord" : function(i) {
		var row = Math.floor(i / this.n);
		var col = i % this.n;
		if (this.current == BLACK) {
			row = this.n - 1 - row;
			col = this.n - 1 - col;
		}
		return {row: row, col: col};
	},

	"mouseToIndex" : function(event) {		
		var col = Math.floor(event.offsetX/this.squarePixels);
		var row = Math.floor(event.offsetY/this.squarePixels);		
		if (this.current == BLACK) {
			col = this.n - 1 - col;
			row = this.n - 1 - row;
		}
		return row*this.n + col;
	},

	"trashCurrentPiece" : function() {
		this.thisTurn.push({type: DELETE, target:this.fromSquare});
		this.inHand = null;
		this.fromSquare = -1;
		render();
	},
};


//
// EVENT HANDLING
//

//On resize, update canvas size and rerender board
function resize() {
	var ctx = document.querySelector("#canvas").getContext("2d");

	//TODO do this on a tick....
	var dim = 8*Math.floor(0.95*Math.min(window.innerWidth, window.innerHeight)/8);
	STATE.squarePixels = dim/8;
	if (dim != ctx.canvas.width) {
		ctx.canvas.width = dim;
		ctx.canvas.height = dim;
		render(ctx);
	}	
}

function doTool(tool, i) {
	if (tool == "trash") {
		STATE.pieces[i] = null;
		STATE.thisTurn.push({type: DELETE, target:i});
	}
	else {
		STATE.pieces[i] = tool;
		STATE.thisTurn.push({type: ADD, target: i});
	}
	STATE.armed = null;
	COMPONENTS.clearArmed();
	render();
}

function liftPiece(i) {
	if (STATE.pieces[i]) {
		STATE.inHand = STATE.pieces[i];
		STATE.pieces[i] = null;
		STATE.fromSquare = i;

		//We've clickend on a new piece, clear the old selection!
		if (STATE.selectedPiece != i) {
			STATE.selectedPiece = null;
		}
	}
}

function setPiece(i) {
	if (STATE.inHand != null) {
		
		//Case where we set it back down where it was
		if (STATE.fromSquare == i) {
			if (STATE.selectedPiece != i) {
				STATE.selectedPiece = i;
			}
			else {
				STATE.selectedPiece = null;
			}
		}
		//Case where we put it somewhere new
		else {
			STATE.thisTurn.push({type: MOVE, from: STATE.fromSquare, to: i});
			STATE.selectedPiece = null;
		}

		STATE.pieces[i] = STATE.inHand;
		STATE.inHand = null;
		STATE.fromSquare = -1;
	} 
}

function colorOf(pieceCode) {
	var code = pieceCode.charCodeAt(0);
	if (code >= 65 && code <= 90) {
		return WHITE;
	}
	if (code >= 97 && code <= 122) {
		return BLACK;
	}
}

function sameColor(i, j) {
	var piece1 = STATE.pieces[i];
	var piece2 = STATE.pieces[j];
	if (piece1 == null || piece2 == null) {
		return false;
	}
	return colorOf(piece1) == colorOf(piece2);
}

//When we start an interaction, 
// !! there shouldn't be a piece in hand already.
// A) no existing selection, lift the piece
// B) This piece is already selected.. that's fine, just pick it up
// C) Another piece was selected. Then it depends who's color it is?
//      it also depends on whether we want to allow self capture! OH NO! That's super confusing.
//
//    I think the UI needs to show a special [x] in part of the cell to mark if we want to 
//    self capture.  Similar to the confusion around multiple pieces on a cell!
//
//    Self capture can also work by, SELECT PIECE, click SELF CAPURE TOOL, click DESTINATION.
//      rare enough that the extra clicks are fine.
// 
function startInteract(i) {
	if (STATE.armed) {
		doTool(STATE.armed, i);
	}
	else if (STATE.selectedPiece == null 
		|| STATE.selectedPiece == i 
		|| sameColor(STATE.selectedPiece, i)) {
		liftPiece(i);
	}
	else {
		liftPiece(STATE.selectedPiece);
		setPiece(i);
	}
	render();
}

function stopInteract(i) {
	setPiece(i);
	render();
}

function onMouseDown(event) {
	if (!STATE.activeTouch) {
		var i = STATE.mouseToIndex(event);
		STATE.mouse = event;
		startInteract(i);
	}
}

function onMouseUp(event) {
	if (!STATE.activeTouch) {
		var i = STATE.mouseToIndex(event);
		stopInteract(i);
	}
}

function onMouseMove(event) {
	if (!STATE.activeTouch && STATE.fromSquare > 0) {
		STATE.mouse = event;
		render();
	}
}

function canvasPosFromTouch(event) {
	var evt = (typeof event.originalEvent === 'undefined') ? event : event.originalEvent;
    var touch = evt.touches[0] || evt.changedTouches[0];
    x = touch.pageX;
    y = touch.pageY;
    var offset = $('#canvas').offset();
    var relx = x - offset.left;
    var rely = y - offset.top;
    return {offsetX: relx, offsetY: rely};
}

function onTouchStart(event) {
	event.preventDefault();	
	var mouse = canvasPosFromTouch(event);
	var i = STATE.mouseToIndex(mouse);
	STATE.mouse = mouse;
	STATE.activeTouch = true;
	startInteract(i);
}

function onTouchEnd(event) {
	event.preventDefault();	
	var mouse = canvasPosFromTouch(event);
	var i = STATE.mouseToIndex(mouse);
	STATE.activeTouch = true;
	stopInteract(i);
}

function onTouchMove(event) {
	event.preventDefault();	
	STATE.mouse = canvasPosFromTouch(event);
	render();
}

function onDropEvent(data, event) {
	var i = STATE.mouseToIndex(event);
	doTool(data, i);
}

//
// Clipboard handling!
//

function doOutputClicked() {
	//Select the element.
	var sel = window.getSelection();
	var range = document.createRange();
	range.selectNodeContents(COMPONENTS.output.get(0));
	sel.removeAllRanges();
	sel.addRange(range);

	document.execCommand("copy");

	COMPONENTS.output.addClass("animate");
	window.setTimeout(function() {
		COMPONENTS.output.removeClass("animate");
	}, 5000);	
}

//
//
//  !RENDERING!
//
//
function convertFenToRenderPiece(char) {
	var result = {};
	switch (char) {
		case 'p': return {color: BLACK, type: PAWN};
		case 'r': return {color: BLACK, type: ROOK};
		case 'n': return {color: BLACK, type: KNIGHT};
		case 'b': return {color: BLACK, type: BISHOP};
		case 'k': return {color: BLACK, type: KING};
		case 'q': return {color: BLACK, type: QUEEN};
		case 'P': return {color: WHITE, type: PAWN};
		case 'R': return {color: WHITE, type: ROOK};
		case 'B': return {color: WHITE, type: BISHOP};
		case 'N': return {color: WHITE, type: KNIGHT};
		case 'K': return {color: WHITE, type: KING};
		case 'Q': return {color: WHITE, type: QUEEN};
	}

	return {};
}

function drawPiece(ctx, img, size, coord, fen) {
	var piece = convertFenToRenderPiece(fen);
	var sleft = SPRITE_DIM*piece.type;
	var stop = SPRITE_DIM*piece.color;
	ctx.drawImage(img, sleft, stop, SPRITE_DIM, SPRITE_DIM, coord.col*size, coord.row*size, size, size);
}

function drawPiecePx(ctx, img, size, mouse, fen) {
	var piece = convertFenToRenderPiece(fen);
	var sleft = SPRITE_DIM*piece.type;
	var stop = SPRITE_DIM*piece.color;
	ctx.drawImage(img, sleft, stop, SPRITE_DIM, SPRITE_DIM, mouse.offsetX - size/2, mouse.offsetY - size/2, size, size);
}

function drawArrow(ctx, size, originCoord, endCoord) {
	var linewidth = ctx.lineWidth;

	var xo = size*originCoord.col + size/2;
	var yo = size*originCoord.row + size/2;
	var xe = size*endCoord.col + size/2;
	var ye = size*endCoord.row + size/2;

	var theta = Math.atan2(yo - ye, xo - xe);
	var theta1 = theta + Math.PI / 4;
	var theta2 = theta - Math.PI / 4;

	var x1 = xe + (size/4)*Math.cos(theta1);
	var y1 = ye + (size/4)*Math.sin(theta1);

	var x2 = xe + (size/4)*Math.cos(theta2);
	var y2 = ye + (size/4)*Math.sin(theta2);

	var dx = linewidth*Math.cos(theta + Math.PI/2)/2;
	var dy = linewidth*Math.sin(theta + Math.PI/2)/2;

	//Clean, but middle is double size!
	// ctx.beginPath();
	// ctx.moveTo(xo+dx, yo+dy);
	// ctx.lineTo(xe+dx, ye+dy);
	// ctx.lineTo(x1+dx, y1+dy);
	// ctx.moveTo(xo-dx, yo-dy);
	// ctx.lineTo(xe-dx, ye-dy);
	// ctx.lineTo(x2-dx, y2-dy);
	// ctx.stroke();

	ctx.beginPath();
	ctx.moveTo(xo, yo);
	ctx.lineTo(xe, ye);
	ctx.stroke();

	ctx.beginPath();
	ctx.moveTo(xe+dx, ye+dy);
	ctx.lineTo(x2+dx, y2+dy);
	ctx.moveTo(xe-dx, ye-dy);
	ctx.lineTo(x1-dx, y1-dy);
	ctx.stroke();
}

function drawCross(ctx, size, coord) {
	var x = size*(coord.col+0.5);
	var y = size*(coord.row+0.5);
	var d = 0.8*size/2;

	ctx.beginPath();
	ctx.moveTo(x-d, y-d);
	ctx.lineTo(x+d, y+d);

	ctx.moveTo(x+d, y-d);
	ctx.lineTo(x-d, y+d);
	ctx.stroke();
}

function drawBorder(ctx, size, coord) {
	var x = size*(coord.col);
	var y = size*(coord.row);

	ctx.beginPath();
	ctx.rect(x, y, size, size);
	ctx.stroke();	
}

// Render the canvas
function render() {
	var ctx = COMPONENTS.ctx;

	var size = STATE.squarePixels;

	// Draw board
	for (var i = 0; i < 64; i++) {
		var row = Math.floor(i / 8);
		var col = i % 8;
		if (STATE.current == BLACK) {
			row = STATE.n - 1 - row;
			col = STATE.n - 1 - col;
		}
		if (i == STATE.fromSquare || i == STATE.selectedPiece) {
			ctx.fillStyle = "#CCFFCC";
		}
		else if ((row%2)==(col%2)) {
			ctx.fillStyle = "#FFDDDD";
		}
		else {
			ctx.fillStyle = "#3333FF";
		}
		
		ctx.fillRect(col*size, row*size, size, size);
	}


	var img = document.querySelector("#sprites");

	// Draw pieces! 
	for (var i = 0; i < STATE.n * STATE.n; i++) {
		var coord = STATE.indexToCoord(i);
		var piece = STATE.pieces[i];
		if (piece != null) {
			drawPiece(ctx, img, size, coord, piece);
		}
	}

	// If there's a piece in hand, draw it at the mouse
	if (STATE.inHand != null) {		
		drawPiecePx(ctx, img, size, STATE.mouse, STATE.inHand);
	}

	// Draw arrows for recorded moves OR for previous moves
	var opList = STATE.thisTurn.length > 0 ? STATE.thisTurn : STATE.lastTurn;
	ctx.strokeStyle = STATE.thisTurn.length > 0 ? "#2c2" : "#a33";
	ctx.lineWidth = size/20;

	for (var i = 0; i < opList.length; i++) {
		var op = opList[i];
		switch(op.type) {
			case MOVE:
				var from = STATE.indexToCoord(op.from);
				var to = STATE.indexToCoord(op.to);
				drawArrow(ctx, size, from, to);
				break;
			case ADD:			
				drawBorder(ctx, size, STATE.indexToCoord(op.target));
				break;
			case DELETE:
				drawCross(ctx, size, STATE.indexToCoord(op.target));
				break;
		}
	}

	//Generate the URL for the new board state
	var fen = "";
	var blankCount = 0;
	for (var i = 0; i < STATE.n * STATE.n; i++) {
		var piece = STATE.pieces[i];
		if (piece != null) {
			//If there were blanks, add them
			if (blankCount > 0) {
				while (blankCount > 8) {
					fen += 8;
					blankCount -= 8;
				}
				fen += blankCount;
				blankCount = 0;
			}
			fen += piece;
		}
		else {
			blankCount++;
		}
	}

	//TODO pull this out
	var lastTurn = "";
	for (var i = 0; i < STATE.thisTurn.length; i++) {
		var op = STATE.thisTurn[i];
		switch(op.type) {
			case MOVE:
				lastTurn += CHARS[op.from];
				lastTurn += CHARS[op.to];
				break;

			default:
				lastTurn += CHARS[op.type];
				lastTurn += CHARS[op.target];
				break;

		}
	}

	//If we've recorded a move, then show the output URL
	if (STATE.thisTurn.length > 0) {
		var nextMove = 1 - STATE.current;
		var url = window.location.origin + window.location.pathname; 
		url += "?pos=" + nextMove + fen;
		url += "?last=" + lastTurn;
		COMPONENTS.output.text(url);
	}
	else {
		COMPONENTS.output.text(" ");
	}
}


function decodeFen(char) {
	var result = {};
	
	var code = char.charCodeAt(0);
	if (code == 48) {
		return {space: 10};
	}
	else if (code > 48 && code < 58) { //'0' to '9'
		return {space: code - 48};
	}
	else if (CHARS.includes(char)) {
		return {space: 1, piece: char};
	}

	return {};
}

//Keep trying to resize board until it isn't tiny.... hopefully this fixes start up on some phones
function checkSize() {
	if (STATE.squarePixels < 10) {
		if (COMPONENTS.spritesLoaded) {
			resize();
		}
		else {
			window.setTimeout(function() {checkSize();}, 1000);
		}
	}
}

function spritesLoaded() {
	COMPONENTS.spritesLoaded = true;
}

$(document).ready(function() {
	COMPONENTS.canvas = document.querySelector("#canvas");
	COMPONENTS.ctx = COMPONENTS.canvas.getContext("2d");	

	console.log(window.location);


	var sPageURL = window.location.search.substring(1);
	var sURLVar = sPageURL.split("?");
	var parameters = {};
	for (var i = 0; i < sURLVar.length; i++) {
		var nameVal = sURLVar[i].split("=");
		parameters[nameVal[0]] = nameVal[1];
	}

	COMPONENTS.output = $("#output");
	COMPONENTS.output.click(doOutputClicked);

	// Parse / default position
	var pos = parameters.pos;
	if (pos == null) {
		pos = "0_rnbqkbnr_pppppppp_8_8_8_8_PPPPPPPP_RNBQKBNR"
	}
	pos = pos.replaceAll("_", "");

	// Strip off first character as current player
	STATE.current = parseInt(pos.charAt(0));

	// Parse board string and set up state.
	var fen = pos.substring(1);
	var square = 0;
	for (var i = 0; i < fen.length; i++) {
		var decode = decodeFen(fen.charAt(i));	
		if ("piece" in decode) {
			STATE.pieces[square] = decode.piece;
		}
		if ("space" in decode) {
			square += decode.space; 
		}
	}

	// Parse last turn arrows
	if (parameters.last != null) {
		var last = parameters.last;
		for (var i = 0; i < last.length - 1; i+=2) {
			var from = CHARS.indexOf(last.charAt(i));
			var to = CHARS.indexOf(last.charAt(i+1));
			if (from < 64) {
				STATE.lastTurn.push({type: MOVE, from: from, to: to});
			}
			else if (from == ADD) {
				STATE.lastTurn.push({type: ADD, target: to});
			}
			else if (from == DELETE) {
				STATE.lastTurn.push({type: DELETE, target: to});
			}
		}
	}

	$(window).resize(function() {
		resize();
	});

	resize();
	checkSize();

	$('#trash').get(0).addEventListener('dragstart', function (event) {
	  event.dataTransfer.setData( 'text/plain', 'trash');
	});


	$('#trash').mouseup(function() {
		STATE.trashCurrentPiece();
	});

	$('#canvas').get(0).addEventListener('dragover', function (event) {
		event.dataTransfer.dropEffect = "move";
    	event.preventDefault();
	});

	$('#canvas').get(0).addEventListener('drop', function(event) {
		var data = event.dataTransfer.getData("text");
		onDropEvent(data, event);
	});


	$("#canvas").mousedown(onMouseDown).mouseup(onMouseUp).mousemove(onMouseMove);
	COMPONENTS.canvas.addEventListener('touchstart', onTouchStart);
	COMPONENTS.canvas.addEventListener('touchend', onTouchEnd);
	COMPONENTS.canvas.addEventListener('touchmove', onTouchMove);


	var adders = document.querySelectorAll(".add");
	for (var i = 0; i < adders.length; i++) {
		var el = adders[i];

		el.addEventListener('dragstart', function(event) {
			event.dataTransfer.setData('text/plain', this.id);
		}.bind(el));
	}

	var toolButtons = $(".tool");
	toolButtons.click(function(event) {
		if ($(this).hasClass("armed")) {
			$(this).removeClass("armed");
			STATE.armed = null;
		}
		else {
			toolButtons.removeClass("armed");
			$(this).toggleClass("armed");
			STATE.armed = this.id;
		}
	});

	COMPONENTS.clearArmed = function() { 
		toolButtons.removeClass("armed");
		//HACK TO REFRESH
		resize();
	};
});

