import { Effect } from "postprocessing";
import { Uniform, Vector2, Vector3, Euler, Quaternion, Color} from "three";
import { forwardRef, useEffect, useRef} from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { noiseTexture } from "./constants";
import { useGameStore } from "./store";
import { damp } from "three/src/math/MathUtils.js";
import { useControls } from "leva";
import { useTexture } from "@react-three/drei";

const fragmentShader = /* glsl */ `
uniform sampler2D tDiffuse;
uniform sampler2D noiseTexture;
uniform sampler2D lensDirtTexture;
uniform float iTime;
uniform float uDirtOpacity;

uniform vec3 uRedMix;
uniform vec3 uGreenMix;
uniform vec3 uBlueMix;
uniform vec3 uShadowTint;
uniform vec3 uHighlightTint;
uniform float hueAdjust[8];
uniform float satAdjust[8];
uniform float lumAdjust[8];

uniform float uBrightness;
uniform float uContrast;
uniform float uSaturation;
uniform float uVibrancy;
uniform float uHueOffset;
uniform float uGamma;
uniform float uSplitToneBalance;
uniform float uExposure;
uniform float uKelvin;
uniform float uChromaticAberration;


vec2 hash(vec2 p) {
  p = vec2(
    dot(p, vec2(127.1, 311.7)),
    dot(p, vec2(269.5, 183.3))
  );
  return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}

vec3 rgbToHsv(vec3 c) {
    vec4 K = vec4(0., -1./3., 2./3., -1.);
    vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
    vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));

    float d = q.x - min(q.w, q.y);
    float e = 1e-10;
    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)),
                d / (q.x + e),
                q.x);
}

vec3 hsvToRgb(vec3 c) {
    vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
    return c.z * mix(vec3(1.0), rgb, c.y);
}

vec3 colorChannelMixer( vec3 inputColor, vec3 redMix, vec3 greenMix, vec3 blueMix, float brightness, float contrast )
{

    mat3 mixMatrix = mat3(
        redMix,
        greenMix,
        blueMix
    );


    vec3 mixedColor = mixMatrix * inputColor;

    mixedColor = max( vec3( 0.0 ), mixedColor * contrast + brightness );

    return mixedColor;

}

vec3 colorContrast( vec3 color, float contrast )
{

    float midPoint = pow( 0.5, 2.2 );

    return ( color - midPoint ) * contrast + midPoint;

}

vec3 colorSaturation( vec3 color, float saturation )
{

    float luminance = dot( color, vec3( 0.299, 0.587, 0.114 ) );

    vec3 grayscale = vec3( luminance );

    return mix( grayscale, color, 1.0 + saturation );

}

vec3 colorHueRadians( vec3 inputColor, float offset )
{

    vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
    vec4 P = mix(vec4(inputColor.bg, K.wz), vec4(inputColor.gb, K.xy), step(inputColor.b, inputColor.g));
    vec4 Q = mix(vec4(P.xyw, inputColor.r), vec4(inputColor.r, P.yzx), step(P.x, inputColor.r));

    float D = Q.x - min(Q.w, Q.y);
    float E = 1e-10;

    vec3 hsv = vec3(
        abs(Q.z + (Q.w - Q.y) / (6.0 * D + E)),
        D / (Q.x + E),
        Q.x
    );

    float hue = hsv.x + offset;

    hsv.x = (hue < 0.0) ? hue + 1.0 : (hue > 1.0) ? hue - 1.0 : hue;

    vec4 K2 = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 P2 = abs(fract(hsv.xxx + K2.xyz) * 6.0 - K2.www);

    return hsv.z * mix(K2.xxx, clamp(P2 - K2.xxx, 0.0, 1.0), hsv.y);
}

vec3 gammaCorrect(vec3 color, float gamma) {
  return pow(clamp(color, 0.0, 1.0), vec3(1.0 / gamma));
}

vec3 colorVibrancy(vec3 color, float vibrancy) {
    float maxVal = max(max(color.r, color.g), color.b);
    float minVal = min(min(color.r, color.g), color.b);
    float sat = maxVal - minVal;

    float vibFactor = smoothstep(0.0, 0.5, sat); // low sat -> more vibrancy
    vibFactor = 1.0 + vibrancy * (1.0 - vibFactor);

    // Convert to perceived grayscale
    float luminance = dot(color, vec3(0.299, 0.587, 0.114));
    vec3 gray = vec3(luminance);

    return mix(gray, color, vibFactor);
}

vec3 splitToning(vec3 color, vec3 shadows, vec3 highlights, float balance) {
  float luminance = dot(color, vec3(0.299, 0.587, 0.114));
  vec3 tone = mix(shadows, highlights, smoothstep(0.0, 1.0, luminance + balance));
  return color * tone;
}

float posterize( float value, float steps )
{

    return floor( value / ( 1.0 / steps ) ) * ( 1.0 / steps );

}

vec3 applyExposure(vec3 color, float exposure) {
    return color * pow(2.0, exposure);
}

vec3 colorTemperature(vec3 color, float kelvin) {
    kelvin = clamp(kelvin, 1000.0, 40000.0) / 100.0;

    float red, green, blue;

    // Red
    if (kelvin <= 66.0) {
        red = 1.0;
    } else {
        red = kelvin - 60.0;
        red = 329.698727446 * pow(red, -0.1332047592) / 255.0;
        red = clamp(red, 0.0, 1.0);
    }

    // Green
    if (kelvin <= 66.0) {
        green = kelvin;
        green = 99.4708025861 * log(green) - 161.1195681661;
        green /= 255.0;
    } else {
        green = kelvin - 60.0;
        green = 288.1221695283 * pow(green, -0.0755148492);
        green /= 255.0;
    }
    green = clamp(green, 0.0, 1.0);

    // Blue
    if (kelvin >= 66.0) {
        blue = 1.0;
    } else if (kelvin <= 19.0) {
        blue = 0.0;
    } else {
        blue = kelvin - 10.0;
        blue = 138.5177312231 * log(blue) - 305.0447927307;
        blue /= 255.0;
        blue = clamp(blue, 0.0, 1.0);
    }

    vec3 tempColor = vec3(red, green, blue);
    return color * tempColor;
}

int getHueRange(float hue) {
    if (hue < 0.04 || hue > 0.96) return 0;        // Red
    else if (hue < 0.10) return 1;                 // Orange
    else if (hue < 0.17) return 2;                 // Yellow
    else if (hue < 0.30) return 3;                 // Green
    else if (hue < 0.45) return 4;                 // Aqua
    else if (hue < 0.60) return 5;                 // Blue
    else if (hue < 0.75) return 6;                 // Purple
    else return 7;                                 // Magenta
}

const int NUM_RANGES = 8;
const float TWO_PI = 6.28318530718;

float circularDistance(float a, float b) {
  float diff = abs(a - b);
  return min(diff, 1.0 - diff); // Wrap hue
}

vec3 applyHslPerRange(vec3 color) {
  vec3 hsv = rgbToHsv(color);
  float hue = hsv.x;

  float totalWeight = 0.0;
  float hShift = 0.0;
  float sShift = 0.0;
  float lShift = 0.0;

  for (int i = 0; i < NUM_RANGES; i++) {
    float centerHue = float(i) / float(NUM_RANGES); // evenly spaced hue centers
    float dist = circularDistance(hue, centerHue);

    float sigma = 0.08; // Smaller = tighter influence
    float weight = exp(-pow(dist, 2.0) / (2.0 * sigma * sigma));

    hShift += weight * hueAdjust[i];
    sShift += weight * satAdjust[i];
    lShift += weight * lumAdjust[i];
    totalWeight += weight;
  }

  hShift /= totalWeight;
  sShift /= totalWeight;
  lShift /= totalWeight;

  hsv.x = mod(hsv.x + hShift, 1.0);
  hsv.y = clamp(hsv.y + sShift, 0.0, 1.0);
  hsv.z = clamp(hsv.z + lShift, 0.0, 1.0);

  return hsvToRgb(hsv);
}

vec3 toneMapFilmic(vec3 x) {
  return (x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14);
}

vec3 chromaticAberration(vec2 uv, float amount) {
  vec2 center = vec2(0.5);

  float dist = distance(uv, center);

  float strength = pow(dist, 2.0) * amount;

  vec2 direction = normalize(uv - center);

  vec2 rOffset = direction * strength *  1.0;
  vec2 bOffset = direction * strength * -1.0;

  float r = texture2D(tDiffuse, uv + rOffset).r;
  float g = texture2D(tDiffuse, uv).g;
  float b = texture2D(tDiffuse, uv + bOffset).b;

  return vec3(r, g, b);
}

vec3 applyLiftGammaGain(vec3 color, vec3 lift, vec3 gamma, vec3 gain) {
    vec3 lifted = color + lift;

    vec3 gained = lifted * gain;

    vec3 corrected = pow(max(vec3(0.0), gained), 1.0 / max(vec3(0.01), gamma));

    return clamp(corrected, 0.0, 1.0);
}

vec3 speedLineEffect(vec2 uv, float iTime, sampler2D noiseTexture) {
    vec2 center = vec2(0.5, 0.5);
    vec2 dir = normalize(uv - center);
    vec2 p = center + dir * min(length(uv - center), 0.05);

    vec3 p3 = 3. * vec3(p.xy, 0.0) + vec3(0.0, 0.0, 0.0);
    vec2 noiseUV = fract(p3.xy * 32. + vec2(0.0, iTime * 0.5));
    float noise = texture2D(noiseTexture, noiseUV).r;

    float dist = distance(uv, center);
    const float e = 0.37;
    float stepped = smoothstep(e - 0.5, e + 0.5, noise * dist);
    float final = smoothstep(e - 0.05, e + 0.05, noise * stepped);

    float radius = length(uv - center);
    float hue = mod(radius * 2.0 + iTime, 1.0);

    vec3 rainbow = hsvToRgb(vec3(hue, 1.0, 1.0));

    float luminance = dot(rainbow, vec3(0.299, 0.587, 0.114));

    vec3 grayscale = vec3(luminance);

    rainbow = mix(grayscale, rainbow, 0.4);

    return rainbow * final;
}

vec3 lensDirt(vec2 uv, float iTime, sampler2D lensDirtTexture, sampler2D noiseTexture) {
  vec2 center = vec2(0.5);

  float dist = distance(uv, center);

  vec2 noiseUV = fract(uv * 0.1 + vec2(0.0, -iTime * 0.012));
  float noise = texture2D(noiseTexture, noiseUV).r;
  noise = pow(noise, 5.0);
  float strength = pow(dist, 2.0) * 0.1;

  vec2 direction = normalize(uv - center);

  vec2 rOffset = direction * strength *  1.0;
  vec2 bOffset = direction * strength * -1.0;

  float r = texture2D(lensDirtTexture, uv * 0.7 + rOffset).r;
  float g = texture2D(lensDirtTexture, uv * 0.7).g;
  float b = texture2D(lensDirtTexture, uv * 0.7 + bOffset).b;

  vec3 lensDirtColor = vec3(r, g, b);


  lensDirtColor *= noise;

  return lensDirtColor;
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 fragColor) {

  vec2 vUv = uv;
  vUv.x += iTime;
  vec3 color = texture2D(tDiffuse, vUv).rgb;
  color = chromaticAberration(uv, uChromaticAberration);
  color = colorChannelMixer(color, uRedMix, uGreenMix, uBlueMix, uBrightness, 1.0);
  color = applyExposure(color, uExposure);
  color = colorContrast(color, uContrast);
  color = gammaCorrect(color, uGamma);
  color = colorTemperature(color, uKelvin);
  color = colorHueRadians(color, uHueOffset);
  color = colorSaturation(color, uSaturation);
  color = colorVibrancy(color, uVibrancy);
  color = splitToning(color, uShadowTint, uHighlightTint, uSplitToneBalance);
  color = applyHslPerRange(color);
  color = toneMapFilmic(color);

  color.rgb += speedLineEffect(uv, iTime, noiseTexture) * uChromaticAberration * 2.;

  color.rgb = mix(color.rgb, color.rgb + lensDirt(uv, iTime, lensDirtTexture, noiseTexture), uDirtOpacity);
  fragColor = vec4(color, 1.0);
}


`;

