/**
 * Mock for tamagui
 */

import React from "react";
import { Image, Pressable, ScrollView, Text, TextInput, View } from "react-native";

// Create mock components that pass through to React Native equivalents
const createMockComponent = (name: string, Component: React.ComponentType<any> = View) => {
  const MockComponent = React.forwardRef((props: Record<string, any>, ref: any) => {
    return React.createElement(Component, { ...props, ref, testID: props.testID || name });
  });
  MockComponent.displayName = name;
  return MockComponent;
};

// Core styled components
export const Stack = createMockComponent("Stack");
export const XStack = createMockComponent("XStack");
export const YStack = createMockComponent("YStack");
export const ZStack = createMockComponent("ZStack");

// Text components
export const SizableText = createMockComponent("SizableText", Text as any);
export const Paragraph = createMockComponent("Paragraph", Text as any);
export const Heading = createMockComponent("Heading", Text as any);
export const H1 = createMockComponent("H1", Text as any);
export const H2 = createMockComponent("H2", Text as any);
export const H3 = createMockComponent("H3", Text as any);
export const H4 = createMockComponent("H4", Text as any);
export const H5 = createMockComponent("H5", Text as any);
export const H6 = createMockComponent("H6", Text as any);
export const Label = createMockComponent("Label", Text as any);

// Input components
export const Input = createMockComponent("Input", TextInput as any);
export const TextArea = createMockComponent("TextArea", TextInput as any);

// Interactive components
export const Button = createMockComponent("Button", Pressable);
export const TamaguiPressable = createMockComponent("Pressable", Pressable);
export const Checkbox = createMockComponent("Checkbox");
export const RadioGroup = createMockComponent("RadioGroup");
export const Slider = createMockComponent("Slider");
export const Switch = createMockComponent("Switch");
export const Select = createMockComponent("Select");

// Container components
export const Card = createMockComponent("Card");
export const ListItem = createMockComponent("ListItem");
export const Separator = createMockComponent("Separator");
export const Sheet = createMockComponent("Sheet");
export const Dialog = createMockComponent("Dialog");
export const Popover = createMockComponent("Popover");
export const Tooltip = createMockComponent("Tooltip");
export const Tabs = createMockComponent("Tabs");

// Media components
export const TamaguiImage = createMockComponent("Image", Image as any);
export const Avatar = createMockComponent("Avatar");

// Layout components
export const ScrollViewBase = createMockComponent("ScrollView", ScrollView as any);
export const Spinner = createMockComponent("Spinner");
export const Progress = createMockComponent("Progress");

// Form components
export const Form = createMockComponent("Form");
export const Group = createMockComponent("Group");
export const FieldGroup = createMockComponent("FieldGroup");

// Theme components
export const Theme = ({ children }: { children: React.ReactNode; }) => children;
export const ThemeProvider = ({ children }: { children: React.ReactNode; }) => children;

// Animation
export const AnimatePresence = ({ children }: { children: React.ReactNode; }) => children;

// Hooks
export const useTheme = jest.fn(() => ({
  background: "#000000",
  color: "#ffffff",
  primary: "#00E5FF",
  secondary: "#FF6B35",
}));

export const useMedia = jest.fn(() => ({
  sm: false,
  md: true,
  lg: false,
  xl: false,
}));

export const useThemeName = jest.fn(() => "dark");

// Styling utilities
export const styled = (Component: any) => {
  const StyledComponent = React.forwardRef((props: Record<string, any>, ref: any) => {
    return React.createElement(Component, { ...props, ref });
  });
  StyledComponent.displayName = `styled(${Component.displayName || Component.name || "Component"})`;
  return StyledComponent;
};

export const getTokens = jest.fn(() => ({
  color: {},
  space: {},
  size: {},
  radius: {},
  zIndex: {},
}));

export const getToken = jest.fn((_name: string, fallback?: any) => fallback);
export const getVariable = jest.fn((_name: string, fallback?: any) => fallback);
export const getVariableValue = jest.fn((_name: string, fallback?: any) => fallback);

// Config utilities
export const createTamagui = jest.fn((config: any) => config);
export const TamaguiProvider = ({ children }: { children: React.ReactNode; }) => children;

// Default export
export default {
  Stack,
  XStack,
  YStack,
  ZStack,
  SizableText,
  Paragraph,
  Heading,
  H1,
  H2,
  H3,
  H4,
  H5,
  H6,
  Label,
  Input,
  TextArea,
  Button,
  Card,
  Sheet,
  Dialog,
  Theme,
  ThemeProvider,
  AnimatePresence,
  useTheme,
  useMedia,
  useThemeName,
  styled,
  createTamagui,
  TamaguiProvider,
};
