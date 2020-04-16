attribute vec2 aPosition;

uniform vec2 uScaleVector;
uniform vec2 uTranslationVector;

/**
 * This program scales and translates the given vertices according to the given uniforms.
 * Note: vector scaling is done via multiplication
 * Note: vector translation is done via addition
 */
void main() {
    gl_Position = vec4(uTranslationVector + uScaleVector * aPosition, 0, 1);
}
