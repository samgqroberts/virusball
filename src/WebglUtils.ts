// WebglUtils.ts
// Utility library for interacting with WebGL

/**
 * Finds a canvas given the supplied canvas id, and returns that canvas's WebGL rendering context.
 * Throws if either step is unsuccessful.
 * @param canvasId the DOM id of the canvas.
 */
export function getWebglContext(canvasId: string): WebGLRenderingContext {
  const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
  if (!canvas) {
    throw new Error(`Could not find canvas, using id: '${canvasId}'`);
  }
  const gl = canvas.getContext('webgl');
  if (!gl) {
    throw new Error(`Could not get webgl context from canvas`);
  }
  return gl;
}

/**
 * Uses the passed in WebGL rendering context to compile a shader program from the given source.
 * @param gl the WebGL rendering context
 * @param type is the source code for vertex or fragment shader.
 *             must pass in gl.VERTEX_SHADER or gl.FRAGMENT_SHADER.
 * @param source the glsl source code
 */
export function loadShader(gl: WebGLRenderingContext, type: GLenum, source: string): WebGLShader | null {
  const shader = gl.createShader(type)
    || (() => { throw new Error(`could not create shader of type ${type}`); })();

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

/**
 * Tries to compile a shader from the given source code, throws if unsuccessful.
 */
export function loadShaderOrFail(gl: WebGLRenderingContext, type: GLenum, source: string): WebGLShader {
  return loadShader(gl, type, source)
    || (() => {
      throw new Error('could not create shader');
    })();
}

/**
 * Compiles shaders from the given sources and links them together into a program.
 * @param gl the WebGL rendering context
 * @param vsSource the source code for the vertex shader
 * @param fsSource the source code for the fragment shader
 */
export function initShaderProgram(gl: WebGLRenderingContext, vsSource: string, fsSource: string) {
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

/**
 * Attempts to compile the shaders into a program, throws if unsuccessful.
 */
export function initShaderProgramOrFail(gl: WebGLRenderingContext, vsSource: string, fsSource: string) {
  return initShaderProgram(gl, vsSource, fsSource)
    || (() => { throw new Error('could not initShaderProgram'); })();
}
