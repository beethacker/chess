

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
	"mouseDownSquare" : -1,
	"mouse" : {offsetx:0, offsety:0},
	"n" : 8,
	"pieces" : [],
	"inHand" : null,
	"squarePixels" : 1,
	"recorded" : [],
	// "undoHistory" : [],
	"lastTurn" : [],


	"indexToCoord" : function(i) {
		return {row: Math.floor(i / this.n), col: i % this.n};
	},

	"mouseToIndex" : function(event) {
		var col = Math.floor(event.offsetX/this.squarePixels);
		var row = Math.floor(event.offsetY/this.squarePixels);
		//TODO do we need to clamp these?
		return row*this.n + col;
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
	//We're holding a piece while the mouse isn't down? We probably released while
	//outside the canvas. Just place the piece instead!
	if (STATE.inHand != null) {
		onMouseUp(event);
		return;
	}

	var i = STATE.mouseDownSquare = STATE.mouseToIndex(event);
	STATE.mouse = event;
	STATE.inHand = STATE.pieces[i];
	STATE.pieces[i] = null;
	render();
}

function onMouseUp(event) {
	if (STATE.inHand != null) {
		var i = STATE.mouseToIndex(event);

		if (STATE.mouseDownSquare != i) {
			STATE.recorded.push({from: STATE.mouseDownSquare, to: i});
			console.log(STATE.recorded);
		}

		STATE.pieces[i] = STATE.inHand;
		STATE.inHand = null;		
	}
	STATE.mouseDownSquare = -1;
	STATE.mouse = null;
	render();
}

function onMouseMove(event) {
	if (STATE.mouseDownSquare > 0) {
		STATE.mouse = event;
		render();
	}
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

// Render the canvas
function render() {
	var ctx = COMPONENTS.ctx;

	var size = STATE.squarePixels;

	// Draw board
	for (var i = 0; i < 64; i++) {
		var row = Math.floor(i / 8);
		var col = i % 8;
		if (i == STATE.mouseDownSquare) {
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

	//If we've recorded a move, then show the output
	if (STATE.recorded.length > 0) {
		COMPONENTS.output.text(window.location.origin + window.location.pathname + "?fen=" + fen);
	}
	else {
		COMPONENTS.output.text("");
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
	console.log(sPageURL);
	var sURLVar = sPageURL.split("&");
	var parameters = {};
	for (var i = 0; i < sURLVar.length; i++) {
		var nameVal = sURLVar[i].split("=");
		parameters[nameVal[0]] = nameVal[1];
	}
	console.log(parameters);

	COMPONENTS.output = $("#output");
	COMPONENTS.output.click(doOutputClicked);

	// console.log(fen);
	/*
	console.log("a =>" + "a".charCodeAt(0));
	console.log("z =>" + "z".charCodeAt(0));
	console.log("A =>" + "A".charCodeAt(0));
	console.log("Z =>" + "Z".charCodeAt(0));
	console.log("0 =>" + "0".charCodeAt(0));
	*/
	var fen = parameters.fen;
	if (fen == null) {
		fen = "rnbqkbnr_pppppppp_8_8_8_8_PPPPPPPP_RNBQKBNR"
	}
	fen = fen.replaceAll("_", "");

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
	console.log(STATE.pieces);

	resize();

	window.setTimeout(function () { 
		// window.location = "index.html?nocache=" + (new Date()).getTime();
	}, 4000); 

	$(window).resize(function() {
		resize();
	});
});