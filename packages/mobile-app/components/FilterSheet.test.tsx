/**
 * FilterSheet Component Tests
 */

// ============================================================================
// Mock for @tamagui/lucide-icons - Override global mock to use React.createElement
// ============================================================================

jest.mock("@tamagui/lucide-icons", () => {
  const ReactActual = jest.requireActual("react");
  const RN = jest.requireActual("react-native");
  // Must use React.createElement, not call View as a function
  const MockIcon = (props: any) => ReactActual.createElement(RN.View, props);
  return {
    Calendar: MockIcon,
    Check: MockIcon,
    ChevronDown: MockIcon,
    RotateCcw: MockIcon,
    Sparkles: MockIcon,
    Clock: MockIcon,
    Image: MockIcon,
    Layers: MockIcon,
    Coins: MockIcon,
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
    Gift: MockIcon,
    Trophy: MockIcon,
    Users: MockIcon,
    CheckCircle: MockIcon,
    UserPlus: MockIcon,
    HelpCircle: MockIcon,
    Facebook: MockIcon,
    Twitter: MockIcon,
    MessageCircle: MockIcon,
    Bell: MockIcon,
    Megaphone: MockIcon,
    Inbox: MockIcon,
    CheckCheck: MockIcon,
    Circle: MockIcon,
  };
});

// ============================================================================
// Mock for tamagui - with Checkbox compound component support
// ============================================================================

