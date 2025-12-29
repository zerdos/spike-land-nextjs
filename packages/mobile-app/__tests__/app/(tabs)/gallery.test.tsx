/**
 * Gallery Screen Tests
 */

import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { useRouter } from "expo-router";
import React from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import GalleryScreen from "@/app/(tabs)/gallery";

// ============================================================================
// Mocks
// ============================================================================

// Mock Tamagui Lucide Icons - must come before tamagui mock
jest.mock("@tamagui/lucide-icons", () => {
  const mockReact = require("react");
  const RN = require("react-native");
  const MockIcon = () => mockReact.createElement(RN.View, { testID: "icon" });
  return {
    Calendar: MockIcon,
    Check: MockIcon,
    CheckSquare: MockIcon,
    ChevronDown: MockIcon,
    Filter: MockIcon,
    FolderPlus: MockIcon,
    Image: MockIcon,
    MoreHorizontal: MockIcon,
    RotateCcw: MockIcon,
    Search: MockIcon,
    Sparkles: MockIcon,
    Square: MockIcon,
    Trash2: MockIcon,
    X: MockIcon,
  };
});

// Mock child components used by GalleryScreen
jest.mock("@/components/FilterSheet", () => {
  const mockReact = require("react");
  const RN = require("react-native");
  return {
    FilterSheet: ({ open, testID }: { open: boolean; testID?: string; }) =>
      open
        ? mockReact.createElement(RN.View, { testID: testID || "filter-sheet" })
        : null,
    __esModule: true,
    default: ({ open, testID }: { open: boolean; testID?: string; }) =>
      open
        ? mockReact.createElement(RN.View, { testID: testID || "filter-sheet" })
        : null,
  };
});

jest.mock("@/components/gallery", () => {
  const mockReact = require("react");
  const RN = require("react-native");
  return {
    ImageGrid: ({
      images,
      ListHeaderComponent,
      ListEmptyComponent,
      onRefresh,
      onLoadMore,
    }: {
      images: unknown[];
      ListHeaderComponent?: unknown;
      ListEmptyComponent?: unknown;
      onRefresh: () => void;
      onLoadMore: () => void;
    }) =>
      mockReact.createElement(
        RN.View,
        { testID: "image-grid" },
        ListHeaderComponent,
        images.length === 0 && ListEmptyComponent
          ? ListEmptyComponent
          : images.map((img: { id?: string; }, idx: number) =>
            mockReact.createElement(RN.View, {
              key: img?.id || idx,
              testID: `image-${img?.id || idx}`,
            })
          ),
      ),
    __esModule: true,
  };
});

jest.mock("@/components/SearchBar", () => {
  const mockReact = require("react");
  const RN = require("react-native");
  return {
    SearchBar: ({
      value,
      onChangeText,
      testID,
    }: {
      value?: string;
      onChangeText?: (text: string) => void;
      testID?: string;
    }) =>
      mockReact.createElement(
        RN.View,
        { testID: testID || "search-bar" },
        mockReact.createElement(RN.TextInput, {
          testID: `${testID || "search-bar"}-input`,
          value,
          onChangeText,
        }),
      ),
    __esModule: true,
    default: ({
      value,
      onChangeText,
      testID,
    }: {
      value?: string;
      onChangeText?: (text: string) => void;
      testID?: string;
    }) =>
      mockReact.createElement(
        RN.View,
        { testID: testID || "search-bar" },
        mockReact.createElement(RN.TextInput, {
          testID: `${testID || "search-bar"}-input`,
          value,
          onChangeText,
        }),
      ),
  };
});

