import * as PressedKeys from './PressedKeys';

export type KeyMappings = {
  left: PressedKeys.Key
  up: PressedKeys.Key
  right: PressedKeys.Key
  down: PressedKeys.Key
}

export interface Dimensions {
  x: number
  y: number
}

export interface Color {
  red: number,
  green: number,
  blue: number,
  alpha: number,
}

export enum CircleHalf {
  LEFT,
  RIGHT,
}