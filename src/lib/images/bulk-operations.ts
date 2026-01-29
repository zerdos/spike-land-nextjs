import prisma from "@/lib/prisma";

/**
 * Bulk Operations Service
 *
 * Provides bulk operations for managing multiple images at once:
 * - Bulk delete with ownership verification
 * - Bulk tag updates (add/remove tags)
 * - Bulk album assignment
 */

const MAX_BULK_SIZE = 100;

/**
 * Result of a bulk operation
 */
export interface BulkOperationResult {
  success: boolean;
  processed: number;
  failed: number;
  errors?: string[];
}

/**
 * Verify that all images belong to the specified user
 * Throws error if any image doesn't belong to the user
 */
async function verifyOwnership(
  imageIds: string[],
  userId: string,
): Promise<void> {
  const images = await prisma.enhancedImage.findMany({
    where: {
      id: { in: imageIds },
    },
    select: {
      id: true,
      userId: true,
    },
  });

  const unauthorizedImages = images.filter(
    (img: { userId: string }) => img.userId !== userId,
  );

  if (unauthorizedImages.length > 0) {
    throw new Error(
      `Unauthorized: ${unauthorizedImages.length} image(s) do not belong to user`,
    );
  }

  if (images.length !== imageIds.length) {
    throw new Error(
      `Not found: ${imageIds.length - images.length} image(s) not found`,
    );
  }
}

/**
 * Bulk delete images
 *
 * @param imageIds - Array of image IDs to delete (max 100)
 * @param userId - The user ID performing the deletion
 * @returns Operation result with counts
 *
 * @throws Error if imageIds exceeds MAX_BULK_SIZE
 * @throws Error if any image doesn't belong to the user
 */
