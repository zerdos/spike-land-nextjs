# Implementation Plan for Issue #428: Improve Tabs Component Visual Distinction

## Summary

Improve the Tabs component to provide clearer visual distinction between active
and inactive states for mobile users. Current implementation has subtle animated
background indicator but lacks sufficient text contrast.

## Current Implementation Analysis

### TabsList (Lines 10-117)

- Animated background indicator moves to highlight active tab
- Uses MutationObserver for state detection
- Styling: `bg-muted/30`, `glass-0`, fixed `h-11`
- Indicator: `bg-white/10`, `shadow-[0_0_15px_rgba(0,229,255,0.15)]`

### TabsTrigger (Lines 120-133)

Current issues:

- **Inactive**: `text-muted-foreground/30` (30% opacity - too low)
- **Active**: `text-primary`, `font-bold`, drop shadow
- No explicit ARIA attributes (relies on Radix defaults)
- Tap target may be insufficient (`px-4 py-2`)

## WCAG Contrast Requirements

- **3:1** for non-text UI components and graphical objects
- **4.5:1** for normal text
- **3:1** for large text (18pt or 14pt bold)

## Proposed Styling Changes

### 1. TabsTrigger - Improved Visual States

**Inactive** (replace `text-muted-foreground/30`):

```css
text-muted-foreground/70  /* Increase from 30% to 70% */
hover:text-muted-foreground
hover:bg-white/5
```

**Active** (enhance current):

```css
data-[state=active]:text-primary
data-[state=active]:font-semibold  /* Use semibold instead of bold */
data-[state=active]:drop-shadow-[0_0_10px_rgba(0,229,255,0.4)]
```

### 2. TabsList - Enhanced Indicator

```css
bg-primary/15  /* Use brand cyan at 15% instead of white/10 */
shadow-[0_0_20px_rgba(0,229,255,0.25)]  /* Stronger glow */
border border-primary/20  /* Add subtle border */
```

### 3. Tap Target Improvements

```css
min-h-[44px]  /* Add minimum height */
px-4 py-2.5  /* Slightly increase vertical padding */
```

## Implementation Phases

### Phase 1: Update TabsTrigger Styles

1. Increase inactive text opacity: 30% → 70%
2. Add hover states
3. Enhance active state visibility
4. Ensure 44px minimum tap target

### Phase 2: Enhance Animated Indicator

1. Change `bg-white/10` to `bg-primary/15`
2. Add border: `border border-primary/20`
3. Enhance glow
4. Add `ease-out` to transition

### Phase 3: Accessibility Verification

1. Verify ARIA attributes (provided by Radix)
2. Test keyboard navigation (Arrow keys, Enter/Space)

### Phase 4: Update Tests

```tsx
it("should have improved visual distinction classes", () => {
  render(<Tabs>...</Tabs>);
  const activeTab = screen.getByRole("tab", { name: "Active Tab" });
  expect(activeTab).toHaveClass("text-muted-foreground/70");
  expect(activeTab).toHaveClass("data-[state=active]:text-primary");
});

it("should have minimum tap target size", () => {
  render(<Tabs>...</Tabs>);
  const tab = screen.getByRole("tab");
  expect(tab).toHaveClass("min-h-[44px]");
});

it("should support keyboard navigation", async () => {
  const user = userEvent.setup();
  // Test arrow key navigation
});
```

## Questions

1. **Light mode**: Verify/adjust contrast ratios for light mode too?
2. **Animation**: Current sliding background vs traditional underline indicator?
3. **Mobile breakpoint**: 44px mobile, 40px desktop like Button?
4. **Usage verification**: Test in ComparisonViewToggle, settings, storybook?

## Critical Files

- `/src/components/ui/tabs.tsx` - Core component styling updates
- `/src/components/ui/tabs.test.tsx` - Add accessibility tests
- `/src/app/globals.css` - Reference for design system colors
- `/src/components/ui/button.tsx` - Pattern for min-h-[44px]
- `/src/app/storybook/components/page.tsx` - Visual testing
