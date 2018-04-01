var express = require('express');
//var path = require('path');
var app = express();
var serv = require('http').Server(app);

app.use(express.static(__dirname+ '/cliente'));

app.get('/', function(req,res){
	res.sendFile(__dirname+ '/cliente/game.html');
	//res.send(path.join(__dirname + '/cliente/game.html'));
});

serv.listen(2000);
console.log("Server started");

var n_clients  = 0;
var jugadores_listos = 0;
var score_jugadores = [0,0];
var socketInfo = {};
var io = require('socket.io')(serv,{});

function cuantosClientes(){
	console.log( "Actualmente hay "+n_clients+" clientes");
}

var paddles = [2];
var ball = {};
var paddleHit; 
var multiplier = 1;
var W=800,H=700;
var initGameTimeout;
var gameOver = false;
// Ball object
ball = {
	x: 50,
	y: 50, 
	r: 5,
	c: "green",
	vx: 4,
	vy: 8
};

function nextMatch(){
	ball = {
		x: 50,
		y: 50, 
		r: 5,
		c: "green",
		vx: 4,
		vy: 8
	};
}

// Function to increase speed after every 5 points
function increaseSpd() {
	//if(score_jugadores[0] % 2 === 0  ||  score_jugadores[1] % 2 === 0 ) {
		if(Math.abs(ball.vx) < 25) {
			ball.vx += (ball.vx < 0) ? -1 : 1;
			ball.vy += (ball.vy < 0) ? -2 : 2;
		}
	//}
}

// Function for creating paddles
function Paddle(pos) {
	// Height and width
	this.h = 5;
	this.w = 150;
	
	// Paddle's position
	this.x = W/2 - this.w/2;
	this.y = (pos == "top") ? 0 : H - this.h;
}

// Push two new paddles into the paddles[] array
paddles.push(new Paddle("bottom"));
paddles.push(new Paddle("top"));

//Function to check collision between ball and one of
//the paddles
function collides(b, p) {
	if(b.x + ball.r >= p.x && b.x - ball.r <=p.x + p.w) {
		if(b.y >= (p.y - p.h) && p.y > 0){
			paddleHit = 1;
			io.sockets.emit('playSound',{msg:"hit"});
			return true;
		}
		
		else if(b.y <= p.h && p.y == 0) {
			paddleHit = 2;
			io.sockets.emit('playSound',{msg:"hit"});
			return true;
		}
		
		else return false;
	}
}

//Do this when collides == true
function collideAction(ball, p) {
	ball.vy = -ball.vy;
	
	if(paddleHit == 1) {
		ball.y = p.y - p.h;
		//particlePos.y = ball.y + ball.r;
		multiplier = -1;	
	}
	
	else if(paddleHit == 2) {
		ball.y = p.h + ball.r;
		//particlePos.y = ball.y - ball.r;
		multiplier = 1;	
	}
	
	//##/points++;
	increaseSpd();
	
	// if(collision) {
	// 	if(points > 0) 
	// 		//collision.pause();
		
	// 	collision.currentTime = 0;
	// 	//##/collision.play();
	// }
	
	//##/particlePos.x = ball.x;
	//##/flag = 1;
}

function finishGame5(){
	clearTimeout(initGameTimeout);
	console.log("Finished game!!!");
	if(!gameOver){ 
		gameOver = true;
		io.sockets.emit('stopGame',{data:"Finished!!"});
		//io.sockets.emit('playSound',{msg:"finished"});
	}
	 // var stack = new Error().stack;
	 //  console.log("PRINTING CALL STACK");
	 //  console.log( stack );
}

