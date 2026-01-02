import type { Page } from "@playwright/test";

export interface MockEnhancedImage {
  id: string;
  userId: string;
  originalUrl: string;
  originalR2Key: string;
  originalWidth: number;
  originalHeight: number;
  originalSizeBytes: number;
  createdAt: string;
  updatedAt: string;
  enhancementJobs: MockEnhancementJob[];
}

export interface MockEnhancementJob {
  id: string;
  userId: string;
  imageId: string;
  tier: "TIER_1K" | "TIER_2K" | "TIER_4K";
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  tokensCost: number;
  enhancedUrl: string | null;
  enhancedR2Key: string | null;
  enhancedWidth: number | null;
  enhancedHeight: number | null;
  enhancedSizeBytes: number | null;
  errorMessage: string | null;
  retryCount: number;
  maxRetries: number;
  geminiPrompt: string | null;
  createdAt: string;
  updatedAt: string;
  processingStartedAt: string | null;
  processingCompletedAt: string | null;
}

/**
 * Mock the token balance API endpoint
 */
export async function mockTokenBalanceAPI(page: Page, balance: number) {
  await page.route("**/api/tokens/balance", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ balance }),
    });
  });
}

/**
 * Mock the image upload API endpoint
 */
export async function mockImageUploadAPI(
  page: Page,
  options: {
    success?: boolean;
    delay?: number;
    imageData?: Partial<MockEnhancedImage>;
  } = {},
) {
  const { success = true, delay = 0, imageData = {} } = options;

  await page.route("**/api/images/upload", async (route) => {
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    if (success) {
      const mockImage: MockEnhancedImage = {
        id: "test-image-123",
        userId: "user-123",
        originalUrl: "https://example.com/original.jpg",
        originalR2Key: "images/original.jpg",
        originalWidth: 1024,
        originalHeight: 768,
        originalSizeBytes: 500000,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        enhancementJobs: [],
        ...imageData,
      };

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          image: mockImage,
        }),
      });
    } else {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ error: "Upload failed" }),
      });
    }
  });
}

/**
 * Mock the image enhancement API endpoint
 */
export async function mockEnhancementAPI(
  page: Page,
  options: {
    success?: boolean;
    jobId?: string;
    tokensCost?: number;
    errorMessage?: string;
  } = {},
) {
  const {
    success = true,
    jobId = "job-123",
    tokensCost = 2,
    errorMessage = "Enhancement failed",
  } = options;

  await page.route("**/api/images/enhance", async (route) => {
    if (success) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          jobId,
          tokensCost,
        }),
      });
    } else {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ error: errorMessage }),
      });
    }
  });
}

/**
 * Mock the job polling API endpoint
 */
export async function mockJobPollingAPI(
  page: Page,
  jobData: Partial<MockEnhancementJob> = {},
) {
  const mockJob: MockEnhancementJob = {
    id: "job-123",
    userId: "user-123",
    imageId: "test-image-123",
    tier: "TIER_1K",
    status: "COMPLETED",
    tokensCost: 2,
    enhancedUrl: "https://example.com/enhanced.jpg",
    enhancedR2Key: "images/enhanced.jpg",
    enhancedWidth: 1920,
    enhancedHeight: 1440,
    enhancedSizeBytes: 1000000,
    errorMessage: null,
    retryCount: 0,
    maxRetries: 3,
    geminiPrompt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    processingStartedAt: new Date().toISOString(),
    processingCompletedAt: new Date().toISOString(),
    ...jobData,
  };

  await page.route("**/api/jobs/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(mockJob),
    });
  });
}

/**
 * Mock the images list API endpoint
 */
export async function mockImagesListAPI(
  page: Page,
  images: MockEnhancedImage[] = [],
) {
  await page.route("**/api/images", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ images }),
    });
  });
}

/**
 * Mock image deletion API endpoint
 */
export async function mockImageDeletionAPI(
  page: Page,
  success: boolean = true,
) {
  await page.route("**/api/images/**", async (route) => {
    if (route.request().method() === "DELETE") {
      if (success) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true }),
        });
      } else {
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({ error: "Deletion failed" }),
        });
      }
    } else {
      await route.continue();
    }
  });
}

/**
 * Create a mock enhanced image with jobs
 */
export function createMockEnhancedImage(
  overrides: Partial<MockEnhancedImage> = {},
): MockEnhancedImage {
  return {
    id: "test-image-123",
    userId: "user-123",
    originalUrl: "https://example.com/original.jpg",
    originalR2Key: "images/original.jpg",
    originalWidth: 1024,
    originalHeight: 768,
    originalSizeBytes: 500000,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    enhancementJobs: [],
    ...overrides,
  };
}

/**
 * Create a mock enhancement job
 */
export function createMockEnhancementJob(
  overrides: Partial<MockEnhancementJob> = {},
): MockEnhancementJob {
  return {
    id: "job-123",
    userId: "user-123",
    imageId: "test-image-123",
    tier: "TIER_1K",
    status: "COMPLETED",
    tokensCost: 2,
    enhancedUrl: "https://example.com/enhanced.jpg",
    enhancedR2Key: "images/enhanced.jpg",
    enhancedWidth: 1920,
    enhancedHeight: 1440,
    enhancedSizeBytes: 1000000,
    errorMessage: null,
    retryCount: 0,
    maxRetries: 3,
    geminiPrompt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    processingStartedAt: new Date().toISOString(),
    processingCompletedAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Simulate file upload in browser
 */
export async function simulateFileUpload(
  page: Page,
  options: {
    fileName?: string;
    fileSize?: number;
    fileType?: string;
    content?: string;
  } = {},
) {
  const {
    fileName = "test.jpg",
    fileSize = 1024 * 1024, // 1MB
    fileType = "image/jpeg",
    content = "fake-image-content",
  } = options;

  const fileInput = page.locator('input[type="file"]');

  await fileInput.evaluate(
    (input: HTMLInputElement, opts) => {
      const dataTransfer = new DataTransfer();
      const file = new File([opts.content], opts.fileName, {
        type: opts.fileType,
      });

      // Override size if needed
      if (opts.fileSize !== file.size) {
        Object.defineProperty(file, "size", { value: opts.fileSize });
      }

      dataTransfer.items.add(file);
      input.files = dataTransfer.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    },
    { fileName, fileSize, fileType, content },
  );
}

/**
 * Wait for enhancement job to complete
 */
export async function waitForEnhancementComplete(
  page: Page,
  timeout: number = 5000,
) {
  await page.waitForFunction(
    () => {
      const statusElement = document.querySelector("[data-job-status]");
      return statusElement?.getAttribute("data-job-status") === "COMPLETED";
    },
    { timeout },
  );
}

/**
 * Auto-accept confirmation dialogs
 */
export async function autoAcceptDialogs(page: Page) {
  page.on("dialog", async (dialog) => {
    await dialog.accept();
  });
}

/**
 * Auto-dismiss confirmation dialogs
 */
export async function autoDismissDialogs(page: Page) {
  page.on("dialog", async (dialog) => {
    await dialog.dismiss();
  });
}
