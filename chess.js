//
//
// Constants
//
//
const CHARS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_";

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

const WHITE = 0;
const BLACK = 1;

const SPRITE_DIM = 200;

//
// !GLOBAL STATE!
//
var COMPONENTS = {};

var STATE = {
	"pieces" : [],   //n x n array of pieces to display
	"fromSquare" : -1,
	"mouse" : {offsetx:0, offsety:0},
	"n" : 8,
	"inHand" : null,
	"squarePixels" : 0,
	"current" : WHITE,

	//TODO maybe this is two arrays of markers, and each stores its type,
	// and we draw them? 
	// {type: MOVE, from: , to: }
	// {type: DELETE, square:, piece: }
	// {type: ADD, square:, piece: }
	"recorded" : [],   // moves this turn
	"trashed" : [],    // trashed this turn
	"added" : [],	   // added this turn

	"lastTurn" : [],   // moves last turn
	"lastTurnTrashed" : [],  // trashed last turn
	"lastTurnAdded" : [],    // added last turn


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
		this.inHand = null;
		this.fromSquare = -1;
		//TODO we want to mark this as deleted, so note the from square!
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
	var dim = 8*Math.floor(0.7*Math.min(window.innerWidth, window.innerHeight)/8);
	STATE.squarePixels = dim/8;
	if (dim != ctx.canvas.width) {
		ctx.canvas.width = dim;
		ctx.canvas.height = dim;
		render(ctx);
	}	
}

function onMouseDown(event) {
	var i = STATE.mouseToIndex(event);

	//Are we holding a piece? 
	if (STATE.inHand != null) {	
		//If this is the original square, put it down!
		if (STATE.fromSquare == i) {
			STATE.pieces[i] = STATE.inHand;
			STATE.inHand = null;
		}
		//Otherwise, place the piece (basically just a mouse up!)
		else {
			onMouseUp(event);
			return;
		}
	}
	//Not holding a piece, pick one up!
	else {
		STATE.mouse = event;
		STATE.inHand = STATE.pieces[i];
		STATE.pieces[i] = null;
		STATE.fromSquare = i;
	}
	render();
}

function onMouseUp(event) {
	//If we're holding a piece, place it on the current square.
	if (STATE.inHand != null) {
		var i = STATE.mouseToIndex(event);

		//If we release in the same square, ignore the click, and place the piece with
		//the next mouse down instead!
		if (STATE.fromSquare == i) {
			return;
		}

		if (STATE.fromSquare != i) {
			STATE.recorded.push({from: STATE.fromSquare, to: i});
		}

		STATE.pieces[i] = STATE.inHand;
		STATE.inHand = null;		
	}
	STATE.fromSquare = -1;
	STATE.mouse = null;
	render();
}

function onMouseMove(event) {
	if (STATE.fromSquare > 0) {
		STATE.mouse = event;
		render();
	}
}

function onDropEvent(data, event) {
	var i = STATE.mouseToIndex(event);
	if (data == "trash") {
		STATE.pieces[i] = null;
	}
	else {
		STATE.pieces[i] = data;
	}
	render();
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
		if (i == STATE.fromSquare) {
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
	var arrowMoves = STATE.recorded.length > 0 ? STATE.recorded : STATE.lastTurn;
	ctx.strokeStyle = STATE.recorded.length > 0 ? "#2c2" : "#a33";
	ctx.lineWidth = size/20;

	for (var i = 0; i < arrowMoves.length; i++) {
		var from = STATE.indexToCoord(arrowMoves[i].from);
		var to = STATE.indexToCoord(arrowMoves[i].to);
		drawArrow(ctx, size, from, to);
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

	var lastTurn = "";
	for (var i = 0; i < STATE.recorded.length; i++) {
		var move = STATE.recorded[i];
		lastTurn += CHARS[move.from];
		lastTurn += CHARS[move.to];
	}

	//If we've recorded a move, then show the output
	if (STATE.recorded.length > 0) {
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
	else if (code > 48 && code < 58) {
		return {space: code - 48};
	}
	else if (CHARS.includes(char)) {
		return {space: 1, piece: char};
	}

	return {};
}

$(document).ready(function() {

	COMPONENTS.canvas = document.querySelector("#canvas");
	COMPONENTS.ctx = COMPONENTS.canvas.getContext("2d");	

	console.log(window.location);

	$("#canvas").mousedown(onMouseDown).mouseup(onMouseUp).mousemove(onMouseMove);

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
			STATE.lastTurn.push({from: from, to: to});
		}
	}

	resize();

	$(window).resize(function() {
		resize();
	});

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
		console.log(data);
		onDropEvent(data, event);
	});


	var adders = document.querySelectorAll(".add");
	console.log(adders);
	console.log(adders.length);
	for (var i = 0; i < adders.length; i++) {
		var el = adders[i];

		el.addEventListener('dragstart', function(event) {
			event.dataTransfer.setData('text/plain', this.id);
		}.bind(el));
	}

});