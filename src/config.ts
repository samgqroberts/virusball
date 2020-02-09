// config.ts
// a collection of global constant variables and configuration options

export default {
  CIRCLE_RADIUS: 0.1, // in clipspace, i think

  PLAYER_1_STARTING_X: -0.2,
  PLAYER_1_STARTING_Y: 0,
  PLAYER_2_STARTING_X: 0.2,
  PLAYER_2_STARTING_Y: 0,

  TICK_VELOCITY: 0.01, // how much to move player per tick while player has a key pressed

  // for debugging
  LOG_FPS: false,
  ONLY_DRAW_ONCE: false
};
