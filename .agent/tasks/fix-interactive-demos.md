# Implementation Plan - Fix Interactive Demo Visual Regressions

The user has reported visual issues and "messiness" in three interactive demos embedded in the blog. This plan aims to fix these regressions to ensure a premium, readable, and accessible experience.

## User Feedback & Issues

1.  **DarwinianTreeDemo:**
    *   **Issue:** Animation is too fast (approx. 10ms).
    *   **Status:** Fix applied (switched to time-based 4s loop). Pending verification.
    *   **Earlier Issue:** Layout overlap. Fix applied (scaled tree, moved legend).

2.  **AgentLoopDemo:**
    *   **Issue:** "Really messy", faint lines, hard to see.
    *   **Diagnosis:** Core component uses fixed low stroke widths and small fonts that don't scale well or lack contrast in the blog context.
    *   **Proposed Fix:** Increase stroke weights, arrow sizes, font sizes, and opacity for better visibility.

3.  **ModelCascadeDemo:**
    *   **Issue:** "Weird" layout, overlapping elements. Screenshot shows cards stacking on top of each other with transparency issues.
    *   **Diagnosis:** Lack of Z-index management when cards overlap or hover. The highlight effect likely scales the card without bringing it to the front, or the default spacing is too tight.
    *   **Proposed Fix:** Add explicit z-index handling (hovered/active item gets `z-index: 10`), ensure proper background opacity to prevent "ghosting", and verify layout spacing.

4.  **RecursiveZoomDemo:**
    *   **Issue:** "Animation also broken", text "Infinite Progression" is unreadable due to overlapping layers.
    *   **Diagnosis:** Text opacity/visibility logic is not aggressive enough during the zoom, causing multiple layers of text to be visible simultaneously and overlap.
    *   **Proposed Fix:** Tune the opacity curve in `RecursiveZoomCore` so text fades out completely before the next layer's text becomes prominent.

## Proposed Changes

### 1. `AgentLoopCore.tsx`
- Increase `strokeWidth` for connection lines (2 -> 3 or 4).
- Increase Arrow head radius.
- Increase label `fontSize` and add text shadow/background for contrast.
- Ensure active state highlight is punchy.

### 2. `ModelCascadeCore.tsx`
- Update `map` loop to assign `zIndex`.
- If `highlightIndex` is set, that index gets high Z-index.
- Ensure `GlassmorphismCardCore` background is sufficient to obscure content behind it, or adjust transparency.
- Fix responsiveness of the container if needed.

### 3. `RecursiveZoomCore.tsx`
- Adjust `opacity` calculation for labels.
- Ensure only the "active" or "near-active" layer text is visible.
- Check font sizes and wrapping.

## Verification
- Run existing tests: `yarn test src/components/blog/interactive/CoreComponents.test.tsx`
- Visual check (via reasoning about CSS/SVG properties).

