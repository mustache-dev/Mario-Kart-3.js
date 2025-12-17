import { PlayerController } from "./PlayerController";
import { Grid } from "@react-three/drei";
import Flames from "./particles/drift/flames/Flames";
import {Track} from './models/Mario-circuit-test';
export const TrackScene = () => {
  return (
    <>
      <PlayerController />
      <Track />


      {/* <Flames /> */}

      {/* <Grid position={[0, -1.99, 0]} infiniteGrid/> */}
    </>
  );
};
