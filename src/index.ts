import * as PressedKeys from './PressedKeys';
import config from './config';
// @ts-ignore
import circleVsSource from './circle_vertex.glsl';
// @ts-ignore
import circleFsSource from './circle_fragment.glsl';
import { getUniformLocationOrFail, getWebglContext, initShaderProgramOrFail } from "./WebglUtils";
import { getInitialState, State } from "./state";
import { KeysCapture } from "./PressedKeys";

const DIMENSION = 2; // it's a 2D game - so we have two values per vertex

enum CircleHalf {
  LEFT,
  RIGHT,
}

// entrypoint to the game. defined below
initGame();

function getAspect(gl: WebGLRenderingContext): number {
  return gl.canvas.width / gl.canvas.height;
}

// TODO rename this program and program info.
//      it no longer only relates to the circle.
//      it applies to any 2d shape with scale and translation vectors.
type CircleProgramInfo = {
  program: WebGLProgram,
  attribLocations: {
    vertexPosition: number,
  },
  uniformLocations: {
    scaleVector: WebGLUniformLocation,
    translationVector: WebGLUniformLocation,
  }
}

function initCircleProgramInfo(
  gl: WebGLRenderingContext,
  circleProgram: WebGLProgram
): CircleProgramInfo {
  return {
    program: circleProgram,
    attribLocations: {
      vertexPosition: gl.getAttribLocation(circleProgram, 'aPosition'),
    },
    uniformLocations: {
      scaleVector: getUniformLocationOrFail(gl, circleProgram, 'uScaleVector'),
      translationVector: getUniformLocationOrFail(gl, circleProgram, 'uTranslationVector'),
    },
  };
}

function degreeToRadian(degree: number): number {
  return degree * Math.PI / 180;
}

type CountedVertexBuffer = {
  buffer: WebGLBuffer,
  vertexCount: number,
}

