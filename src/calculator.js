// src/calculator.js
import * as swe from 'sweph';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { CELESTIAL_BODIES, SIGNS, HOUSE_SYSTEMS } from './constants.js';
import { birthTimeToUTC } from './timezone.js';
import { calculateAspects } from './aspects.js';
import { getDignity, getSignRuler } from './dignities.js';
import {
  longitudeToSign,
  determineMoonPhase,
  calculatePartOfFortune,
  getElementDistribution,
  getModalityDistribution,
  determineHemisphereEmphasis,
  findPlanetInHouse,
  roundTo,
} from './utils.js';
import {
  getBodyAreas, getCombustionStatus, getCriticalDegree,
  getSpeedClassification, calculatePlanetaryStrength, calculateProfection,
  calculateMedicalArabicParts, calculateAntiscia, HOUSE_HEALTH_MAP,
  MEDICAL_FIXED_STARS, OOB_MEDICAL,
  PROGRESSED_MOON_HEALTH, MEDICAL_MIDPOINTS, SIGN_BODY_MAP,
} from './medical.js';

const require = createRequire(import.meta.url);
const { version } = require('../package.json');

// __dirname ES module equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ephemeris dosya yolunu ayarla
// KRİTİK: Bu fonksiyon TÜM hesaplamalardan önce çağrılmalı
// Dahili initialization yapar, null geçilse bile çağrılması şart
const ephePath = path.join(__dirname, '..', 'ephe');
swe.set_ephe_path(ephePath);

/**
 * Tam doğum haritası hesapla.
 *
 * @param {object} params - Doğum bilgileri
 * @param {number} params.year - Doğum yılı
 * @param {number} params.month - Doğum ayı (1-12)
 * @param {number} params.day - Doğum günü
 * @param {number} params.hour - Doğum saati (0-23)
 * @param {number} params.minute - Doğum dakikası (0-59)
 * @param {number} params.latitude - Doğum yeri enlemi (kuzey pozitif)
 * @param {number} params.longitude - Doğum yeri boylamı (doğu pozitif, BATI NEGATİF)
 * @param {string} params.timezone - IANA timezone (örn: "Europe/Istanbul")
 * @param {string} [params.houseSystem='P'] - Ev sistemi kodu (varsayılan: Placidus)
 * @returns {object} Tam doğum haritası verisi
 */
