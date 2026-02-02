
import { describe, it, expect } from 'vitest';
import { convertToYouTubePublishTime, displayScheduledTime } from './timezone-handler';

describe('timezone-handler', () => {
  describe('convertToYouTubePublishTime', () => {
    it('should convert local time to UTC ISO string correctly', () => {
      // Input: 10:00 AM (in local context)
      // Timezone: America/New_York (UTC-5)
      // Expected: 15:00 UTC

      const localDate = new Date('2024-01-01T10:00:00.000Z');
      // Note: In tests, new Date('ISO') creates a UTC date.
      // fromZonedTime treats the UTC components as local time components.
      // So 10:00Z -> 10:00 EST -> 15:00 UTC.

      const result = convertToYouTubePublishTime(localDate, 'America/New_York');
      expect(result).toBe('2024-01-01T15:00:00.000Z');
    });
  });

  describe('displayScheduledTime', () => {
    it('should format UTC time in target timezone', () => {
      // Input: 15:00 UTC
      // Timezone: America/New_York
      // Expected: "Jan 1, 2024, 10:00 AM" (default PPpp format)

      const utcDate = new Date('2024-01-01T15:00:00.000Z');
      const result = displayScheduledTime(utcDate, 'America/New_York');

      expect(result).toContain('Jan 1, 2024');
      // Format might include seconds (PPpp = medium date, medium time)
      // "Jan 1, 2024, 10:00:00 AM"
      expect(result).toContain('10:00');
      expect(result).toContain('AM');
    });
  });
});
