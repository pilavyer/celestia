// src/medical.js — Tıbbi Astroloji Modülü

import { MODALITIES } from './constants.js';
import { longitudeToSign, findPlanetInHouse, roundTo } from './utils.js';
import { getSignRuler } from './dignities.js';

// ========== SABİTLER (Lookup Tabloları) ==========

/** 12 burç → vücut bölgeleri */
export const SIGN_BODY_MAP = {
  Aries:       ['head', 'brain', 'eyes', 'face'],
  Taurus:      ['throat', 'neck', 'thyroid', 'vocal cords'],
  Gemini:      ['lungs', 'arms', 'hands', 'shoulders', 'nervous system'],
  Cancer:      ['stomach', 'breasts', 'uterus', 'digestive system'],
  Leo:         ['heart', 'spine', 'upper back', 'blood circulation'],
  Virgo:       ['intestines', 'digestive system', 'spleen', 'nervous system'],
  Libra:       ['kidneys', 'lower back', 'adrenal glands', 'skin'],
  Scorpio:     ['reproductive organs', 'bladder', 'colon', 'prostate'],
  Sagittarius: ['hips', 'thighs', 'liver', 'sciatic nerve'],
  Capricorn:   ['knees', 'bones', 'joints', 'teeth', 'skin'],
  Aquarius:    ['ankles', 'calves', 'circulatory system', 'shins'],
  Pisces:      ['feet', 'toes', 'lymphatic system', 'immune system'],
};

/** 10 gezegen + Chiron → vücut sistemleri */
export const PLANET_BODY_MAP = {
  Sun:        ['heart', 'vitality', 'spine', 'right eye'],
  Moon:       ['stomach', 'breasts', 'fluids', 'left eye', 'lymphatic system'],
  Mercury:    ['nervous system', 'lungs', 'hands', 'intestines', 'speech'],
  Venus:      ['kidneys', 'throat', 'skin', 'veins', 'reproductive system'],
  Mars:       ['muscles', 'blood', 'head', 'adrenal glands', 'inflammation'],
  Jupiter:    ['liver', 'hips', 'thighs', 'growth', 'arterial system'],
  Saturn:     ['bones', 'teeth', 'knees', 'joints', 'skin', 'chronic conditions'],
  Uranus:     ['nervous system', 'ankles', 'spasms', 'electrical impulses'],
  Neptune:    ['immune system', 'feet', 'pineal gland', 'lymphatic system', 'poisoning'],
  Pluto:      ['reproductive organs', 'colon', 'regeneration', 'cellular mutation'],
  Chiron:     ['wounds', 'chronic pain', 'healing crisis', 'immune vulnerabilities'],
};

/** 12 ev → sağlık alanı */
export const HOUSE_HEALTH_MAP = {
  1:  'constitution and physical body',
  2:  'personal resources affecting health',
  3:  'mental health and nervous tension',
  4:  'hereditary conditions and end of life',
  5:  'heart, fertility and children',
  6:  'acute illness, daily health and hygiene',
  7:  'health of partner, doctors and specialists',
  8:  'chronic illness, surgery and death',
  9:  'mental expansion and long-distance health',
  10: 'public health status and career stress',
  11: 'ankles, circulatory health and social wellbeing',
  12: 'hospitalization, isolation and hidden illness',
};

/** Kritik dereceler — modaliteye göre */
export const CRITICAL_DEGREES = {
  Cardinal: [0, 13, 26],
  Fixed:    [9, 21],
  Mutable:  [4, 17],
};

/** Anaretic derece (tüm burçlarda kriz derecesi) */
export const ANARETIC_DEGREE = 29;

