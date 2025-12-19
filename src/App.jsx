import {
  KeyboardControls,
  useTexture,
} from "@react-three/drei";
import { useEffect } from "react";
import { TrackScene } from "./TrackScene";
import { Lighting } from "./misc/Lighting";
import { VFXParticles } from "wawa-vfx";
import { Composer } from "./Composer";
import { useThree } from "@react-three/fiber";
import { Leva } from "leva";
import { PlayroomStarter } from "./PlayroomStarter";
import { Impact } from "./particles/Impact";
import { Fresnel } from "./particles/Fresnel/Fresnel";
export const App = () => {
  const controls = [
    { name: "forward", keys: ["ArrowUp", "KeyW"] },
    { name: "backward", keys: ["ArrowDown", "KeyS"] },
    { name: "left", keys: ["ArrowLeft", "KeyA"] },
    { name: "right", keys: ["ArrowRight", "KeyD"] },
    { name: "jump", keys: ["Space"] },
  ];

  const smokeTexture = useTexture("./textures/particles/smoke.png");
  const { camera } = useThree();

  useEffect(() => {
    if (camera) {
      camera.layers.enable(1);
    }
  }, [camera]);

  return (
    <>
      <PlayroomStarter />
      <Fresnel />
      <VFXParticles
        name="confettis"
        geometry={<boxGeometry args={[0.5, 1, 0.01]} />}
        settings={{
          fadeAlpha: [0, 1],
          fadeSize: [1, 0],
          intensity: 3,
          nbParticles: 10000,
          renderMode: "mesh",
          gravity: [0, 0, 0],
          frustumCulled: false,
        }}
      />
      <Impact />
      <VFXParticles
        name="smoke"
        settings={{
          fadeAlpha: [1, 0],
          fadeSize: [0.5, 1],
          intensity: 0.5,
          nbParticles: 100,
          renderMode: "billboard",
          gravity: [0, 0, 0],
          frustumCulled: false,
        }}
        alphaMap={smokeTexture}
      />
      <VFXParticles
        name="dust"
        settings={{
          fadeAlpha: [1, 0],
          fadeSize: [0, 1],
          intensity: 10,
          nbParticles: 1000,
          renderMode: "billboard",
          gravity: [0, 1, 0],
          frustumCulled: false,
        }}
        alphaMap={smokeTexture}
      />
      <KeyboardControls map={controls}>
        <TrackScene />
        <Lighting />
      </KeyboardControls>
      <Composer />
      <Leva fill flat oneLineLabels hideTitleBar collapsed hidden />
    </>
  );
};
