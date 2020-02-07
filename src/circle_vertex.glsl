attribute vec2 aPosition;

uniform vec2 uScaleVector;
uniform vec2 uTranslationVector;

void main() {
    // simply scale the position by the scale vector.
    // vector scaling is done via multiplication.
    gl_Position = vec4(uTranslationVector + uScaleVector * aPosition, 0, 1);
}
