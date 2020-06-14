// state.ts
// a collection of mutable game state

import * as config from "./config";
import * as geometry from "./geometry";
import { Dimensions } from "./models";

export type State = {
  frameCount: number,
  previousFrameTimestamp: number,
  currentFrameTimestamp: number,

  player1Pos: geometry.Point
  player1Velocity: geometry.Vector

  player2Pos: geometry.Point
  player2Velocity: geometry.Vector

  ballPos: geometry.Point
  ballVelocity: geometry.Vector
}

/**
 * Produces an initial {@link State} object per the given config.
 * This method takes in a {@link Config}, not a {@link BaseConfig}, so all position / size values are
 * assumed to be in pixels.
 */
export function getInitialState(cfg: config.Config): State {
  return {
    frameCount: 0,
    previousFrameTimestamp: 0,
    currentFrameTimestamp: 0,

    player1Pos: cfg.PLAYER_1_STARTING_POS,
    player1Velocity: { x: 0, y: 0 },

    player2Pos: cfg.PLAYER_2_STARTING_POS,
    player2Velocity: { x: 0, y: 0 },

    // centered in the screen
    ballPos: { x: cfg.canvasDimensions.x / 2, y: cfg.canvasDimensions.y / 2 },
    ballVelocity: { x: cfg.canvasDimensions.x / 2, y: cfg.canvasDimensions.y / 2 },
  };
}
