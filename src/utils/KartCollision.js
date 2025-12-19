import { Vector3, Box3, Line3, Matrix4, Mesh, BoxGeometry, CylinderGeometry, MeshBasicMaterial } from "three";
import { MeshBVH, StaticGeometryGenerator } from "three-mesh-bvh";

const tempVector = new Vector3();
const tempVector2 = new Vector3();
const tempBox = new Box3();
const tempMat = new Matrix4();
const tempSegment = new Line3();

export const kartColliderSettings = {
  radius: 0.8,
  height: 1.0,
  pushOutMultiplier: 1.0,
};

export function buildCollider(group, includeNames = [], excludeNames = ["ground"]) {
  const meshes = [];

  group.traverse((child) => {
    if (!child.isMesh) return;

    const isExcluded = excludeNames.some((name) =>
      child.name.toLowerCase().includes(name.toLowerCase())
    );
    if (isExcluded) return;

    if (includeNames.length > 0) {
      const isIncluded = includeNames.some((name) =>
        child.name.toLowerCase().includes(name.toLowerCase())
      );
      if (!isIncluded) return;
    }

    meshes.push(child);
  });

  if (meshes.length === 0) {
    return null;
  }

  const staticGenerator = new StaticGeometryGenerator(meshes);
  staticGenerator.attributes = ["position"];

  const mergedGeometry = staticGenerator.generate();
  mergedGeometry.boundsTree = new MeshBVH(mergedGeometry);

  const collider = new Mesh(mergedGeometry);
  collider.visible = false;

  return collider;
}

export function checkCollision(currentPosition, desiredPosition, collider, settings = kartColliderSettings) {
  if (!collider || !collider.geometry.boundsTree) {
    return { position: desiredPosition.clone(), collided: false };
  }

  const result = {
    position: desiredPosition.clone(),
    collided: false,
  };

  const capsuleInfo = {
    radius: settings.radius,
    segment: new Line3(
      new Vector3(0, settings.radius, 0),
      new Vector3(0, settings.height, 0)
    ),
  };

  tempMat.copy(collider.matrixWorld).invert();
  tempSegment.copy(capsuleInfo.segment);

  tempSegment.start.add(desiredPosition).applyMatrix4(tempMat);
  tempSegment.end.add(desiredPosition).applyMatrix4(tempMat);

  tempBox.makeEmpty();
  tempBox.expandByPoint(tempSegment.start);
  tempBox.expandByPoint(tempSegment.end);
  tempBox.min.addScalar(-capsuleInfo.radius);
  tempBox.max.addScalar(capsuleInfo.radius);

  collider.geometry.boundsTree.shapecast({
    intersectsBounds: (box) => box.intersectsBox(tempBox),

    intersectsTriangle: (tri) => {
      const triPoint = tempVector;
      const capsulePoint = tempVector2;

      const distance = tri.closestPointToSegment(tempSegment, triPoint, capsulePoint);

      if (distance < capsuleInfo.radius) {
        const depth = capsuleInfo.radius - distance;
        const direction = capsulePoint.sub(triPoint).normalize();

        tempSegment.start.addScaledVector(direction, depth * settings.pushOutMultiplier);
        tempSegment.end.addScaledVector(direction, depth * settings.pushOutMultiplier);

        result.collided = true;
      }
    },
  });

  if (result.collided) {
    const newPosition = tempSegment.start.clone().applyMatrix4(collider.matrixWorld);
    result.position.x = newPosition.x;
    result.position.z = newPosition.z;
  }

  return result;
}

export function checkSimpleCollision(position, velocity, collider, radius = 1.0) {
  if (!collider || !collider.geometry.boundsTree) {
    return {
      position: position.clone().add(velocity),
      velocity: velocity.clone(),
      collided: false,
    };
  }

  const result = {
    position: position.clone(),
    velocity: velocity.clone(),
    collided: false,
  };

  const newPosition = position.clone().add(velocity);

  tempMat.copy(collider.matrixWorld).invert();
  const localPos = newPosition.clone().applyMatrix4(tempMat);

  tempBox.setFromCenterAndSize(localPos, new Vector3(radius * 2, radius * 2, radius * 2));

  collider.geometry.boundsTree.shapecast({
    intersectsBounds: (box) => box.intersectsBox(tempBox),

    intersectsTriangle: (tri) => {
      const normal = tri.getNormal(tempVector);

      const triCenter = tempVector2;
      tri.getMidpoint(triCenter);

      const distToTri = localPos.distanceTo(triCenter);
      if (distToTri < radius * 2) {
        result.velocity.addScaledVector(
          normal.applyMatrix4(collider.matrixWorld).normalize(),
          -result.velocity.dot(normal) * 1.1
        );
        result.collided = true;
      }
    },
  });

  result.position.add(result.velocity);
  return result;
}

export function createWallCollider(width, height, depth, visible = false) {
  const geometry = new BoxGeometry(width, height, depth);
  const material = new MeshBasicMaterial({
    color: 0xff0000,
    wireframe: true,
    visible: visible,
  });
  const wall = new Mesh(geometry, material);
  wall.name = "collision_wall";
  return wall;
}

export function createPillarCollider(radius, height, visible = false) {
  const geometry = new CylinderGeometry(radius, radius, height, 16);
  const material = new MeshBasicMaterial({
    color: 0xff0000,
    wireframe: true,
    visible: visible,
  });
  const pillar = new Mesh(geometry, material);
  pillar.name = "collision_pillar";
  return pillar;
}

export function buildColliderFromMeshes(meshes) {
  if (!meshes || meshes.length === 0) {
    return null;
  }

  const staticGenerator = new StaticGeometryGenerator(meshes);
  staticGenerator.attributes = ["position"];

  const mergedGeometry = staticGenerator.generate();
  mergedGeometry.boundsTree = new MeshBVH(mergedGeometry);

  const collider = new Mesh(mergedGeometry);
  collider.visible = false;

  return collider;
}
