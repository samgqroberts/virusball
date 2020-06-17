import { CircleHalf } from "./models";

export function degreeToRadian(degree: number): number {
  return degree * Math.PI / 180;
}

export type Vector = {
  x: number,
  y: number,
};

export type Point = Vector;

export type Circle = {
  position: Point,
  radius: number,
};

export interface SemicircleArc extends Circle {
  arcWidth: number // value from 0 to 1, proportion of circle radius
  circleHalf: CircleHalf
}


// thank you https://stackoverflow.com/questions/12219802/a-javascript-function-that-returns-the-x-y-points-of-intersection-between-two-ci
export function pointsOfIntersectionBetweenTwoCircles(
  circle1: Circle,
  circle2: Circle,
): false | [Point, Point] {
  const { position: { x: x0, y: y0 }, radius: r0 } = circle1;
  const { position: { x: x1, y: y1 }, radius: r1 } = circle2;
  let a, dx, dy, d, h, rx, ry;
  let x2, y2;

  /* dx and dy are the vertical and horizontal distances between
   * the circle centers.
   */
  dx = x1 - x0;
  dy = y1 - y0;

  /* Determine the straight-line distance between the centers. */
  d = Math.sqrt((dy * dy) + (dx * dx));

  /* Check for solvability. */
  if (d > (r0 + r1)) {
    /* no solution. circles do not intersect. */
    return false;
  }
  if (d < Math.abs(r0 - r1)) {
    /* no solution. one circle is contained in the other */
    return false;
  }

  /* 'point 2' is the point where the line through the circle
   * intersection points crosses the line between the circle
   * centers.  
   */

  /* Determine the distance from point 0 to point 2. */
  a = ((r0 * r0) - (r1 * r1) + (d * d)) / (2.0 * d);

  /* Determine the coordinates of point 2. */
  x2 = x0 + (dx * a / d);
  y2 = y0 + (dy * a / d);

  /* Determine the distance from point 2 to either of the
   * intersection points.
   */
  h = Math.sqrt((r0 * r0) - (a * a));

  /* Now determine the offsets of the intersection points from
   * point 2.
   */
  rx = -dy * (h / d);
  ry = dx * (h / d);

  /* Determine the absolute intersection points. */
  var xi = x2 + rx;
  var xi_prime = x2 - rx;
  var yi = y2 + ry;
  var yi_prime = y2 - ry;

  return [{ x: xi, y: yi }, { x: xi_prime, y: yi_prime }];
}

function sq(value: number): number {
  return value * value;
}

export function innerCircleOfSemicircleArc(semicircleArc: SemicircleArc): Circle {
  return {
    position: semicircleArc.position,
    radius: (semicircleArc.radius * (1 - semicircleArc.arcWidth)),
  };
}

export function distanceBetweenPointAndCircle(
  point: Point,
  circle: Circle,
): number {
  return Math.abs(circle.radius - Math.sqrt(sq(circle.position.x - point.x) + (circle.position.y - point.y)));
}

export function vectorQuadrant(vector: Vector): 1 | 2 | 3 | 4 {
  const { x, y } = vector;
  if (x >= 0 && y >= 0) return 1;
  if (x >= 0 && y < 0) return 4;
  if (x < 0 && y >= 0) return 2;
  return 3;
}

export function diffVector(point1: Point, point2: Point): Vector {
  return { x: point2.x - point1.x, y: point2.y - point1.y };
}

export function lengthSquared(vector: Vector): number {
  return Math.pow(vector.x, 2) + Math.pow(vector.y, 2);
}

export function length(vector: Vector): number {
  return Math.sqrt(lengthSquared(vector));
}

export function normalize(vector: Vector): Vector {
  const l = length(vector);
  return { x: vector.x / l, y: vector.y / l };
}

export function correctPositionAspect(point: Point, aspect: number): Point {
  return { x: point.x, y: point.y / aspect };
}

export function correctCircleAspect(circle: Circle, aspect: number): Circle {
  return { position: correctPositionAspect(circle.position, aspect), radius: circle.radius };
}

export interface VectorMultiplication {
  (factor1: Vector, factor2: number): Vector;
  (factor1: number, factor2: Vector): Vector;
  (factor1: Vector, factor2: Vector): Vector;
}
export const vectorMultiplication: VectorMultiplication = (factor1: Vector | number, factor2: Vector | number) => {
  if (typeof factor1 === 'number') {
    if (typeof factor2 !== 'number') {
      return { x: factor1 * factor2.x, y: factor1 * factor2.y };
    }
  } else {
    if (typeof factor2 === 'number') {
      return { x: factor1.x * factor2, y: factor1.y * factor2 };
    }
    return { x: factor1.x * factor2.x, y: factor1.y * factor2.y };
  }
  throw new Error(`vectorDivision: Cannot multiply factor1 ${factor1} and factor2 ${factor2}`);
};

export interface VectorAddition {
  (addend1: Vector, addend2: number): Vector;
  (addend1: number, addend2: Vector): Vector;
  (addend1: Vector, addend2: Vector): Vector;
}
export const vectorAddition: VectorAddition = (addend1: Vector | number, addend2: Vector | number) => {
  if (typeof addend1 === 'number') {
    if (typeof addend2 !== 'number') {
      return { x: addend1 + addend2.x, y: addend1 + addend2.y };
    }
  } else {
    if (typeof addend2 === 'number') {
      return { x: addend1.x + addend2, y: addend1.y + addend2 };
    }
    return { x: addend1.x + addend2.x, y: addend1.y + addend2.y };
  }
  throw new Error(`vectorDivision: Cannot add addend1 ${addend1} and addend2 ${addend2}`);
};

export interface VectorDivision {
  (dividend: Vector, divisor: number): Vector;
  (dividend: number, divisor: Vector): Vector;
  (dividend: Vector, divisor: Vector): Vector;
}
export const vectorDivision: VectorDivision = (dividend: Vector | number, divisor: Vector | number) => {
  if (typeof dividend === 'number') {
    if (typeof divisor !== 'number') {
      return { x: dividend / divisor.x, y: dividend / divisor.y };
    }
  } else {
    if (typeof divisor === 'number') {
      return { x: dividend.x / divisor, y: dividend.y / divisor };
    }
    return { x: dividend.x / divisor.x, y: dividend.y / divisor.y };
  }
  throw new Error(`vectorDivision: Cannot divide dividend ${dividend} by divisor ${divisor}`);
};

export interface VectorSubtraction {
  (minuend: Vector, subtrahend: number): Vector;
  (minuend: number, subtrahend: Vector): Vector;
  (minuend: Vector, subtrahend: Vector): Vector;
}
export const vectorSubtraction: VectorSubtraction = (minuend: Vector | number, subtrahend: Vector | number) => {
  if (typeof minuend === 'number') {
    if (typeof subtrahend !== 'number') {
      return { x: minuend - subtrahend.x, y: minuend - subtrahend.y };
    }
  } else {
    if (typeof subtrahend === 'number') {
      return { x: minuend.x - subtrahend, y: minuend.y - subtrahend };
    }
    return { x: minuend.x - subtrahend.x, y: minuend.y - subtrahend.y };
  }
  throw new Error(`vectorDivision: Cannot subtract minuen ${minuend} by subtrahend ${subtrahend}`);
};

export function dotProduct(vector1: Vector, vector2: Vector): number {
  return vector1.x * vector2.x + vector1.y * vector2.y;
}
