uniform float uTime;
uniform float uNoiseScale;
uniform float uNoiseStrength;
uniform sampler2D uNoiseTexture;

varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec3 vWorldPosition;

void main() {
  vNormal = normalize(normalMatrix * normal);
  
  vec2 noiseUV = uv - uTime * 0.1;
  float noise = texture2D(uNoiseTexture, fract(noiseUV * uNoiseScale)).r;
  noise = noise * 2.0 - 1.0;
  
  vec3 displaced = position + normal * noise * uNoiseStrength;
  
  vec4 worldPos = modelMatrix * vec4(displaced, 1.0);
  vWorldPosition = worldPos.xyz;
  vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);
  vViewPosition = -mvPosition.xyz;
  gl_Position = projectionMatrix * mvPosition;
}
