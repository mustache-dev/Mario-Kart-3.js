uniform vec3 uColor;
uniform float uFresnelPower;
uniform float uFresnelScale;
uniform float uOpacity;
uniform float uTime;
uniform float uScrollSpeed;
uniform sampler2D uRainbowTexture;
uniform vec2 uResolution;

varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec3 vWorldPosition;

vec2 rotate2D(vec2 uv, float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return vec2(uv.x * c - uv.y * s, uv.x * s + uv.y * c);
}

void main() {
  vec3 viewDir = normalize(vViewPosition);
  float fresnel = pow(1.0 - abs(dot(viewDir, vNormal)), uFresnelPower);
  fresnel = fresnel * uFresnelScale;

  float scrollOffset = uTime * uScrollSpeed;
  vec2 texCoord = vec2(fresnel + scrollOffset);
  vec3 rainbow = texture2D(uRainbowTexture, fract(texCoord)).rgb;

  vec3 finalColor = pow(rainbow, vec3(3.2));

  float dotScale = 80.0;
  float dotRadius = 0.35;
  float fresnelThreshold = 0.3;

  vec2 screenUV = gl_FragCoord.xy / uResolution;
  vec2 aspect = vec2(uResolution.x / uResolution.y, 1.0);
  vec2 scaled = screenUV * aspect * dotScale;
  vec2 rotated = rotate2D(scaled, 0.785398);
  vec2 gridPos = fract(rotated);
  float dist = length(gridPos - 0.5);
  float dot = step(dist, dotRadius);

  float fresnelMask = step(fresnelThreshold, fresnel);
  float alpha = dot * uOpacity;

  if (alpha < 0.01) discard;

  gl_FragColor = vec4(finalColor, alpha);
}
