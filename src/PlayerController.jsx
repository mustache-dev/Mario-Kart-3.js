import { useKeyboardControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useRef, useEffect } from "react";
import { Vector3, MeshBasicMaterial } from "three";
import { damp } from "three/src/math/MathUtils.js";
import { eventBus, kartSettings } from "./constants";
import { useGameStore } from "./store";
import gsap from "gsap";
import { useTouchScreen } from "./hooks/useTouchScreen";
import { VFXEmitter } from "wawa-vfx";
import { Model } from "./models/Witch";
import { me } from "playroomkit";
import { buildCollider, checkCollision, kartColliderSettings } from "./utils/KartCollision";
import { MeshBVHHelper } from "three-mesh-bvh";
import { EVENTS } from "./events";
import { Witch2 } from "./models/Witch-2";

const isDebugMode = typeof window !== "undefined" && window.location.search.includes("debug");

const tempVec3 = new Vector3();
const tempDirection = new Vector3();
const tempDesiredDir = new Vector3();
const tempCameraPos = new Vector3();
const tempKartPos = new Vector3();

export const PlayerController = () => {
  const rbRef = useRef(null);
  const playerRef = useRef(null);
  const cameraGroupRef = useRef(null);
  const cameraLookAtRef = useRef(null);
  const kartRef = useRef(null);
  const jumpIsHeld = useRef(false);
  const driftDirections = {
    none: 0,
    left: 1.4,
    right: -1.4,
  };
  const jumpOffset = useRef(0);
  const driftDirection = useRef(driftDirections.none);
  const driftPower = useRef(0);
  const turbo = useRef(0);
  const isJumping = useRef(false);
  const backWheelOffset = useRef({
    left: 0,
    right: 0,
  });
  const gamepadRef = useRef(null);
  const inputTurn = useRef(0);

  const [, get] = useKeyboardControls();

  const speedRef = useRef(0);
  const rotationSpeedRef = useRef(0);
  const smoothedDirectionRef = useRef(new Vector3(0, 0, -1));

  const collisionStunTimer = useRef(0);
  const COLLISION_STUN_DURATION = 1.5;
  const COLLISION_BOUNCE_SPEED = -15;

  const isTouchScreen = useTouchScreen();

  const setPlayerPosition = useGameStore((state) => state.setPlayerPosition);
  const setIsBoosting = useGameStore((state) => state.setIsBoosting);
  const setSpeed = useGameStore((state) => state.setSpeed);
  const setGamepad = useGameStore((state) => state.setGamepad);

  const colliderRef = useRef(null);
  const colliderBuilt = useRef(false);
  const bvhHelperRef = useRef(null);
  const { scene } = useThree();

  useEffect(() => {
    if (colliderBuilt.current) return;

    const buildTimer = setTimeout(() => {
      const wallMeshes = [];
      scene.traverse((child) => {
        if (child.isMesh) {
          const name = child.name.toLowerCase();
          if (
            name.includes("wall") ||
            name.includes("barrier") ||
            name.includes("fence") ||
            name.includes("border") ||
            name.includes("collision")
          ) {
            wallMeshes.push(child);
          }
        }
      });

      if (wallMeshes.length > 0) {
        const collider = buildCollider({ traverse: (fn) => wallMeshes.forEach(fn) });
        if (collider) {
          colliderRef.current = collider;
          scene.add(collider);
          colliderBuilt.current = true;

          if (isDebugMode) {
            collider.visible = true;
            collider.material = new MeshBasicMaterial({
              color: 0xff0000,
              wireframe: true,
              transparent: true,
              opacity: 0.3,
            });

            const bvhHelper = new MeshBVHHelper(collider, 10);
            bvhHelper.color.set(0x00ff00);
            scene.add(bvhHelper);
            bvhHelperRef.current = bvhHelper;
          }
        }
      }
    }, 1000);

    return () => {
      clearTimeout(buildTimer);
      if (bvhHelperRef.current) {
        scene.remove(bvhHelperRef.current);
        bvhHelperRef.current = null;
      }
    };
  }, [scene]);

  const getGamepad = () => {
    if (navigator.getGamepads) {
      const gamepads = navigator.getGamepads();
      if (gamepads.length > 0) {
        gamepadRef.current = gamepads[0];
        setGamepad(gamepadRef.current);
      }
    }
  };

  const jumpAnim = () => {
    gsap.to(jumpOffset, {
      current: 0.3,
      duration: 0.125,
      ease: "power2.out",
      yoyo: true,
      repeat: 1,
      onComplete: () => {
        isJumping.current = false;
        setTimeout(() => {
          if (driftDirection.current !== 0) {
            gsap.killTweensOf(backWheelOffset.current);
            gsap.to(backWheelOffset.current, {
              left: driftDirection.current === driftDirections.left ? 0.2 : 0,
              right: driftDirection.current === driftDirections.right ? 0.2 : 0,
              duration: 0.3,
              ease: "power4.out",
              onComplete: () => {
                gsap.to(backWheelOffset.current, {
                  left: 0,
                  right: 0,
                  duration: 0.8,
                  ease: "bounce.out",
                });
              },
            });
          }
        }, 100);
      },
    });
  };

  function updateSpeed(forward, backward, delta) {
    if (collisionStunTimer.current > 0) {
      collisionStunTimer.current -= delta;
      speedRef.current = damp(speedRef.current, 0, 2, delta);
      setSpeed(speedRef.current);
      setIsBoosting(false);
      return;
    }

    const maxSpeed = kartSettings.speed.max + (turbo.current > 0 ? 40 : 0);
    maxSpeed > kartSettings.speed.max
      ? setIsBoosting(true)
      : setIsBoosting(false);

    const gamepadButtons = {
      forward: false,
      backward: false,
    };

    if (gamepadRef.current) {
      gamepadButtons.forward = gamepadRef.current.buttons[0].pressed;
      gamepadButtons.backward = gamepadRef.current.buttons[1].pressed;
    }
    const forwardAccel = Number(
      (isTouchScreen && !gamepadRef.current) ||
        forward ||
        gamepadButtons.forward
    );

    speedRef.current = damp(
      speedRef.current,
      maxSpeed * forwardAccel +
        kartSettings.speed.min * Number(backward || gamepadButtons.backward),
      1.5,
      delta
    );
    setSpeed(speedRef.current);
    if (speedRef.current < 20) {
      driftDirection.current = driftDirections.none;
      driftPower.current = 0;
    }
    turbo.current -= delta;
  }

  function rotatePlayer(left, right, player, joystickX, delta) {
    const gamepadJoystick = {
      x: 0,
    };

    if (gamepadRef.current) {
      gamepadJoystick.x = gamepadRef.current.axes[0];
    }

    inputTurn.current =
      (-gamepadJoystick.x -
        joystickX +
        (Number(left) - Number(right)) +
        driftDirection.current) *
      0.1;

    rotationSpeedRef.current = damp(
      rotationSpeedRef.current,
      inputTurn.current,
      4,
      delta
    );
    const targetRotation =
      player.rotation.y +
      (rotationSpeedRef.current *
        (speedRef.current > 40 ? 40 : speedRef.current)) /
        kartSettings.speed.max;

    player.rotation.y = damp(player.rotation.y, targetRotation, 8, delta);
  }

  function jumpPlayer(spaceKey, left, right, joystickX) {
    if (spaceKey && !jumpIsHeld.current && !isJumping.current) {
      jumpAnim();
      isJumping.current = true;
      jumpIsHeld.current = true;
      driftDirection.current =
        left || joystickX < 0
          ? driftDirections.left
          : right || joystickX > 0
          ? driftDirections.right
          : driftDirections.none;
    }

    if (!spaceKey) {
      jumpIsHeld.current = false;
      if (turbo.current <= 0) {
        turbo.current = useGameStore.getState().boostPower
          ? useGameStore.getState().boostPower
          : 0;
      }
      driftDirection.current = driftDirections.none;
      driftPower.current = 0;
    }
  }

  function driftPlayer(delta) {
    if (driftDirection.current !== driftDirections.none) {
      driftPower.current += delta;
    }
  }

  function updatePlayer(player, speed, camera, kart, delta) {
    tempDesiredDir.set(
      -Math.sin(player.rotation.y),
      0,
      -Math.cos(player.rotation.y)
    );

    smoothedDirectionRef.current.lerp(tempDesiredDir, 12 * delta);
    tempDirection.copy(smoothedDirectionRef.current);

    const angle = Math.atan2(
      tempDesiredDir.x * tempDirection.z - tempDesiredDir.z * tempDirection.x,
      tempDesiredDir.x * tempDirection.x + tempDesiredDir.z * tempDirection.z
    );

    kart.rotation.y = damp(
      kart.rotation.y,
      angle * 1.3 - driftDirection.current * 0.05,
      6,
      delta
    );

    kartRef.current.getWorldPosition(tempKartPos);
    camera.lookAt(tempKartPos);
    cameraGroupRef.current.getWorldPosition(tempCameraPos);
    camera.position.lerp(tempCameraPos, 24 * delta);

    const desiredX = player.position.x + tempDirection.x * speed * delta;
    const desiredZ = player.position.z + tempDirection.z * speed * delta;
    tempVec3.set(desiredX, player.position.y, desiredZ);

    if (colliderRef.current) {
      const result = checkCollision(
        player.position,
        tempVec3,
        colliderRef.current,
        kartColliderSettings
      );
      player.position.x = result.position.x;
      player.position.z = result.position.z;

      if (result.collided && collisionStunTimer.current <= 0) {
        speedRef.current = COLLISION_BOUNCE_SPEED;
        collisionStunTimer.current = COLLISION_STUN_DURATION;
        turbo.current = 0;
        eventBus.emit(EVENTS.PLAYER.IMPACT, player.position);
      }
    } else {
      player.position.x = desiredX;
      player.position.z = desiredZ;
    }

    setPlayerPosition(player.position);
  }

  const updatePlayroomState = () => {
    if (me()) {
      me().setState("position", playerRef.current.position);
    }
  };

  useFrame((state, delta) => {
    if (!playerRef.current && !rbRef.current) return;
    const player = playerRef.current;
    const cameraGroup = cameraGroupRef.current;
    const kart = kartRef.current;
    const camera = state.camera;

    if (!player || !cameraGroup || !kart) return;

    const joystick = useGameStore.getState().joystick;
    const jumpButtonPressed = useGameStore.getState().jumpButtonPressed;

    const { forward, backward, left, right, jump } = get();

    const gamepadButtons = {
      jump: false,
      x: 0,
    };

    if (gamepadRef.current) {
      gamepadButtons.jump =
        gamepadRef.current.buttons[5].pressed ||
        gamepadRef.current.buttons[7].pressed;
      gamepadButtons.x = gamepadRef.current.axes[0];
    }

    updateSpeed(forward, backward, delta);
    rotatePlayer(left, right, player, joystick.x, delta);
    updatePlayer(player, speedRef.current, camera, kart, delta);
    const isJumpPressed = jumpButtonPressed || jump || gamepadButtons.jump;
    jumpPlayer(isJumpPressed, left, right, joystick.x || gamepadButtons.x);
    driftPlayer(delta);
    getGamepad();
    updatePlayroomState();
  });

  return (
    <>
      <group></group>
      <group ref={playerRef}>
        <group ref={cameraGroupRef} position={[0, 1, 5]}></group>
        <group ref={kartRef}>
          <VFXEmitter
            emitter="confettis"
            autoStart={true}
            settings={{
              duration: 0.5,
              delay: 0.1,
              nbParticles: 100,
              spawnMode: "time",
              loop: true,
              startPositionMin: [-100, 0, -100],
              startPositionMax: [100, 10, 100],
              startRotationMin: [-1, -1, -1],
              startRotationMax: [1, 1, 1],
              particlesLifetime: [3, 4],
              speed: [1, 3],
              colorStart: [
                "#FF3F3F",
                "#FF9A00",
                "#FFE600",
                "#32FF6A",
                "#00E5FF",
                "#6A5CFF",
                "#FF5CFF",
                "#FF66B3",
                "#00FFB3",
                "#FFD700",
              ],
              directionMin: [-1, -1, -1],
              directionMax: [1, 0, 1],
              rotationSpeedMin: [-10, -10, -10],
              rotationSpeedMax: [10, 10, 10],
              size: [0.5, 1],
            }}
          />
          {/* <Model
            speed={speedRef}
            driftDirection={driftDirection}
            driftPower={driftPower}
            jumpOffset={jumpOffset}
            backWheelOffset={backWheelOffset}
            inputTurn={inputTurn}
          /> */}
          <Witch2            speed={speedRef}
            driftDirection={driftDirection}
            driftPower={driftPower}
            jumpOffset={jumpOffset}
            backWheelOffset={backWheelOffset}
            inputTurn={inputTurn}
          />

          {isDebugMode && (
            <mesh position={[0, (kartColliderSettings.radius + kartColliderSettings.height) / 2, 0]}>
              <capsuleGeometry
                args={[
                  kartColliderSettings.radius,
                  kartColliderSettings.height - kartColliderSettings.radius * 2,
                  4,
                  16,
                ]}
              />
              <meshBasicMaterial color={0x00ffff} wireframe transparent opacity={0.5} />
            </mesh>
          )}
          <group ref={cameraLookAtRef} position={[0, -2, -9]}></group>
        </group>
      </group>
    </>
  );
};
