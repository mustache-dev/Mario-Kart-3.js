import { extend, useFrame } from "@react-three/fiber";
import { InstancedMesh2 } from "@three.ez/instanced-mesh";
import { useRef, forwardRef, useImperativeHandle, useMemo, useEffect } from "react";
import { ShaderMaterial, PlaneGeometry, Color, Vector3 } from "three";
import { useTexture } from "@react-three/drei";
import { memo } from "react";

extend({ InstancedMesh2 });

const vertexShader = /* glsl */ `
#ifdef USE_INSTANCING_INDIRECT
  #include <instanced_pars_vertex>
#endif

uniform float uTime;
uniform float uLifetime;

varying vec2 vUv;
varying float vOpacity;

void main() {
  vUv = uv;
  
  #ifdef USE_INSTANCING_INDIRECT
    #include <instanced_vertex>
  #endif

  vec3 instanceWorldPos = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  vec3 lookDir = normalize(cameraPosition - instanceWorldPos);
  
  vec3 up = vec3(0.0, 1.0, 0.0);
  vec3 right = normalize(cross(up, lookDir));
  vec3 newUp = cross(lookDir, right);
  
  mat3 billboardRotation = mat3(right, newUp, lookDir);
  
  vec3 instanceScale = vec3(
    length(instanceMatrix[0].xyz),
    length(instanceMatrix[1].xyz),
    length(instanceMatrix[2].xyz)
  );
  
  vec3 rotatedPos = billboardRotation * (position * instanceScale);
  vec3 worldPos = instanceWorldPos + rotatedPos;
  
  // Calculate opacity from scale (smaller scale = newer = more opaque)
  float normalizedScale = instanceScale.x;
  vOpacity = 1.0 - smoothstep(0.0, 1.0, normalizedScale / 10.0);
  
  vec4 mvPosition = viewMatrix * vec4(worldPos, 1.0);
  gl_Position = projectionMatrix * mvPosition;
}
`;

const fragmentShader = /* glsl */ `
uniform sampler2D uTexture;
uniform vec3 uColor;
uniform float uTime;
uniform float uLifetime;

varying vec2 vUv;
varying float vOpacity;

void main() {
  vec4 tex = texture2D(uTexture, vUv);
  float texAlpha = (tex.r + tex.g + tex.b) / 3.0;
  gl_FragColor = vec4(tex.rgb * uColor, texAlpha * vOpacity);
}
`;

export const Spark = forwardRef((props, ref) => {
  const meshRef = useRef();
  const colorRef = useRef(new Color(1, 1, 1));
  const pendingEmits = useRef(0);
  const positionRef = useRef(new Vector3());
  const worldPos = useRef(new Vector3());

  const texture = useTexture("./textures/particles/spark.png");

  const geometry = useMemo(() => new PlaneGeometry(1, 1), []);

  const material = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: {
          uTexture: { value: null },
          uColor: { value: new Color(1, 1, 1) },
          uTime: { value: 0 },
          uLifetime: { value: 0.4 },
        },
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        defines: {
          USE_INSTANCING_INDIRECT: true,
        },
      }),
    []
  );

  useEffect(() => {
    if (texture) {
      material.uniforms.uTexture.value = texture;
    }
  }, [texture, material]);

  const lifetime = 0.4;
  const initialScale = 0.1;
  const scaleTarget = 10;

  useImperativeHandle(ref, () => ({
    emit: () => {
      pendingEmits.current++;
    },
    setColor: (newColor) => {
      if (newColor instanceof Color) {
        colorRef.current.copy(newColor);
      } else {
        colorRef.current.set(newColor);
      }
      material.uniforms.uColor.value.copy(colorRef.current).multiplyScalar(12);
    },
    setWorldPosition: (pos) => {
      worldPos.current.copy(pos);
    },
    mesh: meshRef,
  }));

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    // Update time uniform
    material.uniforms.uTime.value = state.clock.getElapsedTime();

    // Spawn 1 particle per emit at world position
    while (pendingEmits.current > 0) {
      pendingEmits.current--;

      // Convert world position to local position for the instance
      meshRef.current.worldToLocal(positionRef.current.copy(worldPos.current));

      meshRef.current.addInstances(1, (obj) => {
        const spread = 0.15;
        obj.position.set(
          positionRef.current.x + (Math.random() - 0.5) * spread,
          positionRef.current.y + (Math.random() - 0.5) * spread,
          positionRef.current.z + (Math.random() - 0.5) * spread
        );
        obj.scale.setScalar(initialScale);
        obj.currentTime = 0;
      });
    }

    // Update instances - just scale animation
    meshRef.current.updateInstances((obj) => {
      obj.currentTime += delta;
      const t = obj.currentTime / lifetime;

      // Scale up then down
      // Just grow, no shrink - fades out via lifetime
      const scale = initialScale + (scaleTarget - initialScale) * Math.min(t * 2, 1);
      obj.scale.setScalar(scale);

      if (obj.currentTime > lifetime) {
        obj.remove();
      }
    });
  });

  return (
    <instancedMesh2
      ref={meshRef}
      args={[geometry, material, { createEntities: true }]}
      frustumCulled={false}
    />
  );
});

export default memo(Spark);
