uniform float uCurrentTime;
uniform vec3 color;
uniform vec3 uColorStart;
uniform float uTimeOffset;
uniform sampler2D noiseTexture;

varying vec2 vUv;

  void main() {
    vec2 center = vec2(0.5, 0.5);
    float dist = distance(vUv, center);
    vec2 noiseUV = fract(vUv * 0.2 + vec2(0.0, -(uTimeOffset + uCurrentTime) * 0.5 ));
    vec3 n = texture2D(noiseTexture, noiseUV).rgb;
    dist += (n.r - .5) * 0.25; 
    
    float end = 0.3;
    float start = 0.;
    
    end -= uCurrentTime * 1.25;
    end = clamp(end, 0.0, 0.3);
    float innerFade = smoothstep(start, uCurrentTime * 0.1, dist);
    float fade = dist < end ? innerFade : 0.0;
    float colorScalar = 10. - uCurrentTime;
    float o = clamp(uCurrentTime * 20., 0., 1.);
    vec3 finalColor = mix(uColorStart, color, clamp(uCurrentTime * 30., 0., 1.));
    gl_FragColor = vec4(finalColor * colorScalar * smoothstep(1., 0.2, dist)  * 4., clamp(fade, 0., 1.));
  }