export function calculateNatalChart({
  year, month, day, hour, minute,
  latitude, longitude, timezone,
  houseSystem = 'P'
}) {
  // ========== GİRDİ DOĞRULAMA ==========

  if (!HOUSE_SYSTEMS[houseSystem]) {
    throw new Error(
      `Geçersiz ev sistemi: "${houseSystem}". ` +
      `Desteklenen sistemler: ${Object.keys(HOUSE_SYSTEMS).join(', ')}`
    );
  }

  if (latitude < -90 || latitude > 90) {
    throw new Error(`Geçersiz enlem: ${latitude}. -90 ile 90 arasında olmalı.`);
  }

  if (longitude < -180 || longitude > 180) {
    throw new Error(`Geçersiz boylam: ${longitude}. -180 ile 180 arasında olmalı.`);
  }

  if (month < 1 || month > 12) {
    throw new Error(`Geçersiz ay: ${month}. 1-12 arasında olmalı.`);
  }

  if (day < 1 || day > 31) {
    throw new Error(`Geçersiz gün: ${day}. 1-31 arasında olmalı.`);
  }

  if (hour < 0 || hour > 23) {
    throw new Error(`Geçersiz saat: ${hour}. 0-23 arasında olmalı.`);
  }

  if (minute < 0 || minute > 59) {
    throw new Error(`Geçersiz dakika: ${minute}. 0-59 arasında olmalı.`);
  }

  // ========== TIMEZONE DÖNÜŞÜMÜ ==========

  const utcData = birthTimeToUTC(year, month, day, hour, minute, timezone);

  // ========== JULIAN DAY HESABI ==========

  // utc_to_jd hem jd_et (Ephemeris Time) hem jd_ut (Universal Time) döndürür
  // KRİTİK: julday() yerine utc_to_jd() kullan — ΔT dönüşümünü otomatik yapar
  const jdResult = swe.utc_to_jd(
    utcData.utcYear,
    utcData.utcMonth,
    utcData.utcDay,
    utcData.utcHour,
    utcData.utcMinute,
    utcData.utcSecond,
    swe.constants.SE_GREG_CAL
  );

  // jdResult.data[0] = JD in ET (Ephemeris Time) — gezegen hesapları için
  // jdResult.data[1] = JD in UT (Universal Time) — ev hesapları için
  const jd_et = jdResult.data[0];
  const jd_ut = jdResult.data[1];

  // ========== GEZEGEN POZİSYONLARI ==========

  // SEFLG_SWIEPH: Swiss Ephemeris dosyalarını kullan (yoksa Moshier'e fallback)
  // SEFLG_SPEED: Hız verisi de döndür (retrograd tespiti için şart)
  const calcFlags = swe.constants.SEFLG_SWIEPH | swe.constants.SEFLG_SPEED;

  const planets = CELESTIAL_BODIES.map(body => {
    const result = swe.calc_ut(jd_et, body.id, calcFlags);

    // result.flag kontrol et — input flag'den farklıysa Moshier fallback olmuş olabilir
    const usedMoshier = (result.flag & swe.constants.SEFLG_SWIEPH) === 0;

    // result.data dizisi:
    // [0] = ekliptik boylam (0-360°)
    // [1] = ekliptik enlem
    // [2] = mesafe (AU)
    // [3] = boylam hızı (°/gün) — negatif = retrograd
    // [4] = enlem hızı
    // [5] = mesafe hızı
    const lon = result.data[0];
    const lat = result.data[1];
    const distance = result.data[2];
    const speedLon = result.data[3];

    const signData = longitudeToSign(lon);

    return {
      id: body.id,
      name: body.name,
      trName: body.trName,
      longitude: roundTo(lon, 6),
      latitude: roundTo(lat, 6),
      distance: roundTo(distance, 6),
      speed: roundTo(speedLon, 6),
      sign: signData.sign,
      signIndex: signData.signIndex,
      degree: signData.degree,
      minute: signData.minute,
      second: signData.second,
      isRetrograde: speedLon < 0,
      dignity: getDignity(body.name, signData.sign),
      formattedPosition: `${signData.degree}°${String(signData.minute).padStart(2, '0')}'${String(signData.second).padStart(2, '0')}" ${signData.sign}`,
      usedMoshierFallback: usedMoshier,
    };
  });

  // Güney Düğümü hesapla (Kuzey Düğümü + 180°)
  const northNode = planets.find(p => p.name === 'True Node');
  if (northNode) {
    const southLon = (northNode.longitude + 180) % 360;
    const southSignData = longitudeToSign(southLon);

    planets.push({
      id: -1,
      name: 'South Node',
      trName: 'Güney Ay Düğümü',
      longitude: roundTo(southLon, 6),
      latitude: roundTo(-northNode.latitude, 6),
      distance: northNode.distance,
      speed: northNode.speed,
      sign: southSignData.sign,
      signIndex: southSignData.signIndex,
      degree: southSignData.degree,
      minute: southSignData.minute,
      second: southSignData.second,
      isRetrograde: northNode.isRetrograde,
      dignity: null,
      formattedPosition: `${southSignData.degree}°${String(southSignData.minute).padStart(2, '0')}'${String(southSignData.second).padStart(2, '0')}" ${southSignData.sign}`,
      usedMoshierFallback: false,
    });
  }

  // ========== EV HESABI ==========

  // KRİTİK: houses fonksiyonu jd_ut (Universal Time) alır, jd_et DEĞİL!
  // KRİTİK: Swiss Ephemeris batı boylamı için NEGATİF değer bekler
  const housesResult = swe.houses(jd_ut, latitude, longitude, houseSystem);

  // housesResult.data.houses: 0-indexed dizi (houses[0] = Ev 1, houses[11] = Ev 12)
  // housesResult.data.points: [ASC, MC, ARMC, Vertex, EquatorialASC, co-ASC Koch, co-ASC Munkasey, PolarASC]
  const rawHouses = housesResult.data.houses;
  const points = housesResult.data.points;

  // 1-indexed cusps dizisine çevir (cusps[1]-cusps[12], cusps[0] boş)
  const cusps = [0, ...rawHouses];

  const ascendant = points[0];
  const midheaven = points[1];
  const armc = points[2]; // Sidereal time (ARMC)
  const vertex = points[3];

  // Polar enlem uyarısı (Placidus ve Koch ~66.5° üstünde başarısız olur)
  const warnings = [...utcData.warnings];

  if (['P', 'K'].includes(houseSystem) && Math.abs(latitude) > 66) {
    warnings.push(
      `${HOUSE_SYSTEMS[houseSystem].name} ev sistemi ${Math.abs(latitude)}° enlemde güvenilir olmayabilir. ` +
      `Kutup bölgelerinde Whole Sign ("W") sistemi önerilir. ` +
      `Swiss Ephemeris otomatik olarak Porphyry'e geçmiş olabilir.`
    );
  }

  // Ev cusp'larını detaylı formata çevir
  const houses = [];
  for (let i = 1; i <= 12; i++) {
    const cuspData = longitudeToSign(cusps[i]);
    houses.push({
      house: i,
      cusp: roundTo(cusps[i], 6),
      sign: cuspData.sign,
      degree: cuspData.degree,
      minute: cuspData.minute,
      formattedCusp: `${cuspData.degree}°${String(cuspData.minute).padStart(2, '0')}' ${cuspData.sign}`,
      healthDomain: HOUSE_HEALTH_MAP[i],
    });
  }

  // Ascendant ve MC detaylı
  const ascData = longitudeToSign(ascendant);
  const mcData = longitudeToSign(midheaven);
  const vtxData = longitudeToSign(vertex);

  // Her gezegenin hangi evde olduğunu bul + tıbbi astroloji verileri
  const sunPlanet = planets.find(p => p.name === 'Sun');
  const sunLon = sunPlanet ? sunPlanet.longitude : null;

  // Gündüz/gece haritası tespiti (Güneş ufkun üstünde mi?) — planetaryStrength için gerekli
  const isDayChart = sunPlanet ? isAboveHorizon(sunPlanet.longitude, ascendant) : true;

  const planetsWithHouses = planets.map(planet => {
    const house = findPlanetInHouse(planet.longitude, cusps);
    const combustion = sunLon !== null ? getCombustionStatus(planet.name, planet.longitude, sunLon) : null;
    const speedAnalysis = getSpeedClassification(planet.name, planet.speed);
    const enriched = {
      ...planet,
      house,
      bodyAreas: getBodyAreas(planet.name, planet.sign),
      combustion,
      criticalDegree: getCriticalDegree(planet.sign, planet.degree),
      speedAnalysis,
    };
    enriched.planetaryStrength = calculatePlanetaryStrength(enriched, isDayChart);
    return enriched;
  });

  // ========== ASPEKTLER ==========

  // Ascendant ve MC'yi de aspekt hesabına dahil et
  const aspectBodies = [
    ...planetsWithHouses,
    { name: 'Ascendant', trName: 'Yükselen', longitude: ascendant, speed: 0 },
    { name: 'Midheaven', trName: 'Gökyüzü Ortası', longitude: midheaven, speed: 0 },
  ];

  const aspects = calculateAspects(aspectBodies);

  // ========== CHART ANALİZİ ==========

  const sun = planetsWithHouses.find(p => p.name === 'Sun');
  const moon = planetsWithHouses.find(p => p.name === 'Moon');

  // Part of Fortune
  const partOfFortune = calculatePartOfFortune(ascendant, sun?.longitude, moon?.longitude, isDayChart);
  const pofData = longitudeToSign(partOfFortune);

  // Ay fazı
  const moonPhase = moon && sun ? determineMoonPhase(sun.longitude, moon.longitude) : null;

  // Element ve modalite dağılımı
  const elementDist = getElementDistribution(planetsWithHouses);
  const modalityDist = getModalityDistribution(planetsWithHouses);

  // Hemisfer vurgusu
  const hemisphereEmphasis = determineHemisphereEmphasis(planetsWithHouses, ascendant, midheaven);

  // Stellium tespiti (aynı burçta 3+ gezegen)
  const stelliums = findStelliums(planetsWithHouses);

  // Harita lordu (yükselen burcun yöneticisi)
  const chartRulerName = getSignRuler(ascData.sign);
  const chartRulerPlanet = planetsWithHouses.find(p => p.name === chartRulerName);
  const chartRuler = chartRulerPlanet ? {
    name: chartRulerPlanet.name,
    trName: chartRulerPlanet.trName,
    sign: chartRulerPlanet.sign,
    house: chartRulerPlanet.house,
    longitude: chartRulerPlanet.longitude,
    isRetrograde: chartRulerPlanet.isRetrograde,
    dignity: chartRulerPlanet.dignity,
    formattedPosition: chartRulerPlanet.formattedPosition,
  } : null;

  // Ev lordları (her evin cusp burcunun yöneticisi + konumu)
  const houseRulers = houses.map(h => {
    const rulerName = getSignRuler(h.sign);
    const rulerPlanet = planetsWithHouses.find(p => p.name === rulerName);
    return {
      house: h.house,
      cuspSign: h.sign,
      rulingPlanet: rulerName,
      rulingPlanetTr: rulerPlanet?.trName || null,
      rulerSign: rulerPlanet?.sign || null,
      rulerHouse: rulerPlanet?.house || null,
      rulerLongitude: rulerPlanet?.longitude || null,
      rulerIsRetrograde: rulerPlanet?.isRetrograde || false,
      rulerDignity: rulerPlanet?.dignity || null,
    };
  });

  // ========== TIBBI ASTROLOJİ ==========

  const profection = calculateProfection(year, month, day, houses, planetsWithHouses);
  const medicalArabicParts = calculateMedicalArabicParts(ascendant, planetsWithHouses, cusps);
  const antiscia = calculateAntiscia(planetsWithHouses);

  // Fixed Stars — gezegen-yıldız kavuşumları
  const fixedStars = calculateFixedStarConjunctions(planetsWithHouses, jd_et);

  // Declination & Parallel aspektler
  const declinations = calculateDeclinations(planetsWithHouses, jd_et);
  const parallelAspects = calculateParallelAspects(declinations);

  // Her gezegene declination bilgisi ekle
  for (const planet of planetsWithHouses) {
    const decData = declinations.find(d => d.name === planet.name);
    if (decData) {
      planet.declination = decData.declination;
      planet.isOutOfBounds = decData.isOutOfBounds;
      if (decData.isOutOfBounds) {
        planet.oobMedicalNote = OOB_MEDICAL[planet.name] || null;
      }
    }
  }

  // Secondary Progressions (hedef: bugün)
  const secondaryProgressions = calculateSecondaryProgressionsInternal(
    jd_et, year, month, day, ascendant, midheaven, planetsWithHouses
  );

  // Solar Return (hedef: bu yıl)
  const currentYear = new Date().getFullYear();
  const solarReturn = calculateSolarReturnInternal(
    planetsWithHouses, jd_et, year, month, day, latitude, longitude, currentYear
  );

  // Medical Midpoints
  const midpoints = calculateMedicalMidpointsInternal(planetsWithHouses, ascendant, midheaven);

  // ========== SONUÇ ==========

  return {
    input: {
      localTime: utcData.originalInput.localTime,
      timezone: timezone,
      utcTime: utcData.originalInput.utcTime,
      coordinates: { latitude, longitude },
      offsetHours: utcData.offsetHours,
      isDST: utcData.isDST,
    },

    planets: planetsWithHouses,

    houses: {
      system: houseSystem,
      systemName: HOUSE_SYSTEMS[houseSystem].name,
      cusps: houses,
      ascendant: {
        longitude: roundTo(ascendant, 6),
        sign: ascData.sign,
        degree: ascData.degree,
        minute: ascData.minute,
        formatted: `${ascData.degree}°${String(ascData.minute).padStart(2, '0')}' ${ascData.sign}`,
      },
      midheaven: {
        longitude: roundTo(midheaven, 6),
        sign: mcData.sign,
        degree: mcData.degree,
        minute: mcData.minute,
        formatted: `${mcData.degree}°${String(mcData.minute).padStart(2, '0')}' ${mcData.sign}`,
      },
      vertex: {
        longitude: roundTo(vertex, 6),
        sign: vtxData.sign,
        degree: vtxData.degree,
        minute: vtxData.minute,
      },
    },

    aspects,

    analysis: {
      sunSign: sun?.sign || null,
      moonSign: moon?.sign || null,
      risingSign: ascData.sign,
      isDayChart,
      moonPhase,
      partOfFortune: {
        longitude: roundTo(partOfFortune, 6),
        sign: pofData.sign,
        degree: pofData.degree,
        minute: pofData.minute,
        formatted: `${pofData.degree}°${String(pofData.minute).padStart(2, '0')}' ${pofData.sign}`,
      },
      elements: elementDist,
      modalities: modalityDist,
      hemispheres: hemisphereEmphasis,
      stelliums,
      chartRuler,
      houseRulers,
      medicalAstrology: {
        profection,
        arabicParts: medicalArabicParts,
        antiscia,
        fixedStars,
        declinations,
        parallelAspects,
        secondaryProgressions,
        solarReturn,
        midpoints,
      },
    },

    meta: {
      julianDayET: roundTo(jd_et, 8),
      julianDayUT: roundTo(jd_ut, 8),
      siderealTime: roundTo(armc, 6),
      deltaT: roundTo((jd_et - jd_ut) * 86400, 2), // saniye cinsinden
      ephemerisMode: planetsWithHouses.some(p => p.usedMoshierFallback) ? 'Moshier (fallback)' : 'Swiss Ephemeris',
      engine: 'sweph (Swiss Ephemeris Node.js binding)',
      version,
      warnings,
    },
  };
}

