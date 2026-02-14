// src/transit.js
import * as swe from 'sweph';
import path from 'path';
import { fileURLToPath } from 'url';
import { CELESTIAL_BODIES, ASPECTS } from './constants.js';
import { calculateNatalChart } from './calculator.js';
import { calculateCrossAspects } from './aspects.js';
import { longitudeToSign, determineMoonPhase, roundTo } from './utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ephePath = path.join(__dirname, '..', 'ephe');
swe.set_ephe_path(ephePath);

const calcFlags = swe.constants.SEFLG_SWIEPH | swe.constants.SEFLG_SPEED;

// Transit orb scale — half of natal orbs
const TRANSIT_ORB_SCALE = 0.5;

// Turkish planet name lookup map
const PLANET_TR = {};
CELESTIAL_BODIES.forEach(b => { PLANET_TR[b.name] = b.trName; });
PLANET_TR['South Node'] = 'Güney Ay Düğümü';
PLANET_TR['Ascendant'] = 'Yükselen';
PLANET_TR['Midheaven'] = 'Gökyüzü Ortası';

// Turkish moon phase name lookup map
const MOON_PHASE_TR = {
  'New Moon': 'Yeni Ay',
  'Waxing Crescent': 'Hilal (Büyüyen)',
  'First Quarter': 'İlk Dördün',
  'Waxing Gibbous': 'Şişkin Ay (Büyüyen)',
  'Full Moon': 'Dolunay',
  'Waning Gibbous': 'Şişkin Ay (Küçülen)',
  'Last Quarter': 'Son Dördün',
  'Waning Crescent': 'Hilal (Küçülen)',
};

// ========== HELPER FUNCTIONS ==========

/**
 * Calculate all planet positions at a single Julian Day (no house calculation).
 */
export function getPlanetPositionsAtJD(jd_et) {
  const planets = CELESTIAL_BODIES.map(body => {
    const result = swe.calc_ut(jd_et, body.id, calcFlags);
    return {
      id: body.id,
      name: body.name,
      trName: body.trName,
      longitude: result.data[0],
      latitude: result.data[1],
      distance: result.data[2],
      speed: result.data[3],
    };
  });

  // South Node
  const northNode = planets.find(p => p.name === 'True Node');
  if (northNode) {
    planets.push({
      id: -1,
      name: 'South Node',
      trName: 'Güney Ay Düğümü',
      longitude: (northNode.longitude + 180) % 360,
      latitude: -northNode.latitude,
      distance: northNode.distance,
      speed: northNode.speed,
    });
  }

  return planets;
}

/**
 * Current UTC time → Julian Day (ET).
 */
export function nowToJD() {
  const now = new Date();
  const jdResult = swe.utc_to_jd(
    now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate(),
    now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds(),
    swe.constants.SE_GREG_CAL
  );
  return jdResult.data[0];
}

/**
 * Calendar date → Julian Day (ET).
 */
export function dateToJD(year, month, day, hour = 12) {
  const minutes = Math.round((hour - Math.floor(hour)) * 60);
  const jdResult = swe.utc_to_jd(
    year, month, day, Math.floor(hour), minutes, 0,
    swe.constants.SE_GREG_CAL
  );
  return jdResult.data[0];
}

/**
 * Julian Day → ISO 8601 string.
 */
