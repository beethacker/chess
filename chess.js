//Auto reload. Ideally we'd only do this when our time stamps change, so we want a 
//a little utility that updates another file that we read for a timestamp, etc.
window.setTimeout(function () {
   // window.location = "index.html?nocache=" + (new Date()).getTime();
}, 4000);

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

function makePieceImg(piece) {
	var scale = 1;
	var top = scale*200*piece.color;
	var bottom = top + scale*200;
	var left = scale*200*piece.type;
	var right = left + scale*200;
	right = 1200;
	bottom = 400;
	var w = 200;
	var h = 200;

	return `<div class="piece" style="width:${w}px;height:${h}px;"><img src="sprites.png" class="piece" style="margin-left: ${-left}px; width: ${right}px; margin-top: ${-top}px; height: ${bottom}px;transform:scale(${scale})"></div></div>`;
}

function drawPiece(coord, piece) {
	$("#" + coord).empty().append(makePieceImg(piece));
}

function render(state) {
	console.log("Render: " + state);

	//NOTE for now, let's just stub in the stuff.
	drawPiece("03", {color:WHITE, type:ROOK});
	drawPiece("77", {color:BLACK, type:QUEEN});
	drawPiece("test", {color:BLACK, type:QUEEN});
}

$(document).ready(function() {
	for (var i = 0; i < 64; i++) {
		var row = Math.floor(i / 8);
		var col = i % 8;
		var color = ((row % 2) == (col % 2)) ? "white" : "black";
		var coord = "" + row + col;
		$("#board").append(`<div id=${coord} class="square ${color}"/>`);
	}
	render();
});