// config.ts
// a collection of global constants and configuration options

export default {
  CIRCLE_RADIUS: 0.1, // in clipspace, i think

  // constants for drawing the goal semicircles
  SEMICIRCLE_ARC_RADIUS: 0.2, // of the outer edge of the semicircle arc
  SEMICIRCLE_ARC_WIDTH: 0.2, // proportion of semicircle outer radisu
  GOAL_OFFSET_X: 0.6, // where to place the goals along the x axis, distance from center

  PLAYER_1_STARTING_X: -0.2,
  PLAYER_1_STARTING_Y: 0,
  PLAYER_2_STARTING_X: 0.2,
  PLAYER_2_STARTING_Y: 0,

  // how much to change player velocity per second while player has a key pressed
  PLAYER_ACCELERATION: 0.02,
  PLAYER_REVERSE_ACCELERATION: 0.04,
  PLAYER_DRAG: 0.01,
  PLAYER_MAX_SPEED: 0.017,
  PLAYER_RESTITUTION: 0.8,
  PLAYER_MASS: 2,

  // for debugging
  LOG_FPS: false,
  ONLY_DRAW_ONCE: false
};