// ========== YARDIMCI FONKSİYONLAR ==========

function isAboveHorizon(planetLon, ascLon) {
  const desc = (ascLon + 180) % 360;
  if (ascLon < desc) {
    return planetLon >= ascLon && planetLon < desc ? false : true;
  } else {
    return planetLon >= ascLon || planetLon < desc ? false : true;
  }
}

function findStelliums(planets) {
  // Güneş, Ay ve geleneksel gezegenler (Chiron, Node'lar hariç)
  const mainPlanets = planets.filter(p =>
    ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto'].includes(p.name)
  );

  const signCounts = {};
  mainPlanets.forEach(p => {
    if (!signCounts[p.sign]) signCounts[p.sign] = [];
    signCounts[p.sign].push(p.name);
  });

  const stelliums = [];
  for (const [sign, names] of Object.entries(signCounts)) {
    if (names.length >= 3) {
      stelliums.push({ sign, planets: names, count: names.length });
    }
  }

  return stelliums;
}

/**
 * Fixed star — gezegen kavuşumlarını hesapla
 * @param {Array} planets - planetsWithHouses dizisi
 * @param {number} jd_et - Julian Day (Ephemeris Time)
 * @returns {Array}
 */
function calculateFixedStarConjunctions(planets, jd_et) {
  const results = [];
  const calcFlags = swe.constants.SEFLG_SWIEPH | swe.constants.SEFLG_SPEED;

  for (const star of MEDICAL_FIXED_STARS) {
    let starResult;
    try {
      starResult = swe.fixstar2_ut(star.sweName, jd_et, calcFlags);
    } catch {
      continue;
    }

    const starLon = starResult.data[0];
    if (starLon === 0 && star.sweName !== 'Algol') {
      // lon=0 genelde yıldız bulunamadı demek (Aries 0° olma ihtimali çok düşük)
      if (starResult.data[1] === 0) continue;
    }

    const starSignData = longitudeToSign(starLon);

    for (const planet of planets) {
      let diff = Math.abs(planet.longitude - starLon);
      if (diff > 180) diff = 360 - diff;

      if (diff <= star.orb) {
        results.push({
          star: star.name,
          starLongitude: roundTo(starLon, 4),
          starSign: starSignData.sign,
          starFormatted: `${starSignData.degree}°${String(starSignData.minute).padStart(2, '0')}' ${starSignData.sign}`,
          planet: planet.name,
          planetTr: planet.trName,
          orb: roundTo(diff, 4),
          nature: star.nature,
          medicalEffect: star.medicalEffect,
          bodyArea: star.bodyArea,
          severity: star.severity,
        });
      }
    }
  }

  return results;
}

