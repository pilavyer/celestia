// src/transit.js
import * as swe from 'sweph';
import path from 'path';
import { fileURLToPath } from 'url';
import { CELESTIAL_BODIES, ASPECTS } from './constants.js';
import { calculateNatalChart } from './calculator.js';
import { calculateCrossAspects, roundTo } from './aspects.js';
import { longitudeToSign, determineMoonPhase } from './utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ephePath = path.join(__dirname, '..', 'ephe');
swe.set_ephe_path(ephePath);

const calcFlags = swe.constants.SEFLG_SWIEPH | swe.constants.SEFLG_SPEED;

// Transit orb ölçeği — natal'in yarısı
const TRANSIT_ORB_SCALE = 0.5;

// Türkçe gezegen isimleri haritası
const PLANET_TR = {};
CELESTIAL_BODIES.forEach(b => { PLANET_TR[b.name] = b.trName; });
PLANET_TR['South Node'] = 'Güney Ay Düğümü';
PLANET_TR['Ascendant'] = 'Yükselen';
PLANET_TR['Midheaven'] = 'Gökyüzü Ortası';

// Ay faz Türkçe isimleri
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

// ========== HELPER FONKSİYONLAR ==========

/**
 * Tek bir Julian Day'de tüm gezegen pozisyonlarını hesapla (house hesabı yok).
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
 * Şu anki UTC zamanı → Julian Day (ET).
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
 * Takvim tarihi → Julian Day (ET).
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
 * Julian Day → "d-M-yyyy" format string (AstroAK uyumlu).
 */
export function jdToDateStr(jd) {
  const rev = swe.revjul(jd, swe.constants.SE_GREG_CAL);
  return `${rev.day}-${rev.month}-${rev.year}`;
}

/**
 * Golden section search ile transit'in exact zamanını bul.
 * approxJD ±1 gün penceresi içinde, ~8.6 saniye hassasiyet.
 */
export function refineExactTime(transitPlanetId, natalLongitude, aspectAngle, approxJD) {
  const tolerance = 0.0001; // ~8.6 saniye
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
 * Transit gezegenler arasında retrograd olanları listele.
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
 * Ay metrikleri hesapla: burç, faz, illumination, perigee/apogee.
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

// ========== ANA FONKSİYON ==========

/**
 * Transit hesapla.
 *
 * @param {object} natalParams - Natal doğum bilgileri
 * @param {object} options - { days, startDate, topN }
 * @returns {object} Transit verileri
 */
export function calculateTransits(natalParams, options = {}) {
  const { days = 30, startDate, topN = 10 } = options;

  // 1. Natal harita hesapla
  const natal = calculateNatalChart(natalParams);

  // 2. Natal bodies dizisi (gezegenler + ASC + MC)
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

  // 3. Start/End JD hesapla
  let startJD;
  if (startDate) {
    const parts = startDate.split('-');
    startJD = dateToJD(parseInt(parts[0]), parseInt(parts[1]), parseInt(parts[2]), 0);
  } else {
    startJD = nowToJD();
  }
  const endJD = startJD + days;

  // Today ve week boundaries
  const todayJD = nowToJD();
  const todayEndJD = todayJD + 1;
  const weekEndJD = todayJD + 7;

  // 4. Günlük tarama — 0.5 günlük adımlar (12 saatlik aralıklar)
  const stepDays = 0.5;
  const activeAspects = new Map(); // key: "transitName-natalName-aspectName"
  const allEvents = [];

  // Transit gezegenler (ASC/MC transit olarak kullanılmaz)
  const transitBodyDefs = CELESTIAL_BODIES.filter(b =>
    !['True Node', 'Lilith'].includes(b.name) // Node ve Lilith dahil etmiyoruz transit gezegen olarak - sadece natal hedef
  );
  // Aslında tüm CELESTIAL_BODIES transit gezegen olarak kullanılabilir
  // Plan'a göre tüm gezegenler transit olarak taranacak

  for (let jd = startJD; jd <= endJD; jd += stepDays) {
    const transitPlanets = getPlanetPositionsAtJD(jd);

    for (const tp of transitPlanets) {
      for (const nb of natalBodies) {
        // Aynı gezegen Conjunction (0°) yapamaz ama diğer aspektler yapabilir
        // (örn: transit Neptune sextile natal Neptune)
        const isSamePlanet = tp.name === nb.name;

        let diff = Math.abs(tp.longitude - nb.longitude);
        if (diff > 180) diff = 360 - diff;

        for (const aspect of ASPECTS) {
          // Aynı gezegen kendisiyle Conjunction yapamaz (her zaman 0° civarı olur)
          if (isSamePlanet && aspect.angle === 0) continue;

          // Transit orb: natal'in yarısı
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
            // Orb içinde
            if (!activeAspects.has(key)) {
              // Yeni event
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
              // Mevcut event'i güncelle — daha dar orb varsa
              const existing = activeAspects.get(key);
              if (deviation < existing.minDeviation) {
                existing.minDeviation = deviation;
                existing.minDeviationJD = jd;
              }
            }

            // Bu çift için sadece bir aspekt
            break;
          } else if (activeAspects.has(key)) {
            // Orb'dan çıktı — event'i finalize et
            const event = activeAspects.get(key);
            const exactJD = refineExactTime(event.transitPlanetId, event.natalLongitude, event.aspectAngle, event.minDeviationJD);

            // exactJD, enterJD'den önce olabilir (tarama başında zaten aktif olan transit)
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

  // Hala aktif olanları finalize et (endTime = null, scan sonu)
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

  // 5. allTransits: her gün en dar orb'lu snapshot (deduplicated)
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

  // 6. todayTransits ve weekTransits
  const todayTransits = allEvents
    .filter(ev => ev.exactJD >= todayJD && ev.exactJD < todayEndJD)
    .map(ev => formatEventSnapshot(ev))
    .sort((a, b) => a.orb - b.orb);

  const weekTransits = allEvents
    .filter(ev => ev.exactJD >= todayJD && ev.exactJD < weekEndJD)
    .map(ev => formatEventSnapshot(ev))
    .sort((a, b) => a.orb - b.orb);

  // 7. weeklyWithTiming: haftalık transitler + timing
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

  // 8. importantTransits: top N event, exact_time'a göre sıralı
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

  // 9. Lunar metrics ve retrogrades
  const currentTransitPlanets = getPlanetPositionsAtJD(todayJD);
  const lunar = calculateLunarMetrics(todayJD);
  const retrogrades = calculateRetrogrades(currentTransitPlanets);

  // Moon phase for top-level
  const moonPhase = lunar.moonPhase;

  // Ascendant sign
  const ascSign = natal.houses.ascendant.sign;

  // Tarih stringleri
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

// ========== YARDIMCI ==========

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
