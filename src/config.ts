import { KeyMappings } from "./models";

// config.ts
// a collection of global constants and configuration options

const config = {
  PLAYER_CIRCLE_RADIUS: 0.05, // in percentage of width of canvas
  BALL_CIRCLE_RADIUS: 0.025, // in percentage of width of canvas

  // constants for drawing the goal semicircles
  SEMICIRCLE_ARC_RADIUS: 0.1, // of the outer edge of the semicircle arc, in percentage of width of canvas
  SEMICIRCLE_ARC_WIDTH: 0.1, // proportion of semicircle outer radius, in percentage of width of canvas
  GOAL_OFFSET_X: 0.3, // where to place the goals along the x axis, distance from center, in percentage of width of canvas

  PLAYER_1_STARTING_POS: { x: 0.35, y: 0 }, // in percentages of height / width of canvas
  PLAYER_2_STARTING_POS: { x: 0.65, y: 0 }, // in percentages of height / width of canvas

  PLAYER_1_COLOR: {
    red: 1.0,
    green: 0.0,
    blue: 0.0,
    alpha: 1.0
  },
  PLAYER_2_COLOR: {
    red: 0.0,
    green: 0.0,
    blue: 1.0,
    alpha: 1.0
  },
  BALL_COLOR: {
    red: 0.0,
    green: 1.0,
    blue: 0.0,
    alpha: 1.0,
  },

  PLAYER_1_KEY_MAPPINGS: {
    'left': 'a',
    'up': 'w',
    'right': 'd',
    'down': 's',
  } as KeyMappings,
  PLAYER_2_KEY_MAPPINGS: {
    'left': 'ArrowLeft',
    'up': 'ArrowUp',
    'right': 'ArrowRight',
    'down': 'ArrowDown',
  } as KeyMappings,

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
} as const;

export default config;

export type Config = typeof config;
