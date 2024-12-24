// server.js
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

// Game state
let gameState = {
  players: {},  // Will only contain connected players
  fruit: null,  // Will be set when game starts
  scores: {},
  gameInProgress: false
};

// Constants
const GAME_WIDTH = 20;
const GAME_HEIGHT = 20;
const TICK_RATE = 750;

function getRandomPosition() {
  return {
    x: Math.floor(Math.random() * GAME_WIDTH),
    y: Math.floor(Math.random() * GAME_HEIGHT)
  };
}

function startNewGame() {
  // Only start if we have 2 or more players
  if (Object.keys(gameState.players).length >= 2) {
    console.log("Starting new game");
    gameState.gameInProgress = true;
    gameState.fruit = getRandomPosition();
    assignRoles();
    return true;
  }
  return false;
}

function assignRoles() {
  const players = Object.keys(gameState.players);
  if (players.length < 2) return;
  
  // Randomly select one player to be pacman
  const pacmanIndex = Math.floor(Math.random() * players.length);
  
  // Assign roles and random starting positions
  players.forEach((playerId, index) => {
    const pos = getRandomPosition();
    gameState.players[playerId] = {
      ...gameState.players[playerId],
      x: pos.x,
      y: pos.y,
      role: index === pacmanIndex ? 'pacman' : 'ghost',
      currentDirection: null,  // Only move when player presses a key
      nextKeyPress: null
    };
  });
}

function updatePosition(player) {
  if (!player.currentDirection && !player.nextKeyPress) {
    return player;  // Don't move if no direction is set
  }

  // Update direction if there's a new keypress
  if (player.nextKeyPress) {
    switch (player.nextKeyPress) {
      case 'w': player.currentDirection = 'up'; break;
      case 's': player.currentDirection = 'down'; break;
      case 'a': player.currentDirection = 'left'; break;
      case 'd': player.currentDirection = 'right'; break;
    }
    player.nextKeyPress = null;
  }

  // Move based on current direction
  // Changed the y-axis movement to match screen coordinates
  switch (player.currentDirection) {
    case 'up': player.y = Math.min(GAME_HEIGHT - 1, player.y + 1); break;    // Changed
    case 'down': player.y = Math.max(0, player.y - 1); break;                // Changed
    case 'left': player.x = Math.max(0, player.x - 1); break;               // Same
    case 'right': player.x = Math.min(GAME_WIDTH - 1, player.x + 1); break; // Same
  }
  
  return player;
}

function checkCollisions(gameState) {
  const pacmanPlayer = Object.entries(gameState.players).find(([_, p]) => p.role === 'pacman');
  if (!pacmanPlayer) return false;

  const [pacmanId, pacman] = pacmanPlayer;

  // Check ghost collisions
  for (const [playerId, player] of Object.entries(gameState.players)) {
    if (player.role === 'ghost' &&
        player.x === pacman.x &&
        player.y === pacman.y) {
      gameState.scores[playerId]++;
      return true;
    }
  }

  // Check fruit collision
  if (gameState.fruit && pacman.x === gameState.fruit.x && pacman.y === gameState.fruit.y) {
    gameState.scores[pacmanId]++;
    gameState.fruit = getRandomPosition();  // New fruit position
  }

  return false;
}

// Socket handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  // Initialize new player
  gameState.players[socket.id] = {
    x: 0,
    y: 0,
    role: 'ghost',  // Will be properly assigned when game starts
    currentDirection: null,
    nextKeyPress: null
  };
  
  // Initialize score for new player
  if (!gameState.scores[socket.id]) {
    gameState.scores[socket.id] = 0;
  }

  // Try to start game if we have enough players
  if (!gameState.gameInProgress) {
    startNewGame();
  }

  // Send current state to new player
  socket.emit('initial_state', gameState);
  io.emit('gamestate_update', gameState);

  socket.on('keypress', (data) => {
    if (gameState.players[socket.id]) {
      gameState.players[socket.id].nextKeyPress = data.key;
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    delete gameState.players[socket.id];
    
    // Stop game if not enough players
    if (Object.keys(gameState.players).length < 2) {
      gameState.gameInProgress = false;
      gameState.fruit = null;
    }
    
    io.emit('gamestate_update', gameState);
  });
});

// Game loop - only runs meaningful updates when game is in progress
setInterval(() => {
  if (!gameState.gameInProgress) return;

  // Update positions
  Object.values(gameState.players).forEach(player => {
    updatePosition(player);
  });

  // Check collisions
  if (checkCollisions(gameState)) {
    // If collision detected, start new round
    assignRoles();
    gameState.fruit = getRandomPosition();
  }

  // Broadcast update
  io.emit('gamestate_update', gameState);
}, TICK_RATE);

http.listen(3000, () => {
  console.log('Server running on port 3000');
});
