// src/stores/game.js
import { defineStore } from 'pinia'

export const useGameStore = defineStore('game', {
  state: () => ({
    players: {},
    fruit: { x: 0, y: 0 },
    scores: {},
    currentPlayerId: null
  }),
  
  actions: {
    updateGameState(newState) {
      this.players = newState.players
      this.fruit = newState.fruit
      this.scores = newState.scores
    },
    
    setCurrentPlayer(playerId) {
      this.currentPlayerId = playerId
    }
  },
  
  getters: {
    currentPlayer: (state) => state.players[state.currentPlayerId],
    isPlayerPacman: (state) => {
      const player = state.players[state.currentPlayerId]
      return player && player.role === 'pacman'
    }
  }
})
