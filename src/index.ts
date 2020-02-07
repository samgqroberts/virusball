import * as PressedKeys from './PressedKeys';
import config from './config';
// @ts-ignore
import circleVsSource from './circle_vertex.glsl';
// @ts-ignore
import circleFsSource from './circle_fragment.glsl';
import { getUniformLocationOrFail, getWebglContext, initShaderProgramOrFail } from "./WebglUtils";

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
  circlePosX: number,
  circlePosY: number
) {
  gl.clearColor(0.0, 0.0, 0.0, 1.0);  // Clear to black, fully opaque
  gl.clearDepth(1.0);                 // Clear everything
  gl.enable(gl.DEPTH_TEST);           // Enable depth testing
  gl.depthFunc(gl.LEQUAL);            // Near things obscure far things

  // Clear the canvas before we start drawing on it.
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  drawCircle(gl,
    circlePInfo.program,
    circleBuffers,
    circlePInfo.attribLocations.vertexPosition,
    circlePInfo.uniformLocations.scaleVector,
    circlePInfo.uniformLocations.translationVector,
    circlePosX,
    circlePosY,
  );
}

function initGame() {
  const gl = getWebglContext('canvas');

  // initialize everything needed for the circle program
  const circleProgram = initShaderProgramOrFail(gl, circleVsSource, circleFsSource);
  const circleProgramInfo = initCircleProgramInfo(gl, circleProgram);
  const circleBuffer = initCircleBuffer(gl, circleProgramInfo);

  // initialize scene drawing / game engine variables
  let then = 0;
  let frameCount = 0;
  let circlePosX = config.CIRCLE_STARTING_X;
  let circlePosY = config.CIRCLE_STARTING_Y;

  if (config.LOG_FPS) {
    let previousFrameCount = 0;
    setInterval(() => {
      console.log('frames in the past second:', frameCount - previousFrameCount);
      previousFrameCount = frameCount;
    }, 1000);
  }

  // Draw the scene repeatedly
  function tick(now: number) {
    frameCount++;

    now *= 0.001;  // convert to seconds
    const deltaTime = now - then;
    then = now;

    const keys = PressedKeys.capture();
    if (keys.isPressed('a')) {
      circlePosX -= config.TICK_VELOCITY;
    } else if (keys.isPressed('d')) {
      circlePosX += config.TICK_VELOCITY;
    }
    if (keys.isPressed('s')) {
      circlePosY -= config.TICK_VELOCITY;
    } else if (keys.isPressed('w')) {
      circlePosY += config.TICK_VELOCITY
    }

    drawScene(gl,
      circleProgramInfo,
      circleBuffer,
      circlePosX,
      circlePosY
    );

    if (!config.ONLY_DRAW_ONCE) {
      requestAnimationFrame((now: number) => tick(now));
    }
  }

  // start the scene drawing loop
  requestAnimationFrame((now: number) => tick(now));
}
