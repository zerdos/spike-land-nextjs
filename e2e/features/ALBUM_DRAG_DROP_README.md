# Album Drag and Drop E2E Tests

This document provides comprehensive documentation for the album drag-drop E2E
tests.

## Overview

The album drag-drop functionality allows users to:

- Reorder images within an album by dragging and dropping
- Move images between different albums
- Select multiple images for batch operations
- Cancel drag operations with keyboard shortcuts

## Test Files

### Feature File

- **Location**:
  `/Users/z/Developer/spike-land-nextjs/e2e/features/album-drag-drop.feature`
- **Format**: Gherkin (BDD syntax)
- **Purpose**: Human-readable test scenarios

### Step Definitions

- **Location**:
  `/Users/z/Developer/spike-land-nextjs/e2e/step-definitions/album-drag-drop.steps.ts`
- **Framework**: Playwright + Cucumber
- **Purpose**: Implementation of test steps with Playwright actions

### Unit Tests

- **Location**:
  `/Users/z/Developer/spike-land-nextjs/e2e/step-definitions/album-drag-drop.steps.test.ts`
- **Framework**: Vitest
- **Purpose**: Validate step definition patterns and configuration

## Test Scenarios

### 1. Reorder Images Within Album

**Purpose**: Verify users can change the order of images in an album

**Steps**:

1. Create an album with 3 images
2. Navigate to album detail page
3. Drag first image to third position
4. Verify images are reordered
5. Verify order is saved to server
6. Refresh page and verify order persists

**Data Attributes Used**:

- `div[draggable="true"]` - Identifies draggable image cards
- `data-draggable-photo-card` - Photo card wrapper
- `data-image-id` - Unique image identifier

### 2. Visual Feedback During Drag

**Purpose**: Ensure proper visual feedback during drag operations

**Visual Indicators**:

- Reduced opacity on dragged image
- `cursor-grabbing` cursor during drag
- Ring highlight on drop target (`ring-2 ring-primary`)
- `data-is-dragging="true"` attribute
- `aria-grabbed="true"` accessibility attribute

**Steps**:

1. Start dragging an image
2. Verify dragged image opacity changes
3. Drag over another image
4. Verify drop indicator appears
5. Release drag
6. Verify all indicators are removed

### 3. Drag Multiple Selected Images

**Purpose**: Allow batch reordering of selected images

**Steps**:

1. Create album with 5 images
2. Enable selection mode
3. Select first and second images
4. Disable selection mode
5. Drag one selected image
6. Verify both images move together

**Selection Mode UI**:

- "Select" button to enable
- Checkboxes on each image
- "Select All" / "Deselect All" button
- "Move (n)" button to move selected
- "Remove (n)" button to delete selected
- "Cancel" button to exit selection mode

### 4. Move Images Between Albums

**Purpose**: Transfer images from one album to another

**API Calls**:

1. POST `/api/albums/{targetAlbumId}/images` - Add images to target
2. DELETE `/api/albums/{sourceAlbumId}/images` - Remove from source

**Steps**:

1. Create two albums
2. Add images to first album
3. Navigate to first album
4. Enter selection mode
5. Select image(s)
6. Click "Move" button
7. Select target album from dropdown
8. Confirm move operation
9. Verify image appears in target album
10. Verify image removed from source album
11. Verify image counts updated

### 5. Cancel Drag with Escape Key

**Purpose**: Allow users to cancel drag operations

**Steps**:

1. Start dragging an image
2. Press Escape key
3. Verify drag cancelled
4. Verify images remain in original order

**Keyboard Interaction**:

- `Escape` key cancels drag
- No modifier keys required

### 6. Selection Mode Restrictions

**Purpose**: Prevent drag operations during selection mode

**Steps**:

1. Enter selection mode
2. Verify images not draggable
3. Verify drag handles not visible

**Expected Behavior**:

- `draggable` attribute set to `false` or not present
- Drag handles (GripVertical icons) hidden
- Only checkboxes visible

