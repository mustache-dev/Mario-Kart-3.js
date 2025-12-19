import React, { useEffect, useRef } from "react";
import { useFrame, useGraph } from "@react-three/fiber";
import { useGLTF, useAnimations } from "@react-three/drei";
import { SkeletonUtils } from "three-stdlib";
import { LoopOnce, LoopRepeat } from "three";
import { Wheels } from "./Wheels";
import { damp } from "three/src/math/MathUtils.js";
import { VFXEmitter } from "wawa-vfx";
import { useGameStore } from "../store.js";
import Flames from "../particles/drift/flames/Flames.jsx";
import { SMOKE_VFX_SETTINGS } from "../constants.js";

export function Model({ speed, inputTurn, driftDirection, driftPower, backWheelOffset, jumpOffset }) {
  const group = React.useRef();
  const { scene, animations } = useGLTF("./models/witch-transformed.glb");
  const clone = React.useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const { nodes, materials } = useGraph(clone);
  const { actions } = useAnimations(animations, group);

  const windActionRef = useRef();
  const wheelsRef = useRef(null);
  const currentAction = useRef();
  const sceneRef = useRef(null);
  const wheelPRY = useRef(null);

  const kartBodyRef = useRef(null);

  const smoke1Ref = useRef(null);
  const smoke2Ref = useRef(null);
  const flamePositionLeftRef = useRef(null);
  const flamePositionRightRef = useRef(null);

  const setFlamePositions = useGameStore((state) => state.setFlamePositions);

  const playAction = (name, loopOnce = false) => {
    if (!actions || !actions[name]) return;

    const nextAction = actions[name];

    if (currentAction.current !== nextAction) {
      if (currentAction.current) {
        currentAction.current.fadeOut(0.2);
      }

      nextAction.reset().setEffectiveWeight(1).fadeIn(0.2);

      if (loopOnce) {
        nextAction.setLoop(LoopOnce, 1);
        nextAction.clampWhenFinished = true;
      } else {
        nextAction.setLoop(LoopRepeat);
      }

      nextAction.play();
      currentAction.current = nextAction;
    }
  };

  useEffect(() => {
    currentAction.current = actions["IDLE-KART"].play();
    windActionRef.current = actions["wind"].play();
    sceneRef.current.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });
  }, [actions]);

  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime();
    windActionRef.current.setEffectiveTimeScale(speed.current / 15);

    if (inputTurn.current < -0.01) {
      playAction("TURN-RIGHT", true);
    } else if (inputTurn.current > 0.01) {
      playAction("TURN-LEFT", true);
    } else {
      playAction("IDLE-KART", false);
    }

    if (wheelPRY.current) {
      sceneRef.current.rotation.x = wheelPRY.current[0];
      sceneRef.current.rotation.z = wheelPRY.current[1];
      sceneRef.current.position.y = damp(sceneRef.current.position.y, wheelPRY.current[2], 24, delta);
    }
    group.current.rotation.y = damp(
      group.current.rotation.y,
      driftDirection.current * 0.4,
      4,
      delta
    );

    kartBodyRef.current.rotation.x = -Math.PI + Math.sin(time * 80) * 0.003;

    if (speed.current < 10) {
      smoke1Ref.current?.startEmitting();
      smoke2Ref.current?.startEmitting();
    } else {
      smoke1Ref.current?.stopEmitting();
      smoke2Ref.current?.stopEmitting();
    }

    if (flamePositionLeftRef.current && flamePositionRightRef.current) {
      setFlamePositions([
        flamePositionLeftRef.current.position,
        flamePositionRightRef.current.position,
      ]);
    }
  });

  return (
    <group ref={group} dispose={null} position={[0, 0, 0]} scale={2}>
      <group ref={wheelsRef}>
        <Wheels
          speed={speed}
          inputTurn={inputTurn}
          driftDirection={driftDirection}
          driftPower={driftPower}
          jumpOffset={jumpOffset}
          wheelPRY={wheelPRY}
          backWheelOffset={backWheelOffset}
        />
      </group>
      <group ref={sceneRef} name="Scene">
        <group name="rig">
          <primitive object={nodes.root} />
          <primitive object={nodes["MCH-torsoparent"]} />
          <primitive object={nodes["MCH-hand_ikparentL"]} />
          <primitive object={nodes["MCH-upper_arm_ik_targetparentL"]} />
          <primitive object={nodes["MCH-hand_ikparentR"]} />
          <primitive object={nodes["MCH-upper_arm_ik_targetparentR"]} />
          <primitive object={nodes["MCH-foot_ikparentL"]} />
          <primitive object={nodes["MCH-thigh_ik_targetparentL"]} />
          <primitive object={nodes["MCH-foot_ikparentR"]} />
          <primitive object={nodes["MCH-thigh_ik_targetparentR"]} />
        </group>
        <mesh
          castShadow
          receiveShadow
          ref={kartBodyRef}
          name="body"
          geometry={nodes.body.geometry}
          material={materials.m_Body}
          rotation={[-Math.PI, 0, -Math.PI]}
          scale={0.522}
          position-y={0.01}
        >
          <Flames />
          <group position={[0.5, 0.55, -1.5]} rotation-x={Math.PI / 9} ref={flamePositionLeftRef}>
            <VFXEmitter ref={smoke1Ref} emitter="smoke" settings={SMOKE_VFX_SETTINGS} />
          </group>
          <group position={[-0.5, 0.55, -1.5]} rotation-x={Math.PI / 9} ref={flamePositionRightRef}>
            <VFXEmitter ref={smoke2Ref} emitter="smoke" settings={SMOKE_VFX_SETTINGS} />
          </group>
        </mesh>
        <skinnedMesh
          castShadow
          receiveShadow
          name="Cube004"
          geometry={nodes.Cube004.geometry}
          material={materials.PaletteMaterial001}
          skeleton={nodes.Cube004.skeleton}
        />
        <skinnedMesh
          castShadow
          receiveShadow
          name="Cube005"
          geometry={nodes.Cube005.geometry}
          material={materials["Material.003"]}
          skeleton={nodes.Cube005.skeleton}
        />
        <skinnedMesh
          castShadow
          receiveShadow
          name="Cube006"
          geometry={nodes.Cube006.geometry}
          material={materials.Material}
          skeleton={nodes.Cube006.skeleton}
        />
        <skinnedMesh
          castShadow
          receiveShadow
          name="Cylinder"
          geometry={nodes.Cylinder.geometry}
          material={materials.PaletteMaterial003}
          skeleton={nodes.Cylinder.skeleton}
        />
      </group>
    </group>
  );
}

useGLTF.preload("./models/witch-transformed.glb");
