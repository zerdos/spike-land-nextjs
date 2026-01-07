import { vi } from "vitest";

// Mock file system entries
export interface MockFileSystemFile {
  kind: "file";
  name: string;
  getFile: () => Promise<{
    size: number;
    type: string;
    lastModified: number;
    text: () => Promise<string>;
  }>;
  createWritable: () => Promise<{
    write: (content: string) => Promise<void>;
    seek: (position: number) => Promise<void>;
    close: () => Promise<void>;
  }>;
}

export interface MockFileSystemDirectory {
  kind: "directory";
  name: string;
  getDirectoryHandle: (
    name: string,
    options?: { create?: boolean; },
  ) => Promise<MockFileSystemDirectory>;
  getFileHandle: (
    name: string,
    options?: { create?: boolean; },
  ) => Promise<MockFileSystemFile>;
  removeEntry: (
    name: string,
    options?: { recursive?: boolean; },
  ) => Promise<void>;
  entries: () => AsyncIterableIterator<
    [string, MockFileSystemFile | MockFileSystemDirectory]
  >;
}

// Create mock file system
export const mockFileSystem: Record<
  string,
  MockFileSystemFile | MockFileSystemDirectory
> = {
  "test.txt": {
    kind: "file",
    name: "test.txt",
    getFile: vi.fn().mockResolvedValue({
      size: 100,
      type: "text/plain",
      lastModified: Date.now(),
      text: vi.fn().mockResolvedValue("test content"),
    }),
    createWritable: vi.fn().mockResolvedValue({
      write: vi.fn().mockResolvedValue(undefined),
      seek: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
    }),
  },
  "test": {
    kind: "directory",
    name: "test",
    getDirectoryHandle: vi.fn().mockImplementation(async (name, options) => {
      if (mockFileSystem[`test/${name}`]?.kind === "directory") {
        return mockFileSystem[`test/${name}`] as MockFileSystemDirectory;
      }
      if (options?.create) {
        const newDir = {
          kind: "directory" as const,
          name,
          getDirectoryHandle: vi.fn().mockResolvedValue({}),
          getFileHandle: vi.fn().mockResolvedValue({}),
          removeEntry: vi.fn().mockResolvedValue(undefined),
          entries: vi.fn().mockReturnValue([]),
        };
        mockFileSystem[`test/${name}`] = newDir;
        return newDir;
      }
      throw new Error("Not a directory");
    }),
    getFileHandle: vi.fn().mockImplementation(async (name, options) => {
      if (mockFileSystem[`test/${name}`]?.kind === "file") {
        return mockFileSystem[`test/${name}`] as MockFileSystemFile;
      }
      if (options?.create) {
        const newFile = {
          kind: "file" as const,
          name,
          getFile: vi.fn().mockResolvedValue({
            size: 0,
            type: "text/plain",
            lastModified: Date.now(),
            text: vi.fn().mockResolvedValue(""),
          }),
          createWritable: vi.fn().mockResolvedValue({
            write: vi.fn().mockResolvedValue(undefined),
            close: vi.fn().mockResolvedValue(undefined),
          }),
        };
        mockFileSystem[`test/${name}`] = newFile;
        return newFile;
      }
      throw new Error("Not a file");
    }),
    removeEntry: vi.fn().mockResolvedValue(undefined),
    entries: vi.fn().mockImplementation(async function*() {
      for (const [key, value] of Object.entries(mockFileSystem)) {
        if (key.startsWith("test/")) {
          yield [key.replace("test/", ""), value];
        }
      }
    }),
  },
};

// Create mock directory handle
export const mockDirectoryHandle: MockFileSystemDirectory = {
  kind: "directory",
  name: "",
  getDirectoryHandle: vi.fn(async (name, options) => {
    if (mockFileSystem[name]?.kind === "directory") {
      return mockFileSystem[name] as MockFileSystemDirectory;
    }
    if (options?.create) {
      const newDir = {
        kind: "directory" as const,
        name,
        getDirectoryHandle: vi.fn().mockResolvedValue({}),
        getFileHandle: vi.fn().mockResolvedValue({}),
        removeEntry: vi.fn().mockResolvedValue(undefined),
        entries: vi.fn().mockReturnValue([]),
      };
      mockFileSystem[name] = newDir;
      return newDir;
    }
    throw new Error("Not a directory");
  }),
  getFileHandle: vi.fn(async (name, options) => {
    if (mockFileSystem[name]?.kind === "file") {
      return mockFileSystem[name] as MockFileSystemFile;
    }
    if (options?.create) {
      const newFile = {
        kind: "file" as const,
        name,
        getFile: vi.fn().mockResolvedValue({
          size: 0,
          type: "text/plain",
          lastModified: Date.now(),
          text: vi.fn().mockResolvedValue(""),
        }),
        createWritable: vi.fn().mockResolvedValue({
          write: vi.fn().mockResolvedValue(undefined),
          close: vi.fn().mockResolvedValue(undefined),
        }),
      };
      mockFileSystem[name] = newFile;
      return newFile;
    }
    throw new Error("Not a file");
  }),
  removeEntry: vi.fn().mockResolvedValue(undefined),
  entries: vi.fn().mockImplementation(async function*() {
    for (const [key, value] of Object.entries(mockFileSystem)) {
      if (!key.includes("/")) {
        yield [key, value];
      }
    }
  }),
};