### 7. Auto-Save with Loading Indicator

**Purpose**: Provide feedback during save operations

**Steps**:

1. Drag image to new position
2. Verify "Saving order..." indicator appears
3. Wait for save to complete
4. Verify indicator disappears

**UI Elements**:

- Loading spinner icon
- "Saving order..." text
- Auto-dismissal on success

### 8. Error Handling and Rollback

**Purpose**: Handle save failures gracefully

**Steps**:

1. Mock API endpoint to return 500 error
2. Drag image to new position
3. Verify error message appears
4. Verify images revert to original order

**Error Recovery**:

- Original order stored in `originalOrderRef`
- Rollback triggered on API failure
- User notified with error toast

### 9. Touch Device Support

**Purpose**: Enable drag-drop on mobile devices

**Configuration**:

```typescript
viewport: { width: 375, height: 667 }
maxTouchPoints: 5
```

**Steps**:

1. Set touch device viewport
2. Perform touch drag gesture
3. Verify images reorder
4. Verify order saved

### 10. Non-Owner Restrictions

**Purpose**: Prevent unauthorized modifications

**Steps**:

1. Create shared album with `isOwner: false`
2. Navigate to album
3. Verify images not draggable
4. Verify no drag handles
5. Verify no selection controls

**Hidden Elements**:

- Drag handles
- "Select" button
- "Move" button
- "Remove" button
- Album settings

## API Mocking

All tests use mocked API responses for deterministic testing:

### Token Balance

```typescript
GET / api / tokens;
Response: {
  balance: 50;
}
```

### Get Album

```typescript
GET /api/albums/{albumId}
Response: {
  album: {
    id, name, description, privacy,
    images: [...], imageCount, isOwner
  }
}
```

### Get All Albums

```typescript
GET / api / albums;
Response: {
  albums: [
    { id, name, imageCount },
  ];
}
```

### Update Image Order

```typescript
PATCH /api/albums/{albumId}/images
Body: { imageOrder: ["image-1", "image-2", ...] }
Response: { success: true }
```

### Add Images to Album

```typescript
POST /api/albums/{albumId}/images
Body: { imageIds: ["image-1", ...] }
Response: {
  success: true,
  added: 1,
  results: [{ imageId, success }]
}
```

### Remove Images from Album

```typescript
DELETE /api/albums/{albumId}/images
Body: { imageIds: ["image-1", ...] }
Response: {
  success: true,
  removed: 1
}
```

## Test Data Structures

### AlbumImage

```typescript
{
  id: string
  name: string
  description: string | null
  originalUrl: string
  enhancedUrl?: string
  enhancementTier?: string
  width: number
  height: number
  sortOrder: number
  createdAt: string
}
```

### Album

```typescript
{
  id: string
  name: string
  description: string | null
  privacy: "PRIVATE" | "UNLISTED" | "PUBLIC"
  coverImageId: string | null
  shareToken?: string
  imageCount: number
  isOwner: boolean
  images: AlbumImage[]
  createdAt: string
  updatedAt: string
}
```

## Running the Tests

### Local Development

```bash
# Start dev server
yarn dev

# Run all E2E tests
yarn test:e2e:local

# Run specific feature
yarn test:e2e:local --name "Album Drag and Drop"
```

### CI/CD Pipeline

```bash
# Tests run against deployed preview URL
yarn test:e2e:ci
```

## Playwright Actions Used

### Drag and Drop

```typescript
await firstCard.dragTo(thirdCard, {
  force: true,
  targetPosition: { x: 10, y: 10 },
});
```

### Manual Drag Simulation

```typescript
await page.mouse.move(x, y);
await page.mouse.down();
await page.mouse.move(newX, newY);
await page.mouse.up();
```

### Click and Select

```typescript
await page.getByRole("button", { name: /select/i }).click();
await page.locator('input[type="checkbox"]').check();
```

### Keyboard Interaction

```typescript
await page.keyboard.press("Escape");
```

## Selectors and Locators

