import * as cfg from './config';
import * as Geometry from './geometry';
import { KeyMappings, Color, Dimensions, CircleHalf } from './models';
import * as Physics from './physics';
import * as PressedKeys from './PressedKeys';
import { KeysCapture } from "./PressedKeys";
import shape2dFsSource from './shape2d_fragment.glsl';
import shape2dVsSource from './shape2d_vertex.glsl';
import { getInitialState, State } from "./state";
import { getUniformLocationOrFail, getWebglContext, initShaderProgramOrFail } from "./WebglUtils";

const DIMENSION = 2; // it's a 2D game - so we have two values per vertex

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

/**
 * Converts a value that's meant to me a proportion of some overall value (eg. of overall canvas width)
 * from pixels to clipspace.
 */
function pixelScalarToClipspace(
  pixelValue: number,
  pixelValueMax: number,
) {
  // from x = 0 to x = width in pixels, we go from x = -1 to x = 1 in clipspace
  // so overall width in clipspace is 2.
  // do not correct by subtracting -1 because this is not tracking position, but rather proportion
  return ((pixelValue * 2) / pixelValueMax);
}

function pixelPositionToClipspace(
  pixelPos: Geometry.Point,
  dimension: Dimensions,
): Geometry.Point {
  return {
    x: pixelScalarToClipspace(pixelPos.x, dimension.x) - 1,
    y: pixelScalarToClipspace(pixelPos.y, dimension.y) - 1,
  };
}

function drawWithProgram(
  config: cfg.Config,
  gl: WebGLRenderingContext,
  programInfo: Shape2DProgramInfo,
  countedBuffer: CountedVertexBuffer,
  position: Geometry.Point,
  scale: number,
  color: Color,
): void {
  const { program, attribLocations, uniformLocations } = programInfo;
  gl.useProgram(program);

  // all values affecting position or size coming into this method are assumed to be in pixels
  // we must convert them to clipspace
  const dimensions = config.canvasDimensions;
  // scale is tracking scale along with x-axis
  const clipspaceScale = pixelScalarToClipspace(scale, dimensions.x);
  const aspect = dimensions.x / dimensions.y;
  const clipspacePosition: Geometry.Point = pixelPositionToClipspace(position, dimensions);

  // scale vector will convert the circle from an oval shape
  //   to a circle shape by changing the dimensions of the circle primitive
  //   relative to the aspect ratio of the canvas.
  // the circle starts out as an oval because the canvas is potentially not a perfect square,
  //   yet canvas clipspace goes from -1 to 1 in x and y directions regardless.
  // scale vector will also change the size of the circle
  //   by multiplying the vector positions by CIRCLE_RADIUS
  gl.uniform2f(uniformLocations.scaleVector, clipspaceScale, aspect * clipspaceScale);

  // translation vector will move the circle along x and y axes
  // must multiply y position by -1 because y pixel position considers 0 to be top of canvas and extend downward
  gl.uniform2f(uniformLocations.translationVector, clipspacePosition.x, -1 * clipspacePosition.y);

  // the color vector... what could that do?
  gl.uniform4f(uniformLocations.colorVector, color.red, color.green, color.blue, color.alpha);

  gl.bindBuffer(gl.ARRAY_BUFFER, countedBuffer.buffer);
  let aPosition = attribLocations.vertexPosition;
  gl.enableVertexAttribArray(aPosition);
  gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

  // Draw the polygons in the circle buffer
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, countedBuffer.vertexCount);
}

interface CircleDrawInfo extends Geometry.Circle {
  color: Color
}

function drawCircle(
  config: cfg.Config,
  gl: WebGLRenderingContext,
  programInfo: Shape2DProgramInfo,
  buffer: CountedVertexBuffer,
  drawInfo: CircleDrawInfo,
): void {
  drawWithProgram(
    config,
    gl,
    programInfo,
    buffer,
    drawInfo.position,
    drawInfo.radius,
    drawInfo.color,
  )
}

function drawSemicircleArc(
  config: cfg.Config,
  gl: WebGLRenderingContext,
  programInfo: Shape2DProgramInfo,
  buffer: CountedVertexBuffer,
  position: Geometry.Point,
  color: Color,
): void {
  drawWithProgram(
    config,
    gl,
    programInfo,
    buffer,
    position,
    config.SEMICIRCLE_ARC_RADIUS,
    color
  );
}

