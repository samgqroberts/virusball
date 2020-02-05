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

const circleVsSource = `
  attribute vec2 aPosition;
  
  uniform vec2 uScaleVector;

  void main() {
    // simply scale the position by the scale vector.
    // vector scaling is done via multiplication.
    gl_Position = vec4(uScaleVector * aPosition, 0, 1);
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
    scaleVector: globalGL.getUniformLocation(circleProgram, 'uScaleVector'),
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
  scaleVectorLocation: WebGLUniformLocation,
) {
  gl.useProgram(program);

  // @ts-ignore
  const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;

  // scale vector will convert the circle from an oval shape
  //   to a circle shape by changing the dimensions of the circle primitive
  //   relative to the aspect ratio of the canvas.
  // the circle starts out as an oval because the canvas is potentially not a perfect square,
  //   yet canvas clipspace goes from -1 to 1 in x and y directions regardless.
  // scale vector will also change the size of the circle
  //   by multiplying the vector positions by CIRCLE_RADIUS
  gl.uniform2f(scaleVectorLocation, config.CIRCLE_RADIUS, aspect * config.CIRCLE_RADIUS);

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

  if (!circlePInfo.uniformLocations.scaleVector) {
    throw new Error('scaleVector location not set');
  }

  drawCircle(gl, circlePInfo.program, circleBuffers, circlePInfo.attribLocations.vertexPosition,
    circlePInfo.uniformLocations.scaleVector);
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

  if (!config.ONLY_DRAW_ONCE) {
    requestAnimationFrame((now: number) => tick(gl, now));
  }
}

// start the scene drawing loop
requestAnimationFrame((now: number) => tick(globalGL, now));
