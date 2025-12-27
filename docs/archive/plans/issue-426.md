# Implementation Plan for Issue #426: Mobile Experience Optimization

## Summary

Optimize mobile experience by addressing five key areas:

1. Reducing glass-morphism intensity on mobile
2. Improving vertical rhythm and spacing consistency
3. Simplifying left navigation for mobile
4. Strengthening typography contrast for body text
5. Making interactive elements unmistakably interactive

## Current Mobile Styling Analysis

### Glass-morphism (src/app/globals.css)

- `--glass-blur-mobile: var(--glass-blur-sm)` = 4px
- `--glass-opacity-dark-mobile: 0.18` (18% - should be >= 85%)
- Glass tiers have mobile overrides using `@media (min-width: 768px)`

### Typography

- Base font size: 16px (meets AC)
- Dark mode muted-foreground: `220 20% 85%` (needs +10-15% contrast)
- Line-height: 1.6 (good)

### Interactive Elements

| Element          | Current Size       | Target             |
| ---------------- | ------------------ | ------------------ |
| Button (default) | h-11 (44px)        | OK                 |
| Icon button      | h-11 w-11          | OK                 |
| Checkbox         | h-5 w-5 (20px)     | 44x44px tap target |
| Radio            | h-5 w-5 (20px)     | 44x44px tap target |
| Switch           | h-7 w-14 (28x56px) | Needs adjustment   |
| Slider thumb     | h-6 w-6 (24px)     | 44x44px tap target |

### Navigation

- `PlatformHeader.tsx`: Uses bottom Sheet (good)
- `PixelAppHeader.tsx`: Uses bottom Sheet (good)
- `PixelHeader.tsx`: Uses right Sheet (needs bottom sheet)

## CSS Changes

### 1. Glass-morphism (globals.css)

```css
--glass-opacity-dark-mobile: 0.85; /* Change from 0.18 to 0.85 */
--glass-blur-mobile: 3px; /* Reduce from 4px */
```

### 2. Typography Contrast (globals.css)

```css
.dark {
  --muted-foreground: 220 20% 90%; /* Was 85%, increase to 90% */
}
```

### 3. Spacing Utilities (globals.css)

```css
@layer utilities {
  .spacing-mobile-4 {
    padding: 1rem;
  }
  .spacing-mobile-8 {
    padding: 2rem;
  }
  .section-mobile {
    padding-top: 2rem;
    padding-bottom: 2rem;
    @media (min-width: 768px) {
      padding-top: 4rem;
      padding-bottom: 4rem;
    }
  }
}
```

## Component Modifications

### Priority 1: Interactive Elements (Tap Targets)

| Component         | Change                                       |
| ----------------- | -------------------------------------------- |
| checkbox.tsx      | `h-11 w-11 md:h-5 md:w-5` with touch wrapper |
| radio-group.tsx   | `h-11 w-11 md:h-5 md:w-5` with touch wrapper |
| slider.tsx        | Thumb: `h-11 w-11 md:h-6 md:w-6`             |
| switch.tsx        | `h-11 w-16 md:h-7 md:w-14`                   |
| dropdown-menu.tsx | Items: `py-3 md:py-1.5`                      |

### Priority 2: Card and Container Spacing

| Component | Change                                  |
| --------- | --------------------------------------- |
| card.tsx  | CardHeader/Content/Footer: `p-6 md:p-7` |
| sheet.tsx | Add mobile padding: `p-8 md:p-6`        |

### Priority 3: Navigation

- `PixelHeader.tsx`: Change `side="right"` to `side="bottom"`
- Increase nav link touch targets to min 44px height

### Priority 4: Interactive Affordances

- button.tsx: Add elevation change on hover for outline variant
- Add `.tap-target` utility class (44x44px minimum)
- Add `.interactive-feedback` for motion states

## Implementation Phases

1. **CSS Foundation**: Update globals.css variables and utilities
2. **Interactive Elements**: Update checkbox, radio, slider, switch
3. **Layout Components**: Update card, sheet, dialog
4. **Navigation**: Refactor PixelHeader to bottom sheet
5. **Visual Affordances**: Add motion feedback utilities
6. **Testing**: Verify at 320px, 375px, 414px widths

## Questions

1. **Glass opacity trade-off**: 18% → 85% is nearly opaque. Middle ground (60-70%)?
2. **Bottom sheet vs side drawer**: All navigation use bottom sheets consistently?
3. **Checkbox/Radio sizing**: Touch wrapper (larger hit area, smaller visual) vs scaling visible element?
4. **Size variants**: Add `size="touch"` instead of changing defaults?

## Critical Files

- `/src/app/globals.css` - Glass, spacing, contrast updates
- `/src/components/ui/button.tsx` - Tap target verification
- `/src/components/ui/card.tsx` - Spacing consistency
- `/src/components/ui/checkbox.tsx` - 44px tap target pattern
- `/src/components/landing/PixelHeader.tsx` - Bottom sheet refactor
