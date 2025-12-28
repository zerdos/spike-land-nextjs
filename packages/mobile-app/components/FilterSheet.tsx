/**
 * FilterSheet Component
 * Bottom sheet with filter options for gallery images
 */

import type { Album } from "@spike-npm-land/shared";
import { Calendar, Check, ChevronDown, RotateCcw } from "@tamagui/lucide-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet } from "react-native";
import {
  Button,
  Checkbox,
  Label,
  ScrollView,
  Separator,
  Sheet,
  Text,
  XStack,
  YStack,
} from "tamagui";

import {
  type DateRange,
  getSortLabel,
  type ImageFilters,
  type SortOption,
} from "../hooks/useImageSearch";

// ============================================================================
// Types
// ============================================================================

export interface FilterSheetProps {
  /** Whether the sheet is open */
  open: boolean;
  /** Callback when sheet open state changes */
  onOpenChange: (open: boolean) => void;
  /** Current filters */
  filters: ImageFilters;
  /** Callback when filters change */
  onFiltersChange: (filters: Partial<ImageFilters>) => void;
  /** Current sort option */
  sortBy: SortOption;
  /** Callback when sort option changes */
  onSortChange: (sortBy: SortOption) => void;
  /** Available albums for filtering */
  albums: Album[];
  /** Callback when apply is pressed */
  onApply: () => void;
  /** Callback when reset is pressed */
  onReset: () => void;
  /** Test ID for testing */
  testID?: string;
}

// ============================================================================
// Constants
// ============================================================================

const SORT_OPTIONS: { value: SortOption; label: string; }[] = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "name_asc", label: "Name A-Z" },
  { value: "name_desc", label: "Name Z-A" },
  { value: "size_asc", label: "Size: Small to Large" },
  { value: "size_desc", label: "Size: Large to Small" },
];

const SNAP_POINTS = [70, 50];

// ============================================================================
// Date Picker Placeholder Component
// In a real app, this would use a proper date picker library
// ============================================================================

interface DatePickerButtonProps {
  label: string;
  value: Date | null;
  onPress: () => void;
  testID?: string;
}

function DatePickerButton({ label, value, onPress, testID }: DatePickerButtonProps) {
  const displayValue = value
    ? value.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
    : "Select date";

  return (
    <Button
      size="$3"
      chromeless
      onPress={onPress}
      testID={testID}
      borderWidth={1}
      borderColor="$borderColor"
      justifyContent="flex-start"
      paddingHorizontal="$3"
    >
      <XStack flex={1} alignItems="center" gap="$2">
        <Calendar size={16} color="$gray10" />
        <YStack flex={1}>
          <Text fontSize="$1" color="$gray9">
            {label}
          </Text>
          <Text fontSize="$3" color={value ? "$color" : "$gray10"}>
            {displayValue}
          </Text>
        </YStack>
      </XStack>
    </Button>
  );
}

// ============================================================================
// Component
// ============================================================================