/** Gezegen ortalama hızları (°/gün) ve durağanlık eşiği */
export const AVERAGE_SPEEDS = {
  Sun:     { avg: 0.9856, stationaryThreshold: 0.0 },
  Moon:    { avg: 13.176, stationaryThreshold: 0.0 },
  Mercury: { avg: 1.383,  stationaryThreshold: 0.10 },
  Venus:   { avg: 1.200,  stationaryThreshold: 0.08 },
  Mars:    { avg: 0.524,  stationaryThreshold: 0.03 },
  Jupiter: { avg: 0.083,  stationaryThreshold: 0.005 },
  Saturn:  { avg: 0.034,  stationaryThreshold: 0.003 },
  Uranus:  { avg: 0.012,  stationaryThreshold: 0.001 },
  Neptune: { avg: 0.006,  stationaryThreshold: 0.0005 },
  Pluto:   { avg: 0.004,  stationaryThreshold: 0.0003 },
};

/** Lilly skor ağırlıkları */
export const DIGNITY_SCORES = {
  // Essential Dignity (pozitif)
  domicile:    +5,
  exaltation:  +4,
  triplicity:  +3,
  term:        +2,
  face:        +1,
  // Essential Debility (negatif)
  detriment:   -5,
  fall:        -4,
  peregrine:   -5,
  // Accidental Dignity — ev pozisyonu
  angular:     +5,   // ev 1, 4, 7, 10
  succedent:   +3,   // ev 2, 5, 8, 11
  cadent:      +1,   // ev 3, 6, 9, 12
  // Modifiers
  retrograde:  -5,
  combust:     -5,
  cazimi:      +5,
  under_beams: -2,
  direct:       0,
  // Hız
  stationary:  -3,
  slow:        -2,
  fast:        +2,
  average:      0,
};

/** Dorothean triplicity — element → gündüz/gece/katılımcı yöneticileri */
export const TRIPLICITY = {
  fire:  { day: 'Sun',    night: 'Jupiter', participating: 'Saturn'  },
  earth: { day: 'Venus',  night: 'Moon',    participating: 'Mars'    },
  air:   { day: 'Saturn', night: 'Mercury', participating: 'Jupiter' },
  water: { day: 'Venus',  night: 'Mars',    participating: 'Moon'    },
};

/** Burç → element (küçük harf, TRIPLICITY ile eşleşir) */
export const SIGN_ELEMENT = {
  Aries: 'fire',     Taurus: 'earth',    Gemini: 'air',
  Cancer: 'water',   Leo: 'fire',        Virgo: 'earth',
  Libra: 'air',      Scorpio: 'water',   Sagittarius: 'fire',
  Capricorn: 'earth', Aquarius: 'air',   Pisces: 'water',
};

/** Egyptian Terms — [gezegenAdı, başlangıçDerece, bitişDerece] (başlangıç dahil, bitiş hariç) */
export const TERMS = {
  Aries:       [['Jupiter',0,6],['Venus',6,12],['Mercury',12,20],['Mars',20,25],['Saturn',25,30]],
  Taurus:      [['Venus',0,8],['Mercury',8,14],['Jupiter',14,22],['Saturn',22,27],['Mars',27,30]],
  Gemini:      [['Mercury',0,6],['Jupiter',6,12],['Venus',12,17],['Mars',17,24],['Saturn',24,30]],
  Cancer:      [['Mars',0,7],['Venus',7,13],['Mercury',13,19],['Jupiter',19,26],['Saturn',26,30]],
  Leo:         [['Jupiter',0,6],['Venus',6,11],['Saturn',11,18],['Mercury',18,24],['Mars',24,30]],
  Virgo:       [['Mercury',0,7],['Venus',7,17],['Jupiter',17,21],['Mars',21,28],['Saturn',28,30]],
  Libra:       [['Saturn',0,6],['Mercury',6,14],['Jupiter',14,21],['Venus',21,28],['Mars',28,30]],
  Scorpio:     [['Mars',0,7],['Venus',7,11],['Mercury',11,19],['Jupiter',19,24],['Saturn',24,30]],
  Sagittarius: [['Jupiter',0,12],['Venus',12,17],['Mercury',17,21],['Saturn',21,26],['Mars',26,30]],
  Capricorn:   [['Mercury',0,7],['Jupiter',7,14],['Venus',14,22],['Saturn',22,26],['Mars',26,30]],
  Aquarius:    [['Mercury',0,7],['Venus',7,13],['Jupiter',13,20],['Mars',20,25],['Saturn',25,30]],
  Pisces:      [['Venus',0,12],['Jupiter',12,16],['Mercury',16,19],['Mars',19,28],['Saturn',28,30]],
};