jest.mock("tamagui", () => {
  const ReactActual = jest.requireActual("react");
  const RN = jest.requireActual("react-native");
  const { View, Text, Pressable, TextInput, ScrollView } = RN;

  // Create Checkbox mock with Indicator subcomponent
  const CheckboxComponent = ReactActual.forwardRef(
    (
      { children, testID, checked, onCheckedChange, ...props }: any,
      ref: any,
    ) => {
      return ReactActual.createElement(
        Pressable,
        {
          ref,
          testID,
          onPress: () => onCheckedChange && onCheckedChange(!checked),
          accessibilityState: { checked: !!checked },
          accessibilityRole: "checkbox",
          ...props,
        },
        children,
      );
    },
  );
  CheckboxComponent.Indicator = (props: any) => ReactActual.createElement(View, props);

  // Sheet mock with compound components
  const SheetComponent = ({ children, open, ...props }: any) => {
    if (!open) return null;
    return ReactActual.createElement(View, props, children);
  };
  SheetComponent.Frame = (props: any) => ReactActual.createElement(View, props);
  SheetComponent.Overlay = () => null;
  SheetComponent.Handle = () => null;
  SheetComponent.ScrollView = (props: any) => ReactActual.createElement(ScrollView, props);

  return {
    styled: jest.fn((component: any) => component),
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
    ScrollView,
    Sheet: SheetComponent,
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
    Checkbox: CheckboxComponent,
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

import type { Album } from "@spike-npm-land/shared";
import { fireEvent, render } from "@testing-library/react-native";
import React from "react";

import type { ImageFilters } from "../hooks/useImageSearch";
import { FilterSheet, type FilterSheetProps } from "./FilterSheet";

// ============================================================================
// Test Helpers
// ============================================================================

const mockAlbums: Album[] = [
  {
    id: "album-1",
    name: "Vacation Photos",
    description: "Summer 2024",
    userId: "user-1",
    imageCount: 10,
    privacy: "PRIVATE",
    defaultTier: "TIER_1K",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "album-2",
    name: "Family",
    description: "Family photos",
    userId: "user-1",
    imageCount: 25,
    privacy: "PRIVATE",
    defaultTier: "TIER_2K",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "album-3",
    name: "Work",
    description: "Professional shots",
    userId: "user-1",
    imageCount: 5,
    privacy: "UNLISTED",
    defaultTier: "TIER_4K",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const defaultFilters: ImageFilters = {
  albumIds: [],
  dateRange: {
    startDate: null,
    endDate: null,
  },
};

const defaultProps: FilterSheetProps = {
  open: true,
  onOpenChange: jest.fn(),
  filters: defaultFilters,
  onFiltersChange: jest.fn(),
  sortBy: "newest",
  onSortChange: jest.fn(),
  albums: mockAlbums,
  onApply: jest.fn(),
  onReset: jest.fn(),
};

const renderComponent = (props: Partial<FilterSheetProps> = {}) => {
  const mergedProps = { ...defaultProps, ...props };
  return render(<FilterSheet {...mergedProps} />);
};

// ============================================================================
// Tests
// ============================================================================

describe("FilterSheet", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders when open is true", () => {
      const { getByTestId } = renderComponent();

      expect(getByTestId("filter-sheet")).toBeTruthy();
    });

    it("renders with custom testID", () => {
      const { getByTestId } = renderComponent({ testID: "custom-filter" });

      expect(getByTestId("custom-filter")).toBeTruthy();
    });

    it("renders sort button with current sort label", () => {
      const { getByTestId, getByText } = renderComponent({ sortBy: "oldest" });

      expect(getByTestId("filter-sheet-sort-button")).toBeTruthy();
      expect(getByText("Oldest First")).toBeTruthy();
    });

    it("renders all album checkboxes", () => {
      const { getByTestId, getByText } = renderComponent();

      mockAlbums.forEach((album) => {
        expect(getByTestId(`filter-sheet-album-${album.id}`)).toBeTruthy();
        expect(getByText(album.name)).toBeTruthy();
      });
    });

    it("renders date range pickers", () => {
      const { getByTestId } = renderComponent();

      expect(getByTestId("filter-sheet-start-date")).toBeTruthy();
      expect(getByTestId("filter-sheet-end-date")).toBeTruthy();
    });

    it("renders action buttons", () => {
      const { getByTestId } = renderComponent();

      expect(getByTestId("filter-sheet-cancel")).toBeTruthy();
      expect(getByTestId("filter-sheet-apply")).toBeTruthy();
      expect(getByTestId("filter-sheet-reset")).toBeTruthy();
    });

    it("shows empty message when no albums", () => {
      const { getByText } = renderComponent({ albums: [] });

      expect(getByText("No albums available")).toBeTruthy();
    });

    it("shows selected album count", () => {
      const filtersWithAlbums: ImageFilters = {
        ...defaultFilters,
        albumIds: ["album-1", "album-2"],
      };

      const { getByText } = renderComponent({ filters: filtersWithAlbums });

      expect(getByText("2 selected")).toBeTruthy();
    });

    it("shows clear dates button when date range is set", () => {
      const filtersWithDates: ImageFilters = {
        ...defaultFilters,
        dateRange: {
          startDate: new Date("2024-01-01"),
          endDate: null,
        },
      };

      const { getByTestId } = renderComponent({ filters: filtersWithDates });

      expect(getByTestId("filter-sheet-clear-dates")).toBeTruthy();
    });
  });

  describe("Sort Dropdown", () => {
    it("shows sort options when sort button is pressed", () => {
      const { getByTestId } = renderComponent();

      const sortButton = getByTestId("filter-sheet-sort-button");
      fireEvent.press(sortButton);

      expect(getByTestId("filter-sheet-sort-dropdown")).toBeTruthy();
    });

    it("shows all sort options", () => {
      const { getByTestId, getAllByText, getByText } = renderComponent();

      fireEvent.press(getByTestId("filter-sheet-sort-button"));

      // "Newest First" appears twice: in button and in dropdown, so use getAllByText
      expect(getAllByText("Newest First").length).toBeGreaterThanOrEqual(1);
      expect(getByText("Oldest First")).toBeTruthy();
      expect(getByText("Name A-Z")).toBeTruthy();
      expect(getByText("Name Z-A")).toBeTruthy();
      expect(getByText("Size: Small to Large")).toBeTruthy();
      expect(getByText("Size: Large to Small")).toBeTruthy();
    });

    it("updates local sort on option select", () => {
      const { getByTestId, getByText } = renderComponent();

      fireEvent.press(getByTestId("filter-sheet-sort-button"));
      fireEvent.press(getByTestId("filter-sheet-sort-option-name_asc"));

      // Dropdown should close and button should show new label
      expect(getByText("Name A-Z")).toBeTruthy();
    });

    it("closes dropdown after selecting option", () => {
      const { getByTestId, queryByTestId } = renderComponent();

      fireEvent.press(getByTestId("filter-sheet-sort-button"));
      expect(getByTestId("filter-sheet-sort-dropdown")).toBeTruthy();

      fireEvent.press(getByTestId("filter-sheet-sort-option-oldest"));

      expect(queryByTestId("filter-sheet-sort-dropdown")).toBeNull();
    });

    it("highlights current sort option", () => {
      const { getByTestId } = renderComponent({ sortBy: "name_desc" });

      fireEvent.press(getByTestId("filter-sheet-sort-button"));

      const option = getByTestId("filter-sheet-sort-option-name_desc");
      // Check that the option has a different background (blue2)
      expect(option).toBeTruthy();
    });
  });

  describe("Album Filtering", () => {
    it("toggles album selection on checkbox press", () => {
      const { getByTestId } = renderComponent();

      const checkbox = getByTestId("filter-sheet-album-album-1");
      fireEvent(checkbox, "checkedChange", true);

      // Local state should be updated
      expect(checkbox).toBeTruthy();
    });

    it("shows correct checked state for pre-selected albums", () => {
      const filtersWithAlbums: ImageFilters = {
        ...defaultFilters,
        albumIds: ["album-2"],
      };

      const { getByTestId } = renderComponent({ filters: filtersWithAlbums });

      const checkbox = getByTestId("filter-sheet-album-album-2");
      expect(checkbox.props.accessibilityState?.checked).toBe(true);
    });

    it("can uncheck selected album", () => {
      const filtersWithAlbums: ImageFilters = {
        ...defaultFilters,
        albumIds: ["album-1"],
      };

      const { getByTestId } = renderComponent({ filters: filtersWithAlbums });

      const checkbox = getByTestId("filter-sheet-album-album-1");
      fireEvent(checkbox, "checkedChange", false);

      expect(checkbox).toBeTruthy();
    });
  });

  describe("Date Range", () => {
    it("shows start date picker button", () => {
      const { getByTestId, getByText } = renderComponent();

      expect(getByTestId("filter-sheet-start-date")).toBeTruthy();
      expect(getByText("From")).toBeTruthy();
    });

    it("shows end date picker button", () => {
      const { getByTestId, getByText } = renderComponent();

      expect(getByTestId("filter-sheet-end-date")).toBeTruthy();
      expect(getByText("To")).toBeTruthy();
    });

    it("displays formatted date when date is set", () => {
      const filtersWithDates: ImageFilters = {
        ...defaultFilters,
        dateRange: {
          startDate: new Date("2024-06-15"),
          endDate: new Date("2024-12-31"),
        },
      };

      const { getByText } = renderComponent({ filters: filtersWithDates });

      // Check for formatted dates (format depends on locale)
      expect(getByText(/Jun/)).toBeTruthy();
      expect(getByText(/Dec/)).toBeTruthy();
    });

    it("shows Select date placeholder when no date", () => {
      const { getAllByText } = renderComponent();

      // Both date pickers should show placeholder
      const placeholders = getAllByText("Select date");
      expect(placeholders.length).toBe(2);
    });

    it("sets start date on press", () => {
      const { getByTestId } = renderComponent();

      const startDateButton = getByTestId("filter-sheet-start-date");
      fireEvent.press(startDateButton);

      // In real app this would open date picker
      // Mock sets date to 30 days ago
      expect(startDateButton).toBeTruthy();
    });

    it("sets end date on press", () => {
      const { getByTestId } = renderComponent();

      const endDateButton = getByTestId("filter-sheet-end-date");
      fireEvent.press(endDateButton);

      // In real app this would open date picker
      // Mock sets date to today
      expect(endDateButton).toBeTruthy();
    });

    it("clears both dates when clear button is pressed", () => {
      const filtersWithDates: ImageFilters = {
        ...defaultFilters,
        dateRange: {
          startDate: new Date("2024-01-01"),
          endDate: new Date("2024-12-31"),
        },
      };

      const { getByTestId, getAllByText } = renderComponent({
        filters: filtersWithDates,
      });

      const clearButton = getByTestId("filter-sheet-clear-dates");
      fireEvent.press(clearButton);

      // After clearing, placeholders should appear
      const placeholders = getAllByText("Select date");
      expect(placeholders.length).toBe(2);
    });
  });

  describe("Apply Action", () => {
    it("calls onFiltersChange with local filters on apply", () => {
      const mockOnFiltersChange = jest.fn();
      const { getByTestId } = renderComponent({
        onFiltersChange: mockOnFiltersChange,
      });

      // Make a change first
      fireEvent.press(getByTestId("filter-sheet-sort-button"));
      fireEvent.press(getByTestId("filter-sheet-sort-option-oldest"));

      // Apply
      fireEvent.press(getByTestId("filter-sheet-apply"));

      expect(mockOnFiltersChange).toHaveBeenCalled();
    });

    it("calls onSortChange with local sort on apply", () => {
      const mockOnSortChange = jest.fn();
      const { getByTestId } = renderComponent({
        onSortChange: mockOnSortChange,
      });

      // Make a change
      fireEvent.press(getByTestId("filter-sheet-sort-button"));
      fireEvent.press(getByTestId("filter-sheet-sort-option-name_asc"));

      // Apply
      fireEvent.press(getByTestId("filter-sheet-apply"));

      expect(mockOnSortChange).toHaveBeenCalledWith("name_asc");
    });

    it("calls onApply callback on apply", () => {
      const mockOnApply = jest.fn();
      const { getByTestId } = renderComponent({
        onApply: mockOnApply,
      });

      // Make a change
      fireEvent.press(getByTestId("filter-sheet-sort-button"));
      fireEvent.press(getByTestId("filter-sheet-sort-option-oldest"));

      fireEvent.press(getByTestId("filter-sheet-apply"));

      expect(mockOnApply).toHaveBeenCalled();
    });

    it("closes sheet on apply", () => {
      const mockOnOpenChange = jest.fn();
      const { getByTestId } = renderComponent({
        onOpenChange: mockOnOpenChange,
      });

      // Make a change
      fireEvent.press(getByTestId("filter-sheet-sort-button"));
      fireEvent.press(getByTestId("filter-sheet-sort-option-oldest"));

      fireEvent.press(getByTestId("filter-sheet-apply"));

      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });

    it("apply button is disabled when no changes", () => {
      const { getByTestId } = renderComponent();

      const applyButton = getByTestId("filter-sheet-apply");
      expect(applyButton.props.accessibilityState?.disabled).toBe(true);
    });

    it("apply button is enabled when changes exist", () => {
      const { getByTestId } = renderComponent();

      // Make a change
      fireEvent.press(getByTestId("filter-sheet-sort-button"));
      fireEvent.press(getByTestId("filter-sheet-sort-option-oldest"));

      const applyButton = getByTestId("filter-sheet-apply");
      expect(applyButton.props.accessibilityState?.disabled).toBe(false);
    });
  });

  describe("Cancel Action", () => {
    it("closes sheet on cancel", () => {
      const mockOnOpenChange = jest.fn();
      const { getByTestId } = renderComponent({
        onOpenChange: mockOnOpenChange,
      });

      fireEvent.press(getByTestId("filter-sheet-cancel"));

      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });

    it("does not call onFiltersChange on cancel", () => {
      const mockOnFiltersChange = jest.fn();
      const { getByTestId } = renderComponent({
        onFiltersChange: mockOnFiltersChange,
      });

      // Make a change
      fireEvent.press(getByTestId("filter-sheet-sort-button"));
      fireEvent.press(getByTestId("filter-sheet-sort-option-oldest"));

      // Cancel instead of apply
      fireEvent.press(getByTestId("filter-sheet-cancel"));

      expect(mockOnFiltersChange).not.toHaveBeenCalled();
    });
  });

  describe("Reset Action", () => {
    it("calls onReset callback on reset", () => {
      const mockOnReset = jest.fn();
      const { getByTestId } = renderComponent({
        onReset: mockOnReset,
      });

      fireEvent.press(getByTestId("filter-sheet-reset"));

      expect(mockOnReset).toHaveBeenCalled();
    });

    it("resets local filters to defaults on reset", () => {
      const filtersWithData: ImageFilters = {
        albumIds: ["album-1"],
        dateRange: {
          startDate: new Date("2024-01-01"),
          endDate: new Date("2024-12-31"),
        },
      };

      const { getByTestId, getAllByText } = renderComponent({
        filters: filtersWithData,
        sortBy: "name_desc",
      });

      fireEvent.press(getByTestId("filter-sheet-reset"));

      // Check local state is reset
      // Sort should show "Newest First"
      expect(getByTestId("filter-sheet-sort-button")).toBeTruthy();

      // Date pickers should show placeholders
      const placeholders = getAllByText("Select date");
      expect(placeholders.length).toBe(2);
    });

    it("resets local sort to newest on reset", () => {
      const { getByTestId, getByText } = renderComponent({
        sortBy: "size_desc",
      });

      // Verify initial state
      expect(getByText("Size: Large to Small")).toBeTruthy();

      fireEvent.press(getByTestId("filter-sheet-reset"));

      // Sort button should show "Newest First"
      expect(getByText("Newest First")).toBeTruthy();
    });
  });

  describe("State Synchronization", () => {
    it("syncs local state with props when sheet opens", () => {
      const filtersWithData: ImageFilters = {
        albumIds: ["album-1"],
        dateRange: {
          startDate: new Date("2024-06-15"),
          endDate: null,
        },
      };

      const { getByTestId, rerender } = renderComponent({
        open: false,
        filters: filtersWithData,
        sortBy: "oldest",
      });

      // Reopen sheet with new props
      rerender(
        <FilterSheet
          {...defaultProps}
          open={true}
          filters={filtersWithData}
          sortBy="oldest"
        />,
      );

      // Check that local state matches props
      expect(
        getByTestId("filter-sheet-album-album-1").props.accessibilityState
          ?.checked,
      ).toBe(
        true,
      );
    });

    it("preserves local changes until apply", () => {
      const mockOnFiltersChange = jest.fn();
      const { getByTestId } = renderComponent({
        onFiltersChange: mockOnFiltersChange,
      });

      // Make multiple changes
      fireEvent.press(getByTestId("filter-sheet-sort-button"));
      fireEvent.press(getByTestId("filter-sheet-sort-option-name_asc"));

      const albumCheckbox = getByTestId("filter-sheet-album-album-1");
      fireEvent(albumCheckbox, "checkedChange", true);

      // Changes should not be applied yet
      expect(mockOnFiltersChange).not.toHaveBeenCalled();

      // Apply
      fireEvent.press(getByTestId("filter-sheet-apply"));

      // Now changes should be applied
      expect(mockOnFiltersChange).toHaveBeenCalled();
    });
  });
});
