import { VFXEmitter } from "wawa-vfx";
import { forwardRef, useImperativeHandle, useRef, useEffect } from "react";

export const Dust = forwardRef(({ position }, ref) => {
  const dustRef = useRef(null);
  const groupRef = useRef(null);

  useImperativeHandle(ref, () => ({
    start: () => dustRef.current?.startEmitting(),
    stop: () => dustRef.current?.stopEmitting(),
    setPosition: (pos) => {

        groupRef.current.position.copy(pos);
      
    },
  }));

  useEffect(() => {
    if (groupRef.current.position && position) {
      groupRef.current.position.copy(position);
    }
  }, [position]);

  return (
    <group ref={groupRef}>
    <VFXEmitter
      ref={dustRef}
      emitter="dust"
      settings={{
        duration: 0.01,
        delay: 0.1,
        nbParticles: 2,
        spawnMode: "time",
        loop: true,
        startPositionMin: [-.3, 0, -.3],
        startPositionMax: [.3, 0, .3],
        startRotationMin: [-1, -1, -1],
        startRotationMax: [1, -1, 1],
        particlesLifetime: [0.2, 0.7],
        speed: [2, 2],
        colorStart: ["#c2c2c2"],
        directionMin: [0, 0, 0],
        directionMax: [0, 0, -.3],
        rotationSpeedMin: [0, 0, -1],
        rotationSpeedMax: [0, 0, 1],
        size: [0.5, 1],
      }}
    />
    </group>
  );
});