export function jdToISO(jd) {
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
 * Julian Day → "d-M-yyyy" format string (AstroAK compatible).
 */
export function jdToDateStr(jd) {
  const rev = swe.revjul(jd, swe.constants.SE_GREG_CAL);
  return `${rev.day}-${rev.month}-${rev.year}`;
}

/**
 * Find the exact time of a transit using golden section search.
 * Searches within a ±1 day window around approxJD, with ~8.6 second precision.
 */
export function refineExactTime(transitPlanetId, natalLongitude, aspectAngle, approxJD) {
  const tolerance = 0.0001; // ~8.6 seconds
  let a = approxJD - 1.0;
  let b = approxJD + 1.0;

  const gr = (Math.sqrt(5) + 1) / 2; // golden ratio

  function getDeviation(jd) {
    let lon;
    if (transitPlanetId === -1) {
      // South Node: True Node + 180°
      const result = swe.calc_ut(jd, 11, calcFlags); // True Node id = 11
      lon = (result.data[0] + 180) % 360;
    } else {
      const result = swe.calc_ut(jd, transitPlanetId, calcFlags);
      lon = result.data[0];
    }
    let diff = Math.abs(lon - natalLongitude);
    if (diff > 180) diff = 360 - diff;
    return Math.abs(diff - aspectAngle);
  }

  let c = b - (b - a) / gr;
  let d = a + (b - a) / gr;

  for (let i = 0; i < 30; i++) {
    if (Math.abs(b - a) < tolerance) break;

    if (getDeviation(c) < getDeviation(d)) {
      b = d;
    } else {
      a = c;
    }

    c = b - (b - a) / gr;
    d = a + (b - a) / gr;
  }

  return (a + b) / 2;
}

/**
 * List retrograde planets among transit planets.
 */
export function calculateRetrogrades(transitPlanets) {
  return transitPlanets
    .filter(p => p.speed < 0 && !['True Node', 'South Node', 'Lilith'].includes(p.name))
    .map(p => ({
      planet: p.name,
      planetTr: PLANET_TR[p.name] || p.name,
      sign: longitudeToSign(p.longitude).sign,
    }));
}

/**
 * Calculate lunar metrics: sign, phase, illumination, perigee/apogee.
 */
export function calculateLunarMetrics(jd_et) {
  const moonResult = swe.calc_ut(jd_et, 1, calcFlags); // Moon
  const sunResult = swe.calc_ut(jd_et, 0, calcFlags);   // Sun

  const moonLon = moonResult.data[0];
  const sunLon = sunResult.data[0];
  const moonDistance = moonResult.data[2]; // AU

  const moonSignData = longitudeToSign(moonLon);
  const phaseData = determineMoonPhase(sunLon, moonLon);

  // Phase angle (Moon - Sun elongation)
  let phaseAngle = moonLon - sunLon;
  if (phaseAngle < 0) phaseAngle += 360;

  // Illumination: (1 - cos(phaseAngle)) / 2 * 100
  const illumination = roundTo((1 - Math.cos(phaseAngle * Math.PI / 180)) / 2 * 100, 1);

  // Moon age in days (synodic month ~29.53 days)
  const moonAgeInDays = roundTo(phaseAngle * 29.53 / 360, 1);
  const moonDay = Math.floor(moonAgeInDays) + 1;

  // Perigee/Apogee thresholds (AU)
  const perigeeThreshold = 0.00244; // ~364,600 km
  const apogeeThreshold = 0.00271;  // ~405,400 km

  const withinPerigee = moonDistance < perigeeThreshold;
  const withinApogee = moonDistance > apogeeThreshold;

  const isFullOrNew = phaseData.phase === 'Full Moon' || phaseData.phase === 'New Moon';
  const isSuperMoon = withinPerigee && isFullOrNew;

  return {
    moonSign: moonSignData.sign,
    moonSignTr: ['Koç','Boğa','İkizler','Yengeç','Aslan','Başak','Terazi','Akrep','Yay','Oğlak','Kova','Balık'][moonSignData.signIndex],
    moonPhase: phaseData.phase,
    moonPhaseTr: MOON_PHASE_TR[phaseData.phase] || phaseData.phase,
    moonIllumination: illumination,
    moonDay: Math.min(moonDay, 30),
    moonAgeInDays,
    isSuperMoon,
    withinPerigee,
    withinApogee,
  };
}

// ========== MAIN FUNCTION ==========

/**
 * Calculate transits.
 *
 * @param {object} natalParams - Natal birth data
 * @param {object} options - { days, startDate, topN }
 * @returns {object} Transit data
 */
export function calculateTransits(natalParams, options = {}) {
  const { days = 30, startDate, topN = 10 } = options;

  // 1. Calculate natal chart
  const natal = calculateNatalChart(natalParams);

  // 2. Natal bodies array (planets + ASC + MC)
  const natalBodies = [
    ...natal.planets.map(p => ({
      id: p.id,
      name: p.name,
      trName: p.trName,
      longitude: p.longitude,
      speed: p.speed,
    })),
    {
      id: -100, name: 'Ascendant', trName: 'Yükselen',
      longitude: natal.houses.ascendant.longitude, speed: 0,
    },
    {
      id: -101, name: 'Midheaven', trName: 'Gökyüzü Ortası',
      longitude: natal.houses.midheaven.longitude, speed: 0,
    },
  ];

  // 3. Calculate Start/End JD
  let startJD;
  if (startDate) {
    const parts = startDate.split('-');
    startJD = dateToJD(parseInt(parts[0]), parseInt(parts[1]), parseInt(parts[2]), 0);
  } else {
    startJD = nowToJD();
  }
  const endJD = startJD + days;

  // Today and week boundaries
  const todayJD = nowToJD();
  const todayEndJD = todayJD + 1;
  const weekEndJD = todayJD + 7;

  // 4. Daily scan — 0.5-day steps (12-hour intervals)
  const stepDays = 0.5;
  const activeAspects = new Map(); // key: "transitName-natalName-aspectName"
  const allEvents = [];

  // Transit planets (ASC/MC are not used as transit bodies)
  const transitBodyDefs = CELESTIAL_BODIES.filter(b =>
    !['True Node', 'Lilith'].includes(b.name) // Node and Lilith excluded as transit planets — natal targets only
  );
  // In practice all CELESTIAL_BODIES can be used as transit planets
  // Per the plan, all planets are scanned as transiting bodies

  for (let jd = startJD; jd <= endJD; jd += stepDays) {
    const transitPlanets = getPlanetPositionsAtJD(jd);

    for (const tp of transitPlanets) {
      for (const nb of natalBodies) {
        // Same planet cannot form Conjunction (0°) but can form other aspects
        // (e.g., transit Neptune sextile natal Neptune)
        const isSamePlanet = tp.name === nb.name;

        let diff = Math.abs(tp.longitude - nb.longitude);
        if (diff > 180) diff = 360 - diff;

        for (const aspect of ASPECTS) {
          // Same planet cannot conjunct itself (always near 0°)
          if (isSamePlanet && aspect.angle === 0) continue;

          // Transit orb: half of natal orb
          let effectiveOrb = aspect.orb * TRANSIT_ORB_SCALE;

          // Luminary modifier
          const luminaries = ['Sun', 'Moon'];
          if (luminaries.includes(tp.name) || luminaries.includes(nb.name)) {
            effectiveOrb *= 1.25;
          }

          // Angle modifier
          const angles = ['Ascendant', 'Midheaven'];
          if (angles.includes(tp.name) || angles.includes(nb.name)) {
            effectiveOrb *= 0.75;
          }

          const deviation = Math.abs(diff - aspect.angle);
          const key = `${tp.name}-${nb.name}-${aspect.name}`;

          if (deviation <= effectiveOrb) {
            // Within orb
            if (!activeAspects.has(key)) {
              // New event
              activeAspects.set(key, {
                transitPlanet: tp.name,
                transitPlanetTr: PLANET_TR[tp.name] || tp.name,
                transitPlanetId: tp.id,
                natalPlanet: nb.name,
                natalPlanetTr: PLANET_TR[nb.name] || nb.name,
                natalLongitude: nb.longitude,
                type: aspect.name,
                typeTr: aspect.trName,
                symbol: aspect.symbol,
                aspectAngle: aspect.angle,
                maxOrb: roundTo(effectiveOrb, 2),
                enterJD: jd,
                minDeviation: deviation,
                minDeviationJD: jd,
              });
            } else {
              // Update existing event — if tighter orb found
              const existing = activeAspects.get(key);
              if (deviation < existing.minDeviation) {
                existing.minDeviation = deviation;
                existing.minDeviationJD = jd;
              }
            }

            // Only one aspect per pair
            break;
          } else if (activeAspects.has(key)) {
            // Exited orb — finalize the event
            const event = activeAspects.get(key);
            const exactJD = refineExactTime(event.transitPlanetId, event.natalLongitude, event.aspectAngle, event.minDeviationJD);

            // exactJD may precede enterJD (transit already active at scan start)
            const eventStartJD = Math.min(event.enterJD, exactJD);

            allEvents.push({
              transitPlanet: event.transitPlanet,
              transitPlanetTr: event.transitPlanetTr,
              natalPlanet: event.natalPlanet,
              natalPlanetTr: event.natalPlanetTr,
              type: event.type,
              typeTr: event.typeTr,
              symbol: event.symbol,
              orb: roundTo(event.minDeviation, 3),
              maxOrb: event.maxOrb,
              strength: calculateStrength(event.minDeviation, event.maxOrb),
              startTime: jdToISO(eventStartJD),
              exactTime: jdToISO(exactJD),
              endTime: jdToISO(jd),
              startJD: eventStartJD,
              exactJD,
              endJD: jd,
            });

            activeAspects.delete(key);
            break;
          }
        }
      }
    }
  }

  // Finalize still-active aspects (endTime = null, end of scan)
  for (const [key, event] of activeAspects.entries()) {
    const exactJD = refineExactTime(event.transitPlanetId, event.natalLongitude, event.aspectAngle, event.minDeviationJD);
    const eventStartJD = Math.min(event.enterJD, exactJD);

    allEvents.push({
      transitPlanet: event.transitPlanet,
      transitPlanetTr: event.transitPlanetTr,
      natalPlanet: event.natalPlanet,
      natalPlanetTr: event.natalPlanetTr,
      type: event.type,
      typeTr: event.typeTr,
      symbol: event.symbol,
      orb: roundTo(event.minDeviation, 3),
      maxOrb: event.maxOrb,
      strength: calculateStrength(event.minDeviation, event.maxOrb),
      startTime: jdToISO(eventStartJD),
      exactTime: jdToISO(exactJD),
      endTime: null,
      startJD: eventStartJD,
      exactJD,
      endJD: null,
    });
  }

  // 5. allTransits: tightest-orb snapshot per day (deduplicated)
  const allTransitsMap = new Map();
  for (const ev of allEvents) {
    const dateStr = jdToDateStr(ev.exactJD);
    const key = `${ev.transitPlanet}-${ev.natalPlanet}-${ev.type}`;
    if (!allTransitsMap.has(key) || ev.orb < allTransitsMap.get(key).orb) {
      allTransitsMap.set(key, {
        date: dateStr,
        transitPlanet: ev.transitPlanet,
        transitPlanetTr: ev.transitPlanetTr,
        natalPlanet: ev.natalPlanet,
        natalPlanetTr: ev.natalPlanetTr,
        type: ev.type,
        typeTr: ev.typeTr,
        symbol: ev.symbol,
        orb: roundTo(ev.orb, 2),
        maxOrb: ev.maxOrb,
        strength: ev.strength,
      });
    }
  }
  const allTransits = [...allTransitsMap.values()].sort((a, b) => a.orb - b.orb);

  // 6. todayTransits and weekTransits
  const todayTransits = allEvents
    .filter(ev => ev.exactJD >= todayJD && ev.exactJD < todayEndJD)
    .map(ev => formatEventSnapshot(ev))
    .sort((a, b) => a.orb - b.orb);

  const weekTransits = allEvents
    .filter(ev => ev.exactJD >= todayJD && ev.exactJD < weekEndJD)
    .map(ev => formatEventSnapshot(ev))
    .sort((a, b) => a.orb - b.orb);

  // 7. weeklyWithTiming: weekly transits + timing
  const weeklyWithTiming = allEvents
    .filter(ev => ev.exactJD >= todayJD && ev.exactJD < weekEndJD)
    .map(ev => ({
      transitPlanet: ev.transitPlanet,
      transitPlanetTr: ev.transitPlanetTr,
      natalPlanet: ev.natalPlanet,
      natalPlanetTr: ev.natalPlanetTr,
      type: ev.type,
      typeTr: ev.typeTr,
      symbol: ev.symbol,
      orb: roundTo(ev.orb, 3),
      maxOrb: ev.maxOrb,
      strength: ev.strength,
      startTime: ev.startTime,
      exactTime: ev.exactTime,
      endTime: ev.endTime,
    }))
    .sort((a, b) => a.orb - b.orb);

  // 8. importantTransits: top N events, sorted by exact_time
  const importantTransits = [...allEvents]
    .sort((a, b) => a.orb - b.orb)
    .slice(0, topN)
    .map(ev => ({
      transitPlanet: ev.transitPlanet,
      transitPlanetTr: ev.transitPlanetTr,
      natalPlanet: ev.natalPlanet,
      natalPlanetTr: ev.natalPlanetTr,
      type: ev.type,
      typeTr: ev.typeTr,
      symbol: ev.symbol,
      orb: roundTo(ev.orb, 3),
      maxOrb: ev.maxOrb,
      strength: ev.strength,
      startTime: ev.startTime,
      exactTime: ev.exactTime,
      endTime: ev.endTime,
    }))
    .sort((a, b) => (a.exactTime || '').localeCompare(b.exactTime || ''));

  // 9. Lunar metrics and retrogrades
  const currentTransitPlanets = getPlanetPositionsAtJD(todayJD);
  const lunar = calculateLunarMetrics(todayJD);
  const retrogrades = calculateRetrogrades(currentTransitPlanets);

  // Moon phase for top-level
  const moonPhase = lunar.moonPhase;

  // Ascendant sign
  const ascSign = natal.houses.ascendant.sign;

  // Date strings
  const monthStartDate = jdToDateStr(startJD);
  const monthEndDate = jdToDateStr(endJD);

  // allEvents for response (clean JD fields)
  const allEventsClean = allEvents.map(ev => ({
    transitPlanet: ev.transitPlanet,
    transitPlanetTr: ev.transitPlanetTr,
    natalPlanet: ev.natalPlanet,
    natalPlanetTr: ev.natalPlanetTr,
    type: ev.type,
    typeTr: ev.typeTr,
    symbol: ev.symbol,
    orb: roundTo(ev.orb, 3),
    maxOrb: ev.maxOrb,
    strength: ev.strength,
    startTime: ev.startTime,
    exactTime: ev.exactTime,
    endTime: ev.endTime,
  })).sort((a, b) => (a.exactTime || '').localeCompare(b.exactTime || ''));

  return {
    success: true,
    monthStartDate,
    monthEndDate,
    periodDays: days,
    ascendant: ascSign,
    moonPhase,
    retrogrades,
    allTransits,
    todayTransits,
    weekTransits,
    weeklyWithTiming,
    importantTransits,
    allEvents: allEventsClean,
    lunar,
    fetchedAt: new Date().toISOString(),
    meta: {
      engine: 'Celestia (Swiss Ephemeris)',
      transitOrbScale: TRANSIT_ORB_SCALE,
    },
  };
}

// ========== UTILITIES ==========

function calculateStrength(deviation, maxOrb) {
  if (maxOrb === 0) return 100;
  const strength = Math.round((1 - deviation / maxOrb) * 100);
  return Math.max(0, Math.min(100, strength));
}

function formatEventSnapshot(ev) {
  return {
    date: jdToDateStr(ev.exactJD),
    transitPlanet: ev.transitPlanet,
    transitPlanetTr: ev.transitPlanetTr,
    natalPlanet: ev.natalPlanet,
    natalPlanetTr: ev.natalPlanetTr,
    type: ev.type,
    typeTr: ev.typeTr,
    symbol: ev.symbol,
    orb: roundTo(ev.orb, 2),
    maxOrb: ev.maxOrb,
    strength: ev.strength,
  };
}
