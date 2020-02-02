import { mat4 } from "gl-matrix";
import * as PressedKeys from './PressedKeys';
import config from './config';

const canvasId = 'canvas';

const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
if (!canvas) {
  throw new Error(`Could not find canvas, using id: '${canvasId}'`);
}

const globalGL = canvas.getContext('webgl');
if (!globalGL) {
  throw new Error(`Could not get webgl context from canvas`);
}

// Set clear color to black, fully opaque
globalGL.clearColor(0.0, 0.0, 0.0, 1.0);
// Clear the color buffer with specified clear color
globalGL.clear(globalGL.COLOR_BUFFER_BIT);

const circleVsSource = `
  attribute vec4 aPosition;
  
  uniform mat4 uModelViewMatrix;
  uniform mat4 uProjectionMatrix;

  void main() {
    gl_Position = uProjectionMatrix * uModelViewMatrix * aPosition;
  }
`;

const circleFsSource = `
  void main() {
    gl_FragColor = vec4(0.3, 0.5, 0.7, 0.9);
  }
`;

function initShaderProgram(gl: WebGLRenderingContext, vsSource: string, fsSource: string) {
  const vertexShader = loadShaderOrFail(gl, gl.VERTEX_SHADER, vsSource);
  const fragmentShader = loadShaderOrFail(gl, gl.FRAGMENT_SHADER, fsSource);

  // Create the shader program

  const shaderProgram = gl.createProgram()
    || (() => { throw new Error(`could not create shader program`); })();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  // If creating the shader program failed, alert

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
    return null;
  }

  return shaderProgram;
}
function loadShader(gl: WebGLRenderingContext, type: GLenum, source: string) {
  const shader = gl.createShader(type) || (() => { throw new Error(`could not create shader of type ${type}`); })();

  // Send the source to the shader object

  gl.shaderSource(shader, source);

  // Compile the shader program

  gl.compileShader(shader);

  // See if it compiled successfully

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

function loadShaderOrFail(gl: WebGLRenderingContext, type: GLenum, source: string) {
  return loadShader(gl, type, source)
    || (() => {
      throw new Error('could not create shader');
    })();
}

function initShaderProgramOrFail(gl: WebGLRenderingContext, vsSource: string, fsSource: string) {
  return initShaderProgram(gl, vsSource, fsSource)
    || (() => { throw new Error('could not initShaderProgram'); })();
}

const circleProgram = initShaderProgramOrFail(globalGL, circleVsSource, circleFsSource);

const circleProgramInfo = {
  program: circleProgram,
  attribLocations: {
    vertexPosition: globalGL.getAttribLocation(circleProgram, 'aPosition'),
  },
  uniformLocations: {
    projectionMatrix: globalGL.getUniformLocation(circleProgram, 'uProjectionMatrix'),
    modelViewMatrix: globalGL.getUniformLocation(circleProgram, 'uModelViewMatrix'),
  },
};

function initCircleBuffer(
  gl: WebGLRenderingContext,
  pInfo: typeof circleProgramInfo,
) {
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

  return vertexBuffer;
}

function drawCircle(
  gl: WebGLRenderingContext,
  program: WebGLProgram,
  buffer: WebGLBuffer,
  vertexPositionLocation: number,
  projectionMatrixLocation: WebGLUniformLocation,
  modelViewMatrixLocation: WebGLUniformLocation,
) {
  gl.useProgram(program);

  // Create a perspective matrix, a special matrix that is
  // used to simulate the distortion of perspective in a camera.
  // Our field of view is 45 degrees, with a width/height
  // ratio that matches the display size of the canvas
  // and we only want to see objects between 0.1 units
  // and 100 units away from the camera.

  const fieldOfView = 45 * Math.PI / 180;   // in radians
  // @ts-ignore
  const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
  const zNear = 0.1;
  const zFar = 100.0;
  const projectionMatrix = mat4.create();

  // note: gl-matrix.js always has the first argument
  // as the destination to receive the result.
  mat4.perspective(projectionMatrix,
    fieldOfView,
    aspect,
    zNear,
    zFar);

  // set this matrix to the value in the program uniform
  gl.uniformMatrix4fv(
    projectionMatrixLocation,
    false,
    projectionMatrix);

  // Set the drawing position to the "identity" point, which is
  // the center of the scene.
  const modelViewMatrix = mat4.create();

  // Now move the drawing position a bit to where we want to
  // start drawing the square.

  mat4.translate(modelViewMatrix,     // destination matrix
    modelViewMatrix,     // matrix to translate
    [-0.0, 0.0, -6.0]);  // amount to translate
  // note: translating "back" 6 units (putting the circle 6 units deep) makes it appear smaller

  // set matrix to program uniform
  gl.uniformMatrix4fv(
    modelViewMatrixLocation,
    false,
    modelViewMatrix);

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
  circlePInfo: typeof circleProgramInfo,
  circleBuffers: WebGLBuffer,
) {
  gl.clearColor(0.0, 0.0, 0.0, 1.0);  // Clear to black, fully opaque
  gl.clearDepth(1.0);                 // Clear everything
  gl.enable(gl.DEPTH_TEST);           // Enable depth testing
  gl.depthFunc(gl.LEQUAL);            // Near things obscure far things

  // Clear the canvas before we start drawing on it.
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  if (!circlePInfo.uniformLocations.projectionMatrix) {
    throw new Error('projectionMatrix location not set');
  }
  if (!circlePInfo.uniformLocations.modelViewMatrix) {
    throw new Error('modelViewMatrix location not set');
  }

  drawCircle(gl, circlePInfo.program, circleBuffers, circlePInfo.attribLocations.vertexPosition,
    circlePInfo.uniformLocations.projectionMatrix,
    circlePInfo.uniformLocations.modelViewMatrix);
}

const globalCircleBuffers = initCircleBuffer(globalGL, circleProgramInfo)
  || (() => { throw new Error('Could not init circle buffers'); })();

let then = 0;

let tutorialSquarePositionCorrectionX = 0;

let frameCount = 0;

if (config.LOG_FPS) {
  let previousFrameCount = 0;
  setInterval(() => {
    console.log('frames in the past second:', frameCount - previousFrameCount);
    previousFrameCount = frameCount;
  }, 1000);
}

// Draw the scene repeatedly
function tick(gl: WebGLRenderingContext, now: number) {
  frameCount++;

  now *= 0.001;  // convert to seconds
  const deltaTime = now - then;
  then = now;

  const keys = PressedKeys.capture();
  if (keys.isPressed('a')) {
    tutorialSquarePositionCorrectionX -= 1;
  } else if (keys.isPressed('d')) {
    tutorialSquarePositionCorrectionX += 1;
  }

  drawScene(gl, circleProgramInfo, globalCircleBuffers);

  requestAnimationFrame((now: number) => tick(gl, now));
}
requestAnimationFrame((now: number) => tick(globalGL, now));