export class ColorGradingEffect extends Effect {
  constructor() {
    super("ColorGradingEffect", fragmentShader, {
      uniforms: new Map([
        ["iTime", new Uniform(0)],
        ["motionDirection", new Uniform(new Vector2(0, 0))],
        ["motionStrength", new Uniform(0)],
        ["uRedMix", new Uniform(new Vector3(1, 0, 0))],
        ["uGreenMix", new Uniform(new Vector3(0, 1, 0))],
        ["uBlueMix", new Uniform(new Vector3(0, 0, 1))],
        ["uSaturation", new Uniform(1)],
        ["uVibrancy", new Uniform(1)],
        ["uBrightness", new Uniform(0)],
        ["uContrast", new Uniform(1)],
        ["uHueOffset", new Uniform(0)],
        ["uGamma", new Uniform(1)],
        ["uShadowTint", new Uniform(new Vector3(1.0, 0.9, 0.9))],
        ["uHighlightTint", new Uniform(new Vector3(0.9, 1.0, 1.0))],
        ["uSplitToneBalance", new Uniform(0.0)],
        ["uExposure", new Uniform(0)],
        ["uKelvin", new Uniform(5500)],
        ["uChromaticAberration", new Uniform(0)],
        ["hueAdjust", new Uniform(new Float32Array(8))],
        ["satAdjust", new Uniform(new Float32Array(8))],
        ["lumAdjust", new Uniform(new Float32Array(8))],
        ["noiseTexture", new Uniform(null)],
        ["lensDirtTexture", new Uniform(null)],
        ["uDirtOpacity", new Uniform(0)],
      ]),
    });
  }

