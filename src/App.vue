// src/App.vue
<template>
  <div class="game-container">
    <div class="scoreboard">
      <h2>Leaderboard</h2>
      <div v-for="(score, playerId) in gameState.scores" :key="playerId">
        Player {{ playerId.slice(0, 4) }}: {{ score }} points
        {{ playerId === currentPlayerId ? '(You)' : '' }}
      </div>
    </div>
    
    <div class="game-board" :style="{ 
      gridTemplateColumns: `repeat(${GAME_WIDTH}, 20px)`,
      gridTemplateRows: `repeat(${GAME_HEIGHT}, 20px)`
    }">
      <!-- Notice we switched the order of x and y iteration -->
      <template v-for="y in GAME_HEIGHT" :key="y">
        <div v-for="x in GAME_WIDTH" :key="`${x}-${y}`" class="cell">
          <template v-for="(player, playerId) in gameState.players" :key="playerId">
            <div v-if="player.x === (x-1) && player.y === (GAME_HEIGHT - y)"
                 :class="['player', player.role]">
              {{ player.role === 'pacman' ? '😀' : '👻' }}
            </div>
          </template>
          <div v-if="gameState.fruit && gameState.fruit.x === (x-1) && gameState.fruit.y === (GAME_HEIGHT - y)" 
               class="fruit">
            🍎
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { io } from 'socket.io-client'
import { useGameStore } from './stores/game'

const GAME_WIDTH = 20
const GAME_HEIGHT = 20
const store = useGameStore()
const gameState = ref({
  players: {},
  fruit: { x: 0, y: 0 },
  scores: {}
})
const currentPlayerId = ref(null)
let socket

onMounted(() => {
  socket = io('http://localhost:3000')
  
  socket.on('connect', () => {
    currentPlayerId.value = socket.id
  })
  
  socket.on('initial_state', (state) => {
    gameState.value = state
    store.updateGameState(state)
  })
  
  socket.on('gamestate_update', (state) => {
    gameState.value = state
    store.updateGameState(state)
  })
  
  window.addEventListener('keydown', handleKeyPress)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyPress)
  if (socket) {
    socket.disconnect()
  }
})

function handleKeyPress(event) {
  if (['w', 'a', 's', 'd'].includes(event.key)) {
    socket.emit('keypress', { 
      type: 'KEY_PRESS',
      key: event.key,
      user_id: currentPlayerId.value
    })
  }
}
</script>

<style scoped>
.game-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
}

.scoreboard {
  margin-bottom: 20px;
  text-align: center;
}

.game-board {
  display: grid;
  gap: 1px;
  background: #eee;
  border: 2px solid #333;
  padding: 10px;
}

.cell {
  width: 20px;
  height: 20px;
  background: white;
  position: relative;
  border: 1px solid #ddd;
}

.player {
  position: absolute;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.fruit {
  position: absolute;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
