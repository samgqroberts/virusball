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

const tutorialSquareVsSource = `
  attribute vec4 aVertexPosition;

  uniform mat4 uModelViewMatrix;
  uniform mat4 uProjectionMatrix;

  void main() {
    gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
  }
`;

const tutorialSquareFsSource = `
  void main() {
    gl_FragColor = vec4(.5, 0.5, 1.0, 1.0);
  }
`;

const circleVsSource = `
  attribute vec4 aPosition;

  void main() {
    gl_Position = aPosition;
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

const tutorialSquareProgram =
  initShaderProgramOrFail(globalGL, tutorialSquareVsSource, tutorialSquareFsSource);

const tutorialSquareProgramInfo = {
  program: tutorialSquareProgram,
  attribLocations: {
    vertexPosition: globalGL.getAttribLocation(tutorialSquareProgram, 'aVertexPosition'),
  },
  uniformLocations: {
    projectionMatrix: globalGL.getUniformLocation(tutorialSquareProgram, 'uProjectionMatrix'),
    modelViewMatrix: globalGL.getUniformLocation(tutorialSquareProgram, 'uModelViewMatrix'),
  },
};

const circleProgram = initShaderProgramOrFail(globalGL, circleVsSource, circleFsSource);

const circleProgramInfo = {
  program: circleProgram,
  attribLocations: {
    vertexPosition: globalGL.getAttribLocation(circleProgram, 'aPosition'),
  },
};

interface TutorialSquareBuffers {
  position: WebGLBuffer
}
function initTutorialSquareBuffers(gl: WebGLRenderingContext): TutorialSquareBuffers {

  // Create a buffer for the square's positions.

  const positionBuffer = gl.createBuffer()
    || (() => { throw new Error('could not create buffer'); })();

  // Select the positionBuffer as the one to apply buffer
  // operations to from here out.

  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

  // Now create an array of positions for the square.

  const positions = [
    -1.0,  1.0,
     1.0,  1.0,
    -1.0, -1.0,
     1.0, -1.0,
  ];

  // Now pass the list of positions into WebGL to build the
  // shape. We do this by creating a Float32Array from the
  // JavaScript array, then use it to fill the current buffer.

  gl.bufferData(gl.ARRAY_BUFFER,
                new Float32Array(positions),
                gl.STATIC_DRAW);

  return {
    position: positionBuffer,
  };
}
function initCircleBuffers(
  gl: WebGLRenderingContext,
  pInfo: typeof circleProgramInfo,
) {
  const program = pInfo.program;
  // Create a buffer object
  const vertexBuffer = gl.createBuffer();
  let vertices: number[] = [];
  const vertCount = 2;
  for (var i=0.0; i<=330; i+=1) {
    // degrees to radians
    var j = i * Math.PI / 180;
    // X Y Z
    var vert1 = [
      Math.sin(j),
      Math.cos(j),
      // 0,
    ];
    var vert2 = [
      0,
      0,
      // 0,
    ];
    // DONUT:
    // var vert2 = [
    //   Math.sin(j)*0.5,
    //   Math.cos(j)*0.5,
    // ];
    vertices = vertices.concat(vert1);
    vertices = vertices.concat(vert2);
  }
  var n = vertices.length / vertCount;
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

  var aPosition = pInfo.attribLocations.vertexPosition;
  gl.enableVertexAttribArray(aPosition);
  gl.vertexAttribPointer(aPosition, vertCount, gl.FLOAT, false, 0, 0);

  return n;
}
function initBuffers(
  gl: WebGLRenderingContext
) {
  return initTutorialSquareBuffers(gl);
  // TODO currently circle buffers are inited on each draw
  //      we should have them only initialize once for perf
  // initCircleBuffers(gl, circleProgram);
}

let squareRotation = 0.0;

function drawTutorialSquare(
  gl: WebGLRenderingContext,
  pInfo: typeof tutorialSquareProgramInfo,
  deltaTime: number,
  positionCorrectX: number
) {

  // Set the drawing position to the "identity" point, which is
  // the center of the scene.
  const modelViewMatrix = mat4.create();

  // Now move the drawing position a bit to where we want to
  // start drawing the square.

  mat4.translate(modelViewMatrix,     // destination matrix
    modelViewMatrix,     // matrix to translate
    [-0.0 + positionCorrectX, 0.0, -6.0]);  // amount to translate
  squareRotation += deltaTime;
  mat4.rotate(modelViewMatrix,  // destination matrix
    modelViewMatrix,  // matrix to rotate
    squareRotation,   // amount to rotate in radians
    [0, 0, 1]);       // axis to rotate around

  // Tell WebGL how to pull out the positions from the position
  // buffer into the vertexPosition attribute.
  {
    const numComponents = 2;  // pull out 2 values per iteration
    const type = gl.FLOAT;    // the data in the buffer is 32bit floats
    const normalize = false;  // don't normalize
    const stride = 0;         // how many bytes to get from one set of values to the next
                              // 0 = use type and numComponents above
    const offset = 0;         // how many bytes inside the buffer to start from
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
    gl.vertexAttribPointer(
      pInfo.attribLocations.vertexPosition,
      numComponents,
      type,
      normalize,
      stride,
      offset);
    gl.enableVertexAttribArray(
      pInfo.attribLocations.vertexPosition);
  }

  gl.uniformMatrix4fv(
    pInfo.uniformLocations.modelViewMatrix,
    false,
    modelViewMatrix);

  {
    const offset = 0;
    const vertexCount = 4;
    gl.drawArrays(gl.TRIANGLE_STRIP, offset, vertexCount);
  }
}

function drawCircle(
  gl: WebGLRenderingContext,
  pInfo: typeof circleProgramInfo
) {
  gl.useProgram(pInfo.program);
  // Write the positions of vertices to a vertex shader
  var n = initCircleBuffers(gl, pInfo);
  if (n < 0) {
    console.log('Failed to set the positions of the vertices');
    return;
  }

  // Specify the color for clearing <canvas>
  // gl.clearColor(0, 0, 0, 1);
  // gl.clear(gl.COLOR_BUFFER_BIT);

  // Draw a line
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, n);
}

function drawScene(
  gl: WebGLRenderingContext,
  tutorialSquarePInfo: typeof tutorialSquareProgramInfo,
  circlePInfo: typeof circleProgramInfo,
  buffers: TutorialSquareBuffers,
  deltaTime: number,
  squarePosCorrectX: number
) {
  gl.clearColor(0.0, 0.0, 0.0, 1.0);  // Clear to black, fully opaque
  gl.clearDepth(1.0);                 // Clear everything
  gl.enable(gl.DEPTH_TEST);           // Enable depth testing
  gl.depthFunc(gl.LEQUAL);            // Near things obscure far things

  // Clear the canvas before we start drawing on it.

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

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

  /*
   * set the projection
   * this uses the same program as the tutorial square
   * when removing the tutorial square we will need to preserve this element, i think
   */

  // note: gl-matrix.js always has the first argument
  // as the destination to receive the result.
  mat4.perspective(projectionMatrix,
    fieldOfView,
    aspect,
    zNear,
    zFar);

  // Tell WebGL to use our program when drawing

  gl.useProgram(tutorialSquarePInfo.program);

  // Set the shader uniforms

  gl.uniformMatrix4fv(
    tutorialSquarePInfo.uniformLocations.projectionMatrix,
    false,
    projectionMatrix);

  drawTutorialSquare(gl, tutorialSquarePInfo, deltaTime, squarePosCorrectX);

  drawCircle(gl, circlePInfo);
}

const buffers = initBuffers(globalGL);

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

  drawScene(gl, tutorialSquareProgramInfo, circleProgramInfo, buffers, deltaTime, tutorialSquarePositionCorrectionX);

  requestAnimationFrame((now: number) => tick(gl, now));
}
requestAnimationFrame((now: number) => tick(globalGL, now));
