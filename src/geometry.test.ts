import { Vector, vectorQuadrant } from "./geometry";

describe('geometry', () => {
  function vector(x: number, y: number): Vector {
    return { x, y };
  }
  describe(vectorQuadrant, () => {
    test('case 1', () => expect(vectorQuadrant(vector(1, 1))).toEqual(1));
    test('case 2', () => expect(vectorQuadrant(vector(-1, 1))).toEqual(2));
    test('case 3', () => expect(vectorQuadrant(vector(-1, -1))).toEqual(3));
    test('case 4', () => expect(vectorQuadrant(vector(1, -1))).toEqual(4));
  });
});
