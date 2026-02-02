
import { fromZonedTime, formatInTimeZone } from "date-fns-tz";

/**
 * Convert a local time (represented as Date) in a specific timezone to UTC ISO string
 *
 * @param localTime - Date object where UTC components represent the local time
 *                    (e.g., 10:00 UTC implies 10:00 in the target timezone)
 * @param timezone - Timezone string (e.g., "America/New_York")
 * @returns ISO 8601 string in UTC
 */
export function convertToYouTubePublishTime(
  localTime: Date,
  timezone: string,
): string {
  // fromZonedTime takes the time components from localTime and assumes they belong to timezone,
  // then returns the actual UTC Date.
  const utcDate = fromZonedTime(localTime, timezone);
  return utcDate.toISOString();
}

/**
 * Format a UTC time for display in a specific timezone
 *
 * @param utcTime - UTC ISO string or Date
 * @param timezone - Target timezone
 * @param formatStr - Format string (default: "PPpp")
 */
export function displayScheduledTime(
  utcTime: string | Date,
  timezone: string,
  formatStr: string = "PPpp"
): string {
  const date = new Date(utcTime);
  return formatInTimeZone(date, timezone, formatStr);
}
