import * as Geometry from './geometry';

/** An object describing a collision between two objects */
export type Manifold = {
  penetration: number,
  normal: Geometry.Vector,
};

export function detectCollisionBetweenCircles(
  circle1: Geometry.Circle,
  circle2: Geometry.Circle,
): Manifold | undefined {
  // Vector from A to B
  const n: Geometry.Vector = Geometry.diffVector(circle1.position, circle2.position);

  let r: number = circle1.radius + circle2.radius
  r *= r;

  if (Geometry.lengthSquared(n) > r) {
    return undefined;
  }

  // Circles have collided, now compute manifold
  const d: number = Geometry.length(n) // perform actual sqrt

  // If distance between circles is not zero
  if (d !== 0) {
    return {
      // Distance is difference between radius and distance
      penetration: r - d,
      // Points from A to B, and is a unit vector
      normal: Geometry.normalize(n),
    };
  }

  // Circles are on same position
  return {
    // Choose random (but consistent) values
    penetration: circle1.radius,
    normal: { x: 1, y: 2 },
  }
}

export type CollisionInfo = {
  velocity: Geometry.Vector,
  restitution: number,
  mass: number,
}

export type CollisionResolution = {
  velocity1: Geometry.Vector,
  velocity2: Geometry.Vector,
}

export function resolveCollisionBetweenCircles(
  obj1: CollisionInfo,
  obj2: CollisionInfo,
  normal: Geometry.Vector,
): CollisionResolution | undefined {
  // Calculate relative velocity
  const rv: Geometry.Vector = Geometry.diffVector(obj1.velocity, obj2.velocity);
 
  // Calculate relative velocity in terms of the normal direction
  const velAlongNormal: number = Geometry.dotProduct(rv, normal);
 
  // Do not resolve if velocities are separating
  if (velAlongNormal > 0) {
    return;
  }
 
  // Calculate restitution
  const e: number = Math.min(obj1.restitution, obj2.restitution);
 
  // Calculate impulse scalar
  let j: number = -(1 + e) * velAlongNormal
  j /= 1 / obj1.mass + 1 / obj2.mass
 
  // Apply impulse
  const impulse: Geometry.Vector = Geometry.vectorMultiplication(j, normal);
  return {
    velocity1: Geometry.vectorSubtraction(obj1.velocity, Geometry.vectorMultiplication(1 / obj1.mass, impulse)),
    velocity2: Geometry.vectorAddition(obj2.velocity, Geometry.vectorMultiplication(1 / obj2.mass, impulse)),
  };
}