// state.ts
// a collection of mutable game state

import { Config } from "./config";
import * as Geometry from "./geometry";

export type State = {
  frameCount: number,
  previousFrameTimestamp: number,
  currentFrameTimestamp: number,

  player1Pos: Geometry.Point
  player1Velocity: Geometry.Vector

  player2Pos: Geometry.Point
  player2Velocity: Geometry.Vector

  ballPos: Geometry.Point
  ballVelocity: Geometry.Vector
}

interface Dimensions {
  x: number
  y: number
}

export function getInitialState(config: Config, dimensions: Dimensions): State {
  return {
    frameCount: 0,
    previousFrameTimestamp: 0,
    currentFrameTimestamp: 0,

    player1Pos: config.PLAYER_1_STARTING_POS,
    player1Velocity: { x: 0, y: 0 },

    player2Pos: config.PLAYER_2_STARTING_POS,
    player2Velocity: { x: 0, y: 0 },

    // centered in the screen
    ballPos: { x: 0, y: 0 },
    ballVelocity: { x: 0, y: 0 },
  };
}
