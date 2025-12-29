/**
 * Mock for react-native-reanimated/mock
 * This prevents jest.setup.ts from loading the real mock which requires native worklets
 */

import { View } from "react-native";

const Reanimated = {
  default: {
    call: () => {},
    createAnimatedComponent: (component: unknown) => component,
    View,
  },
  View,
};

export default Reanimated;
module.exports = Reanimated;