/** Chaldean Face (Decan) — her burcun 3×10° dilimi */
export const FACES = {
  Aries:       ['Mars',    'Sun',     'Venus'  ],
  Taurus:      ['Mercury', 'Moon',    'Saturn' ],
  Gemini:      ['Jupiter', 'Mars',    'Sun'    ],
  Cancer:      ['Venus',   'Mercury', 'Moon'   ],
  Leo:         ['Saturn',  'Jupiter', 'Mars'   ],
  Virgo:       ['Sun',     'Venus',   'Mercury'],
  Libra:       ['Moon',    'Saturn',  'Jupiter'],
  Scorpio:     ['Mars',    'Sun',     'Venus'  ],
  Sagittarius: ['Mercury', 'Moon',    'Saturn' ],
  Capricorn:   ['Jupiter', 'Mars',    'Sun'    ],
  Aquarius:    ['Venus',   'Mercury', 'Moon'   ],
  Pisces:      ['Saturn',  'Jupiter', 'Mars'   ],
};

/** 6 tıbbi Arap noktası tanımı — formül: ASC + a - b */
export const MEDICAL_ARABIC_PARTS = [
  { name: 'Part of Illness',   trName: 'Hastalık Noktası',    a: 'Mars',    b: 'Saturn'  },
  { name: 'Part of Surgery',   trName: 'Cerrahi Noktası',     a: 'Saturn',  b: 'Mars'    },
  { name: 'Part of Healing',   trName: 'Şifa Noktası',        a: 'Jupiter', b: 'Saturn'  },
  { name: 'Part of Vitality',  trName: 'Yaşam Gücü Noktası',  a: 'Moon',    b: 'Saturn'  },
  { name: 'Part of Crisis',    trName: 'Kriz Noktası',         a: 'Saturn',  b: 'Sun'     },
  { name: 'Part of Death',     trName: 'Ölüm Noktası',         a: 'Saturn',  b: 'Moon'    },
];

// ========== FONKSİYONLAR ==========

/**
 * 1. Gezegenin kendi vücut alanları + bulunduğu burcun alanları (deduplicate)
 * @param {string} planetName - Gezegen adı
 * @param {string} sign - Burç adı
 * @returns {string[]}
 */
export function getBodyAreas(planetName, sign) {
  const planetAreas = PLANET_BODY_MAP[planetName] || [];
  const signAreas = SIGN_BODY_MAP[sign] || [];
  return [...new Set([...planetAreas, ...signAreas])];
}

/**
 * 2. Güneşe yakınlık durumu (Cazimi / Combust / Under the Beams / Free)
 * @param {string} planetName
 * @param {number} planetLon - Gezegenin ekliptik boylamı
 * @param {number} sunLon - Güneşin ekliptik boylamı
 * @returns {{ status: string, statusTr: string, distanceToSun: number } | null}
 */
export function getCombustionStatus(planetName, planetLon, sunLon) {
  // Sun, True Node, South Node, Lilith için geçersiz
  if (['Sun', 'True Node', 'South Node', 'Lilith'].includes(planetName)) {
    return null;
  }

  let diff = Math.abs(planetLon - sunLon);
  if (diff > 180) diff = 360 - diff;
  const distance = roundTo(diff, 4);

  if (diff <= 0.283) {
    return { status: 'cazimi', statusTr: 'Cazimi (Güneş Kalbinde)', distanceToSun: distance };
  }
  if (diff <= 8.5) {
    return { status: 'combust', statusTr: 'Yanık (Combust)', distanceToSun: distance };
  }
  if (diff <= 17) {
    return { status: 'under_beams', statusTr: 'Işınlar Altında', distanceToSun: distance };
  }
  return { status: 'free', statusTr: 'Serbest', distanceToSun: distance };
}

