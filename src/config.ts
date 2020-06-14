import { KeyMappings, Dimensions, Color } from "./models";
import * as Geometry from './geometry';

// config.ts
// a collection of global constants and configuration options

/**
 * Configuration that is agnostic to canvas size / dimension.
 * All values that affect position or size are defined in terms of proportion of canvas width / height.
 */
export interface BaseConfig {
  PLAYER_CIRCLE_RADIUS: number // in proportion of width of canvas
  BALL_CIRCLE_RADIUS: number // in proportion of width of canvas

  // constants for drawing the goal semicircles
  SEMICIRCLE_ARC_RADIUS: number // of the outer edge of the semicircle arc, in proportion of width of canvas
  SEMICIRCLE_ARC_WIDTH: number // proportion of semicircle outer radius
  GOAL_OFFSET_X: number // where to place the goals along the x axis, distance from center, in proportion of width of canvas

  PLAYER_1_STARTING_POS: Geometry.Point // in proportions of height / width of canvas
  PLAYER_2_STARTING_POS: Geometry.Point // in proportions of height / width of canvas

  PLAYER_1_COLOR: Color
  PLAYER_2_COLOR: Color
  BALL_COLOR: Color

  PLAYER_1_KEY_MAPPINGS: KeyMappings
  PLAYER_2_KEY_MAPPINGS: KeyMappings

  // how much to change player velocity per second while player has a key pressed
  PLAYER_ACCELERATION: number
  PLAYER_REVERSE_ACCELERATION: number
  PLAYER_DRAG: number
  PLAYER_MAX_SPEED: number
  PLAYER_RESTITUTION: number
  PLAYER_MASS: number

  // for debugging
  LOG_FPS: boolean
  ONLY_DRAW_ONCE: boolean
}

export function getDefaultBaseConfig(): BaseConfig {
  return {
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

    PLAYER_ACCELERATION: 0.01,
    PLAYER_REVERSE_ACCELERATION: 0.02,
    PLAYER_DRAG: 0.005,
    PLAYER_MAX_SPEED: 0.0085,
    PLAYER_RESTITUTION: 0.8,
    PLAYER_MASS: 2,

    LOG_FPS: false,
    ONLY_DRAW_ONCE: false,
  } as const;
}

/**
 * Many config parameters are specified as proportions of the width of the canvas.
 * Returns the pixel value of those proportions
 * @param value the proportion-based value
 * @param width the width of the canvas
 */
function widthProportionToPixels(value: number, width: number): number {
  return value * width;
}

/**
 * Similar to {@link widthPercentageToPixels}, except converts a {@link Geometry.Point}.
 */
function pointProportionsToPixels(point: Geometry.Point, dimensions: Dimensions): Geometry.Point {
  return { x: point.x * dimensions.x, y: point.y * dimensions.y };
}

/**
 * A {@link BaseConfig} that has been combined with the canvas {@link Dimensions}.
 * All proportion-based values are pixel-based in this config representation.
 */
export interface Config extends BaseConfig {
  canvasDimensions: Dimensions
}


/**
 * Combines a {@link BaseConfig} object with the given canvas {@link Dimensions}.
 * Converts all proportion-based config values to pixels.
 */
export function configWithPixelValues(config: BaseConfig, dimensions: Dimensions): Config {
  const { x } = dimensions;
  const xToPixels = (value: number) => widthProportionToPixels(value, x);
  const pointToPixels = (point: Geometry.Point) => pointProportionsToPixels(point, dimensions);
  return { ...config,
    canvasDimensions: dimensions,
    PLAYER_CIRCLE_RADIUS: xToPixels(config.PLAYER_CIRCLE_RADIUS),
    BALL_CIRCLE_RADIUS: xToPixels(config.BALL_CIRCLE_RADIUS),
    SEMICIRCLE_ARC_RADIUS: xToPixels(config.SEMICIRCLE_ARC_RADIUS),
    GOAL_OFFSET_X: xToPixels(config.GOAL_OFFSET_X),
    PLAYER_1_STARTING_POS: pointToPixels(config.PLAYER_1_STARTING_POS),
    PLAYER_2_STARTING_POS: pointToPixels(config.PLAYER_2_STARTING_POS),
    PLAYER_ACCELERATION: xToPixels(config.PLAYER_ACCELERATION),
    PLAYER_REVERSE_ACCELERATION: xToPixels(config.PLAYER_REVERSE_ACCELERATION),
    PLAYER_DRAG: xToPixels(config.PLAYER_DRAG),
    PLAYER_MAX_SPEED: xToPixels(config.PLAYER_MAX_SPEED),
  };
}
