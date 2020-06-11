import { detectCollisionBetweenCircles } from "./physics";

describe('physics', () => {
  describe(detectCollisionBetweenCircles, () => {
    test('is a function', () => {
      // simply ensure that the test framework is set up properly for now
      expect(detectCollisionBetweenCircles).toBeInstanceOf(Function);
    });
  });
});