  updateTime(t) {

    this.uniforms.get("iTime").value = t;
  }

  updateColorMix(
    red,
    green,
    blue,
    brightness,
    contrast,
    saturation,
    vibrancy,
    hueOffset,
    gamma,
    shadowTint,
    highlightTint,
    splitToneBalance,
    exposure,
    kelvin,
    chromaticAberration
  ) {
    this.uniforms.get("uRedMix").value = new Color(red);
    this.uniforms.get("uGreenMix").value = new Color(green);
    this.uniforms.get("uBlueMix").value = new Color(blue);
    this.uniforms.get("uBrightness").value = brightness;
    this.uniforms.get("uContrast").value = contrast;
    this.uniforms.get("uSaturation").value = saturation;
    this.uniforms.get("uVibrancy").value = vibrancy;
    this.uniforms.get("uHueOffset").value = hueOffset;
    this.uniforms.get("uGamma").value = gamma;
    this.uniforms.get("uShadowTint").value = new Color(shadowTint);
    this.uniforms.get("uHighlightTint").value = new Color(highlightTint);
    this.uniforms.get("uSplitToneBalance").value = splitToneBalance;
    this.uniforms.get("uExposure").value = exposure;
    this.uniforms.get("uKelvin").value = kelvin;
    this.uniforms.get("uChromaticAberration").value = chromaticAberration;
  }