function drawScene(
  config: cfg.Config,
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
  drawCircle(
    config,
    gl,
    circlePInfo,
    circleBuffers,
    {
      position: state.player1Pos,
      color: config.PLAYER_1_COLOR,
      radius: config.PLAYER_CIRCLE_RADIUS,
    },
  );

  // player2
  drawCircle(
    config,
    gl,
    circlePInfo,
    circleBuffers,
    {
      position: state.player2Pos,
      color: config.PLAYER_2_COLOR,
      radius: config.PLAYER_CIRCLE_RADIUS,
    },
  );

  // ball
  drawCircle(
    config,
    gl,
    circlePInfo,
    circleBuffers,
    {
      position: state.ballPos,
      color: config.BALL_COLOR,
      radius: config.BALL_CIRCLE_RADIUS,
    }
  );

  // left goal post
  const centeredY = config.canvasDimensions.y / 2;
  drawSemicircleArc(
    config,
    gl,
    circlePInfo,
    leftSemicircleArcBuffer,
    { x: config.canvasDimensions.x / 2 - config.GOAL_OFFSET_X, y: centeredY },
    config.PLAYER_1_COLOR,
  );

  // right goal post
  drawSemicircleArc(
    config,
    gl,
    circlePInfo,
    rightSemicircleArcBuffer,
    { x: config.canvasDimensions.x / 2 + config.GOAL_OFFSET_X, y: centeredY },
    config.PLAYER_2_COLOR,
  );
}

/**
 * If FPS logging is on (configured), tracks how many frames pass each second and logs to console.
 * @param state the game state object. state is assumed to be mutable, with the reference passed
 *        in on initial function call being valid for the lifecycle of the game.
 */
