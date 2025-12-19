import { useRef, useMemo, forwardRef, useImperativeHandle } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { ShaderMaterial, Color, SphereGeometry, BackSide, Vector2, DoubleSide } from "three";
import vertexShader from "./vertex.glsl?raw";
import fragmentShader from "./fragment.glsl?raw";
import { useTexture } from "@react-three/drei";
import { noiseTexture } from "../../constants";

const geometry = new SphereGeometry(1, 64, 64);

const params = {
  color: "#00ffff",
  fresnelPower: 2.0,
  fresnelScale: 1.5,
  opacity: 1.0,
  scale: 1,
  scrollSpeed: 1.0,
  noiseScale: 0.2,
  noiseStrength: 0.2,
};

export const Fresnel = forwardRef((props, ref) => {
  const meshRef = useRef();
  const rainbowTexture = useTexture("./textures/rainbow.jpeg");
  const { size } = useThree();

  const material = useMemo(() => new ShaderMaterial({
    uniforms: {
      uColor: { value: new Color(params.color) },
      uFresnelPower: { value: params.fresnelPower },
      uFresnelScale: { value: params.fresnelScale },
      uOpacity: { value: params.opacity },
      uRainbowTexture: { value: rainbowTexture },
      uNoiseTexture: { value: noiseTexture },
      uTime: { value: 0 },
      uScrollSpeed: { value: params.scrollSpeed },
      uResolution: { value: new Vector2(size.width, size.height) },
      uNoiseScale: { value: params.noiseScale },
      uNoiseStrength: { value: params.noiseStrength },
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
  }), [rainbowTexture]);

  useImperativeHandle(ref, () => ({
    setColor: (newColor) => {
      material.uniforms.uColor.value.set(newColor);
    },
    setOpacity: (newOpacity) => {
      material.uniforms.uOpacity.value = newOpacity;
    },
    setFresnelPower: (power) => {
      material.uniforms.uFresnelPower.value = power;
    },
    setFresnelScale: (scl) => {
      material.uniforms.uFresnelScale.value = scl;
    },
    setScrollSpeed: (speed) => {
      material.uniforms.uScrollSpeed.value = speed;
    },
    setNoiseScale: (scl) => {
      material.uniforms.uNoiseScale.value = scl;
    },
    setNoiseStrength: (str) => {
      material.uniforms.uNoiseStrength.value = str;
    },
    mesh: meshRef,
  }));

  useFrame((state) => {
    material.uniforms.uTime.value = state.clock.getElapsedTime();
    material.uniforms.uResolution.value.set(state.size.width, state.size.height);
  });

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      scale={params.scale}
      {...props}
    />
  );
});
