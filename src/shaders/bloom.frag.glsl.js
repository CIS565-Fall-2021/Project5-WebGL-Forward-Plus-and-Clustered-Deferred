import { glsl } from "./shaderUtil";

export default function(params) {
  return glsl`
#version 100
precision highp float;

uniform sampler2D u_renderTex;

varying vec2 v_uv;

const float threshold = 0.95;

void main() {
  vec3 col = texture2D(u_renderTex, v_uv).rgb;
  for (int i = 0; i < 11; i++) {
    for (int j = 0; j < 11; j++) {
      vec3 pixel = texture2D(u_renderTex, v_uv + (vec2(i, j) - vec2(5, 5)) / vec2(${params.canvasWidth}, ${params.canvasHeight})).rgb;
      if (0.21 * pixel.r + 0.72 * pixel.g + 0.07 * pixel.b > threshold) {
        col += pixel / 121.0;
      }
    }
  }
  gl_FragColor = vec4(col, 1.0);
}
  `;
}