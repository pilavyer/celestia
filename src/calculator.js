// src/calculator.js
import * as swe from 'sweph';
import path from 'path';
import { fileURLToPath } from 'url';
import { CELESTIAL_BODIES, SIGNS, HOUSE_SYSTEMS } from './constants.js';
import { birthTimeToUTC } from './timezone.js';
import { calculateAspects } from './aspects.js';
import { getDignity } from './dignities.js';
import {
  longitudeToSign,
  determineMoonPhase,
  calculatePartOfFortune,
  getElementDistribution,
  getModalityDistribution,
  determineHemisphereEmphasis,
  findPlanetInHouse,
} from './utils.js';

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
    });
  }

  // Ascendant ve MC detaylı
  const ascData = longitudeToSign(ascendant);
  const mcData = longitudeToSign(midheaven);
  const vtxData = longitudeToSign(vertex);

  // Her gezegenin hangi evde olduğunu bul
  const planetsWithHouses = planets.map(planet => ({
    ...planet,
    house: findPlanetInHouse(planet.longitude, cusps),
  }));

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

  // Gündüz/gece haritası tespiti (Güneş ufkun üstünde mi?)
  const isDayChart = sun ? isAboveHorizon(sun.longitude, ascendant) : true;

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
    },

    meta: {
      julianDayET: roundTo(jd_et, 8),
      julianDayUT: roundTo(jd_ut, 8),
      siderealTime: roundTo(armc, 6),
      deltaT: roundTo((jd_et - jd_ut) * 86400, 2), // saniye cinsinden
      ephemerisMode: planetsWithHouses.some(p => p.usedMoshierFallback) ? 'Moshier (fallback)' : 'Swiss Ephemeris',
      engine: 'sweph (Swiss Ephemeris Node.js binding)',
      version: '1.0.0',
      warnings,
    },
  };
}

// ========== YARDIMCI FONKSİYONLAR ==========

function roundTo(num, decimals) {
  return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

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