/**
 * Gezegenlerin deklinasyonlarını hesapla (equatorial koordinatlar)
 * @param {Array} planets - planetsWithHouses dizisi
 * @param {number} jd_et - Julian Day (Ephemeris Time)
 * @returns {Array}
 */
function calculateDeclinations(planets, jd_et) {
  const eqFlags = swe.constants.SEFLG_SWIEPH | swe.constants.SEFLG_EQUATORIAL;

  return planets.map(planet => {
    // South Node için ayrı hesap (id = -1)
    if (planet.id === -1) {
      // South Node'un deklinasyonu = -1 × North Node deklinasyonu
      const northNode = planets.find(p => p.name === 'True Node');
      if (northNode) {
        const nnResult = swe.calc_ut(jd_et, northNode.id, eqFlags);
        const dec = roundTo(-nnResult.data[1], 4);
        return {
          name: planet.name,
          trName: planet.trName,
          declination: dec,
          isOutOfBounds: Math.abs(dec) > 23.44,
          oobDirection: dec > 23.44 ? 'north' : dec < -23.44 ? 'south' : null,
        };
      }
    }

    if (planet.id < 0) {
      return { name: planet.name, trName: planet.trName, declination: null, isOutOfBounds: false, oobDirection: null };
    }

    const result = swe.calc_ut(jd_et, planet.id, eqFlags);
    const dec = roundTo(result.data[1], 4);

    return {
      name: planet.name,
      trName: planet.trName,
      declination: dec,
      isOutOfBounds: Math.abs(dec) > 23.44,
      oobDirection: dec > 23.44 ? 'north' : dec < -23.44 ? 'south' : null,
    };
  });
}

