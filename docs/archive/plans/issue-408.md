# Implementation Plan for Issue #408: Refactor AlbumDetailClient.tsx (1287 lines)

## Summary

The `AlbumDetailClient.tsx` file (1,287 lines) contains 25 useState hooks that should be extracted into custom hooks and components. This plan documents all hooks and proposes a refactoring strategy.

## All 25 useState Hooks (Lines 101-146)

### 1. Album Data State (6 hooks)

- `album` (Line 101) - Main album data
- `isLoading` (Line 102) - Loading state
- `error` (Line 103) - Error state
- `showSettings` (Line 104) - Settings dialog visibility
- `isSaving` (Line 105) - Saving state
- `copied` (Line 106) - Clipboard copy feedback

### 2. Edit Form State (4 hooks)

- `editName`, `editDescription`, `editPrivacy`, `editPipelineId`

### 3. Selection Mode State (2 hooks)

- `isSelectionMode`, `selectedImages`

### 4. Reorder Drag & Drop State (3 hooks)

- `draggedImageId`, `dragOverImageId`, `isSavingOrder`

### 5. Blend Drag-Drop State (3 hooks)

- `blendDragSourceId`, `blendDropTargetId`, `blendingImageId`

### 6. Move to Album Dialog State (5 hooks)

- `showMoveDialog`, `allAlbums`, `selectedTargetAlbum`, `isMoving`, `isLoadingAlbums`

### 7. Other State (2 hooks)

- `showQRSheet`, `isDraggingFiles`

## Proposed Custom Hooks

1. **`useAlbumData(albumId)`** - Album fetching, CRUD, settings
2. **`useImageSelection()`** - Selection mode and selected images
3. **`useImageReorder(albumId)`** - Drag-drop reordering
4. **`useBlendDragDrop(albumId)`** - Blend operations
5. **`useMoveToAlbum(albumId)`** - Move dialog and operations
6. **`useFileDragDrop()`** - File upload drag state

## Proposed Components

1. **`AlbumHeader`** - Title, description, action buttons
2. **`AlbumImageCard`** - Single image with all states
3. **`ImageSelectionToolbar`** - Selection mode controls
4. **`AlbumSettingsDialog`** - Settings form
5. **`MoveToAlbumDialog`** - Move dialog
6. **`AlbumImageGrid`** - Masonry grid
7. **`AlbumEmptyState`** - Empty state
8. **`FileUploadOverlay`** - Drag overlay

## Implementation Order

### Week 1: Core Hooks

- `useAlbumData` + tests
- `useAlbumEditForm` + tests
- `useImageSelection` + tests

### Week 2: Drag-Drop Hooks

- `useImageReorder` + tests
- `useBlendDragDrop` + tests
- `useFileDragDrop` + tests
- `useMoveToAlbum` + tests

### Week 3: Components

- `AlbumHeader` + tests
- `AlbumImageCard` + tests
- `ImageSelectionToolbar` + tests

### Week 4: Dialogs and Integration

- Dialog components + tests
- Integration into refactored `AlbumDetailClient`
- Memoization optimization

## Questions

1. **Hook Count Discrepancy**: Issue mentions 27 hooks, I found 25. Proceed with 25?
2. **QR Sheet State**: Keep in component or add to `useAlbumData`?
3. **View Controls**: Combine `displayType` + `zoomLevel` into `useViewControls`?
4. **Location**: Local to album page or promoted to `src/hooks/`?

## Critical Files

- `/src/app/albums/[id]/AlbumDetailClient.tsx` - Source component (1,287 lines)
- `/src/hooks/useDragDropPhotos.ts` - Pattern to follow for drag-drop
- `/src/hooks/useMultiFileUpload.ts` - Pattern for upload state
- `/src/hooks/useUserAlbums.ts` - Pattern for data fetching
