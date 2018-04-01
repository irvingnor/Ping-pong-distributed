// RequestAnimFrame: a browser API for getting smooth animations
window.requestAnimFrame = (function(){
	return  window.requestAnimationFrame       || 
		window.webkitRequestAnimationFrame || 
		window.mozRequestAnimationFrame    || 
		window.oRequestAnimationFrame      || 
		window.msRequestAnimationFrame     ||  
		function( callback ){
			return window.setTimeout(callback, 1000 / 60);
		};
})();

window.cancelRequestAnimFrame = ( function() {
	return window.cancelAnimationFrame          ||
		window.webkitCancelRequestAnimationFrame    ||
		window.mozCancelRequestAnimationFrame       ||
		window.oCancelRequestAnimationFrame     ||
		window.msCancelRequestAnimationFrame        ||
		clearTimeout
} )();


// Initialize canvas and required variables
var container = document.getElementById("game");
var canvas = document.getElementById("canvas"),
		ctx = canvas.getContext("2d"), // Create canvas context
		W = 800,//window.innerWidth /2, // Window's width
		H = 700,//window.innerHeight, // Window's height
		particles = [], // Array containing particles
		ball = {}, // Ball object
		paddles = [2], // Array containing two paddles
		mouse = {}, // Mouse object to store it's current position
		points = 0, // Varialbe to store points
		fps = 60, // Max FPS (frames per second)
		particlesCount = 20, // Number of sparks when ball strikes the paddle
		flag = 0, // Flag variable which is changed on collision
		particlePos = {}, // Object to contain the position of collision 
		multipler = 1, // Varialbe to control the direction of sparks
		startBtn = {}, // Start button object
		restartBtn = {}, // Restart button object
		over = 0, // flag varialbe, cahnged when the game is over
		init, // variable to initialize animation
		paddleHit;
var score_jugadores = [0,0];

// Add mousemove and mousedown events to the canvas
container.addEventListener("mousemove", trackPosition, true);
container.addEventListener("mousedown", btnClick, true);

// Initialise the collision sound
var collision = document.getElementById("collide");
var perder    = document.getElementById("perder");

// Set the canvas's height and width to full screen
canvas.width = W;
canvas.height = H;

function sendServerData(){
	socket.emit('requestId',{reason:'ping'});
}

socket.on('sendID',function(data){
	console.log("Id del usuario:" + data.msg);
	ball = data.ball;
	paddles = data.paddles;
	usuario_id = data.msg;
	if(usuario_id === -1){
		nombre_chat = "Espectador "+Math.floor(Math.random() * 300);
	}
	else
		nombre_chat = "Jugador "+usuario_id;
	score_jugadores = data.score_jugadores;
	var msg_user = nombre_chat; //( usuario_id !== -1)?"Jugador "+usuario_id: "Espectador" ;
	$("#nUser").text( msg_user );
	if( usuario_id !== -1)
		startBtn.draw();
});

// Function to paint canvas
function paintCanvas() {
	ctx.fillStyle = "black";
	ctx.fillRect(0, 0, W, H);
}

//###################BallObj


// Start Button object
startBtn = {
	w: 100,
	h: 50,
	x: W/2 - 50,
	y: H/2 - 25,
	
	draw: function() {
		ctx.strokeStyle = "blue";
		ctx.lineWidth = "2";
		ctx.strokeRect(this.x, this.y, this.w, this.h);
		
		ctx.font = "18px Arial, sans-serif";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillStlye = "Green";
		ctx.fillText("Start", W/2, H/2 );
	}
};

// Restart Button object
restartBtn = {
	w: 100,
	h: 50,
	x: W/2 - 50,
	y: H/2 - 50,
	
	draw: function() {
		ctx.strokeStyle = "green";
		ctx.lineWidth = "2";
		ctx.strokeRect(this.x, this.y, this.w, this.h);
		
		ctx.font = "18px Arial, sans-serif";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillStlye = "white";
		ctx.fillText("Restart", W/2, H/2 - 25 );
	}
};

// Function for creating particles object
function createParticles(x, y, m) {
	this.x = x || 0;
	this.y = y || 0;
	
	this.radius = 1.2;
	
	this.vx = -1.5 + Math.random()*3;
	this.vy = m * Math.random()*1.5;
}

// Draw everything on canvas
function draw() {
	paintCanvas();
	for(var i = 0; i < paddles.length; i++) {
		p = paddles[i];
		
		ctx.fillStyle = "green";
		ctx.fillRect(p.x, p.y, p.w, p.h);
	}

	//ball.draw();
	drawBall(ball);
	update();
	socket.on('positionPlayer',function(data){
		p = paddles[data.position.usuario];
		p.x = data.position.x;
	});
}

function drawBall(ball){
	ctx.beginPath();
	ctx.fillStyle = ball.c;
	ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI*2, false);
	ctx.fill();
}

// Track the position of mouse cursor
function trackPosition(e) {
	mouse.x = e.pageX;//-225;  559
	mouse.y = e.pageY;
	// if( usuario_id !== -1 && over == 0)
	// 	socket.emit('sendPositionCursor',{usuario:usuario_id,x:mouse.x});
	if( usuario_id !== -1 && over == 0){
		p = paddles[usuario_id]; //1
		p.x = mouse.x - p.w/2;		
		socket.emit('sendPositionCursor',{usuario:usuario_id,x:p.x});
	}
}

