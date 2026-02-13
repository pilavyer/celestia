// src/utils.js
import { SIGNS, ELEMENTS, MODALITIES } from './constants.js';

/**
 * Ekliptik boylamı burç, derece, dakika, saniyeye çevirir.
 *
 * @param {number} longitude - 0-360° ekliptik boylam
 * @returns {object} {sign, signIndex, degree, minute, second}
 */
export function longitudeToSign(longitude) {
  // Negatif veya 360+ değerleri normalize et
  let lon = longitude % 360;
  if (lon < 0) lon += 360;

  const signIndex = Math.floor(lon / 30);
  const posInSign = lon % 30; // 0-30° arası

  const degree = Math.floor(posInSign);
  const fractional = (posInSign - degree) * 60;
  const minute = Math.floor(fractional);
  const second = Math.round((fractional - minute) * 60);

  return {
    sign: SIGNS[signIndex],
    signIndex,
    degree,
    minute,
    second: second >= 60 ? 59 : second, // Yuvarlama taşmasını önle
  };
}

/**
 * Ay fazını belirle.
 * Güneş-Ay açısına göre 8 faz döndürür.
 */
export function determineMoonPhase(sunLon, moonLon) {
  let angle = moonLon - sunLon;
  if (angle < 0) angle += 360;

  if (angle < 22.5)  return { phase: 'New Moon',        phaseTr: 'Yeni Ay',               angle: roundTo(angle, 2) };
  if (angle < 67.5)  return { phase: 'Waxing Crescent', phaseTr: 'Hilal (Büyüyen)',       angle: roundTo(angle, 2) };
  if (angle < 112.5) return { phase: 'First Quarter',   phaseTr: 'İlk Dördün',            angle: roundTo(angle, 2) };
  if (angle < 157.5) return { phase: 'Waxing Gibbous',  phaseTr: 'Şişkin Ay (Büyüyen)',   angle: roundTo(angle, 2) };
  if (angle < 202.5) return { phase: 'Full Moon',       phaseTr: 'Dolunay',               angle: roundTo(angle, 2) };
  if (angle < 247.5) return { phase: 'Waning Gibbous',  phaseTr: 'Şişkin Ay (Küçülen)',   angle: roundTo(angle, 2) };
  if (angle < 292.5) return { phase: 'Last Quarter',    phaseTr: 'Son Dördün',             angle: roundTo(angle, 2) };
  if (angle < 337.5) return { phase: 'Waning Crescent', phaseTr: 'Hilal (Küçülen)',        angle: roundTo(angle, 2) };
  return             { phase: 'New Moon',               phaseTr: 'Yeni Ay',               angle: roundTo(angle, 2) };
}

/**
 * Part of Fortune (Fortuna Noktası) hesapla.
 * Gündüz: ASC + Moon - Sun
 * Gece: ASC + Sun - Moon
 */
export function calculatePartOfFortune(ascLon, sunLon, moonLon, isDayChart) {
  if (sunLon === undefined || moonLon === undefined) return 0;

  let pof;
  if (isDayChart) {
    pof = ascLon + moonLon - sunLon;
  } else {
    pof = ascLon + sunLon - moonLon;
  }

  // 0-360 aralığına normalize
  pof = pof % 360;
  if (pof < 0) pof += 360;

  return pof;
}

/**
 * Element dağılımını hesapla (Ateş/Toprak/Hava/Su)
 */
export function getElementDistribution(planets) {
  const mainPlanets = planets.filter(p =>
    ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto'].includes(p.name)
  );

  const dist = { Fire: 0, Earth: 0, Air: 0, Water: 0 };

  mainPlanets.forEach(p => {
    for (const [element, signs] of Object.entries(ELEMENTS)) {
      if (signs.includes(p.sign)) {
        dist[element]++;
        break;
      }
    }
  });

  // En baskın element
  const dominant = Object.entries(dist).sort((a, b) => b[1] - a[1])[0];
  return { ...dist, dominant: dominant[0] };
}

/**
 * Modalite dağılımını hesapla (Kardinal/Sabit/Değişken)
 */
export function getModalityDistribution(planets) {
  const mainPlanets = planets.filter(p =>
    ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto'].includes(p.name)
  );

  const dist = { Cardinal: 0, Fixed: 0, Mutable: 0 };

  mainPlanets.forEach(p => {
    for (const [modality, signs] of Object.entries(MODALITIES)) {
      if (signs.includes(p.sign)) {
        dist[modality]++;
        break;
      }
    }
  });

  const dominant = Object.entries(dist).sort((a, b) => b[1] - a[1])[0];
  return { ...dist, dominant: dominant[0] };
}

/**
 * Hemisfer vurgusunu hesapla.
 * Kuzey/Güney (ASC-DSC eksenine göre) ve Doğu/Batı (MC-IC eksenine göre)
 */
export function determineHemisphereEmphasis(planets, ascLon, mcLon) {
  const mainPlanets = planets.filter(p =>
    ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto'].includes(p.name)
  );

  const descLon = (ascLon + 180) % 360;
  const icLon = (mcLon + 180) % 360;

  let southern = 0, northern = 0, eastern = 0, western = 0;

  mainPlanets.forEach(p => {
    // Güney yarıküre = evler 7-12 (ufkun üstü)
    // Kuzey yarıküre = evler 1-6 (ufkun altı)
    if (p.house >= 7) southern++;
    else northern++;

    // Doğu yarıküre = evler 10-3 (ASC tarafı)
    // Batı yarıküre = evler 4-9 (DSC tarafı)
    if ([10, 11, 12, 1, 2, 3].includes(p.house)) eastern++;
    else western++;
  });

  return { southern, northern, eastern, western };
}

/**
 * Gezegenin hangi evde olduğunu bul.
 * Ev sınırları (cusps) arasında gezegenin boylamını ara.
 */
export function findPlanetInHouse(planetLon, cusps) {
  // cusps[1] - cusps[12] (index 0 boş)
  for (let i = 1; i <= 12; i++) {
    const nextHouse = i === 12 ? 1 : i + 1;
    const start = cusps[i];
    const end = cusps[nextHouse];

    // 0°/360° geçişini handle et
    if (start <= end) {
      if (planetLon >= start && planetLon < end) return i;
    } else {
      // Burç sınırı geçişi (örn: 350° - 10°)
      if (planetLon >= start || planetLon < end) return i;
    }
  }

  return 1; // Fallback (olmamalı ama güvenlik için)
}

export function roundTo(num, decimals) {
  return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
}
