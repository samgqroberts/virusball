// state.ts
// a collection of mutable game state

import config from "./config";
import * as Geometry from "./geometry";

export type State = {
  frameCount: number,
  previousFrameTimestamp: number,
  currentFrameTimestamp: number,

  player1Pos: Geometry.Point
  player1Velocity: Geometry.Vector

  player2Pos: Geometry.Point
  player2Velocity: Geometry.Vector
}

export function getInitialState(): State {
  return {
    frameCount: 0,
    previousFrameTimestamp: 0,
    currentFrameTimestamp: 0,

    player1Pos: config.PLAYER_1_STARTING_POS,
    player1Velocity: { x: 0, y: 0 },

    player2Pos: config.PLAYER_2_STARTING_POS,
    player2Velocity: { x: 0, y: 0 },
  };
}
