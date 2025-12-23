import { describe, expect, it } from "vitest";
import {
  formatFileSize,
  getValidationSummary,
  hasImageExtension,
  isImageFile,
  isSecureFilename,
  validateFile,
  validateFiles,
} from "./validation";

describe("isImageFile", () => {
  it("should return true for JPEG files", () => {
    const file = new File([], "test.jpg", { type: "image/jpeg" });
    expect(isImageFile(file)).toBe(true);
  });

  it("should return true for PNG files", () => {
    const file = new File([], "test.png", { type: "image/png" });
    expect(isImageFile(file)).toBe(true);
  });

  it("should return true for GIF files", () => {
    const file = new File([], "test.gif", { type: "image/gif" });
    expect(isImageFile(file)).toBe(true);
  });

  it("should return true for WebP files", () => {
    const file = new File([], "test.webp", { type: "image/webp" });
    expect(isImageFile(file)).toBe(true);
  });

  it("should return true for HEIC files", () => {
    const file = new File([], "test.heic", { type: "image/heic" });
    expect(isImageFile(file)).toBe(true);
  });

  it("should return true for HEIF files", () => {
    const file = new File([], "test.heif", { type: "image/heif" });
    expect(isImageFile(file)).toBe(true);
  });

  // Security: Reject potentially dangerous image/* types not in whitelist
  it("should reject image/svg+xml files (XSS risk)", () => {
    const file = new File([], "test.svg", { type: "image/svg+xml" });
    expect(isImageFile(file)).toBe(false);
  });

  it("should reject image/x-icon files", () => {
    const file = new File([], "test.ico", { type: "image/x-icon" });
    expect(isImageFile(file)).toBe(false);
  });

  it("should reject image/vnd.microsoft.icon files", () => {
    const file = new File([], "test.ico", { type: "image/vnd.microsoft.icon" });
    expect(isImageFile(file)).toBe(false);
  });

  it("should reject image/bmp files (not in whitelist)", () => {
    const file = new File([], "test.bmp", { type: "image/bmp" });
    expect(isImageFile(file)).toBe(false);
  });

  it("should reject image/tiff files (not in whitelist)", () => {
    const file = new File([], "test.tiff", { type: "image/tiff" });
    expect(isImageFile(file)).toBe(false);
  });

  it("should return false for non-image files", () => {
    const file = new File([], "test.pdf", { type: "application/pdf" });
    expect(isImageFile(file)).toBe(false);
  });

  it("should return false for text files", () => {
    const file = new File([], "test.txt", { type: "text/plain" });
    expect(isImageFile(file)).toBe(false);
  });
});

describe("formatFileSize", () => {
  it("should format bytes correctly", () => {
    expect(formatFileSize(500)).toBe("500 B");
  });

  it("should format kilobytes correctly", () => {
    expect(formatFileSize(1024)).toBe("1.0 KB");
    expect(formatFileSize(1536)).toBe("1.5 KB");
  });

  it("should format megabytes correctly", () => {
    expect(formatFileSize(1024 * 1024)).toBe("1.0 MB");
    expect(formatFileSize(1024 * 1024 * 2.5)).toBe("2.5 MB");
  });

  it("should format large files correctly", () => {
    expect(formatFileSize(50 * 1024 * 1024)).toBe("50.0 MB");
  });

  it("should handle zero bytes", () => {
    expect(formatFileSize(0)).toBe("0 B");
  });
});