/**
 * Parallel ve contra-parallel aspektleri hesapla
 * @param {Array} declinations - calculateDeclinations çıktısı
 * @param {number} [orb=1.0] - Tolerans derecesi
 * @returns {Array}
 */
function calculateParallelAspects(declinations, orb = 1.0) {
  const aspects = [];

  // Sadece deklinasyonu olan cisimleri al
  const validDecs = declinations.filter(d => d.declination !== null);

  for (let i = 0; i < validDecs.length; i++) {
    for (let j = i + 1; j < validDecs.length; j++) {
      const p1 = validDecs[i];
      const p2 = validDecs[j];

      const decDiff = Math.abs(Math.abs(p1.declination) - Math.abs(p2.declination));
      const sameHemisphere = (p1.declination > 0) === (p2.declination > 0);

      if (decDiff <= orb) {
        if (sameHemisphere) {
          aspects.push({
            planet1: p1.name, planet1Tr: p1.trName,
            planet2: p2.name, planet2Tr: p2.trName,
            type: 'parallel', typeTr: 'Paralel',
            effect: 'conjunction',
            orb: roundTo(decDiff, 4),
            declination1: p1.declination,
            declination2: p2.declination,
          });
        } else {
          aspects.push({
            planet1: p1.name, planet1Tr: p1.trName,
            planet2: p2.name, planet2Tr: p2.trName,
            type: 'contra_parallel', typeTr: 'Kontra-Paralel',
            effect: 'opposition',
            orb: roundTo(decDiff, 4),
            declination1: p1.declination,
            declination2: p2.declination,
          });
        }
      }
    }
  }

  return aspects;
}

// ========== SECONDARY PROGRESSIONS ==========

/**
 * Secondary Progressions — "Day for a Year" yöntemi
 * Progressed JD = natal JD + yaş (her yıl = 1 gün)
 */
