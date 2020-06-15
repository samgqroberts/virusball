import { detectCollisionBetweenCircles, detectCollisionBetweenCircleAndSemicircleArc } from "./physics";
import * as geometry from './geometry'
import { CircleHalf } from "./models";

describe('physics', () => {
  function circle(x: number, y: number, radius: number): geometry.Circle {
    return { position: { x, y, }, radius };
  }
  function semicircleArc(x: number, y: number, radius: number, arcWidth: number, circleHalf: CircleHalf): geometry.SemicircleArc {
    return { position: { x, y }, radius, arcWidth, circleHalf };
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

  describe(detectCollisionBetweenCircleAndSemicircleArc, () => {
    test.only('case 1', () => {
      const manifold = detectCollisionBetweenCircleAndSemicircleArc(
        circle(-3, 2, 0.5),
        semicircleArc(-1, 0, 1, 0.5, CircleHalf.LEFT),
      );
      expect(manifold).toBeUndefined();
    });
    test.only('case 2', () => {
      const manifold = detectCollisionBetweenCircleAndSemicircleArc(
        circle(-3, 2, 2),
        semicircleArc(-1, 0, 1, 0.5, CircleHalf.LEFT),
      );
      
      expect(manifold).toBeDefined();
      expect(manifold?.normal.x).toBeCloseTo(0.707);
      expect(manifold?.normal.y).toBeCloseTo(-0.707);
      expect(manifold?.penetration).toBeCloseTo(0.1716);
    });
    test.only('case 3', () => {
      const manifold = detectCollisionBetweenCircleAndSemicircleArc(
        circle(-3, -2, 2),
        semicircleArc(-1, 0, 1, 0.5, CircleHalf.LEFT),
      );
      
      expect(manifold).toBeDefined();
      expect(manifold?.normal.x).toBeCloseTo(0.707);
      expect(manifold?.normal.y).toBeCloseTo(0.707);
      expect(manifold?.penetration).toBeCloseTo(0.1716);
    });
  });
});