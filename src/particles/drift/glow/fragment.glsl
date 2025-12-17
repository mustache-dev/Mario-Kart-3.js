uniform float time;
uniform vec3 color;
uniform float opacity;

varying vec2 vUv;
varying vec3 vPosition;


void main() {
  float displacedRadius = length(vPosition.xy);

    vec2 center = vec2(0.5);
  vec2 uv = vUv;

  vec2 diff = uv - center;
  float radius = length(diff);
  float innerThreshold = 0.1;
  float outerThreshold = 0.3; 

  float edgeFactor = smoothstep(innerThreshold, outerThreshold, radius);
  float fade = (color. r > 0.5 && color.g > 0.5) ? 0.01 : 1.0;

  vec3 finalColor = mix(vec3(1.0), color * 10., edgeFactor);


  gl_FragColor = vec4(finalColor, opacity * fade);
}