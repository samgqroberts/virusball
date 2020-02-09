// state.ts
// a collection of mutable game state

import config from "./config";

export type State = {
  frameCount: number,
  previousFrameTimestamp: number,
  currentFrameTimestamp: number,

  player1PosX: number
  player1PosY: number
  player1VelocityX: number
  player1VelocityY: number

  player2PosX: number
  player2PosY: number
  player2VelocityX: number
  player2VelocityY: number
}

export function getInitialState(): State {
  return {
    frameCount: 0,
    previousFrameTimestamp: 0,
    currentFrameTimestamp: 0,

    player1PosX: config.PLAYER_1_STARTING_X,
    player1PosY: config.PLAYER_1_STARTING_Y,
    player1VelocityX: 0,
    player1VelocityY: 0,

    player2PosX: config.PLAYER_2_STARTING_X,
    player2PosY: config.PLAYER_2_STARTING_Y,
    player2VelocityX: 0,
    player2VelocityY: 0,
  };
}
