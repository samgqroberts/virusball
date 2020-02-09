import * as PressedKeys from './PressedKeys';
import config from './config';
// @ts-ignore
import circleVsSource from './circle_vertex.glsl';
// @ts-ignore
import circleFsSource from './circle_fragment.glsl';
import { getUniformLocationOrFail, getWebglContext, initShaderProgramOrFail } from "./WebglUtils";
import { getInitialState, State } from "./state";

// entrypoint to the game. defined below
initGame();

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

function initCircleBuffer(
  gl: WebGLRenderingContext,
  pInfo: CircleProgramInfo,
): WebGLBuffer {
  const program = pInfo.program;
  gl.useProgram(program);
  // Create a buffer object
  const vertexBuffer = gl.createBuffer();
  let vertices: number[] = [];
  const vertCount = 2;
  for (let i = 0.0; i <= 360; i+=1) {
    // degrees to radians
    let j = i * Math.PI / 180;
    // X Y Z
    let vert1 = [
      Math.sin(j),
      Math.cos(j),
      // 0,
    ];
    let vert2 = [
      0,
      0,
    ];
    vertices = vertices.concat(vert1);
    vertices = vertices.concat(vert2);
  }

  // TODO what exactly "n" is should be propagated up to rendering
  let n = vertices.length / vertCount;
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

  return vertexBuffer
    || (() => { throw new Error('Could not init circle buffers'); })();
}

function drawCircle(
  gl: WebGLRenderingContext,
  program: WebGLProgram,
  buffer: WebGLBuffer,
  vertexPositionLocation: number,
  scaleVectorLocation: WebGLUniformLocation,
  translationVectorLocation: WebGLUniformLocation,
  circlePosX: number,
  circlePosY: number
) {
  gl.useProgram(program);

  const aspect = gl.canvas.width / gl.canvas.height;

  // scale vector will convert the circle from an oval shape
  //   to a circle shape by changing the dimensions of the circle primitive
  //   relative to the aspect ratio of the canvas.
  // the circle starts out as an oval because the canvas is potentially not a perfect square,
  //   yet canvas clipspace goes from -1 to 1 in x and y directions regardless.
  // scale vector will also change the size of the circle
  //   by multiplying the vector positions by CIRCLE_RADIUS
  gl.uniform2f(scaleVectorLocation, config.CIRCLE_RADIUS, aspect * config.CIRCLE_RADIUS);

  // translation vector will move the circle along x and y axes
  gl.uniform2f(translationVectorLocation, circlePosX, circlePosY);

  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  let aPosition = vertexPositionLocation;
  gl.enableVertexAttribArray(aPosition);
  gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

  // Draw the polygons in the circle buffer
  // TODO 722 here is a magic number - it should be retrieved from initCircleBuffer
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 722);
}

function drawScene(
  gl: WebGLRenderingContext,
  circlePInfo: CircleProgramInfo,
  circleBuffers: WebGLBuffer,
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
    circlePInfo.program,
    circleBuffers,
    circlePInfo.attribLocations.vertexPosition,
    circlePInfo.uniformLocations.scaleVector,
    circlePInfo.uniformLocations.translationVector,
    state.player1PosX,
    state.player1PosY,
  );

  // player2
  drawCircle(gl,
    circlePInfo.program,
    circleBuffers,
    circlePInfo.attribLocations.vertexPosition,
    circlePInfo.uniformLocations.scaleVector,
    circlePInfo.uniformLocations.translationVector,
    state.player2PosX,
    state.player2PosY,
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
 */
// TODO implement speed cap
// TODO implement drag when no keys are pressed
// TODO reversing direction should accelerate quicker than continuing in same direction
function incorporateUserInput(state: State): void {
  // PLAYER_ACCELERATION is measured per second, so multiply by how many seconds have passed
  //   to determine how much to change velocity
  const deltaTime = state.currentFrameTimestamp - state.previousFrameTimestamp;
  const acceleration = config.PLAYER_ACCELERATION * deltaTime;

  const keys = PressedKeys.capture();
  // update velocity for player1
  if (keys.isPressed('a')) {
    state.player1VelocityX -= acceleration;
  } else if (keys.isPressed('d')) {
    state.player1VelocityX += acceleration;
  }
  if (keys.isPressed('s')) {
    state.player1VelocityY -= acceleration;
  } else if (keys.isPressed('w')) {
    state.player1VelocityY += acceleration
  }
  // update velocity for player2
  if (keys.isPressed('ArrowLeft')) {
    state.player2VelocityX -= acceleration;
  } else if (keys.isPressed('ArrowRight')) {
    state.player2VelocityX += acceleration;
  }
  if (keys.isPressed('ArrowDown')) {
    state.player2VelocityY -= acceleration;
  } else if (keys.isPressed('ArrowUp')) {
    state.player2VelocityY += acceleration;
  }

  // update positions based on velocity
  state.player1PosX += state.player1VelocityX;
  state.player1PosY += state.player1VelocityY;
  state.player2PosX += state.player2VelocityX;
  state.player2PosY += state.player2VelocityY;
}

function initGame() {
  const gl = getWebglContext('canvas');

  // initialize everything needed for the circle program
  const circleProgram = initShaderProgramOrFail(gl, circleVsSource, circleFsSource);
  const circleProgramInfo = initCircleProgramInfo(gl, circleProgram);
  const circleBuffer = initCircleBuffer(gl, circleProgramInfo);

  // initialize scene drawing / game engine variables
  const state: State = getInitialState();
  logFPS(state);

  // Draw the scene repeatedly
  function tick(now: number) {
    state.frameCount++;
    state.previousFrameTimestamp = state.currentFrameTimestamp;
    state.currentFrameTimestamp = now * 0.001; // convert to seconds
    // TODO use deltaTime, probably for acceleration (current movement is simply velocity)

    incorporateUserInput(state);

    drawScene(gl,
      circleProgramInfo,
      circleBuffer,
      state,
    );

    if (!config.ONLY_DRAW_ONCE) {
      requestAnimationFrame((now: number) => tick(now));
    }
  }

  // start the scene drawing loop
  requestAnimationFrame((now: number) => tick(now));
}
