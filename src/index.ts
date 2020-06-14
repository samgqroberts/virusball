import * as cfg from './config';
import * as engine from './engine';


const baseConfig: cfg.BaseConfig = {
  PLAYER_CIRCLE_RADIUS: 0.05,
  BALL_CIRCLE_RADIUS: 0.025,

  SEMICIRCLE_ARC_RADIUS: 0.1,
  SEMICIRCLE_ARC_WIDTH: 0.2,
  GOAL_OFFSET_X: 0.2,

  PLAYER_1_STARTING_POS: { x: 0.35, y: 0.5 },
  PLAYER_2_STARTING_POS: { x: 0.65, y: 0.5 },

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
  },
  PLAYER_2_KEY_MAPPINGS: {
    'left': 'ArrowLeft',
    'up': 'ArrowUp',
    'right': 'ArrowRight',
    'down': 'ArrowDown',
  },

  PLAYER_ACCELERATION: 0.02,
  PLAYER_REVERSE_ACCELERATION: 0.04,
  PLAYER_DRAG: 0.005,
  PLAYER_MAX_SPEED: 0.0085,

  PLAYER_RESTITUTION: 0.7,
  PLAYER_MASS: 10,
  BALL_RESTITUTION: 0.9,
  BALL_MASS: 1.2,

  LOG_FPS: false,
  ONLY_DRAW_ONCE: false,
};

engine.initGame(baseConfig);