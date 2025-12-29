/**
 * Jest Setup File for React Native/Expo Mobile App
 * Configures mocks, extends matchers, and sets up test environment
 */

// ============================================================================
// Timer Globals - MUST BE FIRST (for testing-library)
// ============================================================================

// Ensure global timers are available (required by @testing-library/react-native)
if (typeof global.setTimeout === "undefined") {
  global.setTimeout = setTimeout;
}
if (typeof global.clearTimeout === "undefined") {
  global.clearTimeout = clearTimeout;
}
if (typeof global.setInterval === "undefined") {
  global.setInterval = setInterval;
}
if (typeof global.clearInterval === "undefined") {
  global.clearInterval = clearInterval;
}
if (typeof global.setImmediate === "undefined") {
  global.setImmediate = setImmediate || ((fn: () => void) => setTimeout(fn, 0));
}
if (typeof global.clearImmediate === "undefined") {
  global.clearImmediate = clearImmediate || ((id: number) => clearTimeout(id));
}

// ============================================================================
// Browser API Mocks - MUST BE FIRST (before any imports)
// ============================================================================

// Mock addEventListener/removeEventListener for tamagui
if (typeof global.addEventListener === "undefined") {
  global.addEventListener = jest.fn();
}
if (typeof global.removeEventListener === "undefined") {
  global.removeEventListener = jest.fn();
}

// Mock window object for web APIs used by tamagui
// IMPORTANT: Include timer functions because @testing-library/react-native
// checks `typeof window !== 'undefined'` and uses window.setTimeout if available
Object.defineProperty(global, "window", {
  value: {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    matchMedia: jest.fn(() => ({
      matches: false,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    })),
    getComputedStyle: jest.fn(() => ({
      getPropertyValue: jest.fn(),
    })),
    requestAnimationFrame: jest.fn((cb) => setTimeout(cb, 0)),
    cancelAnimationFrame: jest.fn(),
    // Timer functions required by @testing-library/react-native
    setTimeout: global.setTimeout,
    clearTimeout: global.clearTimeout,
    setInterval: global.setInterval,
    clearInterval: global.clearInterval,
  },
  writable: true,
});

// Mock document for SSR checks
Object.defineProperty(global, "document", {
  value: {
    createElement: jest.fn(() => ({
      style: {},
      setAttribute: jest.fn(),
      appendChild: jest.fn(),
    })),
    head: {
      appendChild: jest.fn(),
    },
    body: {
      appendChild: jest.fn(),
    },
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  },
  writable: true,
});

// Note: Jest matchers from @testing-library/react-native v12.4+ are automatically
// available when importing from '@testing-library/react-native' - no setup needed

// ============================================================================
// Expo Module Mock - Must be first to prevent winter runtime issues
// ============================================================================

jest.mock("expo", () => ({
  registerRootComponent: jest.fn(),
}));

// ============================================================================
// React Native Reanimated Mock
// ============================================================================

jest.mock("react-native-reanimated", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Reanimated = require("react-native-reanimated/mock");
  Reanimated.default.call = () => {};
  return {
    ...Reanimated,
    useSharedValue: jest.fn((initial) => ({ value: initial })),
    useAnimatedStyle: jest.fn(() => ({})),
    withTiming: jest.fn((value) => value),
    withSpring: jest.fn((value) => value),
    withDelay: jest.fn((_, animation) => animation),
    withSequence: jest.fn((...animations) => animations[0]),
    runOnJS: jest.fn((fn) => fn),
    runOnUI: jest.fn((fn) => fn),
    Easing: {
      linear: jest.fn(),
      ease: jest.fn(),
      bezier: jest.fn(),
    },
  };
});

// ============================================================================
// React Native Gesture Handler Mock
// ============================================================================

jest.mock("react-native-gesture-handler", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const View = require("react-native").View;
  return {
    GestureHandlerRootView: View,
    Swipeable: View,
    DrawerLayout: View,
    State: {},
    ScrollView: View,
    Slider: View,
    Switch: View,
    TextInput: View,
    ToolbarAndroid: View,
    ViewPagerAndroid: View,
    DrawerLayoutAndroid: View,
    WebView: View,
    NativeViewGestureHandler: View,
    TapGestureHandler: View,
    FlingGestureHandler: View,
    ForceTouchGestureHandler: View,
    LongPressGestureHandler: View,
    PanGestureHandler: View,
    PinchGestureHandler: View,
    RotationGestureHandler: View,
    RawButton: View,
    BaseButton: View,
    RectButton: View,
    BorderlessButton: View,
    FlatList: View,
    gestureHandlerRootHOC: jest.fn((component) => component),
    Directions: {},
    GestureDetector: View,
    Gesture: {
      Pan: jest.fn(() => ({})),
      Tap: jest.fn(() => ({})),
      LongPress: jest.fn(() => ({})),
    },
  };
});