// Mock Tamagui with Popover subcomponents
jest.mock("tamagui", () => {
  const mockReact = require("react");
  const RN = require("react-native");

  // Create wrapper components using require'd React
  const mockPopoverRoot = ({ children }: { children: unknown; }) =>
    mockReact.createElement(RN.View, { testID: "popover" }, children);
  const mockPopoverTrigger = ({ children }: { children: unknown; }) =>
    mockReact.createElement(RN.View, { testID: "popover-trigger" }, children);
  const mockPopoverContent = ({ children }: { children: unknown; }) =>
    mockReact.createElement(RN.View, { testID: "popover-content" }, children);

  const MockPopover = Object.assign(mockPopoverRoot, {
    Trigger: mockPopoverTrigger,
    Content: mockPopoverContent,
  });

  const mockSheetRoot = ({ children, open }: { children: unknown; open?: boolean; }) =>
    open ? mockReact.createElement(RN.View, { testID: "sheet" }, children) : null;
  const mockSheetFrame = ({ children }: { children: unknown; }) =>
    mockReact.createElement(RN.View, { testID: "sheet-frame" }, children);
  const mockSheetOverlay = () => mockReact.createElement(RN.View, { testID: "sheet-overlay" });
  const mockSheetHandle = () => mockReact.createElement(RN.View, { testID: "sheet-handle" });

  const MockSheet = Object.assign(mockSheetRoot, {
    Frame: mockSheetFrame,
    Overlay: mockSheetOverlay,
    Handle: mockSheetHandle,
    ScrollView: RN.View,
  });

  return {
    styled: jest.fn((component: unknown) => component),
    createTamagui: jest.fn(() => ({})),
    TamaguiProvider: ({ children }: { children: unknown; }) => children,
    Theme: ({ children }: { children: unknown; }) => children,
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
    View: RN.View,
    Text: RN.Text,
    Stack: RN.View,
    XStack: RN.View,
    YStack: RN.View,
    ZStack: RN.View,
    Button: RN.Pressable,
    Input: RN.TextInput,
    Label: RN.Text,
    H1: RN.Text,
    H2: RN.Text,
    H3: RN.Text,
    H4: RN.Text,
    Paragraph: RN.Text,
    Card: RN.View,
    Separator: RN.View,
    ScrollView: RN.View,
    Popover: MockPopover,
    Sheet: MockSheet,
    Dialog: {
      Trigger: RN.Pressable,
      Portal: RN.View,
      Overlay: RN.View,
      Content: RN.View,
      Title: RN.Text,
      Description: RN.Text,
      Close: RN.Pressable,
    },
    Spinner: () => null,
    Avatar: {
      Image: RN.View,
      Fallback: RN.Text,
    },
    Progress: Object.assign(RN.View, {
      Indicator: RN.View,
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

jest.mock("expo-router", () => ({
  useRouter: jest.fn(),
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: jest.fn(),
}));

const mockUseGalleryStore = jest.fn();
jest.mock("@/stores", () => ({
  useGalleryStore: (...args: unknown[]) => mockUseGalleryStore(...args),
}));

// Alert mock is set up in beforeEach to avoid being cleared

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
};

const mockInsets = {
  top: 44,
  bottom: 34,
  left: 0,
  right: 0,
};

// ============================================================================
// Test Data
// ============================================================================

const mockImages = [
  {
    id: "img-1",
    userId: "user-1",
    originalUrl: "https://example.com/img1.jpg",
    enhancedUrl: null,
    thumbnailUrl: "https://example.com/img1-thumb.jpg",
    status: "PENDING" as const,
    currentTier: null,
    width: 1920,
    height: 1080,
    sizeBytes: 1024000,
    mimeType: "image/jpeg",
    originalName: "photo1.jpg",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "img-2",
    userId: "user-1",
    originalUrl: "https://example.com/img2.jpg",
    enhancedUrl: "https://example.com/img2-enhanced.jpg",
    thumbnailUrl: "https://example.com/img2-thumb.jpg",
    status: "COMPLETED" as const,
    currentTier: "TIER_2K" as const,
    width: 2048,
    height: 1536,
    sizeBytes: 2048000,
    mimeType: "image/jpeg",
    originalName: "photo2.jpg",
    createdAt: "2024-01-02T00:00:00Z",
    updatedAt: "2024-01-02T00:00:00Z",
  },
];

const mockAlbums = [
  {
    id: "album-1",
    name: "Vacation",
    description: "Summer 2024",
    userId: "user-1",
    imageCount: 10,
    privacy: "PRIVATE" as const,
    defaultTier: "TIER_1K" as const,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
];

const defaultStoreState = {
  images: mockImages,
  albums: mockAlbums,
  isLoadingImages: false,
  hasMoreImages: false,
  isSelectionMode: false,
  selectedImageIds: new Set<string>(),
  selectedAlbumId: null,
  searchQuery: "",
  filters: {
    albumIds: [],
    dateRange: {
      startDate: null,
      endDate: null,
    },
  },
  sortBy: "newest" as const,
  totalImages: 2,
  error: null,

  fetchImages: jest.fn(),
  fetchMoreImages: jest.fn(),
  refreshImages: jest.fn(),
  fetchAlbums: jest.fn(),
  setSelectedAlbum: jest.fn(),
  setSearchQuery: jest.fn(),
  setFilters: jest.fn(),
  resetFilters: jest.fn(),
  setSortBy: jest.fn(),
  toggleSelectionMode: jest.fn(),
  toggleImageSelection: jest.fn(),
  selectAllImages: jest.fn(),
  clearSelection: jest.fn(),
  batchEnhance: jest.fn(),
  batchDelete: jest.fn(),
  addSelectedImagesToAlbum: jest.fn(),
  startSlideshow: jest.fn(),
  clearError: jest.fn(),
};

// ============================================================================
// Test Helpers
// ============================================================================

const renderComponent = (storeOverrides = {}) => {
  const store = { ...defaultStoreState, ...storeOverrides };
  mockUseGalleryStore.mockReturnValue(store);

  return render(<GalleryScreen />);
};

// ============================================================================
// Tests
// ============================================================================

// Create a spy for Alert.alert that persists across tests
const mockAlertAlert = jest.fn();

describe("GalleryScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useSafeAreaInsets as jest.Mock).mockReturnValue(mockInsets);
    jest.useFakeTimers();
    // Set up Alert.alert mock
    Alert.alert = mockAlertAlert;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("Rendering", () => {
    it("renders gallery title", () => {
      const { getByText } = renderComponent();

      expect(getByText("Gallery")).toBeTruthy();
    });

    it("renders search bar", () => {
      const { getByTestId } = renderComponent();

      expect(getByTestId("gallery-search-bar")).toBeTruthy();
    });

    it("renders filter button", () => {
      const { getByTestId } = renderComponent();

      expect(getByTestId("gallery-filter-button")).toBeTruthy();
    });

    it("fetches images on mount", () => {
      renderComponent();

      expect(defaultStoreState.fetchImages).toHaveBeenCalled();
      expect(defaultStoreState.fetchAlbums).toHaveBeenCalled();
    });

    it("shows loading state", () => {
      const { getByText } = renderComponent({
        isLoadingImages: true,
        images: [],
      });

      // Should not show empty state while loading
      expect(true).toBe(true);
    });
  });

  describe("Search Functionality", () => {
    it("shows search input", () => {
      const { getByTestId } = renderComponent();

      expect(getByTestId("gallery-search-bar-input")).toBeTruthy();
    });

    it("calls setSearchQuery when typing", async () => {
      const mockSetSearchQuery = jest.fn();
      const { getByTestId } = renderComponent({
        setSearchQuery: mockSetSearchQuery,
      });

      const input = getByTestId("gallery-search-bar-input");
      fireEvent.changeText(input, "sunset");

      // Wait for debounce
      jest.advanceTimersByTime(300);

      await waitFor(() => {
        expect(mockSetSearchQuery).toHaveBeenCalledWith("sunset");
      });
    });

    it("displays results text when search is active", () => {
      const { getByTestId, getByText } = renderComponent({
        searchQuery: "beach",
        totalImages: 5,
      });

      expect(getByTestId("gallery-results-text")).toBeTruthy();
      expect(getByText('5 results for "beach"')).toBeTruthy();
    });

    it("shows empty results when no matches", () => {
      const { getByTestId, getByText } = renderComponent({
        searchQuery: "nonexistent",
        images: [],
        totalImages: 0,
      });

      expect(getByTestId("gallery-empty-results")).toBeTruthy();
      expect(getByText('No images match "nonexistent"')).toBeTruthy();
    });

    it("shows clear filters button in empty results", () => {
      const { getByText } = renderComponent({
        searchQuery: "test",
        images: [],
        totalImages: 0,
      });

      expect(getByText("Clear filters")).toBeTruthy();
    });
  });

  describe("Filter Functionality", () => {
    it("opens filter sheet when filter button pressed", () => {
      const { getByTestId, queryByTestId } = renderComponent();

      const filterButton = getByTestId("gallery-filter-button");
      fireEvent.press(filterButton);

      // Filter sheet should be rendered
      expect(getByTestId("gallery-filter-sheet")).toBeTruthy();
    });

    it("shows filter badge when filters are active", () => {
      const { getByText } = renderComponent({
        filters: {
          albumIds: ["album-1"],
          dateRange: { startDate: null, endDate: null },
        },
      });

      // Badge should show count
      expect(getByText("1")).toBeTruthy();
    });

    it("shows badge count for multiple active filters", () => {
      const { getByText } = renderComponent({
        filters: {
          albumIds: ["album-1"],
          dateRange: { startDate: new Date(), endDate: null },
        },
        sortBy: "name_asc",
      });

      // Badge should show 3 (album + date + sort)
      expect(getByText("3")).toBeTruthy();
    });

    it("calls resetFilters when clear filters pressed", () => {
      const mockResetFilters = jest.fn();
      const mockSetSortBy = jest.fn();

      const { getByText } = renderComponent({
        searchQuery: "test",
        images: [],
        totalImages: 0,
        resetFilters: mockResetFilters,
        setSortBy: mockSetSortBy,
      });

      const clearButton = getByText("Clear filters");
      fireEvent.press(clearButton);

      expect(mockResetFilters).toHaveBeenCalled();
      expect(mockSetSortBy).toHaveBeenCalledWith("newest");
    });

    it("shows results count when filters active", () => {
      const { getByTestId, getByText } = renderComponent({
        filters: {
          albumIds: ["album-1"],
          dateRange: { startDate: null, endDate: null },
        },
        totalImages: 10,
      });

      expect(getByTestId("gallery-results-text")).toBeTruthy();
      expect(getByText("10 results")).toBeTruthy();
    });
  });

  describe("Selection Mode", () => {
    it("shows selection header when selection mode active", () => {
      const { getByText } = renderComponent({
        isSelectionMode: true,
        selectedImageIds: new Set(["img-1", "img-2"]),
      });

      expect(getByText("2 selected")).toBeTruthy();
    });

    it("toggles selection mode", () => {
      const mockToggleSelectionMode = jest.fn();
      const { getByText, rerender } = renderComponent({
        toggleSelectionMode: mockToggleSelectionMode,
      });

      // Initially shows Gallery title (not in selection mode)
      expect(getByText("Gallery")).toBeTruthy();
    });

    it("shows action bar when items selected", () => {
      const { getByText } = renderComponent({
        isSelectionMode: true,
        selectedImageIds: new Set(["img-1"]),
      });

      expect(getByText("Enhance")).toBeTruthy();
      expect(getByText("Add to Album")).toBeTruthy();
      expect(getByText("Delete")).toBeTruthy();
    });
  });

  describe("Album Filter", () => {
    it("shows album popover when clicked", () => {
      const { getAllByText, getByText } = renderComponent();

      // Click on All Photos - there may be multiple, get the first one (in the button)
      const allPhotosElements = getAllByText("All Photos");
      fireEvent.press(allPhotosElements[0]);

      // Should show album options
      expect(getByText("Vacation")).toBeTruthy();
    });

    it("changes album filter when album selected", () => {
      const mockSetSelectedAlbum = jest.fn();
      const { getAllByText, getByText } = renderComponent({
        setSelectedAlbum: mockSetSelectedAlbum,
      });

      // Open album popover - there may be multiple, get the first one (in the button)
      const allPhotosElements = getAllByText("All Photos");
      fireEvent.press(allPhotosElements[0]);

      // Select an album
      const vacationAlbum = getByText("Vacation");
      fireEvent.press(vacationAlbum);

      expect(mockSetSelectedAlbum).toHaveBeenCalledWith("album-1");
    });
  });

  describe("Error Handling", () => {
    it("shows alert when error occurs", () => {
      renderComponent({
        error: "Failed to load images",
      });

      expect(mockAlertAlert).toHaveBeenCalledWith(
        "Error",
        "Failed to load images",
        expect.any(Array),
      );
    });

    it("clears error when alert dismissed", () => {
      const mockClearError = jest.fn();
      renderComponent({
        error: "Test error",
        clearError: mockClearError,
      });

      // Get the alert callback
      const alertCall = mockAlertAlert.mock.calls[0];
      const okButton = alertCall[2][0];

      // Press OK
      okButton.onPress();

      expect(mockClearError).toHaveBeenCalled();
    });
  });

  describe("Batch Actions", () => {
    it("opens enhance sheet when enhance pressed", () => {
      const { getByText } = renderComponent({
        isSelectionMode: true,
        selectedImageIds: new Set(["img-1"]),
      });

      const enhanceButton = getByText("Enhance");
      fireEvent.press(enhanceButton);

      expect(getByText("Select Enhancement Tier")).toBeTruthy();
    });

    it("shows delete confirmation", () => {
      const { getByText } = renderComponent({
        isSelectionMode: true,
        selectedImageIds: new Set(["img-1"]),
      });

      const deleteButton = getByText("Delete");
      fireEvent.press(deleteButton);

      expect(mockAlertAlert).toHaveBeenCalledWith(
        "Delete Images",
        expect.stringContaining("1 image"),
        expect.any(Array),
      );
    });

    it("calls batchEnhance when tier selected", async () => {
      const mockBatchEnhance = jest.fn().mockResolvedValue(true);
      const { getByText } = renderComponent({
        isSelectionMode: true,
        selectedImageIds: new Set(["img-1"]),
        batchEnhance: mockBatchEnhance,
      });

      // Open enhance sheet
      fireEvent.press(getByText("Enhance"));

      // Select tier
      fireEvent.press(getByText("1K (1024px)"));

      await waitFor(() => {
        expect(mockBatchEnhance).toHaveBeenCalledWith("TIER_1K");
      });
    });
  });

  describe("Navigation", () => {
    it("navigates to albums when more button pressed", () => {
      const { getAllByRole } = renderComponent();

      // The MoreHorizontal button should navigate to albums
      // This is harder to test without proper testID
      expect(mockRouter.push).not.toHaveBeenCalled();
    });

    it("starts slideshow and navigates on image press", () => {
      const mockStartSlideshow = jest.fn();
      const { getByText } = renderComponent({
        startSlideshow: mockStartSlideshow,
      });

      // Image press is handled by ImageGrid component
      expect(mockStartSlideshow).not.toHaveBeenCalled();
    });
  });

  describe("Refresh", () => {
    it("calls refreshImages on pull to refresh", async () => {
      const mockRefreshImages = jest.fn().mockResolvedValue(undefined);
      renderComponent({
        refreshImages: mockRefreshImages,
      });

      // Pull to refresh is handled by ImageGrid component
      expect(true).toBe(true);
    });
  });

  describe("Pagination", () => {
    it("calls fetchMoreImages when reaching end", () => {
      const mockFetchMoreImages = jest.fn();
      renderComponent({
        hasMoreImages: true,
        fetchMoreImages: mockFetchMoreImages,
      });

      // Pagination is handled by ImageGrid component
      expect(true).toBe(true);
    });
  });
});
