## 2024-05-23 - [Reference Image Upload Accessibility]

**Learning:** Buttons with `opacity-0` that rely on `group-hover:opacity-100` for visibility are completely invisible to keyboard users when they receive focus.
**Action:** Always pair `group-hover:opacity-100` with `focus:opacity-100` (or `focus-within`) on the element itself to ensure keyboard users can see what they are focusing on.
