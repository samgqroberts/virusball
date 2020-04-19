import config from './config';
import * as Geometry from './geometry';
import { KeyMappings } from './models';
import * as Physics from './physics';
import * as PressedKeys from './PressedKeys';
import { KeysCapture } from "./PressedKeys";
import shape2dFsSource from './shape2d_fragment.glsl';
import shape2dVsSource from './shape2d_vertex.glsl';
import { getInitialState, State } from "./state";
import { getUniformLocationOrFail, getWebglContext, initShaderProgramOrFail } from "./WebglUtils";

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

type Shape2DProgramInfo = {
  program: WebGLProgram,
  attribLocations: {
    vertexPosition: number,
  },
  uniformLocations: {
    colorVector: WebGLUniformLocation,
    scaleVector: WebGLUniformLocation,
    translationVector: WebGLUniformLocation,
  }
}

function initShape2dProgramInfo(
  gl: WebGLRenderingContext,
  shape2dProgram: WebGLProgram
): Shape2DProgramInfo {
  return {
    program: shape2dProgram,
    attribLocations: {
      vertexPosition: gl.getAttribLocation(shape2dProgram, 'aPosition'),
    },
    uniformLocations: {
      colorVector: getUniformLocationOrFail(gl, shape2dProgram, 'uColorVector'),
      scaleVector: getUniformLocationOrFail(gl, shape2dProgram, 'uScaleVector'),
      translationVector: getUniformLocationOrFail(gl, shape2dProgram, 'uTranslationVector'),
    },
  };
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
  for (let currentDegree = 0.0; currentDegree <= 360; currentDegree++) {
    const currentRadian = Geometry.degreeToRadian(currentDegree);
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
  const startingDegree = circleHalf === CircleHalf.RIGHT ? 0 : 180;
  const finalDegree = circleHalf === CircleHalf.RIGHT ? 180 : 360;
  for (let currentDegree = startingDegree; currentDegree <= finalDegree; currentDegree++) {
    const currentRadian = Geometry.degreeToRadian(currentDegree);

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

type Color = {
  red: number,
  green: number,
  blue: number,
  alpha: number,
}

function drawWithProgram(
  gl: WebGLRenderingContext,
  programInfo: Shape2DProgramInfo,
  countedBuffer: CountedVertexBuffer,
  position: Geometry.Point,
  scale: number,
  color: Color,
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

  // the color vector... what could that do?
  gl.uniform4f(uniformLocations.colorVector, color.red, color.green, color.blue, color.alpha);

  gl.bindBuffer(gl.ARRAY_BUFFER, countedBuffer.buffer);
  let aPosition = attribLocations.vertexPosition;
  gl.enableVertexAttribArray(aPosition);
  gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

  // Draw the polygons in the circle buffer
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, countedBuffer.vertexCount);
}

function drawCircle(
  gl: WebGLRenderingContext,
  programInfo: Shape2DProgramInfo,
  buffer: CountedVertexBuffer,
  circlePos: Geometry.Point,
  color: Color,
): void {
  drawWithProgram(gl,
    programInfo,
    buffer,
    circlePos,
    config.CIRCLE_RADIUS,
    color,
  )
}

function drawSemicircleArc(
  gl: WebGLRenderingContext,
  programInfo: Shape2DProgramInfo,
  buffer: CountedVertexBuffer,
  position: Geometry.Point,
  color: Color,
): void {
  drawWithProgram(gl,
    programInfo,
    buffer,
    position,
    config.SEMICIRCLE_ARC_RADIUS,
    color
  );
}

function drawScene(
  gl: WebGLRenderingContext,
  circlePInfo: Shape2DProgramInfo,
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
    state.player1Pos,
    config.PLAYER_1_COLOR,
  );

  // player2
  drawCircle(gl,
    circlePInfo,
    circleBuffers,
    state.player2Pos,
    config.PLAYER_2_COLOR
  );

  // left goal post
  drawSemicircleArc(gl,
    circlePInfo,
    leftSemicircleArcBuffer,
    { x: -config.GOAL_OFFSET_X, y: 0 },
    config.PLAYER_1_COLOR,
  );

  // right goal post
  drawSemicircleArc(gl,
    circlePInfo,
    rightSemicircleArcBuffer,
    { x: config.GOAL_OFFSET_X, y: 0 },
    config.PLAYER_2_COLOR,
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
  const { PLAYER_ACCELERATION, PLAYER_REVERSE_ACCELERATION, PLAYER_DRAG, PLAYER_MAX_SPEED, PLAYER_1_KEY_MAPPINGS, PLAYER_2_KEY_MAPPINGS } = config;
  // PLAYER_ACCELERATION is measured per second, so multiply by how many seconds have passed
  //   to determine how much to change velocity
  const deltaTime = state.currentFrameTimestamp - state.previousFrameTimestamp;
  const acceleration = PLAYER_ACCELERATION * deltaTime;
  const reverseAcceleration = PLAYER_REVERSE_ACCELERATION * deltaTime;
  const drag = PLAYER_DRAG * deltaTime;

  const keys = PressedKeys.capture();

  // wrapper to capture current-frame constants
  const updateVelocityFn = (velocity: Geometry.Vector, keyMappings: KeyMappings) =>
    updateVelocity(
      velocity,
      PLAYER_MAX_SPEED,
      acceleration,
      reverseAcceleration,
      drag,
      aspect,
      keys,
      keyMappings
    );

  // update velocities
  state.player1Velocity = updateVelocityFn(state.player1Velocity, PLAYER_1_KEY_MAPPINGS);
  state.player2Velocity = updateVelocityFn(state.player2Velocity, PLAYER_2_KEY_MAPPINGS);

  // update positions based on velocity
  state.player1Pos = Geometry.vectorAddition(state.player1Pos, state.player1Velocity);
  state.player2Pos = Geometry.vectorAddition(state.player2Pos, state.player2Velocity);

  const detectionResult = Physics.detectCollisionBetweenCircles(
    { position: state.player1Pos, radius: config.CIRCLE_RADIUS },
    { position: state.player2Pos, radius: config.CIRCLE_RADIUS },
    aspect
  );
  if (detectionResult) {
    const resolutionResult = Physics.resolveCollisionBetweenCircles(
      { velocity: state.player1Velocity, restitution: config.PLAYER_RESTITUTION, mass: config.PLAYER_MASS },
      { velocity: state.player2Velocity, restitution: config.PLAYER_RESTITUTION, mass: config.PLAYER_MASS },
      detectionResult.normal,
    );
    if (resolutionResult) {
      state.player1Velocity = resolutionResult.velocity1;
      state.player2Velocity = resolutionResult.velocity2;
    }
  }
}

/**
 * updates a given velocity) with respect to user input, acceleration, and drag.
 * @param currentVelocity the velocity value coming into this frame
 * @param maxSpeed the cap for the velocity's magnitute
 * @param accelerationRate amount to update a velocity component by if correct key is pressed
 * @param reverseAccelerationRate amount to update a velocity component by if correct key is pressed
 *        and player is currently moving in the opposite direction
 * @param dragRate amount to update velocity's magnitute by if no relevant key is pressed
 * @param aspect the scale aspect of the canvas (width / height), to correct movement
 * @param pressedKeys current frame capture of pressed keys
 * @param keyMappings key mapping config for given player, to cross reference with pressedKeys
 */
function updateVelocity(
  currentVelocity: Geometry.Vector,
  maxSpeed: number,
  accelerationRate: number,
  reverseAccelerationRate: number,
  dragRate: number,
  aspect: number,
  pressedKeys: KeysCapture,
  keyMappings: KeyMappings,
): Geometry.Vector {
  let { x, y } = currentVelocity;
  const xResult = updateComponentSpeed(
    x,
    accelerationRate,
    reverseAccelerationRate,
    pressedKeys,
    keyMappings.left,
    keyMappings.right,
  );
  const yResult = updateComponentSpeed(
    y,
    accelerationRate * aspect,
    reverseAccelerationRate * aspect,
    pressedKeys,
    keyMappings.down,
    keyMappings.up,
  );
  // if only one component changed, drag against the other one
  x = xResult.speed;
  y = yResult.speed;
  if (xResult.noChange && !yResult.noChange && x !== 0) {
    x = x > 0 ? Math.max(0, x - dragRate) : Math.min(0, x + dragRate);
  } else if (yResult.noChange && !xResult.noChange && y !== 0) {
    y = y > 0 ? Math.max(0, y - dragRate) : Math.min(0, y + dragRate);
  } else if (xResult.noChange && yResult.noChange) {
    // preserve direction by dragging against vector speed, rather than a single component's speed
    const velocity = { x, y };
    const speed = Geometry.length(velocity);
    if (speed > 0) {
      // drag rate applies to each component, so apply drag rate twice to overall speed
      const newSpeed = Math.max(0, speed - dragRate * 2);
      const newVelocity = Geometry.vectorMultiplication(velocity, newSpeed / speed);
      x = newVelocity.x;
      y = newVelocity.y;
    }
  }
  {
    // cap velocity's speed
    const velocity = { x, y };
    const speed = Geometry.length(velocity);
    if (speed > maxSpeed) {
      const newVelocity = Geometry.vectorMultiplication(velocity, maxSpeed / speed);
      x = newVelocity.x;
      y = newVelocity.y;
    }
  }
  return { x, y };
}

/**
 * updates a single velocity component (x or y) with respect to user input and acceleration.
 * @param currentSpeed the component velocity value coming into this frame
 * @param accelerationRate amount to update velocity by if correct key is pressed
 * @param reverseAccelerationRate amount to update velocity by if correct key is pressed
 *        and player is currently moving in the opposite direction
 * @param pressedKeys current frame capture of pressed keys
 * @param negativeKey keycode for movement in negative direction
 * @param positiveKey keycode for movement in positive direction
 */
function updateComponentSpeed(
  currentSpeed: number,
  accelerationRate: number,
  reverseAccelerationRate: number,
  pressedKeys: KeysCapture,
  negativeKey: PressedKeys.Key,
  positiveKey: PressedKeys.Key,
): { speed: number, noChange: boolean } {
  let speed = currentSpeed;
  let noChange = false;
  const pressedKey = pressedKeys.latestPressed(negativeKey, positiveKey);
  if (pressedKey === negativeKey) {
    if (speed > 0) {
      speed -= reverseAccelerationRate;
    } else {
      speed -= accelerationRate;
    }
  } else if (pressedKey === positiveKey) {
    if (speed < 0) {
      speed += reverseAccelerationRate;
    } else {
      speed += accelerationRate;
    }
  } else {
    noChange = true;
  }
  return { speed, noChange };
}

function initGame() {
  const gl = getWebglContext('canvas');

  // initialize everything needed for the circle program
  const shape2dProgram = initShaderProgramOrFail(gl, shape2dVsSource, shape2dFsSource);
  const shape2dProgramInfo = initShape2dProgramInfo(gl, shape2dProgram);
  const { program } = shape2dProgramInfo;
  const circleBuffer = initCircleBuffer(gl, shape2dProgram);
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
      shape2dProgramInfo,
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