export function FilterSheet({
  open,
  onOpenChange,
  filters,
  onFiltersChange,
  sortBy,
  onSortChange,
  albums,
  onApply,
  onReset,
  testID = "filter-sheet",
}: FilterSheetProps) {
  // Local state for temporary changes
  const [localFilters, setLocalFilters] = useState<ImageFilters>(filters);
  const [localSortBy, setLocalSortBy] = useState<SortOption>(sortBy);
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  // Sync local state with props when sheet opens
  useEffect(() => {
    if (open) {
      setLocalFilters(filters);
      setLocalSortBy(sortBy);
    }
  }, [open, filters, sortBy]);

  // Handle album toggle
  const handleAlbumToggle = useCallback((albumId: string, checked: boolean) => {
    setLocalFilters((prev) => {
      const newAlbumIds = checked
        ? [...prev.albumIds, albumId]
        : prev.albumIds.filter((id) => id !== albumId);

      return {
        ...prev,
        albumIds: newAlbumIds,
      };
    });
  }, []);

  // Handle date change
  const handleDateChange = useCallback((field: keyof DateRange, date: Date | null) => {
    setLocalFilters((prev) => ({
      ...prev,
      dateRange: {
        ...prev.dateRange,
        [field]: date,
      },
    }));
  }, []);

  // Handle sort change
  const handleSortChange = useCallback((newSortBy: SortOption) => {
    setLocalSortBy(newSortBy);
    setShowSortDropdown(false);
  }, []);

  // Handle apply
  const handleApply = useCallback(() => {
    onFiltersChange(localFilters);
    onSortChange(localSortBy);
    onApply();
    onOpenChange(false);
  }, [localFilters, localSortBy, onFiltersChange, onSortChange, onApply, onOpenChange]);

  // Handle reset
  const handleReset = useCallback(() => {
    const defaultFilters: ImageFilters = {
      albumIds: [],
      dateRange: {
        startDate: null,
        endDate: null,
      },
    };
    setLocalFilters(defaultFilters);
    setLocalSortBy("newest");
    onReset();
  }, [onReset]);

  // Clear start date
  const handleClearStartDate = useCallback(() => {
    handleDateChange("startDate", null);
  }, [handleDateChange]);

  // Clear end date
  const handleClearEndDate = useCallback(() => {
    handleDateChange("endDate", null);
  }, [handleDateChange]);

  // Set start date to a mock value (in real app, would open date picker)
  const handleSelectStartDate = useCallback(() => {
    // In a real app, this would open a date picker
    // For now, set to 30 days ago as a demo
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    handleDateChange("startDate", thirtyDaysAgo);
  }, [handleDateChange]);

  // Set end date to a mock value (in real app, would open date picker)
  const handleSelectEndDate = useCallback(() => {
    // In a real app, this would open a date picker
    // For now, set to today as a demo
    handleDateChange("endDate", new Date());
  }, [handleDateChange]);

  // Check if any filters have changed
  const hasChanges = useMemo(() => {
    const filtersChanged = JSON.stringify(localFilters) !== JSON.stringify(filters);
    const sortChanged = localSortBy !== sortBy;
    return filtersChanged || sortChanged;
  }, [localFilters, filters, localSortBy, sortBy]);

  // Count selected albums
  const selectedAlbumCount = localFilters.albumIds.length;

  // Check if date range is set
  const hasDateRange = localFilters.dateRange.startDate !== null ||
    localFilters.dateRange.endDate !== null;

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      snapPoints={SNAP_POINTS}
      dismissOnSnapToBottom
      modal
    >
      <Sheet.Overlay
        animation="lazy"
        enterStyle={{ opacity: 0 }}
        exitStyle={{ opacity: 0 }}
      />

      <Sheet.Frame
        testID={testID}
        padding="$4"
        backgroundColor="$background"
      >
        <Sheet.Handle />

        {/* Header */}
        <XStack
          justifyContent="space-between"
          alignItems="center"
          paddingTop="$2"
          paddingBottom="$4"
        >
          <Text fontSize="$6" fontWeight="600">
            Filters
          </Text>
          <Button
            size="$3"
            chromeless
            icon={RotateCcw}
            onPress={handleReset}
            testID={`${testID}-reset`}
          >
            Reset
          </Button>
        </XStack>

        <ScrollView flex={1} showsVerticalScrollIndicator={false}>
          <YStack gap="$4">
            {/* Sort By Section */}
            <YStack gap="$2">
              <Text fontSize="$4" fontWeight="500" color="$gray11">
                Sort By
              </Text>
              <Button
                size="$4"
                onPress={() => setShowSortDropdown(!showSortDropdown)}
                testID={`${testID}-sort-button`}
                iconAfter={ChevronDown}
                justifyContent="space-between"
              >
                <Text>{getSortLabel(localSortBy)}</Text>
              </Button>

              {showSortDropdown && (
                <YStack
                  backgroundColor="$gray2"
                  borderRadius="$3"
                  overflow="hidden"
                  borderWidth={1}
                  borderColor="$borderColor"
                  testID={`${testID}-sort-dropdown`}
                >
                  {SORT_OPTIONS.map((option) => (
                    <Button
                      key={option.value}
                      size="$4"
                      chromeless
                      onPress={() => handleSortChange(option.value)}
                      testID={`${testID}-sort-option-${option.value}`}
                      backgroundColor={localSortBy === option.value ? "$blue2" : "transparent"}
                      justifyContent="flex-start"
                      borderRadius={0}
                    >
                      <XStack flex={1} justifyContent="space-between" alignItems="center">
                        <Text>{option.label}</Text>
                        {localSortBy === option.value && <Check size={16} color="$blue10" />}
                      </XStack>
                    </Button>
                  ))}
                </YStack>
              )}
            </YStack>

            <Separator />

            {/* Album Filter Section */}
            <YStack gap="$2">
              <XStack justifyContent="space-between" alignItems="center">
                <Text fontSize="$4" fontWeight="500" color="$gray11">
                  Albums
                </Text>
                {selectedAlbumCount > 0 && (
                  <Text fontSize="$2" color="$blue10">
                    {selectedAlbumCount} selected
                  </Text>
                )}
              </XStack>

              {albums.length === 0
                ? (
                  <Text fontSize="$3" color="$gray9" paddingVertical="$2">
                    No albums available
                  </Text>
                )
                : (
                  <YStack gap="$2">
                    {albums.map((album) => {
                      const isChecked = localFilters.albumIds.includes(album.id);
                      return (
                        <XStack
                          key={album.id}
                          alignItems="center"
                          gap="$3"
                          paddingVertical="$1"
                        >
                          <Checkbox
                            id={`album-${album.id}`}
                            checked={isChecked}
                            onCheckedChange={(checked) =>
                              handleAlbumToggle(album.id, checked as boolean)}
                            testID={`${testID}-album-${album.id}`}
                          >
                            <Checkbox.Indicator>
                              <Check size={14} />
                            </Checkbox.Indicator>
                          </Checkbox>
                          <Label
                            htmlFor={`album-${album.id}`}
                            flex={1}
                            pressStyle={{ opacity: 0.7 }}
                          >
                            <Text fontSize="$4">{album.name}</Text>
                          </Label>
                        </XStack>
                      );
                    })}
                  </YStack>
                )}
            </YStack>

            <Separator />

            {/* Date Range Section */}
            <YStack gap="$2">
              <XStack justifyContent="space-between" alignItems="center">
                <Text fontSize="$4" fontWeight="500" color="$gray11">
                  Date Range
                </Text>
                {hasDateRange && (
                  <Button
                    size="$2"
                    chromeless
                    onPress={() => {
                      handleClearStartDate();
                      handleClearEndDate();
                    }}
                    testID={`${testID}-clear-dates`}
                  >
                    <Text fontSize="$2" color="$red10">
                      Clear
                    </Text>
                  </Button>
                )}
              </XStack>

              <XStack gap="$2">
                <YStack flex={1}>
                  <DatePickerButton
                    label="From"
                    value={localFilters.dateRange.startDate}
                    onPress={handleSelectStartDate}
                    testID={`${testID}-start-date`}
                  />
                </YStack>
                <YStack flex={1}>
                  <DatePickerButton
                    label="To"
                    value={localFilters.dateRange.endDate}
                    onPress={handleSelectEndDate}
                    testID={`${testID}-end-date`}
                  />
                </YStack>
              </XStack>
            </YStack>
          </YStack>
        </ScrollView>

        {/* Action Buttons */}
        <XStack gap="$3" paddingTop="$4">
          <Button
            flex={1}
            size="$4"
            chromeless
            onPress={() => onOpenChange(false)}
            testID={`${testID}-cancel`}
            borderWidth={1}
            borderColor="$borderColor"
          >
            Cancel
          </Button>
          <Button
            flex={1}
            size="$4"
            theme="blue"
            onPress={handleApply}
            testID={`${testID}-apply`}
            disabled={!hasChanges}
            opacity={hasChanges ? 1 : 0.5}
          >
            Apply
          </Button>
        </XStack>
      </Sheet.Frame>
    </Sheet>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  // Reserved for future use
});

export default FilterSheet;