/**
 * 3. Kritik derece kontrolü
 * @param {string} sign - Burç adı
 * @param {number} degree - Burç içindeki derece (0-29)
 * @returns {Array<{ type: string, typeTr: string, degree: number }> | null}
 */
export function getCriticalDegree(sign, degree) {
  const results = [];

  // Burcun modalitesini bul
  for (const [modality, signs] of Object.entries(MODALITIES)) {
    if (signs.includes(sign)) {
      const critDegrees = CRITICAL_DEGREES[modality];
      if (critDegrees && critDegrees.includes(degree)) {
        const typeName = `${modality.toLowerCase()}_critical`;
        const typeTrMap = {
          cardinal_critical: 'Cardinal Kritik Derece',
          fixed_critical: 'Sabit Kritik Derece',
          mutable_critical: 'Değişken Kritik Derece',
        };
        results.push({
          type: typeName,
          typeTr: typeTrMap[typeName],
          degree,
        });
      }
      break;
    }
  }

  // Anaretic derece kontrolü
  if (degree === ANARETIC_DEGREE) {
    results.push({
      type: 'anaretic',
      typeTr: 'Anaretik Derece (29°)',
      degree: ANARETIC_DEGREE,
    });
  }

  return results.length > 0 ? results : null;
}

/**
 * 4. Gezegen hız sınıflandırması
 * @param {string} planetName
 * @param {number} speed - Gezegenin günlük hızı (°/gün)
 * @returns {{ classification: string, classificationTr: string, averageSpeed: number, currentSpeed: number, ratio: number, isStationary: boolean } | null}
 */
export function getSpeedClassification(planetName, speed) {
  // True Node, South Node, Lilith için geçersiz
  if (['True Node', 'South Node', 'Lilith'].includes(planetName)) {
    return null;
  }

  const data = AVERAGE_SPEEDS[planetName];
  if (!data) return null;

  const absSpeed = Math.abs(speed);
  const ratio = roundTo(absSpeed / data.avg, 4);
  const isStationary = data.stationaryThreshold > 0 && absSpeed < data.stationaryThreshold;

  let classification, classificationTr;

  if (isStationary) {
    classification = 'stationary';
    classificationTr = 'Durağan';
  } else if (ratio < 0.75) {
    classification = 'slow';
    classificationTr = 'Yavaş';
  } else if (ratio > 1.25) {
    classification = 'fast';
    classificationTr = 'Hızlı';
  } else {
    classification = 'average';
    classificationTr = 'Ortalama';
  }

  return {
    classification,
    classificationTr,
    averageSpeed: data.avg,
    currentSpeed: roundTo(absSpeed, 6),
    ratio,
    isStationary,
  };
}

/**
 * 5. Yıllık profeksiyon hesabı
 * @param {number} birthYear
 * @param {number} birthMonth
 * @param {number} birthDay
 * @param {Array} houses - Ev objelerinin dizisi (house, cusp, sign, ...)
 * @param {Array} planetsWithHouses - Ev bilgisi eklenmiş gezegen dizisi
 * @returns {object}
 */
