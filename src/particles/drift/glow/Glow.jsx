import { Billboard } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { forwardRef, useImperativeHandle, useRef, useMemo } from "react";
import { AdditiveBlending, Color, ShaderMaterial } from "three";
import fragmentShader from './fragment.glsl';
import vertexShader from './vertex.glsl';
import { noiseTexture } from "../../../constants";


export const Glow = forwardRef(({ driftDirection }, ref) => {
  const materialRef = useRef(null);
  
  const material = useMemo(() => new ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      color: { value: new Color(0xffffff)},
      level: { value: 2 },
      opacity: { value: 1 },
      timeOffset: { value: Math.random() * 3},
      xDisplacement: { value: 0 },
      noiseTexture: { value: noiseTexture }
    },
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending:AdditiveBlending
  }), [])
  
  useFrame((state) => {
    if (material) {
      material.uniforms.time.value = state.clock.getElapsedTime() * 2;
      material.uniforms.xDisplacement.value = -(driftDirection.current) * 0.1;
    }
  });

  useImperativeHandle(ref, () => {
    let prevColor = new Color(0xffffff);
  
    return {
      setColor: (newColor) => {
        const newCol = new Color(newColor);
  
        if (!newCol.equals(prevColor)) {
          prevColor.copy(newCol);
          material.uniforms.color.value.copy(newCol);
        }
      },
      setLevel: (level) => {
        material.uniforms.level.value = level;
      },
      setOpacity: (newOpacity) => {
          material.uniforms.opacity.value = newOpacity;
      },
    };
  });
  

  const size = 0.07;

  return (
    <Billboard>
      <mesh material={material}>
        <circleGeometry args={[size, 22]} />
      </mesh>
    </Billboard>
  );
});