// ============================================================================
// Expo Module Mocks
// ============================================================================

// expo-secure-store is mocked via __mocks__/expo-secure-store.ts

// expo-constants mock
jest.mock("expo-constants", () => ({
  __esModule: true,
  default: {
    expoConfig: {
      name: "spike-land",
      slug: "spike-land",
      version: "1.0.0",
      extra: {
        apiUrl: "https://spike.land",
      },
    },
    executionEnvironment: "storeClient",
    appOwnership: "expo",
    deviceName: "Test Device",
  },
}));

// expo-auth-session mock
jest.mock("expo-auth-session", () => ({
  makeRedirectUri: jest.fn(() => "spikeland://auth/callback"),
  AuthRequest: jest.fn().mockImplementation(() => ({
    promptAsync: jest.fn().mockResolvedValue({ type: "success", params: { code: "test-code" } }),
  })),
  ResponseType: {
    Code: "code",
    Token: "token",
  },
}));

// expo-web-browser mock
jest.mock("expo-web-browser", () => ({
  maybeCompleteAuthSession: jest.fn(),
  openBrowserAsync: jest.fn(),
  dismissBrowser: jest.fn(),
}));

// expo-linking mock
jest.mock("expo-linking", () => ({
  createURL: jest.fn((path) => `spikeland://${path}`),
  parse: jest.fn(),
  useURL: jest.fn(),
}));

// expo-router mock
jest.mock("expo-router", () => {
  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
    navigate: jest.fn(),
  };
  return {
    router: mockRouter,
    useRouter: jest.fn(() => mockRouter),
    useLocalSearchParams: jest.fn(() => ({})),
    useSegments: jest.fn(() => []),
    usePathname: jest.fn(() => "/"),
    Link: ({ children }: { children: React.ReactNode; }) => children,
    Stack: {
      Screen: ({ children }: { children?: React.ReactNode; }) => children,
    },
    Tabs: {
      Screen: ({ children }: { children?: React.ReactNode; }) => children,
    },
  };
});

// expo-font mock
jest.mock("expo-font", () => ({
  useFonts: jest.fn(() => [true, null]),
  loadAsync: jest.fn(),
}));

// expo-splash-screen mock
jest.mock("expo-splash-screen", () => ({
  preventAutoHideAsync: jest.fn(),
  hideAsync: jest.fn(),
}));

// expo-status-bar mock
jest.mock("expo-status-bar", () => ({
  StatusBar: () => null,
  setStatusBarStyle: jest.fn(),
  setStatusBarHidden: jest.fn(),
}));

// expo-image mock
jest.mock("expo-image", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require("react-native");
  return {
    Image: View,
    ImageBackground: View,
  };
});

// expo-clipboard mock
jest.mock("expo-clipboard", () => ({
  getStringAsync: jest.fn().mockResolvedValue(""),
  setStringAsync: jest.fn().mockResolvedValue(true),
}));

// expo-notifications mock
jest.mock("expo-notifications", () => ({
  getExpoPushTokenAsync: jest.fn().mockResolvedValue({ data: "test-push-token", type: "expo" }),
  getPermissionsAsync: jest.fn().mockResolvedValue({
    status: "granted",
    expires: "never",
    granted: true,
    canAskAgain: true,
  }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({
    status: "granted",
    expires: "never",
    granted: true,
    canAskAgain: true,
  }),
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn().mockResolvedValue(null),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  removeNotificationSubscription: jest.fn(),
  getLastNotificationResponseAsync: jest.fn().mockResolvedValue(null),
  scheduleNotificationAsync: jest.fn().mockResolvedValue("notification-id"),
  cancelScheduledNotificationAsync: jest.fn().mockResolvedValue(undefined),
  cancelAllScheduledNotificationsAsync: jest.fn().mockResolvedValue(undefined),
  setBadgeCountAsync: jest.fn().mockResolvedValue(undefined),
  getBadgeCountAsync: jest.fn().mockResolvedValue(0),
  DEFAULT_ACTION_IDENTIFIER: "default",
  AndroidImportance: {
    MAX: 5,
    HIGH: 4,
    DEFAULT: 3,
    LOW: 2,
    MIN: 1,
  },
  SchedulableTriggerInputTypes: {
    TIME_INTERVAL: "timeInterval",
    DATE: "date",
    CALENDAR: "calendar",
  },
}));

// expo-device mock
jest.mock("expo-device", () => ({
  isDevice: true,
  deviceName: "Test Device",
  brand: "Apple",
  manufacturer: "Apple",
  modelName: "iPhone 15 Pro",
  osName: "iOS",
  osVersion: "17.0",
}));

// expo-camera mock
jest.mock("expo-camera", () => ({
  Camera: jest.fn(() => null),
  useCameraPermissions: jest.fn(() => [{ granted: true }, jest.fn()]),
  CameraType: {
    front: "front",
    back: "back",
  },
}));

// expo-sharing mock
jest.mock("expo-sharing", () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(true),
  shareAsync: jest.fn().mockResolvedValue(undefined),
}));