export function calculateProfection(birthYear, birthMonth, birthDay, houses, planetsWithHouses) {
  const now = new Date();
  const birthDate = new Date(birthYear, birthMonth - 1, birthDay);

  // Yaş hesapla
  let age = now.getFullYear() - birthDate.getFullYear();
  const monthDiff = now.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birthDate.getDate())) {
    age--;
  }
  if (age < 0) age = 0;

  // Aktif ev: (yaş % 12) + 1
  const activeHouse = (age % 12) + 1;

  // Aktif evin cusp burcunu bul
  const activeHouseObj = houses.find(h => h.house === activeHouse);
  const activeSign = activeHouseObj ? activeHouseObj.sign : null;

  // Yıl lordu: aktif evin cusp burcunun yöneticisi
  const yearLord = activeSign ? getSignRuler(activeSign) : null;

  // Yıl lordunun haritadaki konumu
  const yearLordPlanet = yearLord ? planetsWithHouses.find(p => p.name === yearLord) : null;

  return {
    age,
    activeHouse,
    activeSign,
    yearLord,
    yearLordTr: yearLordPlanet ? yearLordPlanet.trName : null,
    yearLordSign: yearLordPlanet ? yearLordPlanet.sign : null,
    yearLordHouse: yearLordPlanet ? yearLordPlanet.house : null,
    yearLordIsRetrograde: yearLordPlanet ? yearLordPlanet.isRetrograde : null,
  };
}

/**
 * 6. Tıbbi Arap noktaları hesabı
 * Formül: (ASC + A_longitude - B_longitude) % 360
 * @param {number} ascLon - Ascendant boylamı (raw longitude)
 * @param {Array} planetsWithHouses
 * @param {number[]} cusps - 1-indexed cusp dizisi
 * @returns {Array}
 */
export function calculateMedicalArabicParts(ascLon, planetsWithHouses, cusps) {
  // ascLon burada raw longitude olarak gelecek — houses.ascendant objesinden değil, doğrudan ascendant değeri
  const ascLonValue = typeof ascLon === 'object' ? ascLon.longitude : ascLon;

  return MEDICAL_ARABIC_PARTS.map(part => {
    const planetA = planetsWithHouses.find(p => p.name === part.a);
    const planetB = planetsWithHouses.find(p => p.name === part.b);

    if (!planetA || !planetB) return null;

    let lon = (ascLonValue + planetA.longitude - planetB.longitude) % 360;
    if (lon < 0) lon += 360;

    const signData = longitudeToSign(lon);
    const house = findPlanetInHouse(lon, cusps);

    return {
      name: part.name,
      trName: part.trName,
      longitude: roundTo(lon, 6),
      sign: signData.sign,
      degree: signData.degree,
      minute: signData.minute,
      formatted: `${signData.degree}°${String(signData.minute).padStart(2, '0')}' ${signData.sign}`,
      house,
    };
  }).filter(Boolean);
}

/**
 * 7. Antiscia ve contra-antiscia hesabı
 * Antiscion: Cancer-Capricorn ekseni aynası → (180 - longitude + 360) % 360
 * Contra-antiscion: Aries-Libra ekseni aynası → (360 - longitude) % 360
 * @param {Array} planetsWithHouses
 * @param {number} [orb=2.0] - Hidden connection eşiği (derece)
 * @returns {{ points: Array, hiddenConnections: Array }}
 */