### Image Cards

- `div[draggable="true"]` - Draggable wrapper
- `[data-draggable-photo-card]` - Photo card component
- `[data-image-id]` - Image identifier
- `[data-is-dragging="true"]` - Currently dragging

### Selection Mode

- `button:has-text("Select")` - Enable selection mode
- `input[type="checkbox"]` - Image checkboxes
- `button:has-text("Select All")` - Bulk select
- `button:has-text("Move (")` - Move selected
- `button:has-text("Remove (")` - Delete selected

### Visual Feedback

- `.cursor-grabbing` - Active drag cursor
- `.ring-2.ring-primary` - Drop target highlight
- `[aria-grabbed="true"]` - Accessibility state

## Timeouts and Waits

- **Short wait**: 100ms - After mouse movements
- **Medium wait**: 200-300ms - After UI interactions
- **Long wait**: 500ms - After API calls
- **Visibility timeout**: 5000ms - For element appearance
- **Network idle**: After page navigation

## Authentication

Tests use E2E auth bypass:

```typescript
Given("I am logged in as a test user");
// Sets auth cookie and mocks session endpoint
```

## Coverage

### Feature Coverage

- ✅ Reorder within album
- ✅ Visual drag feedback
- ✅ Multi-select drag
- ✅ Move between albums
- ✅ Cancel operations
- ✅ Selection mode restrictions
- ✅ Auto-save feedback
- ✅ Error handling
- ✅ Touch device support
- ✅ Permission enforcement

### Component Coverage

- AlbumDetailClient (drag handlers)
- DraggablePhotoCard (drag source)
- DroppableAlbum (drop target)
- DragDropContext (state management)

## Troubleshooting

### Tests Failing Locally

1. **Dev server not running**
   ```bash
   yarn dev
   ```

2. **Port conflict**
   - Check localhost:3000 is available
   - Update BASE_URL in env

3. **Browser not installed**
   ```bash
   yarn dlx playwright install chromium
   ```

### Flaky Tests

- Increase timeout values
- Add explicit waits
- Check for network race conditions
- Verify mock data consistency

### CI/CD Failures

- Check deployment URL is accessible
- Verify E2E_BYPASS_SECRET configured
- Review screenshot artifacts
- Check test report HTML

## Related Files

### Implementation

- `/Users/z/Developer/spike-land-nextjs/src/app/albums/[id]/AlbumDetailClient.tsx`
- `/Users/z/Developer/spike-land-nextjs/src/components/enhance/DraggablePhotoCard.tsx`
- `/Users/z/Developer/spike-land-nextjs/src/components/enhance/DroppableAlbum.tsx`

### API Routes

- `/Users/z/Developer/spike-land-nextjs/src/app/api/albums/[id]/route.ts`
- `/Users/z/Developer/spike-land-nextjs/src/app/api/albums/[id]/images/route.ts`

### Other E2E Tests

- `album-photo-addition.feature` - Adding photos to albums
- `batch-operations.feature` - Batch enhancement
- `image-enhancement.feature` - Single image enhancement

## Best Practices

1. **Use data-testid for stable selectors**
   ```tsx
   <div data-testid="album-image-card-{imageId}">
   ```

2. **Wait for network idle after navigation**
   ```typescript
   await page.waitForLoadState("networkidle");
   ```

3. **Explicit waits for async operations**
   ```typescript
   await page.waitForTimeout(500);
   ```

4. **Mock all API responses**
   - Prevents external dependencies
   - Ensures deterministic tests
   - Faster execution

5. **Test both happy and error paths**
   - Successful operations
   - API failures
   - Permission denied
   - Invalid input

## Future Enhancements

- [ ] Test drag preview customization
- [ ] Test keyboard-only navigation
- [ ] Test screen reader announcements
- [ ] Test very large albums (100+ images)
- [ ] Test concurrent user edits
- [ ] Test undo/redo functionality
- [ ] Test drag across multiple pages
- [ ] Test nested album structures
