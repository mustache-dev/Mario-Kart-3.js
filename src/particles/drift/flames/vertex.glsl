#ifdef USE_INSTANCING_INDIRECT
  #include <instanced_pars_vertex>
#endif

varying vec3 vPosition;
varying vec2 vUv;

void main() {
  vPosition = position;
  vUv = uv;
  
  #ifdef USE_INSTANCING_INDIRECT
    #include <instanced_vertex>
  #endif

  // Extract the world position of this instance (translation only)
  vec3 instanceWorldPos = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  
  // Get camera position in world space
  vec3 cameraWorldPos = cameraPosition;
  
  // Calculate direction from instance to camera
  vec3 lookDir = normalize(cameraWorldPos - instanceWorldPos);
  
  // Build billboard rotation axes
  vec3 up = vec3(0.0, 1.0, 0.0);
  vec3 right = normalize(cross(up, lookDir));
  vec3 newUp = cross(lookDir, right);
  
  // Create billboard rotation matrix (right, up, forward)
  mat3 billboardRotation = mat3(
    right,
    newUp,
    lookDir
  );
  
  // Extract scale from instanceMatrix
  vec3 instanceScale = vec3(
    length(instanceMatrix[0].xyz),
    length(instanceMatrix[1].xyz),
    length(instanceMatrix[2].xyz)
  );
  
  // Apply billboard rotation and scale to the vertex position
  vec3 rotatedPos = billboardRotation * (position * instanceScale);
  
  // Add to world position
  vec3 worldPos = instanceWorldPos + rotatedPos;
  
  // Transform to clip space
  vec4 mvPosition = viewMatrix * vec4(worldPos, 1.0);
  gl_Position = projectionMatrix * mvPosition;
}