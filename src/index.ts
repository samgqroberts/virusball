import * as PressedKeys from './PressedKeys';
import config from './config';
// @ts-ignore
import circleVsSource from './circle_vertex.glsl';
// @ts-ignore
import circleFsSource from './circle_fragment.glsl';
import { getUniformLocationOrFail, getWebglContext, initShaderProgramOrFail } from "./WebglUtils";
import { getInitialState, State } from "./state";
import { KeysCapture } from "./PressedKeys";
import * as Geometry from './geometry';

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
  const startingDegree = circleHalf === CircleHalf.LEFT ? 0 : 180;
  const finalDegree = circleHalf === CircleHalf.LEFT ? 180 : 360;
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

function drawWithProgram(
  gl: WebGLRenderingContext,
  programInfo: CircleProgramInfo,
  countedBuffer: CountedVertexBuffer,
  position: Geometry.Point,
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
  circlePos: Geometry.Point,
): void {
  drawWithProgram(gl,
    programInfo,
    buffer,
    circlePos,
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
    { x: state.player1PosX, y: state.player1PosY },
  );

  // player2
  drawCircle(gl,
    circlePInfo,
    circleBuffers,
    { x: state.player2PosX, y: state.player2PosY },
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

/** An object describing a collision between two objects */
type Manifold = {
  penetration: number,
  normal: Geometry.Vector,
};

function detectCollisionBetweenCircles(
  circle1: Geometry.Circle,
  circle2: Geometry.Circle,
  aspect: number
): Manifold | undefined {
  circle1 = Geometry.correctCircleAspect(circle1, aspect);
  circle2 = Geometry.correctCircleAspect(circle2, aspect);
  // Vector from A to B
  const n: Geometry.Vector = Geometry.diffVector(circle1.position, circle2.position);

  let r: number = circle1.radius + circle2.radius
  r *= r;

  if (Geometry.lengthSquared(n) > r) {
    return undefined;
  }

  // Circles have collided, now compute manifold
  const d: number = Geometry.length(n) // perform actual sqrt

  // If distance between circles is not zero
  if (d !== 0) {
    return {
      // Distance is difference between radius and distance
      penetration: r - d,
      // Points from A to B, and is a unit vector
      normal: Geometry.normalize(n),
    };
  }

  // Circles are on same position
  return {
    // Choose random (but consistent) values
    penetration: circle1.radius,
    normal: { x: 1, y: 2 },
  }
}

function dotProduct(vector1: Geometry.Vector, vector2: Geometry.Vector): number {
  return vector1.x * vector2.x + vector1.y * vector2.y;
}

type CollisionInfo = {
  velocity: Geometry.Vector,
  restitution: number,
  mass: number,
}

type CollisionResolution = {
  velocity1: Geometry.Vector,
  velocity2: Geometry.Vector,
}

function resolveCollisionBetweenCircles(
  obj1: CollisionInfo,
  obj2: CollisionInfo,
  normal: Geometry.Vector,
): CollisionResolution | undefined {
  // Calculate relative velocity
  const rv: Geometry.Vector = Geometry.diffVector(obj1.velocity, obj2.velocity);
 
  // Calculate relative velocity in terms of the normal direction
  const velAlongNormal: number = dotProduct(rv, normal);
 
  // Do not resolve if velocities are separating
  if (velAlongNormal > 0) {
    return;
  }
 
  // Calculate restitution
  const e: number = Math.min(obj1.restitution, obj2.restitution);
 
  // Calculate impulse scalar
  let j: number = -(1 + e) * velAlongNormal
  j /= 1 / obj1.mass + 1 / obj2.mass
 
  // Apply impulse
  const impulse: Geometry.Vector = Geometry.vectorMultiplication(j, normal);
  return {
    velocity1: Geometry.vectorSubtraction(obj1.velocity, Geometry.vectorMultiplication(1 / obj1.mass, impulse)),
    velocity2: Geometry.vectorAddition(obj2.velocity, Geometry.vectorMultiplication(1 / obj2.mass, impulse)),
  };
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

  const detectionResult = detectCollisionBetweenCircles(
    { position: { x: state.player1PosX, y: state.player1PosY }, radius: config.CIRCLE_RADIUS },
    { position: { x: state.player2PosX, y: state.player2PosY }, radius: config.CIRCLE_RADIUS },
    aspect
  );
  if (detectionResult) {
    const resolutionResult = resolveCollisionBetweenCircles(
      { velocity: { x: state.player1VelocityX, y: state.player1VelocityY }, restitution: config.PLAYER_RESTITUTION, mass: config.PLAYER_MASS },
      { velocity: { x: state.player2VelocityX, y: state.player2VelocityY }, restitution: config.PLAYER_RESTITUTION, mass: config.PLAYER_MASS },
      detectionResult.normal,
    );
    if (resolutionResult) {
      state.player1VelocityX = resolutionResult.velocity1.x;
      state.player1VelocityY = resolutionResult.velocity1.y;
      state.player2VelocityX = resolutionResult.velocity2.x;
      state.player2VelocityY = resolutionResult.velocity2.y;
    }
  }
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
// TODO drag rate is currently liable to change velocity direction.
//      this may be due to the fact that this function applies drag separately to each velocity component.
//      it will have to consider both components in order to drag while preserving direction.
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