function initCircleBuffer(
  gl: WebGLRenderingContext,
  program: WebGLProgram,
): CountedVertexBuffer {
  gl.useProgram(program);
  const vertexBuffer = gl.createBuffer();

  let vertices: number[] = [];
  for (let currentDegree = 0.0; currentDegree <= 360; currentDegree+=1) {
    const currentRadian = degreeToRadian(currentDegree);
    // add a vertex on the circle's circumference, according to currentDegree
    vertices = vertices.concat([
      Math.sin(currentRadian),
      Math.cos(currentRadian),
    ]);
    // add a vertex back at the top of the circumference
    vertices = vertices.concat([
      0,
      0,
    ]);
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

  if (!vertexBuffer) {
    throw new Error('Could not init circle buffers');
  }

  return { buffer: vertexBuffer, vertexCount: vertices.length / DIMENSION };
}

function initSemicircleArcBuffer(
  gl: WebGLRenderingContext,
  program: WebGLProgram,
  circleHalf: CircleHalf,
  arcWidth: number // value from 0 to 1, proportion of circle radius
): CountedVertexBuffer {
  gl.useProgram(program);
  const vertexBuffer = gl.createBuffer();

  let vertices: number[] = [];
  const startingDegree = circleHalf === CircleHalf.LEFT ? 0 : 180;
  const finalDegree = circleHalf === CircleHalf.LEFT ? 180 : 360;
  for (let currentDegree = startingDegree; currentDegree <= finalDegree; currentDegree++) {
    const currentRadian = degreeToRadian(currentDegree);

    const outerVertexX = Math.sin(currentRadian);
    const outerVertexY = Math.cos(currentRadian);
    vertices = vertices.concat([
      outerVertexX,
      outerVertexY,
    ]);
    vertices = vertices.concat([
      outerVertexX * (1 - arcWidth),
      outerVertexY * (1 - arcWidth),
    ]);
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

  if (!vertexBuffer) {
    throw new Error('Could not init semicircle buffers');
  }

  return { buffer: vertexBuffer, vertexCount: vertices.length / DIMENSION };
}

type Point = {
  x: number
  y: number
}

function drawWithProgram(
  gl: WebGLRenderingContext,
  programInfo: CircleProgramInfo,
  countedBuffer: CountedVertexBuffer,
  position: Point,
  scale: number,
): void {
  const { program, attribLocations, uniformLocations } = programInfo;
  gl.useProgram(program);

  const aspect = getAspect(gl);

  // scale vector will convert the circle from an oval shape
  //   to a circle shape by changing the dimensions of the circle primitive
  //   relative to the aspect ratio of the canvas.
  // the circle starts out as an oval because the canvas is potentially not a perfect square,
  //   yet canvas clipspace goes from -1 to 1 in x and y directions regardless.
  // scale vector will also change the size of the circle
  //   by multiplying the vector positions by CIRCLE_RADIUS
  gl.uniform2f(uniformLocations.scaleVector, scale, aspect * scale);

  // translation vector will move the circle along x and y axes
  gl.uniform2f(uniformLocations.translationVector, position.x, position.y);

  gl.bindBuffer(gl.ARRAY_BUFFER, countedBuffer.buffer);
  let aPosition = attribLocations.vertexPosition;
  gl.enableVertexAttribArray(aPosition);
  gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

  // Draw the polygons in the circle buffer
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, countedBuffer.vertexCount);
}

function drawCircle(
  gl: WebGLRenderingContext,
  programInfo: CircleProgramInfo,
  buffer: CountedVertexBuffer,
  circlePosX: number,
  circlePosY: number
): void {
  drawWithProgram(gl,
    programInfo,
    buffer,
    { x: circlePosX, y: circlePosY },
    config.CIRCLE_RADIUS,
  )
}

function drawSemicircleArc(
  gl: WebGLRenderingContext,
  programInfo: CircleProgramInfo,
  buffer: CountedVertexBuffer,
  circleHalf: CircleHalf,
): void {
  drawWithProgram(gl,
    programInfo,
    buffer,
    {
      x: config.GOAL_OFFSET_X * (circleHalf === CircleHalf.LEFT ? 1 : -1),
      y: 0, // centered at the vertical midpoint
    },
    config.SEMICIRCLE_ARC_RADIUS,
  );
}

function drawScene(
  gl: WebGLRenderingContext,
  circlePInfo: CircleProgramInfo,
  circleBuffers: CountedVertexBuffer,
  leftSemicircleArcBuffer: CountedVertexBuffer,
  rightSemicircleArcBuffer: CountedVertexBuffer,
  state: State,
) {
  gl.clearColor(0.0, 0.0, 0.0, 1.0);  // Clear to black, fully opaque
  gl.clearDepth(1.0);                 // Clear everything
  gl.enable(gl.DEPTH_TEST);           // Enable depth testing
  gl.depthFunc(gl.LEQUAL);            // Near things obscure far things

  // Clear the canvas before we start drawing on it.
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // player1
  drawCircle(gl,
    circlePInfo,
    circleBuffers,
    state.player1PosX,
    state.player1PosY,
  );

  // player2
  drawCircle(gl,
    circlePInfo,
    circleBuffers,
    state.player2PosX,
    state.player2PosY,
  );

  // left goal post
  drawSemicircleArc(gl,
    circlePInfo,
    leftSemicircleArcBuffer,
    CircleHalf.LEFT
  );

  // right goal post
  drawSemicircleArc(gl,
    circlePInfo,
    rightSemicircleArcBuffer,
    CircleHalf.RIGHT
  );
}

/**
 * If FPS logging is on (configured), tracks how many frames pass each second and logs to console.
 * @param state the game state object. state is assumed to be mutable, with the reference passed
 *        in on initial function call being valid for the lifecycle of the game.
 */
function logFPS(state: State): void {
  if (config.LOG_FPS) {
    let previousFrameCount = 0;
    setInterval(() => {
      console.log('frames in the past second:', state.frameCount - previousFrameCount);
      previousFrameCount = state.frameCount;
    }, 1000);
  }
}


/**
 * Updates the game state wrt user input (which keys are pressed in this frame).
 * @param state the game state to update. state is assumed to be mutable and its fields will be
 *        mutated in-place.
 * @param aspect the scale aspect of the canvas (width / height), to correct movement
 */
function updatePlayerPositions(state: State, aspect: number): void {
  const { PLAYER_ACCELERATION, PLAYER_REVERSE_ACCELERATION, PLAYER_DRAG, PLAYER_MAX_SPEED } = config;
  // PLAYER_ACCELERATION is measured per second, so multiply by how many seconds have passed
  //   to determine how much to change velocity
  const deltaTime = state.currentFrameTimestamp - state.previousFrameTimestamp;
  const acceleration = PLAYER_ACCELERATION * deltaTime;
  const reverseAcceleration = PLAYER_REVERSE_ACCELERATION * deltaTime;
  const drag = PLAYER_DRAG * deltaTime;

  const keys = PressedKeys.capture();

  // wrapper to capture current-frame constants
  const updateVelocityFn = (velocity: number, negativeKey: string, positiveKey: string, aspectMultiplier: number = 1) =>
    updateComponentVelocity(
      velocity,
      PLAYER_MAX_SPEED * aspectMultiplier,
      acceleration * aspectMultiplier,
      reverseAcceleration * aspectMultiplier,
      drag * aspectMultiplier,
      keys,
      negativeKey,
      positiveKey,
    );

  // update velocities
  state.player1VelocityX = updateVelocityFn(state.player1VelocityX, 'a', 'd');
  state.player1VelocityY = updateVelocityFn(state.player1VelocityY, 's', 'w', aspect);
  state.player2VelocityX = updateVelocityFn(state.player2VelocityX, 'ArrowLeft', 'ArrowRight');
  state.player2VelocityY = updateVelocityFn(state.player2VelocityY, 'ArrowDown', 'ArrowUp', aspect);

  // update positions based on velocity
  state.player1PosX += state.player1VelocityX;
  state.player1PosY += state.player1VelocityY;
  state.player2PosX += state.player2VelocityX;
  state.player2PosY += state.player2VelocityY;
}

/**
 * updates a single velocity component (x or y) with respect to user input, acceleration, and drag.
 * @param currentVelocity the component velocity value coming into this frame
 * @param maxVelocity the cap for the component velocity
 * @param accelerationRate amount to update velocity by if correct key is pressed
 * @param reverseAccelerationRate amount to update velocity by if correct key is pressed
 *        and player is currently moving in the opposite direction
 * @param dragRate amount to update velocity by if no relevant key is pressed
 * @param pressedKeys current frame capture of pressed keys
 * @param negativeKey keycode for movement in negative direction
 * @param positiveKey keycode for movement in positive direction
 */
function updateComponentVelocity(
  currentVelocity: number,
  maxVelocity: number,
  accelerationRate: number,
  reverseAccelerationRate: number,
  dragRate: number,
  pressedKeys: KeysCapture,
  negativeKey: string,
  positiveKey: string,
): number {
  let velocity = currentVelocity;
  const pressedKey = pressedKeys.latestPressed(negativeKey, positiveKey);
  if (pressedKey === negativeKey) {
    if (velocity > 0) {
      velocity -= reverseAccelerationRate;
    } else {
      velocity -= accelerationRate;
    }
  } else if (pressedKey === positiveKey) {
    if (velocity < 0) {
      velocity += reverseAccelerationRate;
    } else {
      velocity += accelerationRate;
    }
  } else { // no relevant keys are pressed, so consider dragging to stop
    if (currentVelocity > 0) {
      velocity = Math.max(0, velocity - dragRate);
    } else if (currentVelocity < 0) {
      velocity = Math.min(0, velocity + dragRate);
    }
  }
  // cap velocity
  if (velocity > 0) {
    return Math.min(velocity, maxVelocity);
  } else if (velocity < 0) {
    return Math.max(velocity, -maxVelocity);
  }
  return velocity;
}

function initGame() {
  const gl = getWebglContext('canvas');

  // initialize everything needed for the circle program
  const circleProgram = initShaderProgramOrFail(gl, circleVsSource, circleFsSource);
  const circleProgramInfo = initCircleProgramInfo(gl, circleProgram);
  const { program } = circleProgramInfo;
  const circleBuffer = initCircleBuffer(gl, circleProgram);
  const leftSemicircleArcBuffer = initSemicircleArcBuffer(gl, program, CircleHalf.LEFT, config.SEMICIRCLE_ARC_WIDTH);
  const rightSemicircleArcBuffer = initSemicircleArcBuffer(gl, program, CircleHalf.RIGHT, config.SEMICIRCLE_ARC_WIDTH);

  // initialize scene drawing / game engine variables
  const state: State = getInitialState();
  logFPS(state);

  // Draw the scene repeatedly
  function tick(now: number) {
    state.frameCount++;
    state.previousFrameTimestamp = state.currentFrameTimestamp;
    state.currentFrameTimestamp = now * 0.001; // convert to seconds

    updatePlayerPositions(state, getAspect(gl));

    drawScene(gl,
      circleProgramInfo,
      circleBuffer,
      leftSemicircleArcBuffer,
      rightSemicircleArcBuffer,
      state,
    );

    if (!config.ONLY_DRAW_ONCE) {
      requestAnimationFrame((now: number) => tick(now));
    }
  }

  // start the scene drawing loop
  requestAnimationFrame((now: number) => tick(now));
}
