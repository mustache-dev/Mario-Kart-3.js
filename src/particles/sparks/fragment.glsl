precision mediump float;

uniform sampler2D uTexture;
uniform float uStretchFactor;
uniform bool shouldEmit;

varying float vLifetime;
varying vec3 vVelocity;
varying float vLifeRatio;
varying float vShouldShow;

uniform vec3 color;

void main() {
    vec2 uv = gl_PointCoord;

    vec4 tex = texture2D(uTexture, uv);

    float alpha = smoothstep(1., 0., vLifeRatio * 7.);
    if(!shouldEmit){
      alpha = 0.0;
    }
    if (vShouldShow < 0.5) discard;

    gl_FragColor = vec4(color * 100., tex.a * alpha);
}