export async function bulkDeleteImages(
  imageIds: string[],
  userId: string,
): Promise<BulkOperationResult> {
  if (imageIds.length === 0) {
    return { success: true, processed: 0, failed: 0 };
  }

  if (imageIds.length > MAX_BULK_SIZE) {
    throw new Error(
      `Bulk operation limited to ${MAX_BULK_SIZE} images at once`,
    );
  }

  // Verify ownership of all images
  await verifyOwnership(imageIds, userId);

  try {
    // Delete images (cascade delete will handle related records)
    const result = await prisma.enhancedImage.deleteMany({
      where: {
        id: { in: imageIds },
        userId, // Additional safety check
      },
    });

    return {
      success: true,
      processed: result.count,
      failed: 0,
    };
  } catch (error) {
    return {
      success: false,
      processed: 0,
      failed: imageIds.length,
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
}

/**
 * Bulk add tags to multiple images
 *
 * @param imageIds - Array of image IDs to update
 * @param tagsToAdd - Array of tags to add (will be normalized)
 * @param userId - The user ID performing the operation
 * @returns Operation result with counts
 */
export async function bulkAddTags(
  imageIds: string[],
  tagsToAdd: string[],
  userId: string,
): Promise<BulkOperationResult> {
  if (imageIds.length === 0 || tagsToAdd.length === 0) {
    return { success: true, processed: 0, failed: 0 };
  }

  if (imageIds.length > MAX_BULK_SIZE) {
    throw new Error(
      `Bulk operation limited to ${MAX_BULK_SIZE} images at once`,
    );
  }

  // Normalize tags
  const normalizedTags = tagsToAdd
    .map((tag) => tag.toLowerCase().trim())
    .filter((tag) => tag.length > 0);

  // Verify ownership
  await verifyOwnership(imageIds, userId);

  const errors: string[] = [];
  let processed = 0;

  // Update each image by adding new tags to existing ones
  for (const imageId of imageIds) {
    try {
      const image = await prisma.enhancedImage.findUnique({
        where: { id: imageId },
        select: { tags: true },
      });

      if (!image) continue;

      // Merge existing tags with new tags (deduplicate)
      const updatedTags = Array.from(
        new Set([...image.tags, ...normalizedTags]),
      );

      await prisma.enhancedImage.update({
        where: { id: imageId },
        data: { tags: updatedTags },
      });

      processed++;
    } catch (error) {
      errors.push(
        `Failed to update image ${imageId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  return {
    success: errors.length === 0,
    processed,
    failed: imageIds.length - processed,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Bulk remove tags from multiple images
 *
 * @param imageIds - Array of image IDs to update
 * @param tagsToRemove - Array of tags to remove
 * @param userId - The user ID performing the operation
 * @returns Operation result with counts
 */
export async function bulkRemoveTags(
  imageIds: string[],
  tagsToRemove: string[],
  userId: string,
): Promise<BulkOperationResult> {
  if (imageIds.length === 0 || tagsToRemove.length === 0) {
    return { success: true, processed: 0, failed: 0 };
  }

  if (imageIds.length > MAX_BULK_SIZE) {
    throw new Error(
      `Bulk operation limited to ${MAX_BULK_SIZE} images at once`,
    );
  }

  // Normalize tags for case-insensitive removal
  const normalizedTagsToRemove = tagsToRemove
    .map((tag) => tag.toLowerCase().trim())
    .filter((tag) => tag.length > 0);

  // Verify ownership
  await verifyOwnership(imageIds, userId);

  const errors: string[] = [];
  let processed = 0;

  // Update each image by removing specified tags
  for (const imageId of imageIds) {
    try {
      const image = await prisma.enhancedImage.findUnique({
        where: { id: imageId },
        select: { tags: true },
      });

      if (!image) continue;

      // Remove specified tags
      const updatedTags = image.tags.filter(
        (tag) => !normalizedTagsToRemove.includes(tag.toLowerCase()),
      );

      await prisma.enhancedImage.update({
        where: { id: imageId },
        data: { tags: updatedTags },
      });

      processed++;
    } catch (error) {
      errors.push(
        `Failed to update image ${imageId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  return {
    success: errors.length === 0,
    processed,
    failed: imageIds.length - processed,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Bulk add images to an album
 *
 * @param imageIds - Array of image IDs to add to album
 * @param albumId - The album ID
 * @param userId - The user ID performing the operation
 * @returns Operation result with counts
 */
export async function bulkAddToAlbum(
  imageIds: string[],
  albumId: string,
  userId: string,
): Promise<BulkOperationResult> {
  if (imageIds.length === 0) {
    return { success: true, processed: 0, failed: 0 };
  }

  if (imageIds.length > MAX_BULK_SIZE) {
    throw new Error(
      `Bulk operation limited to ${MAX_BULK_SIZE} images at once`,
    );
  }

  // Verify album ownership
  const album = await prisma.album.findUnique({
    where: { id: albumId },
    select: { userId: true },
  });

  if (!album) {
    throw new Error("Album not found");
  }

  if (album.userId !== userId) {
    throw new Error("Unauthorized: Album does not belong to user");
  }

  // Verify image ownership
  await verifyOwnership(imageIds, userId);

  try {
    // Get existing album image relationships
    const existing = await prisma.albumImage.findMany({
      where: {
        albumId,
        imageId: { in: imageIds },
      },
      select: { imageId: true },
    });

    const existingImageIds = new Set(existing.map((ai) => ai.imageId));

    // Filter out images already in the album
    const newImageIds = imageIds.filter((id) => !existingImageIds.has(id));

    // Add new album-image relationships
    if (newImageIds.length > 0) {
      await prisma.albumImage.createMany({
        data: newImageIds.map((imageId) => ({
          albumId,
          imageId,
        })),
      });
    }

    return {
      success: true,
      processed: newImageIds.length,
      failed: 0,
    };
  } catch (error) {
    return {
      success: false,
      processed: 0,
      failed: imageIds.length,
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
}

/**
 * Get available tags for a user (tags used in their images)
 *
 * @param userId - The user ID
 * @returns Array of unique tags sorted alphabetically
 */
export async function getUserTags(userId: string): Promise<string[]> {
  const images = await prisma.enhancedImage.findMany({
    where: { userId },
    select: { tags: true },
  });

  // Flatten and deduplicate all tags
  const allTags = images.flatMap((img) => img.tags);
  const uniqueTags = Array.from(new Set(allTags));

  return uniqueTags.sort();
}

/**
 * Rename a tag globally for a user's images
 *
 * @param oldTag - The tag to rename
 * @param newTag - The new tag name
 * @param userId - The user ID
 * @returns Operation result with counts
 */
export async function renameTagGlobally(
  oldTag: string,
  newTag: string,
  userId: string,
): Promise<BulkOperationResult> {
  const normalizedOldTag = oldTag.toLowerCase().trim();
  const normalizedNewTag = newTag.toLowerCase().trim();

  if (!normalizedOldTag || !normalizedNewTag) {
    throw new Error("Tag names cannot be empty");
  }

  if (normalizedOldTag === normalizedNewTag) {
    return { success: true, processed: 0, failed: 0 };
  }

  // Find all images with the old tag
  const images = await prisma.enhancedImage.findMany({
    where: {
      userId,
      tags: { has: normalizedOldTag },
    },
    select: { id: true, tags: true },
  });

  const errors: string[] = [];
  let processed = 0;

  for (const image of images) {
    try {
      // Replace old tag with new tag
      const updatedTags = image.tags.map((tag: string) =>
        tag.toLowerCase() === normalizedOldTag ? normalizedNewTag : tag,
      );

      // Deduplicate in case new tag already exists
      const uniqueTags = Array.from(new Set(updatedTags));

      await prisma.enhancedImage.update({
        where: { id: image.id },
        data: { tags: uniqueTags },
      });

      processed++;
    } catch (error) {
      errors.push(
        `Failed to update image ${image.id}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  return {
    success: errors.length === 0,
    processed,
    failed: images.length - processed,
    errors: errors.length > 0 ? errors : undefined,
  };
}
