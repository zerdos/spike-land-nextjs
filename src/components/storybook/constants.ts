import {
  Accessibility,
  Bell,
  Component,
  LayoutGrid,
  Loader,
  MousePointerClick,
  Palette,
  PanelTop,
  Sparkles,
  SplitSquareHorizontal,
  Table2,
  Type,
} from "lucide-react";

export const storybookIconMap = {
  Sparkles,
  Palette,
  Type,
  MousePointerClick,
  Component,
  SplitSquareHorizontal,
  Bell,
  Loader,
  PanelTop,
  Accessibility,
  Table2,
  LayoutGrid,
};

export const colorPalette = {
  brand: [
    {
      name: "Pixel Cyan",
      var: "--pixel-cyan",
      hex: "#00E5FF",
      desc: "Primary brand accent colors",
      role: "Primary",
      contrastPass: true,
    },
    {
      name: "Pixel Fuchsia",
      var: "--pixel-fuchsia",
      hex: "#FF00FF",
      desc: "Secondary accent",
      role: "Secondary",
      contrastPass: true,
    },
  ],
  dark: [
    {
      name: "Surface Blue",
      var: "--surface-blue",
      hex: "#112244",
      desc: "Card backgrounds",
    },
    {
      name: "Border",
      var: "--border-dark",
      hex: "#221144",
      desc: "Primary borders",
    },
    {
      name: "Border Item",
      var: "--border-item",
      hex: "#222244",
      desc: "Item borders",
    },
    {
      name: "Deep Space",
      var: "--background",
      hex: "#08081C",
      desc: "Dark background",
    },
    {
      name: "Text Muted",
      var: "--muted-foreground",
      hex: "#A0A0C0",
      desc: "Secondary text",
    },
  ],
  light: [
    {
      name: "Clean White",
      var: "--background",
      hex: "#FFFFFF",
      desc: "Light background",
    },
    {
      name: "Light Surface",
      var: "--card",
      hex: "#F4F6F8",
      desc: "Light cards",
    },
    {
      name: "Carbon Text",
      var: "--foreground",
      hex: "#12121C",
      desc: "Primary text",
    },
    {
      name: "Grid Grey",
      var: "--border",
      hex: "#DCE0E8",
      desc: "Light borders",
    },
  ],
};

export const logoSizes = ["sm", "md", "lg", "xl"] as const;
export const logoVariants = ["icon", "horizontal", "stacked"] as const;
export const buttonVariants = [
  "default",
  "secondary",
  "outline",
  "ghost",
  "destructive",
  "link",
] as const;
export const buttonSizes = ["sm", "default", "lg", "icon"] as const;

export const storybookSections = [
  {
    id: "brand",
    label: "Brand",
    description: "Logo variants, sizes, and the Pixel AI Spark logo",
    icon: "Sparkles",
  },
  {
    id: "colors",
    label: "Colors",
    description: "Color palette, brand colors, dark/light modes, glow effects",
    icon: "Palette",
  },
  {
    id: "typography",
    label: "Typography",
    description: "Font families, heading scale, text colors",
    icon: "Type",
  },
  {
    id: "buttons",
    label: "Buttons",
    description: "Button variants, sizes, states, loading indicators",
    icon: "MousePointerClick",
  },
  {
    id: "components",
    label: "Components",
    description: "Cards, badges, inputs, accordion, tabs, textarea, tooltip, slider",
    icon: "Component",
  },
  {
    id: "data-display",
    label: "Data Display",
    description: "Tables, toggle groups, and copy buttons",
    icon: "Table2",
  },
  {
    id: "layout",
    label: "Layout",
    description: "Masonry grid, text overlays, and zoom controls",
    icon: "LayoutGrid",
  },
  {
    id: "comparison",
    label: "Comparison",
    description: "Image comparison slider, comparison view toggle",
    icon: "SplitSquareHorizontal",
  },
  {
    id: "feedback",
    label: "Feedback",
    description: "Toast notifications, alerts, semantic state colors",
    icon: "Bell",
  },
  {
    id: "loading",
    label: "Loading",
    description: "Skeleton loaders, progress bars, spinners/animations",
    icon: "Loader",
  },
  {
    id: "modals",
    label: "Modals",
    description: "Dialogs, dropdown menus, sheets, alert dialogs",
    icon: "PanelTop",
  },
  {
    id: "accessibility",
    label: "Accessibility",
    description: "Contrast checker, keyboard navigation, ARIA attributes",
    icon: "Accessibility",
  },
] as const;

export type StorybookSectionId = (typeof storybookSections)[number]["id"];
