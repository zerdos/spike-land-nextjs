/**
 * Mock for @tamagui/font-inter
 */

export const createInterFont = jest.fn(() => ({
  family: "Inter",
  size: {
    1: { fontSize: 11, lineHeight: 15 },
    2: { fontSize: 12, lineHeight: 17 },
    3: { fontSize: 13, lineHeight: 18 },
    4: { fontSize: 14, lineHeight: 20 },
    5: { fontSize: 16, lineHeight: 22 },
    6: { fontSize: 18, lineHeight: 24 },
    7: { fontSize: 20, lineHeight: 28 },
    8: { fontSize: 23, lineHeight: 30 },
    9: { fontSize: 30, lineHeight: 40 },
    10: { fontSize: 46, lineHeight: 55 },
    11: { fontSize: 55, lineHeight: 65 },
    12: { fontSize: 62, lineHeight: 72 },
    13: { fontSize: 72, lineHeight: 82 },
    14: { fontSize: 92, lineHeight: 102 },
    15: { fontSize: 114, lineHeight: 124 },
    16: { fontSize: 134, lineHeight: 144 },
  },
  weight: {
    1: "100",
    2: "200",
    3: "300",
    4: "400",
    5: "500",
    6: "600",
    7: "700",
    8: "800",
    9: "900",
  },
  letterSpacing: {
    1: 0,
    2: -0.5,
    3: -1,
  },
  face: {
    400: { normal: "Inter" },
    700: { normal: "Inter-Bold" },
  },
}));

export default { createInterFont };