function calculateSecondaryProgressionsInternal(jd_et, birthYear, birthMonth, birthDay, natalAsc, natalMC, natalPlanets) {
  const now = new Date();
  const birthDate = new Date(birthYear, birthMonth - 1, birthDay);

  // Ondalıklı yaş
  const ageInDays = (now.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24);
  const ageInYears = ageInDays / 365.25;

  // Progressed JD: her yıl = 1 gün
  const prog_jd = jd_et + ageInYears;

  const calcFlags = swe.constants.SEFLG_SWIEPH | swe.constants.SEFLG_SPEED;

  // Tüm gezegen pozisyonları progressed JD'de
  const progPlanets = CELESTIAL_BODIES.map(body => {
    const result = swe.calc_ut(prog_jd, body.id, calcFlags);
    const lon = result.data[0];
    const signData = longitudeToSign(lon);
    return {
      name: body.name,
      trName: body.trName,
      longitude: roundTo(lon, 6),
      speed: roundTo(result.data[3], 6),
      sign: signData.sign,
      degree: signData.degree,
      minute: signData.minute,
      isRetrograde: result.data[3] < 0,
      formatted: `${signData.degree}°${String(signData.minute).padStart(2, '0')}' ${signData.sign}`,
    };
  });

  // Solar Arc = progressed Sun - natal Sun
  const natalSun = natalPlanets.find(p => p.name === 'Sun');
  const progSun = progPlanets.find(p => p.name === 'Sun');
  const solarArc = progSun && natalSun ? roundTo(progSun.longitude - natalSun.longitude, 6) : 0;

  // Progressed ASC & MC (Solar Arc yöntemi)
  let progAscLon = (natalAsc + solarArc) % 360;
  if (progAscLon < 0) progAscLon += 360;
  let progMCLon = (natalMC + solarArc) % 360;
  if (progMCLon < 0) progMCLon += 360;

  const progAscData = longitudeToSign(progAscLon);
  const progMCData = longitudeToSign(progMCLon);

  // Progressed Moon analizi
  const progMoon = progPlanets.find(p => p.name === 'Moon');
  const moonHealthTheme = progMoon ? PROGRESSED_MOON_HEALTH[progMoon.sign] : null;

  // Progressed-to-natal aspektler (1° orb)
  const progressedAspects = [];
  const aspectDefs = [
    { name: 'Conjunction', angle: 0 },
    { name: 'Opposition', angle: 180 },
    { name: 'Square', angle: 90 },
    { name: 'Trine', angle: 120 },
    { name: 'Sextile', angle: 60 },
  ];

  for (const pp of progPlanets) {
    for (const np of natalPlanets) {
      let diff = Math.abs(pp.longitude - np.longitude);
      if (diff > 180) diff = 360 - diff;

      for (const asp of aspectDefs) {
        const orbDiff = Math.abs(diff - asp.angle);
        if (orbDiff <= 1.0) {
          progressedAspects.push({
            progressed: pp.name,
            progressedTr: pp.trName,
            natal: np.name,
            natalTr: np.trName,
            aspect: asp.name,
            orb: roundTo(orbDiff, 4),
            priority: pp.name === 'Moon' ? 'high' : pp.name === 'Sun' ? 'medium' : 'low',
          });
        }
      }
    }
  }

  // Önceliğe göre sırala
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  progressedAspects.sort((a, b) => (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2) || a.orb - b.orb);

  return {
    targetDate: now.toISOString().split('T')[0],
    ageInYears: roundTo(ageInYears, 4),
    progressedJD: roundTo(prog_jd, 8),
    solarArc: solarArc,
    planets: progPlanets,
    ascendant: {
      longitude: roundTo(progAscLon, 6),
      sign: progAscData.sign,
      degree: progAscData.degree,
      minute: progAscData.minute,
      formatted: `${progAscData.degree}°${String(progAscData.minute).padStart(2, '0')}' ${progAscData.sign}`,
    },
    midheaven: {
      longitude: roundTo(progMCLon, 6),
      sign: progMCData.sign,
      degree: progMCData.degree,
      minute: progMCData.minute,
      formatted: `${progMCData.degree}°${String(progMCData.minute).padStart(2, '0')}' ${progMCData.sign}`,
    },
    progressedMoon: progMoon ? {
      sign: progMoon.sign,
      degree: progMoon.degree,
      longitude: progMoon.longitude,
      formatted: progMoon.formatted,
      healthTheme: moonHealthTheme,
    } : null,
    aspectsToNatal: progressedAspects,
  };
}

// ========== SOLAR RETURN ==========

/**
 * Solar Return — Güneşin natal derecesine tam dönüş anı ve haritası
 */