describe("validateFile", () => {
  it("should validate a valid image file", () => {
    const file = new File([new ArrayBuffer(1024)], "test.jpg", {
      type: "image/jpeg",
    });
    const result = validateFile(file);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("should reject non-image files", () => {
    const file = new File([new ArrayBuffer(1024)], "test.pdf", {
      type: "application/pdf",
    });
    const result = validateFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Invalid file type");
  });

  it("should reject files exceeding max size", () => {
    const file = new File([new ArrayBuffer(51 * 1024 * 1024)], "large.jpg", {
      type: "image/jpeg",
    });
    const result = validateFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("File too large");
  });

  it("should accept files within custom max size", () => {
    const file = new File([new ArrayBuffer(100 * 1024 * 1024)], "large.jpg", {
      type: "image/jpeg",
    });
    const result = validateFile(file, { maxFileSize: 200 * 1024 * 1024 });
    expect(result.valid).toBe(true);
  });

  it("should reject files with empty names", () => {
    const file = new File([new ArrayBuffer(1024)], "", {
      type: "image/jpeg",
    });
    const result = validateFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("valid name");
  });

  it("should reject files with whitespace-only names", () => {
    const file = new File([new ArrayBuffer(1024)], "   ", {
      type: "image/jpeg",
    });
    const result = validateFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("valid name");
  });

  it("should validate against custom allowed types", () => {
    const file = new File([new ArrayBuffer(1024)], "test.jpg", {
      type: "image/jpeg",
    });
    const result = validateFile(file, {
      allowedTypes: ["image/png"],
    });
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Invalid file type");
  });

  it("should support wildcard MIME types", () => {
    const file = new File([new ArrayBuffer(1024)], "test.svg", {
      type: "image/svg+xml",
    });
    const result = validateFile(file, {
      allowedTypes: ["image/*"],
    });
    expect(result.valid).toBe(true);
  });

  // Security: Path traversal prevention tests
  it("should reject files with path traversal using '..'", () => {
    const file = new File([new ArrayBuffer(1024)], "../etc/passwd.jpg", {
      type: "image/jpeg",
    });
    const result = validateFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("path traversal");
  });

  it("should reject files with forward slash in name", () => {
    const file = new File([new ArrayBuffer(1024)], "path/to/file.jpg", {
      type: "image/jpeg",
    });
    const result = validateFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("path traversal");
  });

  it("should reject files with backslash in name", () => {
    const file = new File([new ArrayBuffer(1024)], "path\\to\\file.jpg", {
      type: "image/jpeg",
    });
    const result = validateFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("path traversal");
  });

  // Security: Hidden files prevention tests
  it("should reject hidden files starting with dot", () => {
    const file = new File([new ArrayBuffer(1024)], ".hidden.jpg", {
      type: "image/jpeg",
    });
    const result = validateFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("hidden files");
  });

  it("should reject .htaccess files", () => {
    const file = new File([new ArrayBuffer(1024)], ".htaccess", {
      type: "image/jpeg",
    });
    const result = validateFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("hidden files");
  });

  // Security: Filename length tests
  it("should reject files with overly long filenames", () => {
    const longName = "a".repeat(256) + ".jpg";
    const file = new File([new ArrayBuffer(1024)], longName, {
      type: "image/jpeg",
    });
    const result = validateFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("maximum length");
  });

  it("should accept files with maximum allowed filename length", () => {
    const maxName = "a".repeat(250) + ".jpg"; // 254 chars total
    const file = new File([new ArrayBuffer(1024)], maxName, {
      type: "image/jpeg",
    });
    const result = validateFile(file);
    expect(result.valid).toBe(true);
  });
});

describe("validateFiles", () => {
  it("should validate multiple valid files", () => {
    const files = [
      new File([new ArrayBuffer(1024)], "test1.jpg", { type: "image/jpeg" }),
      new File([new ArrayBuffer(2048)], "test2.png", { type: "image/png" }),
    ];
    const result = validateFiles(files);
    expect(result.valid).toBe(true);
    expect(result.validFiles).toHaveLength(2);
    expect(result.invalidFiles).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });

  it("should handle empty file list", () => {
    const result = validateFiles([]);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("No files selected.");
  });

  it("should reject when exceeding max files", () => {
    const files = Array.from(
      { length: 25 },
      (_, i) =>
        new File([new ArrayBuffer(1024)], `test${i}.jpg`, {
          type: "image/jpeg",
        }),
    );
    const result = validateFiles(files);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("Too many files");
  });

  it("should accept files within custom max files limit", () => {
    const files = Array.from(
      { length: 30 },
      (_, i) =>
        new File([new ArrayBuffer(1024)], `test${i}.jpg`, {
          type: "image/jpeg",
        }),
    );
    const result = validateFiles(files, { maxFiles: 30 });
    expect(result.valid).toBe(true);
  });

  it("should separate valid and invalid files", () => {
    const files = [
      new File([new ArrayBuffer(1024)], "valid.jpg", { type: "image/jpeg" }),
      new File([new ArrayBuffer(1024)], "invalid.pdf", {
        type: "application/pdf",
      }),
      new File([new ArrayBuffer(1024)], "valid2.png", { type: "image/png" }),
    ];
    const result = validateFiles(files);
    expect(result.valid).toBe(false);
    expect(result.validFiles).toHaveLength(2);
    expect(result.invalidFiles).toHaveLength(1);
    expect(result.invalidFiles[0]!.file.name).toBe("invalid.pdf");
    expect(result.invalidFiles[0]!.error).toContain("Invalid file type");
  });

  it("should handle FileList input", () => {
    const file = new File([new ArrayBuffer(1024)], "test.jpg", {
      type: "image/jpeg",
    });
    const fileList = {
      0: file,
      length: 1,
      item: (index: number) => (index === 0 ? file : null),
      [Symbol.iterator]: function*() {
        yield file;
      },
    } as unknown as FileList;

    const result = validateFiles(fileList);
    expect(result.valid).toBe(true);
    expect(result.validFiles).toHaveLength(1);
  });

  it("should accumulate errors for all invalid files", () => {
    const files = [
      new File([new ArrayBuffer(1024)], "invalid1.pdf", {
        type: "application/pdf",
      }),
      new File([new ArrayBuffer(51 * 1024 * 1024)], "toolarge.jpg", {
        type: "image/jpeg",
      }),
    ];
    const result = validateFiles(files);
    expect(result.errors).toHaveLength(2);
    expect(result.errors[0]).toContain("invalid1.pdf");
    expect(result.errors[1]).toContain("toolarge.jpg");
  });

  it("should pass custom options to individual file validation", () => {
    const files = [
      new File([new ArrayBuffer(100 * 1024 * 1024)], "large.jpg", {
        type: "image/jpeg",
      }),
    ];
    const result = validateFiles(files, { maxFileSize: 200 * 1024 * 1024 });
    expect(result.valid).toBe(true);
  });
});

describe("getValidationSummary", () => {
  it("should return success message for all valid files", () => {
    const result = {
      valid: true,
      errors: [],
      validFiles: [
        new File([], "test1.jpg"),
        new File([], "test2.jpg"),
      ],
      invalidFiles: [],
    };
    const summary = getValidationSummary(result);
    expect(summary).toBe("2 file(s) ready to upload.");
  });

  it("should return summary for mixed valid and invalid files", () => {
    const result = {
      valid: false,
      errors: ["error"],
      validFiles: [new File([], "test1.jpg")],
      invalidFiles: [{ file: new File([], "test2.pdf"), error: "Invalid" }],
    };
    const summary = getValidationSummary(result);
    expect(summary).toBe("1 valid file(s), 1 invalid file(s)");
  });

  it("should return summary for only invalid files", () => {
    const result = {
      valid: false,
      errors: ["error"],
      validFiles: [],
      invalidFiles: [{ file: new File([], "test.pdf"), error: "Invalid" }],
    };
    const summary = getValidationSummary(result);
    expect(summary).toBe("1 invalid file(s)");
  });
});

describe("hasImageExtension", () => {
  it("should return true for .jpg extension", () => {
    expect(hasImageExtension("photo.jpg")).toBe(true);
  });

  it("should return true for .jpeg extension", () => {
    expect(hasImageExtension("photo.jpeg")).toBe(true);
  });

  it("should return true for .png extension", () => {
    expect(hasImageExtension("photo.png")).toBe(true);
  });

  it("should return true for .gif extension", () => {
    expect(hasImageExtension("photo.gif")).toBe(true);
  });

  it("should return true for .webp extension", () => {
    expect(hasImageExtension("photo.webp")).toBe(true);
  });

  it("should be case-insensitive", () => {
    expect(hasImageExtension("photo.JPG")).toBe(true);
    expect(hasImageExtension("photo.PNG")).toBe(true);
  });

  it("should return false for non-image extensions", () => {
    expect(hasImageExtension("document.pdf")).toBe(false);
    expect(hasImageExtension("script.js")).toBe(false);
  });

  it("should return false for files without extension", () => {
    expect(hasImageExtension("filename")).toBe(false);
  });
});

describe("isSecureFilename", () => {
  it("should accept valid filenames", () => {
    expect(isSecureFilename("photo.jpg")).toBe(true);
    expect(isSecureFilename("my-photo-2024.png")).toBe(true);
    expect(isSecureFilename("vacation_photo_1.jpeg")).toBe(true);
  });

  it("should reject path traversal attempts", () => {
    expect(isSecureFilename("../etc/passwd")).toBe(false);
    expect(isSecureFilename("..\\windows\\system32")).toBe(false);
  });

  it("should reject paths with forward slashes", () => {
    expect(isSecureFilename("path/to/file.jpg")).toBe(false);
  });

  it("should reject paths with backslashes", () => {
    expect(isSecureFilename("path\\to\\file.jpg")).toBe(false);
  });

  it("should reject hidden files", () => {
    expect(isSecureFilename(".hidden")).toBe(false);
    expect(isSecureFilename(".htaccess")).toBe(false);
  });

  it("should reject overly long filenames", () => {
    const longName = "a".repeat(256) + ".jpg";
    expect(isSecureFilename(longName)).toBe(false);
  });

  it("should accept maximum allowed length", () => {
    const maxName = "a".repeat(250) + ".jpg"; // 254 chars total
    expect(isSecureFilename(maxName)).toBe(true);
  });
});