export function calculateAntiscia(planetsWithHouses, orb = 2.0) {
  const points = planetsWithHouses.map(planet => {
    // Antiscion: Cancer-Capricorn ekseni aynası
    const antisciaLon = (180 - planet.longitude + 360) % 360;
    const antisciaSign = longitudeToSign(antisciaLon);

    // Contra-antiscion: Aries-Libra ekseni aynası
    const contraLon = (360 - planet.longitude) % 360;
    const contraSign = longitudeToSign(contraLon);

    return {
      planet: planet.name,
      planetTr: planet.trName,
      longitude: planet.longitude,
      antiscion: {
        longitude: roundTo(antisciaLon, 6),
        sign: antisciaSign.sign,
        degree: antisciaSign.degree,
        minute: antisciaSign.minute,
        formatted: `${antisciaSign.degree}°${String(antisciaSign.minute).padStart(2, '0')}' ${antisciaSign.sign}`,
      },
      contraAntiscion: {
        longitude: roundTo(contraLon, 6),
        sign: contraSign.sign,
        degree: contraSign.degree,
        minute: contraSign.minute,
        formatted: `${contraSign.degree}°${String(contraSign.minute).padStart(2, '0')}' ${contraSign.sign}`,
      },
    };
  });

  // Hidden connections: başka bir gezegenin konumu antiscion/contra noktasına orb içinde mi?
  const hiddenConnections = [];
  const seen = new Set();

  for (let i = 0; i < planetsWithHouses.length; i++) {
    for (let j = 0; j < planetsWithHouses.length; j++) {
      if (i === j) continue;

      const p1 = planetsWithHouses[i];
      const p2 = planetsWithHouses[j];
      const anti = points[i].antiscion.longitude;
      const contra = points[i].contraAntiscion.longitude;

      // Antiscion bağlantısı
      let diff = Math.abs(p2.longitude - anti);
      if (diff > 180) diff = 360 - diff;
      if (diff <= orb) {
        const key = [p1.name, p2.name].sort().join('-') + '-antiscion';
        if (!seen.has(key)) {
          seen.add(key);
          hiddenConnections.push({
            type: 'antiscion',
            typeTr: 'Antiscion',
            planet1: p1.name,
            planet1Tr: p1.trName,
            planet2: p2.name,
            planet2Tr: p2.trName,
            orb: roundTo(diff, 4),
          });
        }
      }

      // Contra-antiscion bağlantısı
      diff = Math.abs(p2.longitude - contra);
      if (diff > 180) diff = 360 - diff;
      if (diff <= orb) {
        const key = [p1.name, p2.name].sort().join('-') + '-contra';
        if (!seen.has(key)) {
          seen.add(key);
          hiddenConnections.push({
            type: 'contra-antiscion',
            typeTr: 'Contra-Antiscion',
            planet1: p1.name,
            planet1Tr: p1.trName,
            planet2: p2.name,
            planet2Tr: p2.trName,
            orb: roundTo(diff, 4),
          });
        }
      }
    }
  }

  return { points, hiddenConnections };
}

/**
 * 8. Gezegen güç skoru hesabı (Lilly sistemi)
 * Essential dignity + accidental dignity + modifiers
 * @param {object} planet - Ev, combustion, speedAnalysis bilgileri eklenmiş gezegen
 * @param {boolean} isDayChart - Gündüz haritası mı?
 * @returns {{ totalScore: number, breakdown: object, strength: string, strengthTr: string } | null}
 */
