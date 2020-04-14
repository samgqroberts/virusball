export function degreeToRadian(degree: number): number {
  return degree * Math.PI / 180;
}

export type Point = {
  x: number
  y: number
}

export type Circle = {
  position: Point,
  radius: number,
};

export type Vector = {
  x: number,
  y: number,
};

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