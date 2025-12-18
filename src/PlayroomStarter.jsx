import { insertCoin, onPlayerJoin, me } from "playroomkit";
import { useEffect, useRef, memo } from "react";
import { usePlayroomStore } from "./playroomStore";
import { extend, useFrame } from "@react-three/fiber";
import { BoxGeometry, DoubleSide, MeshBasicMaterial } from "three";
import { InstancedMesh2 } from "@three.ez/instanced-mesh";

extend({ InstancedMesh2 });

const geometry = new BoxGeometry(1, 1, 1);
const material = new MeshBasicMaterial({ color: 0x00ff00, side: DoubleSide });

const PlayroomStarterInner = () => {
  const ref = useRef();
  const pendingPlayers = useRef([]);
  const playerInstanceMap = useRef(new Map());
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const start = async () => {
      await insertCoin();

      onPlayerJoin((state) => {
        if (state.id === me().id) return;
        
        usePlayroomStore.getState().addPlayer(state);
        console.log("Player joined", state);

        pendingPlayers.current.push(state);

        state.onQuit(() => {
          console.log("Player left", state);
          usePlayroomStore.getState().removePlayer(state);
          // Remove instance when player quits
          const instance = playerInstanceMap.current.get(state.id);
          if (instance) {
            instance.remove();
            playerInstanceMap.current.delete(state.id);
          }
        });
      });
    };

    start();
  }, []);

  useFrame(() => {
    if (!ref.current) return;


    while (pendingPlayers.current.length > 0) {
      const playerState = pendingPlayers.current.shift();
      ref.current.addInstances(1, (obj) => {
        obj.position.set(0, 2, 0);
        obj.playerId = playerState.id;
        obj.playerState = playerState;
        obj.scale.set(2, 2, 2);
        playerInstanceMap.current.set(playerState.id, obj);
        console.log("Instance created for player", playerState.id);
      });
    }

    ref.current.updateInstances((obj) => {
      const pos = obj.playerState?.state?.position;
      if (pos && pos.x !== undefined && pos.y !== undefined && pos.z !== undefined) {
        obj.position.set(pos.x, pos.y, pos.z);
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

export const PlayroomStarter = memo(PlayroomStarterInner);