// expo-file-system mock
jest.mock("expo-file-system", () => ({
  cacheDirectory: "file:///cache/",
  documentDirectory: "file:///documents/",
  downloadAsync: jest.fn().mockResolvedValue({
    uri: "file:///cache/test-image.jpg",
    status: 200,
    headers: {},
  }),
  createDownloadResumable: jest.fn(() => ({
    downloadAsync: jest.fn().mockResolvedValue({
      uri: "file:///cache/test-image.jpg",
    }),
    pauseAsync: jest.fn(),
    resumeAsync: jest.fn(),
  })),
  deleteAsync: jest.fn().mockResolvedValue(undefined),
  getInfoAsync: jest.fn().mockResolvedValue({
    exists: true,
    isDirectory: false,
    size: 1024,
  }),
  readAsStringAsync: jest.fn().mockResolvedValue(""),
  writeAsStringAsync: jest.fn().mockResolvedValue(undefined),
  makeDirectoryAsync: jest.fn().mockResolvedValue(undefined),
  copyAsync: jest.fn().mockResolvedValue(undefined),
  moveAsync: jest.fn().mockResolvedValue(undefined),
}));

// expo-media-library mock
jest.mock("expo-media-library", () => ({
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: "granted" }),
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: "granted" }),
  createAssetAsync: jest.fn().mockResolvedValue({
    id: "test-asset-id",
    uri: "file:///photos/test-image.jpg",
    mediaType: "photo",
    width: 1920,
    height: 1080,
  }),
  getAlbumAsync: jest.fn().mockResolvedValue(null),
  createAlbumAsync: jest.fn().mockResolvedValue({
    id: "test-album-id",
    title: "Spike Land",
  }),
  addAssetsToAlbumAsync: jest.fn().mockResolvedValue(true),
  MediaType: {
    photo: "photo",
    video: "video",
    audio: "audio",
    unknown: "unknown",
  },
}));

// expo-linear-gradient mock
jest.mock("expo-linear-gradient", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require("react-native");
  return {
    LinearGradient: View,
  };
});

// ============================================================================
// TanStack React Query - Allow real implementation in tests
// Tests should create their own QueryClient and wrapper
// ============================================================================

// Note: React Query is NOT mocked to allow for proper testing with QueryClientProvider
// Tests should wrap components with a fresh QueryClientProvider for each test

// ============================================================================
// Tamagui Lucide Icons Mock
// ============================================================================

jest.mock("@tamagui/lucide-icons", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require("react-native");
  const MockIcon = (props: { testID?: string; }) => View(props);
  return {
    Sparkles: MockIcon,
    Clock: MockIcon,
    Image: MockIcon,
    Layers: MockIcon,
    Coins: MockIcon,
    Check: MockIcon,
    X: MockIcon,
    ChevronRight: MockIcon,
    ChevronLeft: MockIcon,
    Plus: MockIcon,
    Minus: MockIcon,
    Settings: MockIcon,
    User: MockIcon,
    Home: MockIcon,
    Search: MockIcon,
    Download: MockIcon,
    Share2: MockIcon,
    Trash2: MockIcon,
    Copy: MockIcon,
    Loader2: MockIcon,
    ZoomIn: MockIcon,
    ZoomOut: MockIcon,
    // Referral system icons
    Gift: MockIcon,
    Trophy: MockIcon,
    Users: MockIcon,
    CheckCircle: MockIcon,
    UserPlus: MockIcon,
    HelpCircle: MockIcon,
    Facebook: MockIcon,
    Twitter: MockIcon,
    MessageCircle: MockIcon,
    // Notification icons
    Bell: MockIcon,
    Megaphone: MockIcon,
    Inbox: MockIcon,
    CheckCheck: MockIcon,
    Circle: MockIcon,
  };
});

// ============================================================================
// Tamagui Mock
// ============================================================================

