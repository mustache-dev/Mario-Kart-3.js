import { VFXParticles, VFXEmitter, RenderMode, AppearanceMode } from "wawa-vfx";
import { AdditiveBlending, NormalBlending } from "three";
import { eventBus } from "../constants";
import { EVENTS } from "../events";
import { useEffect, useRef } from "react";
import { useTexture } from "@react-three/drei";
export const Impact = () => {
  const ref = useRef(null);
  const flareRef = useRef(null);
  const flareTexture = useTexture("./textures/flare.png");

  useEffect(() => {
    eventBus.on(EVENTS.PLAYER.IMPACT, (pos) => {
      ref.current.emitAtPos(pos, true);
      flareRef.current.emitAtPos(pos, true);
    });
  }, []);
  return (
    <>
      <VFXParticles
        name="impact"
        settings={{
          fadeAlpha: [0, 1],
          fadeSize: [1, 0],
          intensity: 24,
          nbParticles: 1000,
          renderMode: RenderMode.StretchBillboard,
          appearance: AppearanceMode.Circular,
          gravity: [0, -9, 0],
          frustumCulled: false,
          blendingMode: NormalBlending,
        }}
      />
      <VFXEmitter
        ref={ref}
        emitter="impact"
        autoStart={false}
        settings={{
          duration: 0.02,
          delay: 0.1,
          nbParticles: 128,
          spawnMode: "burst",
          loop: true,
          startPositionMin: [0, 0, 0],
          startPositionMax: [0, 0, 0],
          startRotationMin: [0, 0, -1],
          startRotationMax: [0, 0, 1],
          particlesLifetime: [0.3, 1],
          speed: [24, 48],
          colorStart: ["#fab457", "#ffb420"],
          directionMin: [-1, -1, -1],
          directionMax: [1, 1, 1],
          rotationSpeedMin: [0, 0, 0],
          rotationSpeedMax: [0, 0, 0],
          size: [0.1, 0.4],
        }}
      />
      <VFXParticles
        name="flare"
        settings={{
          fadeAlpha: [1, 1],
          fadeSize: [1, 0],
          intensity: 24,
          nbParticles: 1000,
          renderMode: RenderMode.Mesh,

          gravity: [0, 0, 0],
          frustumCulled: false,
          blendingMode: AdditiveBlending
        }}
        alphaMap={flareTexture}
      />
      <VFXEmitter
        ref={flareRef}
        emitter="flare"
        autoStart={false}
        settings={{
          duration: 0.02,
          delay: 0.1,
          nbParticles: 128,
          spawnMode: "burst",
          loop: true,
          startPositionMin: [0, 0, 0],
          startPositionMax: [0, 0, 0],
          startRotationMin: [-Math.PI * 2, -Math.PI * 2, -Math.PI * 2],
          startRotationMax: [Math.PI * 2, Math.PI * 2, Math.PI * 2],
          particlesLifetime: [0.2, 0.2],
          speed: [0, 0],
          colorStart: ["#fab457", "#ffb420"],
          directionMin: [0, 0, 0],
          directionMax: [0, 0, 0],
          rotationSpeedMin: [0, 0, 0],
          rotationSpeedMax: [0, 0, 0],
          size: [20, 20],
        }}
      />
    </>
  );
};
