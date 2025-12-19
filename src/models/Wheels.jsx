import React, { useRef, useEffect } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { damp } from "three/src/math/MathUtils.js";
import { Raycaster, Vector3 } from "three";
import { Sparks } from "../particles/sparks/Sparks";
import { Glow } from "../particles/drift/glow/Glow";
import { Skate } from "../particles/drift/Skate/Skate";
import { Trails } from "../particles/sparks/Trails";
import { KartDust } from "./KartDust";
import { Spark } from "../particles/drift/Spark";
import { getDriftLevel } from "../constants";
import { useGameStore } from "../store";

const raycaster = new Raycaster();
const direction = new Vector3(0, -1, 0);
const tempOrigin = new Vector3();
const tempWorldPos = new Vector3();

export function Wheels({ speed, inputTurn, driftDirection, driftPower, jumpOffset, backWheelOffset, wheelPRY }) {
  const { nodes, materials } = useGLTF("./models/wheel-transformed.glb");
  const wheel3 = useRef(null);
  const wheel2 = useRef(null);
  const wheel1 = useRef(null);
  const wheel0 = useRef(null);
  const frontWheels = useRef(null);
  const yRotation = useRef(0);

  const wheel0Base = useRef(null);
  const wheel1Base = useRef(null);
  const wheel2Base = useRef(null);
  const wheel3Base = useRef(null);

  const sparksLeftRef = useRef(null);
  const sparksRightRef = useRef(null);
  const glow1Ref = useRef(null);
  const glow2Ref = useRef(null);
  const skate1Ref = useRef(null);
  const skate2Ref = useRef(null);
  const sparkLeftRef = useRef(null);
  const sparkRightRef = useRef(null);

  const leftParticles = useRef(null);
  const rightParticles = useRef(null);

  const isDriftingRef = useRef(false);
  const lastSparkColor = useRef(null);

  const dustWheelStates = useRef([
    { position: new Vector3(), shouldEmit: false },
    { position: new Vector3(), shouldEmit: false },
    { position: new Vector3(), shouldEmit: false },
    { position: new Vector3(), shouldEmit: false },
  ]);

  const setBoostPower = useGameStore((state) => state.setBoostPower);
  const setDriftLevel = useGameStore((state) => state.setDriftLevel);

  const scene = useThree((state) => state.scene);

  useEffect(() => {
    if (glow1Ref.current && glow2Ref.current) {
      glow1Ref.current.setOpacity(0);
      glow2Ref.current.setOpacity(0);
    }
  }, []);

  function getGroundPosition(wheelBase, wheel, offset = 0, wheelIndex, delta) {
    wheelBase.current.getWorldPosition(tempOrigin);

    raycaster.set(tempOrigin, direction);
    raycaster.far = 3;
    raycaster.layers.set(1);
    raycaster.firstHitOnly = true;

    const intersects = raycaster.intersectObjects(scene.children, true);
    if (!intersects.length) return;

    const hit = intersects[0];

    wheel.current.position.y = damp(
      wheel.current.position.y,
      hit.point.y + 0.93 + jumpOffset.current + offset,
      24,
      delta
    );

    wheel.current.isOnDirt =
      hit.object.name.includes("dirt") && speed.current > 5 && jumpOffset.current === 0;

    if ((wheelIndex === 0 || wheelIndex === 1) && driftPower.current > 0.01 && jumpOffset.current === 0 && offset < 0.05) {
      wheel.current.isOnDirt = true;
    }
  }

  function getWheelPositions() {
    const wheelPositions = [wheel0, wheel1, wheel2, wheel3].map((wheel, index) => {
      wheel.current.getWorldPosition(tempWorldPos);
      const localPos = wheel.current.position;

      dustWheelStates.current[index].position.copy(localPos);
      dustWheelStates.current[index].shouldEmit = wheel.current.isOnDirt || false;

      return tempWorldPos.clone();
    });
    return wheelPositions;
  }

  const rotateWheels = (delta) => {
    const rotationSpeed = -speed.current * 0.01;
    wheel0.current.rotation.x += rotationSpeed;
    wheel1.current.rotation.x += rotationSpeed;
    wheel2.current.rotation.x += rotationSpeed;
    wheel3.current.rotation.x += rotationSpeed;

    yRotation.current = damp(yRotation.current, inputTurn.current * 2, 4, delta);

    frontWheels.current.rotation.y = yRotation.current;
  };

  function animateDriftParticles(isDrifting, driftLevel) {
    if (isDrifting !== isDriftingRef.current) {
      isDriftingRef.current = isDrifting;
      if (isDrifting) {
        sparksLeftRef?.current?.setEmitState(true);
        sparksRightRef?.current?.setEmitState(true);
        glow1Ref?.current?.setOpacity(1);
        glow2Ref?.current?.setOpacity(1);
        skate1Ref?.current?.setOpacity(1);
        skate2Ref?.current?.setOpacity(1);
      } else {
        sparksLeftRef?.current?.setEmitState(false);
        sparksRightRef?.current?.setEmitState(false);
        glow1Ref?.current?.setOpacity(0);
        glow2Ref?.current?.setOpacity(0);
        skate1Ref?.current?.setOpacity(0);
        skate2Ref?.current?.setOpacity(0);
        lastSparkColor.current = null;
      }
    }

    if (isDrifting) {
      glow1Ref?.current?.setColor(driftLevel.color);
      glow2Ref?.current?.setColor(driftLevel.color);
      glow1Ref?.current?.setLevel(driftLevel.threshold);
      glow2Ref?.current?.setLevel(driftLevel.threshold);
      sparksLeftRef?.current?.setColor(driftLevel.color);
      sparksRightRef?.current?.setColor(driftLevel.color);

      const isWhite = driftLevel.color === 0xffffff || driftLevel.color === "#ffffff";
      if (!isWhite && lastSparkColor.current !== driftLevel.color) {
        lastSparkColor.current = driftLevel.color;
        sparkLeftRef?.current?.setColor(driftLevel.color);
        sparkRightRef?.current?.setColor(driftLevel.color);
        sparkLeftRef?.current?.emit();
        sparkRightRef?.current?.emit();
      }
    }

    setDriftLevel(driftLevel);
    setBoostPower(driftLevel.threshold / 2);
  }

  const stickWheelsToGround = (delta) => {
    getGroundPosition(wheel0Base, wheel0, backWheelOffset.current.left, 0, delta);
    getGroundPosition(wheel1Base, wheel1, backWheelOffset.current.right, 1, delta);
    getGroundPosition(wheel2Base, wheel2, backWheelOffset.current.left, 2, delta);
    getGroundPosition(wheel3Base, wheel3, backWheelOffset.current.right, 3, delta);
  };

  function moveAndRotateKart(wheelPositions) {
    const a = wheelPositions[0];
    const b = wheelPositions[1];
    const c = wheelPositions[2];
    const d = wheelPositions[3];

    const pitch = (c.y + d.y - (a.y + b.y)) * 0.5;
    const roll = (b.y - a.y + d.y - c.y) * 0.5;

    const averageYPos = 0.15 + (a.y + b.y + c.y + d.y) / 7;
    wheelPRY.current = [pitch, roll, averageYPos + jumpOffset.current * 0.1];
  }

  useFrame((_, delta) => {
    rotateWheels(delta);
    stickWheelsToGround(delta);
    const wheelPositions = getWheelPositions();
    moveAndRotateKart(wheelPositions);

    const isDrifting = !!driftDirection.current && jumpOffset.current === 0;
    const driftLevel = getDriftLevel(driftPower.current);
    animateDriftParticles(isDrifting, driftLevel);

    leftParticles.current.position.set(
      wheel0.current.position.x - 0.1,
      wheel0.current.position.y - 0.1,
      wheel0.current.position.z + 0.1
    );
    rightParticles.current.position.set(
      wheel1.current.position.x + 0.1,
      wheel1.current.position.y - 0.1,
      wheel1.current.position.z + 0.1
    );

    if (sparkLeftRef.current && leftParticles.current) {
      leftParticles.current.getWorldPosition(tempWorldPos);
      sparkLeftRef.current.setWorldPosition(tempWorldPos);
    }
    if (sparkRightRef.current && rightParticles.current) {
      rightParticles.current.getWorldPosition(tempWorldPos);
      sparkRightRef.current.setWorldPosition(tempWorldPos);
    }
  });

  return (
    <group dispose={null}>
      <KartDust wheelStates={dustWheelStates.current} />
      <Spark ref={sparkLeftRef} />
      <Spark ref={sparkRightRef} />

      <mesh
        name="wheel"
        castShadow
        receiveShadow
        ref={wheel0}
        position={[-0.35, -0.079, 0.35]}
        geometry={nodes.wheel_3.geometry}
        material={materials.m_Tire}
        rotation={[Math.PI, 0, Math.PI]}
        scale={0.522}
      />
      <mesh
        name="wheel"
        castShadow
        receiveShadow
        ref={wheel1}
        position={[0.35, -0.079, 0.35]}
        geometry={nodes.wheel_3.geometry}
        material={materials.m_Tire}
        rotation={[Math.PI, Math.PI, Math.PI]}
        scale={0.522}
      />

      <group>
        <group ref={leftParticles}>
          <Glow ref={glow1Ref} driftDirection={driftDirection} />
          <Sparks ref={sparksLeftRef} />
          <Trails />
          <group scale={0.5} position={[0.11, 0.13, 0.1]}>
            <Skate ref={skate1Ref} />
          </group>
        </group>
        <group ref={rightParticles}>
          <Glow ref={glow2Ref} driftDirection={driftDirection} />
          <Sparks ref={sparksRightRef} left={true} />
          <Trails left={true} />
          <group scale={0.5} position={[-0.11, 0.13, 0.1]}>
            <Skate ref={skate2Ref} />
          </group>
        </group>
      </group>

      <group ref={frontWheels}>
        <mesh
          name="wheel"
          castShadow
          receiveShadow
          ref={wheel2}
          position={[-0.35, -0.095, -0.37]}
          geometry={nodes.wheel_3.geometry}
          material={materials.m_Tire}
          rotation={[Math.PI, 0, Math.PI]}
          scale={0.45}
        />
        <mesh
          name="wheel"
          castShadow
          receiveShadow
          ref={wheel3}
          position={[0.35, -0.095, -0.37]}
          geometry={nodes.wheel_3.geometry}
          material={materials.m_Tire}
          rotation={[Math.PI, Math.PI, Math.PI]}
          scale={0.45}
        />
      </group>

      <group ref={wheel0Base} position={[-0.35, -0.079, 0.35]} />
      <group ref={wheel1Base} position={[0.35, -0.079, 0.35]} />
      <group ref={wheel2Base} position={[-0.35, -0.095, -0.37]} />
      <group ref={wheel3Base} position={[0.35, -0.095, -0.37]} />
    </group>
  );
}

useGLTF.preload("./models/wheel-transformed.glb");