function calculateSolarReturnInternal(natalPlanets, jd_et_birth, birthYear, birthMonth, birthDay, latitude, longitude, targetYear) {
  const natalSun = natalPlanets.find(p => p.name === 'Sun');
  if (!natalSun) return null;

  const targetLon = natalSun.longitude;

  // Kaba tahmin: hedef yılın doğum günü civarı
  const approxJDResult = swe.utc_to_jd(targetYear, birthMonth, birthDay, 12, 0, 0, swe.constants.SE_GREG_CAL);
  const approxJD = approxJDResult.data[0];

  // Exact sun return JD bul
  const exactJD = findExactSunReturn(targetLon, approxJD);
  if (!exactJD) return null;

  // JD → tarih dönüşümü
  const dateResult = swe.jdut1_to_utc(exactJD, swe.constants.SE_GREG_CAL);
  const srDateStr = `${dateResult.year}-${String(dateResult.month).padStart(2,'0')}-${String(dateResult.day).padStart(2,'0')}T${String(dateResult.hour).padStart(2,'0')}:${String(dateResult.minute).padStart(2,'0')}:${String(Math.floor(dateResult.second)).padStart(2,'0')}Z`;

  // SR haritasını hesapla
  const calcFlags = swe.constants.SEFLG_SWIEPH | swe.constants.SEFLG_SPEED;

  const srPlanets = CELESTIAL_BODIES.map(body => {
    const result = swe.calc_ut(exactJD, body.id, calcFlags);
    const lon = result.data[0];
    const signData = longitudeToSign(lon);
    return {
      name: body.name,
      trName: body.trName,
      longitude: roundTo(lon, 6),
      sign: signData.sign,
      degree: signData.degree,
      minute: signData.minute,
      isRetrograde: result.data[3] < 0,
      formatted: `${signData.degree}°${String(signData.minute).padStart(2, '0')}' ${signData.sign}`,
    };
  });

  // SR evleri — doğum yeri koordinatları
  const srHousesResult = swe.houses(exactJD, latitude, longitude, 'P');
  const srCusps = [0, ...srHousesResult.data.houses];
  const srAsc = srHousesResult.data.points[0];
  const srMC = srHousesResult.data.points[1];

  const srAscData = longitudeToSign(srAsc);
  const srMCData = longitudeToSign(srMC);

  // SR gezegenlerin ev konumları
  const srPlanetsWithHouses = srPlanets.map(p => ({
    ...p,
    house: findPlanetInHouse(p.longitude, srCusps),
  }));

  // SR sağlık analizi
  const healthAnalysis = analyzeSolarReturnHealth(srPlanetsWithHouses, srCusps, srAsc);

  return {
    year: targetYear,
    exactJD: roundTo(exactJD, 8),
    exactDatetime: srDateStr,
    sunAccuracy: roundTo(Math.abs(srPlanets.find(p => p.name === 'Sun').longitude - targetLon), 6),
    chart: {
      planets: srPlanetsWithHouses,
      ascendant: {
        longitude: roundTo(srAsc, 6),
        sign: srAscData.sign,
        degree: srAscData.degree,
        formatted: `${srAscData.degree}°${String(srAscData.minute).padStart(2, '0')}' ${srAscData.sign}`,
      },
      midheaven: {
        longitude: roundTo(srMC, 6),
        sign: srMCData.sign,
        degree: srMCData.degree,
        formatted: `${srMCData.degree}°${String(srMCData.minute).padStart(2, '0')}' ${srMCData.sign}`,
      },
    },
    healthAnalysis,
  };
}

/**
 * Güneşin belirli bir ekliptik boylamına tam dönüş anını bisection ile bul
 */
function findExactSunReturn(targetLon, approxJD) {
  const calcFlags = swe.constants.SEFLG_SWIEPH;

  function getSunLon(jd) {
    return swe.calc_ut(jd, 0, calcFlags).data[0];
  }

  // -5/+5 gün aralığında 0.5 günlük adımlarla tara
  let jd1 = null, jd2 = null;
  for (let jd = approxJD - 5; jd <= approxJD + 5; jd += 0.5) {
    const lon1 = getSunLon(jd);
    const lon2 = getSunLon(jd + 0.5);
    if (isLonBetween(targetLon, lon1, lon2)) {
      jd1 = jd;
      jd2 = jd + 0.5;
      break;
    }
  }

  if (jd1 === null) return null;

  // Bisection: 25 iterasyon ≈ 0.5/2^25 ≈ 0.015ms hassasiyet
  for (let i = 0; i < 25; i++) {
    const midJD = (jd1 + jd2) / 2;
    const midLon = getSunLon(midJD);
    if (isLonBetween(targetLon, getSunLon(jd1), midLon)) {
      jd2 = midJD;
    } else {
      jd1 = midJD;
    }
  }

  return (jd1 + jd2) / 2;
}

/**
 * Wrap-around güvenli longitude kontrolü
 * lon1'den saat yönünde lon2'ye giderken target arada mı?
 */
function isLonBetween(target, lon1, lon2) {
  const diff12 = ((lon2 - lon1) + 360) % 360;
  const diff1T = ((target - lon1) + 360) % 360;
  return diff1T <= diff12 && diff12 < 180;
}

/**
 * Solar Return sağlık analizi
 */
