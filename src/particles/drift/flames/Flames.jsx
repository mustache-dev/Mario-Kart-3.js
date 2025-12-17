import { extend, useFrame } from "@react-three/fiber";
import { InstancedMesh2 } from "@three.ez/instanced-mesh";
import { useMemo, useRef, useEffect } from "react";
import {
  ShaderMaterial,
  PlaneGeometry,
  Vector3,
  Color,
  Quaternion,
  Euler,
  BackSide,
  DoubleSide,
} from "three";
import { memo } from "react";
import fragmentShader from "./fragment.glsl";
import vertexShader from "./vertex.glsl";
import { useGameStore } from "../../../store";

extend({ InstancedMesh2 });

export const Flames = () => {
  const ref = useRef();

  const geometry = useMemo(() => new PlaneGeometry(1.5, 1.5), []);

  const material = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: {
          uCurrentTime: { value: 0 },
          uColorStart: { value: new Color("#2149ff").multiplyScalar(1) },
          color: { value: new Color(0xffa22b).multiplyScalar(1) },
          uTimeOffset: { value: 0 },
          noiseTexture: { value: null },
        },
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        transparent: true,
        depthWrite: false,
        // side: DoubleSide,
        defines: {
          USE_INSTANCING_INDIRECT: true,
        },
      }),
    []
  );

  useEffect(() => {
    if (ref.current) {
      ref.current.initUniformsPerInstance({
        fragment: { uCurrentTime: "float", uTimeOffset: "float" },
      });
    }
  }, [material.uniforms.noiseTexture]);

  const lastFiredTimeRef = useRef(0);
  const addInterval = 0.01;
  const scaleTarget = 2;
  const initialScale = 0.3

  useFrame((state, delta) => {
    if (!ref.current) return;
    const camera = state.camera;
    const flamePositions = useGameStore.getState().flamePositions;
    const isBoosting = useGameStore.getState().isBoosting;
    if (
      flamePositions &&
      state.clock.getElapsedTime() - lastFiredTimeRef.current >= addInterval &&
      isBoosting
    ) {
      const noiseTexture = useGameStore.getState().noiseTexture;
      material.uniforms.noiseTexture.value = noiseTexture;
      const [left, right] = flamePositions;
      ref.current.addInstances(1, (obj) => {
        obj.position.set(left.x, left.y + 0., left.z);
        obj.currentTime = 0;
        obj.velocity = new Vector3(
          -.2,
          0.,
          -2 
        );
        obj.setUniform("uCurrentTime", 0);
        obj.setUniform("uTimeOffset", Math.random());

        obj.scale.set(initialScale, initialScale, initialScale);
      });

      ref.current.addInstances(1, (obj) => {
        obj.position.set(right.x, right.y + 0., right.z);
        obj.currentTime = 0;
        obj.velocity = new Vector3(
          .2,
          0.,
          -2 
        );
        obj.setUniform("uCurrentTime", 0);
        obj.setUniform("uTimeOffset", Math.random());

        obj.scale.set(initialScale, initialScale, initialScale);
      });

      lastFiredTimeRef.current = state.clock.getElapsedTime();
    }

    const GRAVITY = 3.;
    const q = ref.current.parent.getWorldQuaternion(new Quaternion())
    ref.current.updateInstances((obj) => {
      obj.currentTime += delta * 0.4 
      obj.setUniform("uCurrentTime", obj.currentTime);
      obj.scale.lerp(new Vector3(scaleTarget, scaleTarget * 2, scaleTarget), 1 * delta);
      obj.velocity.y += GRAVITY * delta;

      // Integrate velocity
      obj.position.addScaledVector(obj.velocity, delta);


      obj.scale.lerp(new Vector3(0, 0, 0), delta * 3);


      if (obj.currentTime > 2) {
        obj.remove();
      }
    });
  });

  return (
    <instancedMesh2
      ref={ref}
      args={[geometry, material, { createEntities: true }]}
      frustumCulled={false}
    />
  );
};

export default memo(Flames);