// Function to update positions, score and everything.
// Basically, the main game logic is defined here
function update() {
	
	// Update scores
	updateScore(); 
	
	// Move the paddles on mouse move
	if(mouse.x && mouse.y) {
		// for(var i = 1; i < paddles.length; i++) {
		// 	p = paddles[i];
		// 	p.x = mouse.x - p.w/2;
		// }
		// if( usuario_id !== -1 && over == 0){
		// 	p = paddles[usuario_id]; //1
		// 	p.x = mouse.x - p.w/2;		
		// 	socket.emit('sendPositionCursor',{usuario:usuario_id,x:p.x});
		// }
	}

	//Update ball position and verify collisions	
	socket.on('updateBall',function(data){
		ball = data.ball;
	});

	//Update the paddles
	// socket.on('updatePaddle',function(data){
	// 	if(usuario_id === -1){
	// 		paddles[1]  = data.paddles[1];
	// 		paddles[2]  = data.paddles[2];
	// 	}else{
	// 		console.log("Update Paddle"+JSON.stringify(JSON.stringify(data)) );
	// 		console.log("User id:"+usuario_id);
	// 		console.log("P1:"+JSON.stringify(data.paddles[1]));
	// 		console.log("P2:"+JSON.stringify(data.paddles[2]));
	// 		if(usuario_id === 1){ //Update just the other player paddle
	// 			paddles[2]  = data.paddles[2];
	// 		}else{
	// 			paddles[1]  = data.paddles[1];
	// 		}
	// 	}
	// });
	
	// If flag is set, push the particles
	if(flag == 1) { 
		for(var k = 0; k < particlesCount; k++) {
			particles.push(new createParticles(particlePos.x, particlePos.y, multiplier));
		}
	}	
	
	// Emit particles/sparks
	emitParticles();
	
	// reset flag
	flag = 0;
}

// Function for emitting particles
function emitParticles() { 
	for(var j = 0; j < particles.length; j++) {
		par = particles[j];
		
		ctx.beginPath(); 
		ctx.fillStyle = "white";
		if (par.radius > 0) {
			ctx.arc(par.x, par.y, par.radius, 0, Math.PI*2, false);
		}
		ctx.fill();	 
		
		par.x += par.vx; 
		par.y += par.vy; 
		
		// Reduce radius so that the particles die after a few seconds
		par.radius = Math.max(par.radius - 0.05, 0.0); 
		
	} 
}

// Function for updating score
function updateScore() {
	ctx.fillStlye = "white";
	ctx.font = "16px Arial, sans-serif";
	ctx.textAlign = "left";
	ctx.textBaseline = "top";
	socket.on('updateScore',function(data){
		score_jugadores[0] = data.scoreP1;
		score_jugadores[1] = data.scoreP2;
	});
	ctx.fillText("P1("+ score_jugadores[0] + ")  P2(" +score_jugadores[1]+")", 20, 20 );
}

// Function to run when the game overs
function gameOver() {
	ctx.fillStlye = "white";
	ctx.font = "20px Arial, sans-serif";
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";

	var playerWinner = (score_jugadores[0] > score_jugadores[1])?"P1":"P2";
	playerWinner += " wins!!!";
	var messageGame = "";
	if(usuario_id === -1)
		messageGame = playerWinner;
	else
		messageGame = playerWinner +" - Game Over - You scored "+score_jugadores[usuario_id -1]+" points!"
	ctx.fillText( messageGame , W/2, H/2 + 25 );
	
	// Stop the Animation
		
	var playPromise = perder.play();

	  if (playPromise !== undefined) {
	    playPromise.then(_ => {
	      perder.pause();
	    })
	    .catch(error => {
	      // Auto-play was prevented
	      // Show paused UI.
	      console.log("Error...");
	    });
	   }
	cancelRequestAnimFrame(init);
	

	// Set the over flag
	over = 1;
	
	// Show the restart button
	if(usuario_id !== -1)
		restartBtn.draw();
}

// Function for running the whole animation
function animloop() {
	init = requestAnimFrame(animloop);
	draw();
}

// Function to execute at startup
function startScreen() {
	draw();
	if(usuario_id !== -1)
		startBtn.draw();
}
function verifyClick(posX,posY,btn){
	var beg_left = btn.x, end_right = btn.x + btn.w;
	var beg_up = btn.y , end_down = btn.y + btn.h;
	// $("#isReadyPlayer").append("bL:"+beg_left + "eR"+end_right);
	// $("#isReadyPlayer").append("<br>");
	return posX >= beg_left && posX <= end_right && posY >= beg_up &&  posY <= end_down;
}
// On button click (Restart and start)
function btnClick(e) {
	
	// Variables for storing mouse position on click
	var mx = e.pageX,my = e.pageY; //-225  559
	//$("#isReadyPlayer").append("ep:"+e.pageX+",mx:"+mx+",H:"+H);
	// Click start button
	if( verifyClick(mx,my,startBtn) && usuario_id !== -1 ){
		playerReady();
		//animloop();
		
		// Delete the start button after clicking it
		startBtn = {};
	}
	
	// If the game is over, and the restart button is clicked
	if(over == 1) {

		if( verifyClick(mx,my,restartBtn) && usuario_id !== -1 ) {
			ball.x = 20;
			ball.y = 20;
			points = 0;
			ball.vx = 4;
			ball.vy = 8;
			//animloop();
			
			over = 0;
			playerReady();
		}
	}
}

function playerReady(){
	socket.emit('playerReady',{usuario:usuario_id});
	$("#isReadyPlayer").text("Jugador listo");
}

socket.on('startGame',function(data){
	animloop();
	$("#isReadyPlayer").text("");
});

socket.on('stopGame',function(data){
	gameOver();
	// setTimeout(function(){
	// 	gameOver();
	// },100);
	console.log("Game finished!!");
});

socket.on('playSound',function(data){
	if(data.msg === "hit"){
		collision.play();
		//collision.pause();
	}else{
		perder.play();
		//perder.pause();
	}
	
});
// Show the start screen
startScreen();