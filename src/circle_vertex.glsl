attribute vec2 aPosition;

uniform vec2 uScaleVector;

void main() {
    // simply scale the position by the scale vector.
    // vector scaling is done via multiplication.
    gl_Position = vec4(uScaleVector * aPosition, 0, 1);
}