export function calculatePlanetaryStrength(planet, isDayChart) {
  // True Node, South Node, Lilith için skor hesaplanmaz
  if (['True Node', 'South Node', 'Lilith'].includes(planet.name)) {
    return null;
  }

  let score = 0;
  const breakdown = {};

  // === ESSENTIAL DIGNITY ===

  // Domicile / Exaltation / Detriment / Fall
  if (planet.dignity === 'domicile')   { score += DIGNITY_SCORES.domicile;   breakdown.domicile   = DIGNITY_SCORES.domicile; }
  if (planet.dignity === 'exaltation') { score += DIGNITY_SCORES.exaltation; breakdown.exaltation = DIGNITY_SCORES.exaltation; }
  if (planet.dignity === 'detriment')  { score += DIGNITY_SCORES.detriment;  breakdown.detriment  = DIGNITY_SCORES.detriment; }
  if (planet.dignity === 'fall')       { score += DIGNITY_SCORES.fall;       breakdown.fall       = DIGNITY_SCORES.fall; }

  // Triplicity (Dorothean)
  const element = SIGN_ELEMENT[planet.sign];
  if (element) {
    const trip = TRIPLICITY[element];
    if (isDayChart && planet.name === trip.day) {
      score += DIGNITY_SCORES.triplicity; breakdown.triplicity = DIGNITY_SCORES.triplicity;
    } else if (!isDayChart && planet.name === trip.night) {
      score += DIGNITY_SCORES.triplicity; breakdown.triplicity = DIGNITY_SCORES.triplicity;
    } else if (planet.name === trip.participating) {
      score += 1; breakdown.triplicity = +1;
    }
  }

  // Term (Egyptian)
  const degree = Math.floor(planet.longitude % 30);
  const termEntries = TERMS[planet.sign];
  if (termEntries) {
    const termEntry = termEntries.find(t => degree >= t[1] && degree < t[2]);
    if (termEntry && planet.name === termEntry[0]) {
      score += DIGNITY_SCORES.term; breakdown.term = DIGNITY_SCORES.term;
    }
  }

  // Face (Chaldean Decan)
  const faceData = FACES[planet.sign];
  if (faceData) {
    const faceIndex = Math.floor(degree / 10);
    if (planet.name === faceData[faceIndex]) {
      score += DIGNITY_SCORES.face; breakdown.face = DIGNITY_SCORES.face;
    }
  }

  // Peregrine — hiçbir essential dignity yoksa (detriment/fall hariç)
  const hasAnyDignity = breakdown.domicile || breakdown.exaltation ||
                         breakdown.triplicity || breakdown.term || breakdown.face;
  if (!hasAnyDignity && !breakdown.detriment && !breakdown.fall) {
    score += DIGNITY_SCORES.peregrine; breakdown.peregrine = DIGNITY_SCORES.peregrine;
  }

  // === ACCIDENTAL DIGNITY (ev pozisyonu) ===
  const house = planet.house;
  if ([1, 4, 7, 10].includes(house)) {
    score += DIGNITY_SCORES.angular;   breakdown.angular   = DIGNITY_SCORES.angular;
  } else if ([2, 5, 8, 11].includes(house)) {
    score += DIGNITY_SCORES.succedent; breakdown.succedent = DIGNITY_SCORES.succedent;
  } else {
    score += DIGNITY_SCORES.cadent;    breakdown.cadent    = DIGNITY_SCORES.cadent;
  }

  // === MODIFIERS ===

  // Retrograde
  if (planet.isRetrograde) {
    score += DIGNITY_SCORES.retrograde; breakdown.retrograde = DIGNITY_SCORES.retrograde;
  }

  // Combustion
  if (planet.combustion) {
    const cs = planet.combustion.status;
    if (cs === 'cazimi')      { score += DIGNITY_SCORES.cazimi;      breakdown.cazimi      = DIGNITY_SCORES.cazimi; }
    else if (cs === 'combust')     { score += DIGNITY_SCORES.combust;     breakdown.combust     = DIGNITY_SCORES.combust; }
    else if (cs === 'under_beams') { score += DIGNITY_SCORES.under_beams; breakdown.under_beams = DIGNITY_SCORES.under_beams; }
  }

  // Speed
  if (planet.speedAnalysis) {
    const cls = planet.speedAnalysis.classification;
    if (cls === 'stationary') { score += DIGNITY_SCORES.stationary; breakdown.stationary = DIGNITY_SCORES.stationary; }
    else if (cls === 'slow')  { score += DIGNITY_SCORES.slow;      breakdown.slow       = DIGNITY_SCORES.slow; }
    else if (cls === 'fast')  { score += DIGNITY_SCORES.fast;      breakdown.fast       = DIGNITY_SCORES.fast; }
  }

  // Strength label
  let strength, strengthTr;
  if (score >= 8)       { strength = 'very_strong'; strengthTr = 'Çok Güçlü'; }
  else if (score >= 4)  { strength = 'strong';      strengthTr = 'Güçlü'; }
  else if (score >= 0)  { strength = 'moderate';    strengthTr = 'Orta'; }
  else if (score >= -4) { strength = 'weak';        strengthTr = 'Zayıf'; }
  else                  { strength = 'very_weak';   strengthTr = 'Çok Zayıf'; }

  return { totalScore: score, breakdown, strength, strengthTr };
}
