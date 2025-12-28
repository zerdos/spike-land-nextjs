/**
 * Mock for @tamagui/animations-css
 */

export const createAnimations = jest.fn(() => ({
  animations: {
    quick: { type: "timing", duration: 100 },
    medium: { type: "timing", duration: 200 },
    slow: { type: "timing", duration: 300 },
    bouncy: { type: "spring", damping: 10, stiffness: 100 },
    lazy: { type: "timing", duration: 500 },
  },
}));

export default { createAnimations };
