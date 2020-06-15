import { detectCollisionBetweenCircles } from "./physics";
import * as geometry from './geometry'

describe('physics', () => {
  function circle(x: number, y: number, radius: number): geometry.Circle {
    return { position: { x, y, }, radius };
  }

  describe(detectCollisionBetweenCircles, () => {
    test('case 1', () => {
      expect(detectCollisionBetweenCircles(
        circle(0, 0, 1),
        circle(2, 2, 1),
      )).toBeUndefined();
    });
    test('case 2', () => {
      const manifold = detectCollisionBetweenCircles(
        circle(1, 1, 2),
        circle(2, 2, 1),
      );
      expect(manifold).toBeDefined();
      expect(manifold?.normal.x).toBeCloseTo(0.7071);
      expect(manifold?.normal.y).toBeCloseTo(0.7071);
      expect(manifold?.penetration).toBeCloseTo(1.5858);
    });
    test('case 3', () => {
      expect(detectCollisionBetweenCircles(
        circle(-3, 4, 2),
        circle(-6, 6, 1.5),
      )).toBeUndefined();
    });
    test('case 4', () => {
      const manifold = detectCollisionBetweenCircles(
        circle(-3, 4, 2),
        circle(-6, 6, 1.8),
      );
      expect(manifold).toBeDefined();
      expect(manifold?.normal.x).toBeCloseTo(-0.832);
      expect(manifold?.normal.y).toBeCloseTo(0.5547);
      expect(manifold?.penetration).toBeCloseTo(0.1944);
    });
  });

  // describe();
});