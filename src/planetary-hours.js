// src/planetary-hours.js — Chaldean Planetary Hours Calculation

/**
 * Chaldean order of planets (slowest to fastest).
 * The planetary hour cycle follows this order.
 */
const CHALDEAN_ORDER = ['Saturn', 'Jupiter', 'Mars', 'Sun', 'Venus', 'Mercury', 'Moon'];

/**
 * Day ruler by day-of-week (0 = Sunday ... 6 = Saturday).
 * Each day's first hour is ruled by the day planet.
 */
const DAY_RULERS = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];

const DAY_RULERS_TR = {
  Sun: 'Güneş', Moon: 'Ay', Mars: 'Mars', Mercury: 'Merkür',
  Jupiter: 'Jüpiter', Venus: 'Venüs', Saturn: 'Satürn',
};

/**
 * Calculate approximate sunrise and sunset using the standard sunrise equation.
 *
 * @param {number} jd_ut - Julian Day (UT)
 * @param {number} latitude - Geographic latitude (degrees)
 * @param {number} longitude - Geographic longitude (degrees, east positive)
 * @returns {{ sunriseJD: number, sunsetJD: number }} Julian Day values for sunrise/sunset
 */
export function calculateSunriseSunset(jd_ut, latitude, longitude) {
  // Standard sunrise equation (Wikipedia)
  // longitude: east-positive convention; l_w (west longitude) = -longitude
  const l_w = -longitude;

  // Julian cycle number (rounded to nearest integer day)
  const n_star = jd_ut - 2451545.0009 - l_w / 360;
  const n = Math.round(n_star);

  // Approximate solar noon for this day and longitude
  const J_star = n + 0.0009 + l_w / 360;

  // Solar mean anomaly
  let M_deg = (357.5291 + 0.98560028 * J_star) % 360;
  if (M_deg < 0) M_deg += 360;
  const M_rad = M_deg * Math.PI / 180;

  // Equation of the center
  const C = 1.9148 * Math.sin(M_rad) + 0.0200 * Math.sin(2 * M_rad) + 0.0003 * Math.sin(3 * M_rad);

  // Ecliptic longitude of the Sun
  let lambda_deg = (M_deg + C + 180 + 102.9372) % 360;
  if (lambda_deg < 0) lambda_deg += 360;
  const lambda_rad = lambda_deg * Math.PI / 180;

  // Sun's declination
  const sin_dec = Math.sin(lambda_rad) * Math.sin(23.4397 * Math.PI / 180);
  const dec_rad = Math.asin(sin_dec);

  // Hour angle
  const lat_rad = latitude * Math.PI / 180;
  const cos_H = (Math.sin(-0.8333 * Math.PI / 180) - Math.sin(lat_rad) * Math.sin(dec_rad)) /
                (Math.cos(lat_rad) * Math.cos(dec_rad));

  // Clamp for polar regions
  let H_deg;
  if (cos_H > 1) {
    // Sun never rises
    H_deg = 0;
  } else if (cos_H < -1) {
    // Sun never sets
    H_deg = 180;
  } else {
    H_deg = Math.acos(cos_H) * 180 / Math.PI;
  }

  // Solar transit (noon)
  const J_transit = 2451545.0 + J_star + 0.0053 * Math.sin(M_rad) - 0.0069 * Math.sin(2 * lambda_rad);

  // Sunrise and sunset
  const sunriseJD = J_transit - H_deg / 360;
  const sunsetJD = J_transit + H_deg / 360;

  return { sunriseJD, sunsetJD };
}

/**
 * Calculate the planetary hour at a given Julian Day.
 *
 * @param {number} jd_ut - Julian Day of the birth time (UT)
 * @param {number} latitude - Birth latitude
 * @param {number} longitude - Birth longitude
 * @returns {object} Planetary hour information
 */
export function calculatePlanetaryHour(jd_ut, latitude, longitude) {
  const { sunriseJD, sunsetJD } = calculateSunriseSunset(jd_ut, latitude, longitude);

  // Day duration and night duration
  const dayDuration = sunsetJD - sunriseJD;

  // Previous day's sunset and next day's sunrise for night hours
  const prevSunset = sunsetJD - 1;
  const nextSunrise = sunriseJD + 1;
  const nightDuration = nextSunrise - sunsetJD;

  // Day hour length and night hour length
  const dayHourLength = dayDuration / 12;
  const nightHourLength = nightDuration / 12;

  // Determine if the time is during the day or night
  let isDay, hourNumber, elapsed;

  if (jd_ut >= sunriseJD && jd_ut < sunsetJD) {
    // Daytime
    isDay = true;
    elapsed = jd_ut - sunriseJD;
    hourNumber = Math.floor(elapsed / dayHourLength) + 1;
    if (hourNumber > 12) hourNumber = 12;
  } else if (jd_ut >= sunsetJD) {
    // Night (after sunset same day)
    isDay = false;
    elapsed = jd_ut - sunsetJD;
    hourNumber = Math.floor(elapsed / nightHourLength) + 1;
    if (hourNumber > 12) hourNumber = 12;
  } else {
    // Night (before sunrise = continuation of previous day's night)
    isDay = false;
    const prevDaySunset = sunsetJD - 1;
    const prevNightDuration = sunriseJD - prevDaySunset;
    const prevNightHourLength = prevNightDuration / 12;
    elapsed = jd_ut - prevDaySunset;
    hourNumber = Math.floor(elapsed / prevNightHourLength) + 1;
    if (hourNumber > 12) hourNumber = 12;
    if (hourNumber < 1) hourNumber = 1;
  }

  // Determine day of week from JD
  // Math.floor(JD + 1.5) % 7 gives: 0=Sun, 1=Mon, 2=Tue, ..., 6=Sat
  // This directly matches DAY_RULERS index (0=Sun, ..., 6=Sat)
  const dayOfWeek = Math.floor(jd_ut + 1.5) % 7;

  // If it's before sunrise, we're still in the previous day's night hours
  let effectiveDayOfWeek = dayOfWeek;
  if (!isDay && jd_ut < sunriseJD) {
    effectiveDayOfWeek = (dayOfWeek + 6) % 7; // previous day
  }

  const dayRuler = DAY_RULERS[effectiveDayOfWeek];

  // Find the starting index in the Chaldean order for this day
  const startIndex = CHALDEAN_ORDER.indexOf(dayRuler);

  // The hour offset: day hours 1-12 start from the day ruler,
  // night hours 1-12 continue from where day hours left off
  let totalHourOffset;
  if (isDay) {
    totalHourOffset = hourNumber - 1;
  } else {
    totalHourOffset = 12 + hourNumber - 1;
  }

  const planetIndex = (startIndex + totalHourOffset) % 7;
  const hourPlanet = CHALDEAN_ORDER[planetIndex];

  return {
    planet: hourPlanet,
    planetTr: DAY_RULERS_TR[hourPlanet] || hourPlanet,
    hourNumber,
    isDay,
    isDayTr: isDay ? 'Gündüz' : 'Gece',
    dayRuler,
    dayRulerTr: DAY_RULERS_TR[dayRuler] || dayRuler,
  };
}