jest.mock("tamagui", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View, Text, Pressable, TextInput } = require("react-native");
  return {
    styled: jest.fn((component) => component),
    createTamagui: jest.fn(() => ({})),
    TamaguiProvider: ({ children }: { children: React.ReactNode; }) => children,
    Theme: ({ children }: { children: React.ReactNode; }) => children,
    useTheme: jest.fn(() => ({
      background: { val: "#ffffff" },
      color: { val: "#000000" },
    })),
    useMedia: jest.fn(() => ({
      xs: false,
      sm: false,
      md: false,
      lg: true,
    })),
    // Component mocks
    View,
    Text,
    Stack: View,
    XStack: View,
    YStack: View,
    ZStack: View,
    Button: Pressable,
    Input: TextInput,
    Label: Text,
    H1: Text,
    H2: Text,
    H3: Text,
    H4: Text,
    Paragraph: Text,
    Card: View,
    Separator: View,
    ScrollView: View,
    Sheet: {
      Frame: View,
      Overlay: View,
      Handle: View,
      ScrollView: View,
    },
    Dialog: {
      Trigger: Pressable,
      Portal: View,
      Overlay: View,
      Content: View,
      Title: Text,
      Description: Text,
      Close: Pressable,
    },
    Spinner: () => null,
    Avatar: {
      Image: View,
      Fallback: Text,
    },
    Progress: Object.assign(View, {
      Indicator: View,
    }),
    getTokens: jest.fn(() => ({
      color: {},
      space: {},
      size: {},
      radius: {},
    })),
    getToken: jest.fn(() => ""),
    isWeb: false,
  };
});

// ============================================================================
// React Native Purchases Mock
// ============================================================================

jest.mock("react-native-purchases", () => ({
  configure: jest.fn(),
  getProducts: jest.fn().mockResolvedValue([]),
  purchaseProduct: jest.fn(),
  getCustomerInfo: jest.fn().mockResolvedValue({
    entitlements: { active: {} },
    activeSubscriptions: [],
  }),
  restorePurchases: jest.fn(),
  addCustomerInfoUpdateListener: jest.fn(() => ({ remove: jest.fn() })),
  LOG_LEVEL: {
    VERBOSE: 0,
    DEBUG: 1,
    INFO: 2,
    WARN: 3,
    ERROR: 4,
  },
}));

// ============================================================================
// Navigation Mocks
// ============================================================================

jest.mock("@react-navigation/native", () => ({
  useNavigation: jest.fn(() => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    setOptions: jest.fn(),
    addListener: jest.fn(() => jest.fn()),
  })),
  useRoute: jest.fn(() => ({
    params: {},
    name: "TestRoute",
  })),
  useFocusEffect: jest.fn((callback) => callback()),
  useIsFocused: jest.fn(() => true),
  NavigationContainer: ({ children }: { children: React.ReactNode; }) => children,
  createNavigationContainerRef: jest.fn(() => ({
    isReady: jest.fn(() => true),
    navigate: jest.fn(),
  })),
}));

// ============================================================================
// Safe Area Context Mock
// ============================================================================

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode; }) => children,
  SafeAreaView: ({ children }: { children: React.ReactNode; }) => children,
  useSafeAreaInsets: jest.fn(() => ({
    top: 44,
    right: 0,
    bottom: 34,
    left: 0,
  })),
}));

// ============================================================================
// React Native Partial Mocks (AppState, Linking, Alert, Share)
// ============================================================================

// Mock AppState for push notification tests
const mockAppStateSubscription = { remove: jest.fn() };
// eslint-disable-next-line @typescript-eslint/no-require-imports
jest.spyOn(require("react-native").AppState, "addEventListener").mockReturnValue(
  mockAppStateSubscription,
);

// Mock Linking for share tests
// eslint-disable-next-line @typescript-eslint/no-require-imports
jest.spyOn(require("react-native").Linking, "canOpenURL").mockResolvedValue(true);
// eslint-disable-next-line @typescript-eslint/no-require-imports
jest.spyOn(require("react-native").Linking, "openURL").mockResolvedValue(undefined);

// Mock Alert for share tests and error dialogs
// eslint-disable-next-line @typescript-eslint/no-require-imports
jest.spyOn(require("react-native").Alert, "alert").mockImplementation(jest.fn());

// Mock Share for native share functionality
// eslint-disable-next-line @typescript-eslint/no-require-imports
jest.spyOn(require("react-native").Share, "share").mockResolvedValue({
  action: "sharedAction",
  activityType: undefined,
});

// ============================================================================
// Console Suppression
// ============================================================================

beforeAll(() => {
  // Suppress console.error for cleaner test output
  jest.spyOn(console, "error").mockImplementation(() => {});
  // Suppress console.warn
  jest.spyOn(console, "warn").mockImplementation(() => {});
  // Suppress console.log
  jest.spyOn(console, "log").mockImplementation(() => {});
});

afterAll(() => {
  jest.restoreAllMocks();
});

// ============================================================================
// Global Test Utilities
// ============================================================================

// Clear mocks after each test
// Note: Fake timers should be set up locally in tests that need them
// (e.g., useEnhancementJob.test.ts) to avoid breaking @testing-library/react-native
afterEach(() => {
  jest.clearAllMocks();
});

// Global fetch mock
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(""),
    blob: () => Promise.resolve(new Blob()),
    headers: new Headers(),
    status: 200,
    statusText: "OK",
  } as Response)
);

// Mock localStorage for web platform tests
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};
Object.defineProperty(global, "localStorage", { value: localStorageMock });
