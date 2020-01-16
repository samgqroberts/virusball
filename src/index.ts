
const canvasId = 'canvas';

const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
if (!canvas) {
  throw new Error(`Could not find canvas, using id: '${canvasId}'`);
}

const gl = canvas.getContext('webgl');
if (!gl) {
  throw new Error(`Could not get webgl context from canvas`);
}

// Set clear color to black, fully opaque
gl.clearColor(0.0, 0.0, 0.0, 1.0);
// Clear the color buffer with specified clear color
gl.clear(gl.COLOR_BUFFER_BIT);

