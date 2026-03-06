// src/eclipses.js
// Eclipse calculation module — solar and lunar eclipses
import * as swe from 'sweph';
import path from 'path';
import { fileURLToPath } from 'url';
import { CELESTIAL_BODIES, ASPECTS } from './constants.js';
import { longitudeToSign, roundTo } from './utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ephePath = path.join(__dirname, '..', 'ephe');
swe.set_ephe_path(ephePath);

const calcFlags = swe.constants.SEFLG_SWIEPH | swe.constants.SEFLG_SPEED;

// Eclipse type bitmask constants
const SE_ECL_TOTAL = 4;
const SE_ECL_ANNULAR = 8;
const SE_ECL_PARTIAL = 16;
const SE_ECL_ANNULAR_TOTAL = 32;  // hybrid
const SE_ECL_PENUMBRAL = 64;

// Saros cycle: ~6585.32 days (223 synodic months)
const SAROS_CYCLE_DAYS = 6585.3211;
// Reference Saros eclipse: 6 Jan 2000, Solar Total, Saros 117
const SAROS_REF_JD = 2451549.5; // ~6 Jan 2000
const SAROS_REF_SERIES = 117;

/**
 * Julian Day → ISO 8601 string.
 */
function jdToISO(jd) {
  const rev = swe.revjul(jd, swe.constants.SE_GREG_CAL);
  const y = rev.year;
  const m = String(rev.month).padStart(2, '0');
  const d = String(rev.day).padStart(2, '0');
  const hourDec = rev.hour;
  const hh = Math.floor(hourDec);
  const mm = Math.floor((hourDec - hh) * 60);
  const ss = Math.floor(((hourDec - hh) * 60 - mm) * 60);
  return `${y}-${m}-${d}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}.000Z`;
}

/**
 * Decode eclipse type bitmask to human-readable subType.
 */
function decodeEclipseSubType(typeFlag, isSolar) {
  if (isSolar) {
    if (typeFlag & SE_ECL_TOTAL) return 'total';
    if (typeFlag & SE_ECL_ANNULAR_TOTAL) return 'hybrid';
    if (typeFlag & SE_ECL_ANNULAR) return 'annular';
    if (typeFlag & SE_ECL_PARTIAL) return 'partial';
    return 'unknown';
  } else {
    if (typeFlag & SE_ECL_TOTAL) return 'total';
    if (typeFlag & SE_ECL_PENUMBRAL) return 'penumbral';
    if (typeFlag & SE_ECL_PARTIAL) return 'partial';
    return 'unknown';
  }
}

/**
 * Estimate Saros series number from eclipse JD.
 * This is an approximation based on the Saros cycle period.
 */
function estimateSarosSeries(eclipseJD, isSolar) {
  const cycleDiff = (eclipseJD - SAROS_REF_JD) / SAROS_CYCLE_DAYS;
  const sarosOffset = Math.round(cycleDiff);
  // Solar and lunar eclipses have different saros numbering
  // This gives a reasonable estimate
  let series = SAROS_REF_SERIES + sarosOffset;
  if (series < 1) series += 223; // wrap around
  return series;
}

/**
 * Calculate eclipses for a given time range.
 *
 * @param {object} params
 * @param {number} [params.year] - Year to search (defaults to full year)
 * @param {string} [params.startDate] - Start date YYYY-MM-DD
 * @param {string} [params.endDate] - End date YYYY-MM-DD
 * @param {object} [params.natal] - Optional natal chart data for aspect calculation
 * @returns {object} Eclipse data
 */
