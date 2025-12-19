import EventEmitter from "eventemitter3";
import { TextureLoader } from "three";

export const kartSettings = {
  speed: {
    min: -10,
    max: 30,
    default: 0,
  },

};

export const drifts = {
  level3: {
    name: "purple",
    threshold: 6,
    color: "#d677ff",
    nbParticles: 25,
    level: 3,
  },
    level2: {
    name: "yellow",
    threshold: 3,
    color: "#fab457",
    nbParticles: 5,
    level: 2,
  },
  level1: {
    name: "blue",
    threshold: 1,
    color: "#a3ffff",
    nbParticles: 15,
    level: 1,
  },

};

const driftLevels = Object.values(drifts).sort(
  (a, b) => b.threshold - a.threshold
);

export const getDriftLevel = (power) => {
  for (const level of driftLevels) {
    if (power >= level.threshold) {
      return level;
    }
  }

  return {
    name: "none",
    color: "#ffffff",
    nbParticles: 5,
    level: 0,
  };
};

export const noiseTexture = new TextureLoader().load("./textures/noise.png");

export const eventBus = new EventEmitter()