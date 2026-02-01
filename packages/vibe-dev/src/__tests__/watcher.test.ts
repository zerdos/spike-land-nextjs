import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as watcher from '../watcher';
import { existsSync, mkdirSync } from 'fs';
import { readFile, writeFile } from 'fs/promises';
import { pullCode, pushCode, withRetry } from '../sync';
import chokidar from 'chokidar';
import path from 'path';

// Mock dependencies
vi.mock('fs');
vi.mock('fs/promises');
vi.mock('chokidar');
vi.mock('../sync');

describe('Watcher Module', () => {
  const mockWatcher = {
    on: vi.fn(),
    close: vi.fn(),
  };

  beforeEach(() => {
    vi.resetAllMocks();
    // Setup default mock implementations
    vi.mocked(chokidar.watch).mockReturnValue(mockWatcher as any);
    vi.mocked(withRetry).mockImplementation(async (fn) => fn());
  });

  describe('getLiveDir', () => {
    it('should return live directory path', () => {
      const dir = watcher.getLiveDir();
      expect(dir).toBe(path.join(process.cwd(), 'live'));
    });
  });

  describe('getLocalPath', () => {
    it('should return local file path', () => {
      const filePath = watcher.getLocalPath('test-code');
      expect(filePath).toBe(path.join(process.cwd(), 'live', 'test-code.tsx'));
    });

    it('should sanitize codespace id', () => {
      const filePath = watcher.getLocalPath('test/code');
      expect(filePath).toBe(path.join(process.cwd(), 'live', 'test-code.tsx'));
    });
  });

  describe('ensureLiveDir', () => {
    it('should create directory if it does not exist', () => {
      vi.mocked(existsSync).mockReturnValue(false);
      watcher.ensureLiveDir();
      expect(mkdirSync).toHaveBeenCalledWith(expect.stringContaining('live'), { recursive: true });
    });

    it('should not create directory if it exists', () => {
      vi.mocked(existsSync).mockReturnValue(true);
      watcher.ensureLiveDir();
      expect(mkdirSync).not.toHaveBeenCalled();
    });
  });

  describe('downloadToLocal', () => {
    it('should download code and save to file', async () => {
      vi.mocked(pullCode).mockResolvedValue('code content');
      vi.mocked(existsSync).mockReturnValue(true);

      const result = await watcher.downloadToLocal('code1');

      expect(result).toContain('code1.tsx');
      expect(pullCode).toHaveBeenCalledWith('code1');
      expect(writeFile).toHaveBeenCalledWith(
        expect.stringContaining('code1.tsx'),
        'code content',
        'utf-8'
      );
      expect(writeFile).toHaveBeenCalledWith(
        expect.stringContaining('code1.meta.json'),
        expect.any(String),
        'utf-8'
      );
    });
  });

  describe('watchCodespace', () => {
    it('should start watching file', () => {
      const w = watcher.watchCodespace('code1');

      expect(w.codespaceId).toBe('code1');
      expect(w.watcher).toBe(mockWatcher);
      expect(mockWatcher.on).toHaveBeenCalledWith('change', expect.any(Function));
      expect(mockWatcher.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('should sync changes when file changes', async () => {
      vi.useFakeTimers();
      const w = watcher.watchCodespace('code1', { debounceMs: 100 });

      // Extract the change handler
      const changeHandler = mockWatcher.on.mock.calls.find(call => call[0] === 'change')?.[1];
      expect(changeHandler).toBeDefined();

      // Simulate file change
      vi.mocked(readFile).mockResolvedValue('new code');
      changeHandler();

      // Fast forward timer
      vi.advanceTimersByTime(100);

      // Wait for promises to resolve
      await vi.runAllTicks();

      expect(readFile).toHaveBeenCalled();
      expect(pushCode).toHaveBeenCalledWith('code1', 'new code');

      vi.useRealTimers();
    });
  });
});