function logFPS(config: cfg.Config, state: State): void {
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
function updatePlayerPositions(config: cfg.Config, state: State, aspect: number): void {
  const { PLAYER_ACCELERATION, PLAYER_REVERSE_ACCELERATION, PLAYER_DRAG, PLAYER_MAX_SPEED, PLAYER_1_KEY_MAPPINGS, PLAYER_2_KEY_MAPPINGS } = config;
  // PLAYER_ACCELERATION is measured per second, so multiply by how many seconds have passed
  //   to determine how much to change velocity
  const deltaTime = state.currentFrameTimestamp - state.previousFrameTimestamp;
  const acceleration = PLAYER_ACCELERATION * deltaTime;
  const reverseAcceleration = PLAYER_REVERSE_ACCELERATION * deltaTime;
  const drag = PLAYER_DRAG * deltaTime;

  const keys = PressedKeys.capture();

  // wrapper to capture current-frame constants
  const updateVelocityFn = (velocity: Geometry.Vector, keyMappings?: KeyMappings) =>
    updateVelocity(
      velocity,
      PLAYER_MAX_SPEED,
      acceleration,
      reverseAcceleration,
      drag,
      keyMappings && {
        pressedKeys: keys,
        keyMappings,
      },
    );

  // update velocities
  state.player1Velocity = updateVelocityFn(state.player1Velocity, PLAYER_1_KEY_MAPPINGS);
  state.player2Velocity = updateVelocityFn(state.player2Velocity, PLAYER_2_KEY_MAPPINGS);
  state.ballVelocity = updateVelocityFn(state.ballVelocity);

  // TODO detect collision with goal posts
  // TODO eliminate copy-pasta
  // player on player
  const p1p2DetectionResult = Physics.detectCollisionBetweenCircles(
    { position: state.player1Pos, radius: config.PLAYER_CIRCLE_RADIUS },
    { position: state.player2Pos, radius: config.PLAYER_CIRCLE_RADIUS },
  );
  if (p1p2DetectionResult) {
    const resolutionResult = Physics.resolveCollisionBetweenCircles(
      { velocity: state.player1Velocity, restitution: config.PLAYER_RESTITUTION, mass: config.PLAYER_MASS },
      { velocity: state.player2Velocity, restitution: config.PLAYER_RESTITUTION, mass: config.PLAYER_MASS },
      p1p2DetectionResult.normal,
    );
    if (resolutionResult) {
      state.player1Velocity = resolutionResult.velocity1;
      state.player2Velocity = resolutionResult.velocity2;
    }
  }
  // player1 on ball
  const p1BallDetectionResult = Physics.detectCollisionBetweenCircles(
    { position: state.player1Pos, radius: config.PLAYER_CIRCLE_RADIUS },
    { position: state.ballPos, radius: config.BALL_CIRCLE_RADIUS },
  );
  if (p1BallDetectionResult) {
    const resolutionResult = Physics.resolveCollisionBetweenCircles(
      { velocity: state.player1Velocity, restitution: config.PLAYER_RESTITUTION, mass: config.PLAYER_MASS },
      { velocity: state.ballVelocity, restitution: config.BALL_RESTITUTION, mass: config.BALL_MASS },
      p1BallDetectionResult.normal,
    );
    if (resolutionResult) {
      state.player1Velocity = resolutionResult.velocity1;
      state.ballVelocity = resolutionResult.velocity2;
    }
  }
  // player2 on ball
  const p2BallDetectionResult = Physics.detectCollisionBetweenCircles(
    { position: state.player2Pos, radius: config.PLAYER_CIRCLE_RADIUS },
    { position: state.ballPos, radius: config.BALL_CIRCLE_RADIUS },
  );
  if (p2BallDetectionResult) {
    const resolutionResult = Physics.resolveCollisionBetweenCircles(
      { velocity: state.player2Velocity, restitution: config.PLAYER_RESTITUTION, mass: config.PLAYER_MASS },
      { velocity: state.ballVelocity, restitution: config.BALL_RESTITUTION, mass: config.BALL_MASS },
      p2BallDetectionResult.normal,
    );
    if (resolutionResult) {
      state.player2Velocity = resolutionResult.velocity1;
      state.ballVelocity = resolutionResult.velocity2;
    }
  }
  // player1 on left goal post
  const p1LeftGoalDetectionResult = Physics.detectCollisionBetweenCircleAndSemicircleArc(
    { position: state.player1Pos, radius: config.PLAYER_CIRCLE_RADIUS },
    {
      position: {
        x: (config.canvasDimensions.x / 2) - config.GOAL_OFFSET_X,
        y: config.canvasDimensions.y / 2,
      },
      radius: config.SEMICIRCLE_ARC_RADIUS,
      arcWidth: config.SEMICIRCLE_ARC_WIDTH,
      circleHalf: CircleHalf.LEFT,
    },
  );
  if (p1LeftGoalDetectionResult) {
    const resolutionResult = Physics.resolveCollisionBetweenCircles(
      { velocity: state.player1Velocity, restitution: config.PLAYER_RESTITUTION, mass: config.PLAYER_MASS },
      { velocity: { x: 0, y: 0 }, restitution: config.GOAL_RESTITUTION, mass: Number.MAX_SAFE_INTEGER },
      p1LeftGoalDetectionResult.normal,
    );
    if (resolutionResult) {
      state.player1Velocity = resolutionResult.velocity1;
    }
  }
  // TODO add collision detection for other entities and goal posts

  // update positions based on velocity
  state.player1Pos = Geometry.vectorAddition(state.player1Pos, state.player1Velocity);
  state.player2Pos = Geometry.vectorAddition(state.player2Pos, state.player2Velocity);
  state.ballPos = Geometry.vectorAddition(state.ballPos, state.ballVelocity);
}

/**
 * updates a given velocity with respect to user input, acceleration, and drag.
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
  keys?: {
    pressedKeys: KeysCapture
    keyMappings: KeyMappings,
  }
): Geometry.Vector {
  let { x, y } = currentVelocity;
  const xResult = updateComponentSpeed(
    x,
    accelerationRate,
    reverseAccelerationRate,
    keys && {
      pressedKeys: keys.pressedKeys,
      negativeKey: keys.keyMappings.left,
      positiveKey: keys.keyMappings.right,
    }
  );
  const yResult = updateComponentSpeed(
    y,
    accelerationRate,
    reverseAccelerationRate,
    keys && {
      pressedKeys: keys.pressedKeys,
      negativeKey: keys.keyMappings.up, // pressing up makes the player visibly go up, but that is negative in the y-direction
      positiveKey: keys.keyMappings.down,
    }
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
  keys?: {
    pressedKeys: KeysCapture,
    negativeKey: PressedKeys.Key,
    positiveKey: PressedKeys.Key,
  }
): { speed: number, noChange: boolean } {
  let speed = currentSpeed;
  let noChange = false;
  if (keys) {
    const { pressedKeys, negativeKey, positiveKey } = keys;
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
  } else {
    noChange = true;
  }
  return { speed, noChange };
}

export function initGame(baseConfig: cfg.BaseConfig) {
  const gl = getWebglContext('canvas');

  const dimensions: Dimensions = { x: gl.canvas.width, y: gl.canvas.height };
  const config = cfg.configWithPixelValues(baseConfig, dimensions);

  // for debugging: attach the config objects to window
  Object.assign(window, { baseConfig, config });

  // initialize everything needed for the circle program
  const shape2dProgram = initShaderProgramOrFail(gl, shape2dVsSource, shape2dFsSource);
  const shape2dProgramInfo = initShape2dProgramInfo(gl, shape2dProgram);
  const { program } = shape2dProgramInfo;
  const circleBuffer = initCircleBuffer(gl, shape2dProgram);
  const leftSemicircleArcBuffer = initSemicircleArcBuffer(gl, program, CircleHalf.LEFT, config.SEMICIRCLE_ARC_WIDTH);
  const rightSemicircleArcBuffer = initSemicircleArcBuffer(gl, program, CircleHalf.RIGHT, config.SEMICIRCLE_ARC_WIDTH);

  // initialize scene drawing / game engine variables
  const state: State = getInitialState(config);
  logFPS(config, state);

  // Draw the scene repeatedly
  function tick(now: number) {
    state.frameCount++;
    state.previousFrameTimestamp = state.currentFrameTimestamp;
    state.currentFrameTimestamp = now * 0.001; // convert to seconds

    updatePlayerPositions(config, state, getAspect(gl));

    // for debugging: attach the state object to window
    Object.assign(window, { state });

    drawScene(
      config,
      gl,
      shape2dProgramInfo,
      circleBuffer,
      leftSemicircleArcBuffer,
      rightSemicircleArcBuffer,
      state,
    );

    if (!config.ONLY_DRAW_ONCE) {
      requestAnimationFrame(tick);
    }
  }

  // start the scene drawing loop
  requestAnimationFrame(tick);
}