export function calculateEclipses(params = {}) {
  const { year, startDate, endDate, natal } = params;

  // Determine search range
  let startJD, endJDLimit;

  if (startDate && endDate) {
    const [sy, sm, sd] = startDate.split('-').map(Number);
    const [ey, em, ed] = endDate.split('-').map(Number);
    const startResult = swe.utc_to_jd(sy, sm, sd, 0, 0, 0, swe.constants.SE_GREG_CAL);
    const endResult = swe.utc_to_jd(ey, em, ed, 23, 59, 59, swe.constants.SE_GREG_CAL);
    startJD = startResult.data[0];
    endJDLimit = endResult.data[0];
  } else if (year) {
    const startResult = swe.utc_to_jd(year, 1, 1, 0, 0, 0, swe.constants.SE_GREG_CAL);
    const endResult = swe.utc_to_jd(year, 12, 31, 23, 59, 59, swe.constants.SE_GREG_CAL);
    startJD = startResult.data[0];
    endJDLimit = endResult.data[0];
  } else {
    throw new Error('Either year or startDate+endDate is required');
  }

  const eclipses = [];

  // ========== SOLAR ECLIPSES ==========
  let searchJD = startJD;
  let safetyCounter = 0;

  while (searchJD < endJDLimit && safetyCounter < 20) {
    safetyCounter++;
    try {
      const result = swe.sol_eclipse_when_glob(searchJD, calcFlags, 0, false);
      if (!result || !result.data || result.data[0] === 0) break;

      const eclipseMaxJD = result.data[0]; // maximum eclipse JD
      if (eclipseMaxJD > endJDLimit) break;
      if (eclipseMaxJD <= searchJD) {
        searchJD += 20; // skip forward to avoid infinite loop
        continue;
      }

      // Get Sun position at eclipse maximum (= eclipse longitude)
      const sunResult = swe.calc(eclipseMaxJD, 0, calcFlags);
      const eclipseLon = sunResult.data[0];
      const signData = longitudeToSign(eclipseLon);

      const eclipse = {
        type: 'solar',
        subType: decodeEclipseSubType(result.flag || result.data?.[7] || SE_ECL_PARTIAL, true),
        date: jdToISO(eclipseMaxJD),
        jd: roundTo(eclipseMaxJD, 6),
        longitude: roundTo(eclipseLon, 4),
        sign: signData.sign,
        signTr: signData.signTr,
        degree: signData.degree,
        minute: signData.minute,
        formattedPosition: `${signData.degree}°${String(signData.minute).padStart(2, '0')}' ${signData.sign}`,
        sarosSeries: estimateSarosSeries(eclipseMaxJD, true),
      };

      eclipses.push(eclipse);
      searchJD = eclipseMaxJD + 20; // next eclipse at least ~20 days later
    } catch (e) {
      break;
    }
  }

  // ========== LUNAR ECLIPSES ==========
  searchJD = startJD;
  safetyCounter = 0;

  while (searchJD < endJDLimit && safetyCounter < 20) {
    safetyCounter++;
    try {
      const result = swe.lun_eclipse_when(searchJD, calcFlags, 0, false);
      if (!result || !result.data || result.data[0] === 0) break;

      const eclipseMaxJD = result.data[0];
      if (eclipseMaxJD > endJDLimit) break;
      if (eclipseMaxJD <= searchJD) {
        searchJD += 20;
        continue;
      }

      // Moon position at eclipse maximum
      const moonResult = swe.calc(eclipseMaxJD, 1, calcFlags);
      const eclipseLon = moonResult.data[0];
      const signData = longitudeToSign(eclipseLon);

      const eclipse = {
        type: 'lunar',
        subType: decodeEclipseSubType(result.flag || result.data?.[7] || SE_ECL_PARTIAL, false),
        date: jdToISO(eclipseMaxJD),
        jd: roundTo(eclipseMaxJD, 6),
        longitude: roundTo(eclipseLon, 4),
        sign: signData.sign,
        signTr: signData.signTr,
        degree: signData.degree,
        minute: signData.minute,
        formattedPosition: `${signData.degree}°${String(signData.minute).padStart(2, '0')}' ${signData.sign}`,
        sarosSeries: estimateSarosSeries(eclipseMaxJD, false),
      };

      eclipses.push(eclipse);
      searchJD = eclipseMaxJD + 20;
    } catch (e) {
      break;
    }
  }

  // Sort by date
  eclipses.sort((a, b) => a.jd - b.jd);

  // ========== NATAL ASPECTS (optional) ==========
  let natalAspects = null;
  if (natal && natal.planets) {
    natalAspects = [];

    for (const eclipse of eclipses) {
      const eclipseAspects = [];

      for (const planet of natal.planets) {
        let diff = Math.abs(eclipse.longitude - planet.longitude);
        if (diff > 180) diff = 360 - diff;

        for (const aspect of ASPECTS) {
          let effectiveOrb = aspect.orb * 0.5; // tight orbs for eclipses
          // Luminary widening
          if (['Sun', 'Moon'].includes(planet.name)) {
            effectiveOrb *= 1.25;
          }

          const deviation = Math.abs(diff - aspect.angle);
          if (deviation <= effectiveOrb) {
            eclipseAspects.push({
              planet: planet.name,
              planetTr: planet.trName,
              natalLongitude: roundTo(planet.longitude, 4),
              aspect: aspect.name,
              aspectTr: aspect.trName,
              symbol: aspect.symbol,
              orb: roundTo(deviation, 2),
            });
            break;
          }
        }
      }

      natalAspects.push({
        eclipseDate: eclipse.date,
        eclipseType: eclipse.type,
        eclipseSign: eclipse.sign,
        aspects: eclipseAspects,
      });
    }
  }

  const result = {
    success: true,
    searchRange: {
      start: jdToISO(startJD),
      end: jdToISO(endJDLimit),
    },
    totalEclipses: eclipses.length,
    solarCount: eclipses.filter(e => e.type === 'solar').length,
    lunarCount: eclipses.filter(e => e.type === 'lunar').length,
    eclipses,
  };

  if (natalAspects) {
    result.natalAspects = natalAspects;
  }

  return result;
}
