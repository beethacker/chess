window.setTimeout(function () { 
	// window.location = "index.html?nocache=" + (new Date()).getTime();
}, 4000); 

$(window).resize(function() {
	resize();
});

const CHARS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_";
//a=97
//A=65

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

var state = {
	"mouseDown" : false,
	"pieces" : [],
	"inHand" : null
};

function resize() {
	var ctx = document.querySelector("#canvas").getContext("2d");

	//TODO do this on a tick....
	var dim = 8*Math.floor(0.7*Math.min(window.innerWidth, window.innerHeight)/8);
	if (dim != ctx.canvas.width) {
		ctx.canvas.width = dim;
		ctx.canvas.height = dim;
		render(ctx, "");
	}	
}

function onMouseDown(event) {
	// console.log(event);
	state.mouseDown = true;
}

function onMouseUp(event) {
	// console.log(event);
	state.mouseDown = false;
}

function onMouseMove(event) {
	if (state.mouseDown) {
		// console.log("Move: " + event.offsetX + ", " + event.offsetY);
	}
}

function drawPiece(ctx, img, size, coord, piece) {
	var sleft = SPRITE_DIM*piece.type;
	var stop = SPRITE_DIM*piece.color;
	ctx.drawImage(img, sleft, stop, SPRITE_DIM, SPRITE_DIM, coord.col*size, coord.row*size, size, size);
}

function render(ctx) {
	console.log("Render: " + state);
	ctx.fillStyle = "#000000";
	ctx.fillRect(0, 0, 400, 400);

	ctx.fillStyle = "#F0DB4F";
	ctx.fillRect(50, 50, 200, 200);


	var size = Math.floor(ctx.canvas.width / 8);
	for (var i = 0; i < 64; i++) {
		var row = Math.floor(i / 8);
		var col = i % 8;
		if ((row%2)==(col%2)) {
			ctx.fillStyle = "#FFDDDD";
		}
		else {
			ctx.fillStyle = "#3333FF";
		}
		
		ctx.fillRect(col*size, row*size, size, size);
	}


	var img = document.querySelector("#sprites");
	//NOTE for now, let's just stub in the stuff.
	/*
	drawPiece(ctx, img, size, {row:0, col:2}, {color:WHITE, type:ROOK});
	drawPiece(ctx, img, size, {row:7, col:7}, {color:BLACK, type:QUEEN});
	for (var i = 0; i < 7; i++) {
		drawPiece(ctx, img, size, {row:1, col:i}, {color:WHITE, type:PAWN});
		drawPiece(ctx, img, size, {row:6, col:i}, {color:BLACK, type:PAWN});
	}
	*/
	for (var i = 0; i < state.pieces.length; i++) {
		var piece = state.pieces[i];
		drawPiece(ctx, img, size, piece, piece);
	}
}

function fenPiece(char) {
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

	var code = char.charCodeAt(0);
	if (code == 48) {
		return {space: 10};
	}
	else if (code > 48 && code < 58) {
		return {space: code - 48};
	}

	return {};
}

$(document).ready(function() {
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



	//TODO we'll grab this from url in a minute, but for now, lets hardcode in
	//a list of 64 squares, each showing whats on it. we can use FEN notation here
	//that gives a pretty compressed sense of it. ignore _.
	// board, turn, castle availability, en passant availability, turn num.


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
		fen = "rnbqkbnr_pppppppp_8_8_8_8_PPPPPPPP_RNBQKBNR";
	}
	fen = fen.replaceAll("_", "");

	var square = 0;
	for (var i = 0; i < fen.length; i++) {
		var piece = fenPiece(fen.charAt(i));	
		if ("color" in piece) {
			piece.row = Math.floor(square/8);
			piece.col = square%8;
			state.pieces.push(piece);
			square++;
		}
		else if ("space" in piece) {
			square += piece.space; 
		}
		else {
			alert("can't parse: " + fen[i]);
		}
	}
	console.log(state.pieces);

	resize();
});