// Create mock navigator
export const mockNavigator = {
  storage: {
    getDirectory: vi.fn().mockResolvedValue(mockDirectoryHandle),
  },
};

// Setup function to reset mocks before each test
export const setupTest = () => {
  // Clear only the call history, not the implementations
  vi.clearAllMocks();

  // Clear and reset mock file system to initial state
  Object.keys(mockFileSystem).forEach((key) => {
    delete mockFileSystem[key];
  });

  // Reinitialize default test.txt file
  mockFileSystem["test.txt"] = {
    kind: "file",
    name: "test.txt",
    getFile: vi.fn().mockResolvedValue({
      size: 100,
      type: "text/plain",
      lastModified: Date.now(),
      text: vi.fn().mockResolvedValue("test content"),
    }),
    createWritable: vi.fn().mockResolvedValue({
      write: vi.fn().mockResolvedValue(undefined),
      seek: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
    }),
  };

  // Reinitialize default test directory
  mockFileSystem["test"] = {
    kind: "directory",
    name: "test",
    getDirectoryHandle: vi.fn().mockImplementation(async (name, options) => {
      if (mockFileSystem[`test/${name}`]?.kind === "directory") {
        return mockFileSystem[`test/${name}`] as MockFileSystemDirectory;
      }
      if (options?.create) {
        const newDir = {
          kind: "directory" as const,
          name,
          getDirectoryHandle: vi.fn().mockResolvedValue({}),
          getFileHandle: vi.fn().mockResolvedValue({}),
          removeEntry: vi.fn().mockResolvedValue(undefined),
          entries: vi.fn().mockReturnValue([]),
        };
        mockFileSystem[`test/${name}`] = newDir;
        return newDir;
      }
      throw new Error("Not a directory");
    }),
    getFileHandle: vi.fn().mockImplementation(async (name, options) => {
      if (mockFileSystem[`test/${name}`]?.kind === "file") {
        return mockFileSystem[`test/${name}`] as MockFileSystemFile;
      }
      if (options?.create) {
        const newFile = {
          kind: "file" as const,
          name,
          getFile: vi.fn().mockResolvedValue({
            size: 0,
            type: "text/plain",
            lastModified: Date.now(),
            text: vi.fn().mockResolvedValue(""),
          }),
          createWritable: vi.fn().mockResolvedValue({
            write: vi.fn().mockResolvedValue(undefined),
            close: vi.fn().mockResolvedValue(undefined),
          }),
        };
        mockFileSystem[`test/${name}`] = newFile;
        return newFile;
      }
      throw new Error("Not a file");
    }),
    removeEntry: vi.fn().mockResolvedValue(undefined),
    entries: vi.fn().mockImplementation(async function*() {
      for (const [key, value] of Object.entries(mockFileSystem)) {
        if (key.startsWith("test/")) {
          yield [key.replace("test/", ""), value];
        }
      }
    }),
  };

  // Properly reset mock directory handle methods with fresh implementations
  mockDirectoryHandle.getFileHandle = vi.fn(async (name, options) => {
    if (mockFileSystem[name]?.kind === "file") {
      return mockFileSystem[name] as MockFileSystemFile;
    }
    if (options?.create) {
      const newFile = {
        kind: "file" as const,
        name,
        getFile: vi.fn().mockResolvedValue({
          size: 0,
          type: "text/plain",
          lastModified: Date.now(),
          text: vi.fn().mockResolvedValue(""),
        }),
        createWritable: vi.fn().mockResolvedValue({
          write: vi.fn().mockResolvedValue(undefined),
          close: vi.fn().mockResolvedValue(undefined),
        }),
      };
      mockFileSystem[name] = newFile;
      return newFile;
    }
    throw new Error("Not a file");
  });

  mockDirectoryHandle.getDirectoryHandle = vi.fn(async (name, options) => {
    if (mockFileSystem[name]?.kind === "directory") {
      return mockFileSystem[name] as MockFileSystemDirectory;
    }
    if (options?.create) {
      const newDir = {
        kind: "directory" as const,
        name,
        getDirectoryHandle: vi.fn().mockResolvedValue({}),
        getFileHandle: vi.fn().mockResolvedValue({}),
        removeEntry: vi.fn().mockResolvedValue(undefined),
        entries: vi.fn().mockReturnValue([]),
      };
      mockFileSystem[name] = newDir;
      return newDir;
    }
    throw new Error("Not a directory");
  });

  mockDirectoryHandle.removeEntry = vi.fn().mockResolvedValue(undefined);

  mockDirectoryHandle.entries = vi.fn().mockImplementation(async function*() {
    for (const [key, value] of Object.entries(mockFileSystem)) {
      if (!key.includes("/")) {
        yield [key, value];
      }
    }
  });

  // Reset navigator mock
  mockNavigator.storage.getDirectory = vi.fn().mockResolvedValue(mockDirectoryHandle);
};