function analyzeSolarReturnHealth(srPlanets, srCusps, srAsc) {
  let riskLevel = 0;
  const warnings = [];
  const protectiveFactors = [];

  // SR ASC burcu → yıllık bünye
  const ascSign = longitudeToSign(srAsc).sign;
  const yearlyConstitution = {
    sign: ascSign,
    bodyFocus: SIGN_BODY_MAP[ascSign] || [],
  };

  // 6., 8., 12. ev cusp burcunun lordları
  const house6Sign = longitudeToSign(srCusps[6]).sign;
  const house8Sign = longitudeToSign(srCusps[8]).sign;
  const house12Sign = longitudeToSign(srCusps[12]).sign;
  const house6Lord = getSignRuler(house6Sign);
  const house8Lord = getSignRuler(house8Sign);
  const house12Lord = getSignRuler(house12Sign);

  // 6. ev lordu pozisyonu
  const h6LordPlanet = srPlanets.find(p => p.name === house6Lord);
  const yearTheme = h6LordPlanet ? {
    lord: house6Lord,
    sign: h6LordPlanet.sign,
    house: h6LordPlanet.house,
  } : null;

  // 8. ev lordu dusthana evlerde mi? (6, 8, 12)
  const h8LordPlanet = srPlanets.find(p => p.name === house8Lord);
  if (h8LordPlanet && [6, 8, 12].includes(h8LordPlanet.house)) {
    riskLevel += 2;
    warnings.push(`8th lord ${house8Lord} in house ${h8LordPlanet.house} — crisis potential`);
  }

  // Malefic'ler (Mars, Saturn) 1. veya 6. evde mi?
  const mars = srPlanets.find(p => p.name === 'Mars');
  const saturn = srPlanets.find(p => p.name === 'Saturn');
  if (mars && [1, 6].includes(mars.house)) {
    riskLevel += 2;
    warnings.push(`Mars in SR house ${mars.house} — inflammation, surgery risk`);
  }
  if (saturn && [1, 6].includes(saturn.house)) {
    riskLevel += 2;
    warnings.push(`Saturn in SR house ${saturn.house} — chronic issue, fatigue`);
  }

  // Benefic'ler (Jupiter, Venus) 1. veya 6. evde mi?
  const jupiter = srPlanets.find(p => p.name === 'Jupiter');
  const venus = srPlanets.find(p => p.name === 'Venus');
  if (jupiter && [1, 6].includes(jupiter.house)) {
    riskLevel -= 2;
    protectiveFactors.push(`Jupiter in SR house ${jupiter.house} — strong protection`);
  }
  if (venus && [1, 6].includes(venus.house)) {
    riskLevel -= 1;
    protectiveFactors.push(`Venus in SR house ${venus.house} — comfort, healing`);
  }

  riskLevel = Math.max(0, Math.min(10, riskLevel));

  return {
    yearTheme,
    yearlyConstitution,
    house6Lord, house8Lord, house12Lord,
    riskLevel,
    warnings,
    protectiveFactors,
  };
}

// ========== MEDICAL MIDPOINTS ==========

/**
 * Tıbbi midpoint'leri hesapla + natal gezegen kontakları (90° dial)
 */
function calculateMedicalMidpointsInternal(planets, ascLon, mcLon) {
  // Gezegen + açılar listesi
  const points = {};
  for (const p of planets) {
    points[p.name] = p.longitude;
  }
  points['Ascendant'] = ascLon;
  points['Midheaven'] = mcLon;

  const pointNames = Object.keys(points);
  const medicalMidpoints = [];

  for (let i = 0; i < pointNames.length; i++) {
    for (let j = i + 1; j < pointNames.length; j++) {
      const name1 = pointNames[i];
      const name2 = pointNames[j];
      const key = `${name1}/${name2}`;

      // Sadece tıbbi kataloğunda olan midpoint'leri hesapla
      const medData = MEDICAL_MIDPOINTS[key];
      if (!medData) continue;

      const mp = calcMidpoint(points[name1], points[name2]);
      const oppMp = (mp + 180) % 360;
      const mpSign = longitudeToSign(mp);

      medicalMidpoints.push({
        pair: key,
        midpoint: roundTo(mp, 4),
        oppositeMidpoint: roundTo(oppMp, 4),
        sign: mpSign.sign,
        degree: mpSign.degree,
        minute: mpSign.minute,
        formatted: `${mpSign.degree}°${String(mpSign.minute).padStart(2, '0')}' ${mpSign.sign}`,
        meaning: medData.meaning,
        medical: medData.medical,
        priority: key === 'Mars/Saturn' ? 'critical' : 'high',
      });
    }
  }

  // Natal gezegenlerin midpoint kontakları (90° dial, 1.5° orb)
  const contacts = [];
  for (const mp of medicalMidpoints) {
    for (const p of planets) {
      const contactAngles = [0, 90, 180, 270];
      for (const angle of contactAngles) {
        const contactPoint = (mp.midpoint + angle) % 360;
        let diff = Math.abs(p.longitude - contactPoint);
        if (diff > 180) diff = 360 - diff;

        if (diff <= 1.5) {
          contacts.push({
            midpoint: mp.pair,
            planet: p.name,
            planetTr: p.trName,
            contactType: angle === 0 ? 'direct' : angle === 180 ? 'opposition' : 'square',
            orb: roundTo(diff, 4),
            medical: mp.medical,
            priority: mp.priority,
          });
        }
      }
    }
  }

  // Sıralama: priority → orb
  const priorityOrder = { critical: 0, high: 1 };
  contacts.sort((a, b) => (priorityOrder[a.priority] ?? 1) - (priorityOrder[b.priority] ?? 1) || a.orb - b.orb);

  // Mars/Saturn midpoint'i özel olarak vurgula
  const marsSaturn = medicalMidpoints.find(mp => mp.pair === 'Mars/Saturn');

  return {
    medical: medicalMidpoints,
    marsSaturnMidpoint: marsSaturn || null,
    natalContacts: contacts,
  };
}

/**
 * İki boylam arası en kısa yol midpoint
 */
function calcMidpoint(lon1, lon2) {
  let diff = lon2 - lon1;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  let mp = lon1 + diff / 2;
  if (mp < 0) mp += 360;
  if (mp >= 360) mp -= 360;
  return mp;
}
