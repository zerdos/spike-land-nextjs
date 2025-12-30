# Implementation Plan for Issue #410: Extract Custom Hooks from AlbumDetailClient.tsx

## Summary

GitHub Issue #410 requests extracting the 25+ useState hooks from
`AlbumDetailClient.tsx` into 5 reusable custom hooks. The goal is to improve
code maintainability, testability, and reusability while maintaining 100% test
coverage.

**Note**: The issue mentions 27 useState hooks, but analysis identified 25
useState calls (plus 1 call to existing `useZoomLevel` hook).

## Hook Grouping Analysis

### Current State Distribution

| Hook Category     | # of useState | Related Functions                                          |
| ----------------- | ------------- | ---------------------------------------------------------- |
| Album Data & CRUD | 6             | fetchAlbum, handleSaveSettings, handleDeleteAlbum          |
| Edit Form         | 4             | Part of album settings                                     |
| Selection Mode    | 2             | toggleSelectAll, toggleImageSelection, exitSelectionMode   |
| Reorder Drag-Drop | 3             | handleDragStart, handleDragOver, handleDrop                |
| Blend Drag-Drop   | 3             | handleBlendDragStart, handleBlendDragOver, handleBlendDrop |
| Move Dialog       | 5             | fetchAllAlbums, openMoveDialog, handleMoveImages           |
| File Upload       | 1             | handleFileDragEnter, handleFileDrop                        |
| Other             | 2             | showQRSheet, displayType                                   |

## Proposed Custom Hooks

### 1. `useAlbumData(albumId: string)`

- Album fetching, CRUD operations, settings state
- Returns: album, isLoading, error, showSettings, isSaving, copied, editState,
  saveSettings, deleteAlbum

### 2. `useImageSelection(images: AlbumImage[])`

- Selection mode and selected images set
- Returns: isSelectionMode, selectedImages, toggleSelectAll,
  toggleImageSelection, exitSelectionMode

### 3. `useImageReorder(albumId: string)`

- Drag-drop reordering
- Returns: draggedImageId, dragOverImageId, isSavingOrder, drag handlers

### 4. `useBlendDragDrop(albumId: string)`

- Blend operations
- Returns: blendDragSourceId, blendDropTargetId, blendingImageId, blend handlers

### 5. `useMoveToAlbum(currentAlbumId: string)`

- Move dialog and operations
- Returns: showMoveDialog, allAlbums, selectedTargetAlbum, isMoving, moveImages

### 6. `useFileDragDrop()` (Bonus)

- File upload drag state
- Returns: isDraggingFiles, dragProps, fileInputRef

## Implementation Phases

### Phase 1: Create Hooks Directory and Types

1. Create directory: `src/app/albums/[id]/hooks/`
2. Create shared types file: `types.ts`
3. Create index file for exports

### Phase 2: Implement Hooks (dependency order)

1. `useImageSelection.ts` + tests
2. `useImageReorder.ts` + tests
3. `useBlendDragDrop.ts` + tests
4. `useMoveToAlbum.ts` + tests
5. `useFileDragDrop.ts` + tests
6. `useAlbumData.ts` + tests

### Phase 3: Update AlbumDetailClient

1. Import all new hooks
2. Replace individual useState calls
3. Update handler references

### Phase 4: Testing

1. Ensure each hook has comprehensive unit tests
2. Run `yarn test:coverage` for 100% coverage
3. Update existing AlbumDetailClient tests

## File Structure After Implementation

```
src/app/albums/[id]/
├── AlbumDetailClient.tsx (refactored)
├── hooks/
│   ├── index.ts
│   ├── types.ts
│   ├── useAlbumData.ts
│   ├── useAlbumData.test.ts
│   ├── useImageSelection.ts
│   ├── useImageSelection.test.ts
│   ├── useImageReorder.ts
│   ├── useImageReorder.test.ts
│   ├── useBlendDragDrop.ts
│   ├── useBlendDragDrop.test.ts
│   ├── useMoveToAlbum.ts
│   ├── useMoveToAlbum.test.ts
│   ├── useFileDragDrop.ts
│   └── useFileDragDrop.test.ts
└── page.tsx
```

## Questions

1. **Hook Count Discrepancy**: Issue mentions 27 hooks, found 25. Proceed with
   25?
2. **QR Sheet State**: Keep in component or add to useAlbumData?
3. **View Controls**: Combine displayType + useZoomLevel into useViewControls?
4. **Location**: Local to album page or promoted to `src/hooks/`?

## Critical Files

- `/src/app/albums/[id]/AlbumDetailClient.tsx` - Source component (1,287 lines)
- `/src/hooks/useMultiFileUpload.ts` - Pattern to follow
- `/src/hooks/useDragDropPhotos.ts` - Reference for drag-drop patterns
- `/src/hooks/useUserAlbums.ts` - Pattern for data fetching
