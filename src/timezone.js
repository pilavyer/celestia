// src/timezone.js
import { DateTime } from 'luxon';

/**
 * Converts birth time from local time to UTC.
 *
 * CRITICAL NOTES:
 * - Never use raw UTC offsets (e.g. "+3"), always use IANA timezone IDs
 * - IANA IDs encode historical DST changes
 * - Turkey example: before 2016 UTC+2/+3 (DST), after 2016 fixed UTC+3
 *
 * @param {number} year - Birth year
 * @param {number} month - Birth month (1-12, unlike JavaScript's 0-based Date!)
 * @param {number} day - Birth day
 * @param {number} hour - Birth hour (0-23)
 * @param {number} minute - Birth minute (0-59)
 * @param {string} timezone - IANA timezone ID (e.g. "Europe/Istanbul", "America/New_York")
 * @returns {object} UTC information and warnings
 */
export function birthTimeToUTC(year, month, day, hour, minute, timezone) {
  // IANA timezone validation
  const testZone = DateTime.now().setZone(timezone);
  if (!testZone.isValid) {
    throw new Error(`Invalid timezone: "${timezone}". Use IANA format (e.g. "Europe/Istanbul")`);
  }

  // Construct local time
  const local = DateTime.fromObject(
    { year, month, day, hour, minute, second: 0 },
    { zone: timezone }
  );

  // DST spring-forward gap check
  // Example: When clock jumps from 02:00 to 03:00, 02:30 is invalid
  if (!local.isValid) {
    throw new Error(
      `Invalid time: ${year}-${month}-${day} ${hour}:${minute} does not exist in timezone "${timezone}". ` +
      `This time was likely skipped due to a daylight saving time transition. ` +
      `Reason: ${local.invalidReason}. Explanation: ${local.invalidExplanation}`
    );
  }

  // Convert to UTC
  const utc = local.toUTC();

  // Build warnings
  const warnings = [];

  if (year < 1970) {
    warnings.push(
      'Timezone data before 1970 may not be reliable. ' +
      'Cross-checking with astro.com atlas is recommended.'
    );
  }

  if (year < 1883 && timezone.startsWith('America/')) {
    warnings.push(
      'Standard time zones did not exist in the US before 1883. ' +
      'Local Mean Time (LMT) may have been used.'
    );
  }

  // DST fall-back ambiguity check (the same clock time occurs twice)
  // Luxon prefers the first occurrence (DST time) in this case
  const oneHourLater = local.plus({ hours: 1 });
  if (local.offset !== oneHourLater.offset && local.isInDST) {
    warnings.push(
      'This time coincides with a DST transition. ' +
      'The same clock time may have occurred twice (DST and standard). ' +
      'The DST version was used.'
    );
  }

  return {
    utcYear: utc.year,
    utcMonth: utc.month,
    utcDay: utc.day,
    utcHour: utc.hour,
    utcMinute: utc.minute,
    utcSecond: utc.second,
    // Decimal hour (for Swiss Ephemeris julday function)
    utcDecimalHour: utc.hour + utc.minute / 60 + utc.second / 3600,
    // Offset information (in minutes)
    offsetMinutes: local.offset,
    offsetHours: local.offset / 60,
    // DST status
    isDST: local.isInDST,
    // Original input (for debugging)
    originalInput: {
      localTime: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
      timezone,
      utcTime: utc.toISO(),
    },
    // Warnings
    warnings,
  };
}

/**
 * Get information about an IANA timezone.
 * NOTE: This is a simple approach. In production, using Google Time Zone API or
 * a service like timezonefinder would be more accurate.
 *
 * Notable timezones:
 * - Turkey: "Europe/Istanbul" (applies to all of Turkey, fixed UTC+3 since 2016)
 * - Eastern US: "America/New_York"
 * - Western US: "America/Los_Angeles"
 * - Brazil: "America/Sao_Paulo"
 * - India: "Asia/Kolkata"
 */
export function getTimezoneInfo(timezone) {
  const now = DateTime.now().setZone(timezone);
  return {
    timezone,
    currentOffset: now.offset / 60,
    isDST: now.isInDST,
    abbreviation: now.offsetNameShort,
    longName: now.offsetNameLong,
  };
}