function initGame(){
	// Move the ball
	ball.x += ball.vx;
	ball.y += ball.vy;
	io.sockets.emit('updateBall',{ball:ball});
	
	// Collision with paddles
	var p1 = paddles[1];
	var p2 = paddles[2];
	//io.sockets.emit('updatePaddle',{paddles:paddles});

	
	// If the ball strikes with paddles,
	// invert the y-velocity vector of ball,
	// increment the points, play the collision sound,
	// save collision's position so that sparks can be
	// emitted from that position, set the flag variable,
	// and change the multiplier
	if(collides(ball, p1)) {
		collideAction(ball, p1);
	}
	
	
	else if(collides(ball, p2)) {
		collideAction(ball, p2);
	} 
	
	else {
		// Collide with walls, If the ball hits the top/bottom,
		// walls, run gameOver() function

		if(ball.y + ball.r > H) {
			ball.y = H - ball.r;
			score_jugadores[1]++;
			nextMatch();
			io.sockets.emit('updateScore',{scoreP1:score_jugadores[0],scoreP2:score_jugadores[1]});
			if(score_jugadores[1] >= 3){
				finishGame5();
				//gameOver = true;
			}
		}else if(ball.y < 0) {
			ball.y = ball.r;
			score_jugadores[0]++;
			nextMatch();
			io.sockets.emit('updateScore',{scoreP1:score_jugadores[0],scoreP2:score_jugadores[1]});
			if(score_jugadores[0] >= 3){
				finishGame5();
				//gameOver = true;
			}
		}
		
		// If ball strikes the vertical walls, invert the 
		// x-velocity vector of ball
		if(ball.x + ball.r > W) {
			ball.vx = -ball.vx;
			ball.x = W - ball.r;
		}
		else if(ball.x -ball.r < 0) {
			ball.vx = -ball.vx;
			ball.x = ball.r;
		}
	}

	initGameTimeout = setTimeout( initGame , 100); //setTimeout(function(){initGame()}, 100);
}
var jugadores = [0,0];
io.sockets.on('connection',function(socket){
	console.log('socket connection');
	n_clients++; 
	cuantosClientes();
	socketInfo[socket.id]  = [];
	socketInfo[socket.id].socket =  socket;
	socketInfo[socket.id].usuario =  n_clients;
	var jugador = -1;
	if(jugadores[0] === 0){
		jugador = 1;
		jugadores[0] = 1;
	}else if(jugadores[1] === 0){
		jugador = 2;
		jugadores[1] = 1;
	}
	socketInfo[socket.id].player =  jugador;
	console.log("Client id:" + socket.id );

	socket.on('requestId',function(data){
		console.log("test:" + data.reason);
		var user_id = socketInfo[socket.id].player;
		socket.emit('sendID',{msg:user_id,ball:ball,paddles:paddles,score_jugadores:score_jugadores});
	});

	socket.on('sendPositionCursor', function(data) { 
		paddles[data.usuario].x = data.x;
		socket.broadcast.emit('positionPlayer',{ position : data });
	});

	socket.on('msgChat', function(data) { 
		socket.broadcast.emit('updateChat',{ data });
	});

	socket.on('playerReady', function(data) { 
		var msg = "<i>Player "+ data.usuario + " ready.</i><hr>";
		var dat ={msg:msg};
		socket.broadcast.emit('updateChat',{ data : dat});
		console.log("Player "+ data.usuario + " ready.");
		jugadores_listos++;
		console.log("Jugadores actuales listos:" + jugadores_listos);
		if(jugadores_listos === 2){
			io.sockets.emit('startGame', { start: 1 });
			jugadores_listos = 0;
			gameOver = false;
			score_jugadores[0] = score_jugadores[1] = 0;
			nextMatch();
			initGame();
		}
	});

	socket.on('disconnect', function() { 
		n_clients--;
		if(socketInfo[socket.id].player === 1){
			jugadores[0] = 0;
		}else if(socketInfo[socket.id].player === 2){
			jugadores[1] = 0;
		}
		// if( socketInfo[socket.id].usuario === 1 && Object.keys(socketInfo).length > 1 )
		// {

		// }else if( socketInfo[socket.id].usuario === 2 && Object.keys(socketInfo).length > 1 ){

		// }
		delete socketInfo[socket.id]; 
		cuantosClientes();
	});

	socket.emit('server',{msg:'From Server'});	
});