  setHslAdjustments(hueAdjust, satAdjust, lumAdjust) {
    if (!this.uniforms.has("hueAdjust")) {
      this.uniforms.set("hueAdjust", { value: new Float32Array(8) });
      this.uniforms.set("satAdjust", { value: new Float32Array(8) });
      this.uniforms.set("lumAdjust", { value: new Float32Array(8) });
    }

    this.uniforms.get("hueAdjust").value.set(hueAdjust);
    this.uniforms.get("satAdjust").value.set(satAdjust);
    this.uniforms.get("lumAdjust").value.set(lumAdjust);
  }

  setNoiseTexture(texture){
    this.uniforms.get("noiseTexture").value = texture;
  }

  setLensDirtTexture(texture){
    this.uniforms.get("lensDirtTexture").value = texture;
  }

  setDirtOpacity(opacity){
    this.uniforms.get("uDirtOpacity").value = opacity;
  }
}


export const ColorGrading = forwardRef((props, ref) => {
  const effect = new ColorGradingEffect();
  const { camera } = useThree();

  let {
    redMix,
    greenMix,
    blueMix,
    brightness,
    contrast,
    saturation,
    vibrancy,
    hueOffset,
    gamma,
    shadowTint,
    highlightTint,
    splitToneBalance,
    exposure,
    kelvin,
    chromaticAberration
  } = useControls("Color Grading", {
    redMix: { value: "#FF0000", label: "Red Mix" },
    greenMix: {
      value: "#00FF00",
      label: "Green Mix",
    },
    blueMix: {
      value: "#0000FF",
      label: "Blue Mix",
    },
    brightness: { value: 0.03, min: -1, max: 1, step: 0.001 },
    contrast: { value: 1.03, min: 0, max: 3, step: 0.001 },
    saturation: { value: 0.15, min: -1, max: 3, step: 0.001 },
    vibrancy: { value: 0.3, min: -1, max: 3, step: 0.001 },
    hueOffset: { value: 0, min: -Math.PI, max: Math.PI, step: 0.001 },
    gamma: { value: 1, min: 0, max: 3, step: 0.001 },
    shadowTint: { value: "#d8d8d8", label: "Shadow Tint" },
    highlightTint: { value: "#ffffff", label: "Highlight Tint" },
    splitToneBalance: { value: 0, min: 0, max: 1, step: 0.001 },
    exposure: { value: -.5, min: -1, max: 3, step: 0.001 },
    kelvin: { value: 5900, min: 1000, max: 40000 },
    chromaticAberration : { value : 0, min : -5, max : 5}
  });

  const hues = [
    "Red", "Orange", "Yellow", "Green", "Aqua", "Blue", "Purple", "Magenta"
  ];

  const hueControls = useControls("Hue Adjustments", () =>
    Object.fromEntries(
      hues.map((hue) => [
        `${hue}`,
        {
          value: { hue: 0, sat: 0, lum: 0 },
          step: 0.01,
          min: -1,
          max: 1,
        },
      ])
    )
  );

  const currentTime = useRef(0);

  const dirtOpacity = useRef(0);
  const lensDirtTexture = useTexture('./textures/lensDirt.jpg');

  useFrame((state, delta) => {
    if (!camera) return;

    if (!hueControls) return;
    const hueAdjust = hues.map(h => hueControls[0][h].hue);
    const satAdjust = hues.map(h => hueControls[0][h].sat);
    const lumAdjust = hues.map(h => hueControls[0][h].lum);
    currentTime.current += delta;
    
    const isBoosting = useGameStore.getState().isBoosting;
    chromaticAberration = damp(chromaticAberration, isBoosting ? 0.2 : 0, 4, delta);

    const isOnDirt = useGameStore.getState().isOnDirt;
    dirtOpacity.current = damp(dirtOpacity.current, isOnDirt ? 0.4 : 0, 4, delta);
    effect.setDirtOpacity(dirtOpacity.current);
    effect.updateColorMix(
      redMix,
      greenMix,
      blueMix,
      brightness,
      contrast,
      saturation,
      vibrancy,
      hueOffset,
      gamma,
      shadowTint,
      highlightTint,
      splitToneBalance,
      exposure,
      kelvin,
      chromaticAberration
    );
    
    effect.setHslAdjustments(hueAdjust, satAdjust, lumAdjust);
    effect.updateTime(currentTime.current);
  });

  useEffect(() => {
    if (ref) ref.current = effect;
    effect.setNoiseTexture(noiseTexture);
    effect.setLensDirtTexture(lensDirtTexture);
  }, [effect, camera, ref, lensDirtTexture]);

  return <primitive object={effect} />;
});
