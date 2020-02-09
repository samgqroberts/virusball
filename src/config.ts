// config.ts
// a collection of global constant variables and configuration options

export default {
  CIRCLE_RADIUS: 0.1, // in clipspace, i think

  PLAYER_1_STARTING_X: -0.2,
  PLAYER_1_STARTING_Y: 0,
  PLAYER_2_STARTING_X: 0.2,
  PLAYER_2_STARTING_Y: 0,

  // how much to change player velocity per second while player has a key pressed
  PLAYER_ACCELERATION: 0.02,
  PLAYER_DRAG: 0.01,
  PLAYER_MAX_SPEED: 0.017,

  // for debugging
  LOG_FPS: false,
  ONLY_DRAW_ONCE: false
};
