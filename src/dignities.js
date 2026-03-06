// src/dignities.js

import { SIGN_RULERS } from './constants.js';

/**
 * Traditional planetary dignity (honor/fall) table.
 * Domicile = Planet in its own sign (strongest)
 * Exaltation = Sign where the planet is exalted
 * Detriment = Opposite sign (weak)
 * Fall = Sign of the planet's fall (weakest)
 * Peregrine = If none of the above apply
 */
const DIGNITY_TABLE = {
  Sun:     { domicile: ['Leo'],                  exaltation: ['Aries'],     detriment: ['Aquarius'],            fall: ['Libra'] },
  Moon:    { domicile: ['Cancer'],               exaltation: ['Taurus'],    detriment: ['Capricorn'],           fall: ['Scorpio'] },
  Mercury: { domicile: ['Gemini', 'Virgo'],      exaltation: ['Virgo'],     detriment: ['Sagittarius', 'Pisces'], fall: ['Pisces'] },
  Venus:   { domicile: ['Taurus', 'Libra'],      exaltation: ['Pisces'],    detriment: ['Aries', 'Scorpio'],    fall: ['Virgo'] },
  Mars:    { domicile: ['Aries', 'Scorpio'],     exaltation: ['Capricorn'], detriment: ['Libra', 'Taurus'],     fall: ['Cancer'] },
  Jupiter: { domicile: ['Sagittarius', 'Pisces'],exaltation: ['Cancer'],    detriment: ['Gemini', 'Virgo'],     fall: ['Capricorn'] },
  Saturn:  { domicile: ['Capricorn', 'Aquarius'],exaltation: ['Libra'],     detriment: ['Cancer', 'Leo'],       fall: ['Aries'] },
  Uranus:  { domicile: ['Aquarius'],             exaltation: ['Scorpio'],   detriment: ['Leo'],                 fall: ['Taurus'] },
  Neptune: { domicile: ['Pisces'],               exaltation: ['Cancer'],    detriment: ['Virgo'],               fall: ['Capricorn'] },
  Pluto:   { domicile: ['Scorpio'],              exaltation: ['Aries'],     detriment: ['Taurus'],              fall: ['Libra'] },
};

/** Egyptian Terms — [planetName, startDegree, endDegree] (start inclusive, end exclusive) */
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

/** Chaldean Face (Decan) — each sign's 3×10° slices, Chaldean planetary order */
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

/** Dorothean Triplicity — element → day/night/participating rulers */
export const TRIPLICITY = {
  fire:  { day: 'Sun',    night: 'Jupiter', participating: 'Saturn'  },
  earth: { day: 'Venus',  night: 'Moon',    participating: 'Mars'    },
  air:   { day: 'Saturn', night: 'Mercury', participating: 'Jupiter' },
  water: { day: 'Venus',  night: 'Mars',    participating: 'Moon'    },
};

/** Sign → element (lowercase keys matching TRIPLICITY) */
export const SIGN_ELEMENT = {
  Aries: 'fire',      Taurus: 'earth',    Gemini: 'air',
  Cancer: 'water',    Leo: 'fire',        Virgo: 'earth',
  Libra: 'air',       Scorpio: 'water',   Sagittarius: 'fire',
  Capricorn: 'earth', Aquarius: 'air',    Pisces: 'water',
};

/**
 * Returns the dignity status of a planet in the given sign.
 *
 * @param {string} planetName - Planet name (English)
 * @param {string} sign - Sign name (English)
 * @returns {string|null} 'domicile' | 'exaltation' | 'detriment' | 'fall' | 'peregrine' | null
 */
export function getDignity(planetName, sign) {
  const table = DIGNITY_TABLE[planetName];
  if (!table) return null; // No dignity data for Chiron, Nodes, etc.

  if (table.domicile.includes(sign))   return 'domicile';
  if (table.exaltation.includes(sign)) return 'exaltation';
  if (table.detriment.includes(sign))  return 'detriment';
  if (table.fall.includes(sign))       return 'fall';
  return 'peregrine';
}

/**
 * Turkish translation of dignity status.
 */
export function getDignityTr(dignity) {
  const map = {
    domicile: 'Hane (Güçlü)',
    exaltation: 'Yücelme',
    detriment: 'Sürgün (Zayıf)',
    fall: 'Düşüş',
    peregrine: 'Peregrine (Nötr)',
  };
  return map[dignity] || null;
}

/**
 * Returns the modern ruling planet of a sign.
 *
 * @param {string} sign - Sign name (English)
 * @returns {string|null} Planet name or null
 */
export function getSignRuler(sign) {
  return SIGN_RULERS[sign] || null;
}

/**
 * Returns the Egyptian Term ruler for a given sign and degree.
 * @param {string} sign - Sign name
 * @param {number} degree - Degree within sign (0-29)
 * @returns {string|null} Planet name ruling that term
 */
export function getTermRuler(sign, degree) {
  const entries = TERMS[sign];
  if (!entries) return null;
  const entry = entries.find(t => degree >= t[1] && degree < t[2]);
  return entry ? entry[0] : null;
}

/**
 * Returns the Chaldean Face/Decan ruler for a given sign and degree.
 * Also returns the decan number (1, 2, or 3).
 * @param {string} sign - Sign name
 * @param {number} degree - Degree within sign (0-29)
 * @returns {{ decan: number, ruler: string }|null}
 */
export function getFaceRuler(sign, degree) {
  const faces = FACES[sign];
  if (!faces) return null;
  const decan = Math.min(Math.floor(degree / 10), 2); // 0-9 → 0, 10-19 → 1, 20-29 → 2
  return { decan: decan + 1, ruler: faces[decan] };
}

/**
 * Returns the Dorothean Triplicity rulers for a sign.
 * @param {string} sign - Sign name
 * @returns {{ day: string, night: string, participating: string }|null}
 */
export function getTriplicityRulers(sign) {
  const element = SIGN_ELEMENT[sign];
  if (!element) return null;
  return TRIPLICITY[element];
}

/**
 * Returns a full dignity detail object for a planet at a given position.
 * @param {string} planetName - Planet name
 * @param {string} sign - Sign name
 * @param {number} degree - Degree within sign (0-29)
 * @param {boolean} isDayChart - Is this a day chart?
 * @returns {object|null} Detailed dignity information
 */
export function getDignityDetail(planetName, sign, degree, isDayChart) {
  const basicDignity = getDignity(planetName, sign);
  if (basicDignity === null) return null;

  const termRuler = getTermRuler(sign, degree);
  const faceData = getFaceRuler(sign, degree);
  const triplicityData = getTriplicityRulers(sign);

  // Calculate dignity score (essential only)
  let score = 0;
  if (basicDignity === 'domicile')   score += 5;
  if (basicDignity === 'exaltation') score += 4;
  if (basicDignity === 'detriment')  score -= 5;
  if (basicDignity === 'fall')       score -= 4;

  // Triplicity bonus
  let inTriplicity = false;
  if (triplicityData) {
    if (isDayChart && planetName === triplicityData.day) { score += 3; inTriplicity = true; }
    else if (!isDayChart && planetName === triplicityData.night) { score += 3; inTriplicity = true; }
    else if (planetName === triplicityData.participating) { score += 1; inTriplicity = true; }
  }

  // Term bonus
  const inTerm = termRuler === planetName;
  if (inTerm) score += 2;

  // Face bonus
  const inFace = faceData && faceData.ruler === planetName;
  if (inFace) score += 1;

  // Peregrine: no essential dignity at all
  const hasAnyDignity = basicDignity === 'domicile' || basicDignity === 'exaltation' ||
                        inTriplicity || inTerm || inFace;
  const isPeregrine = !hasAnyDignity && basicDignity !== 'detriment' && basicDignity !== 'fall';
  if (isPeregrine) score -= 5;

  return {
    domicile: basicDignity === 'domicile',
    exaltation: basicDignity === 'exaltation',
    detriment: basicDignity === 'detriment',
    fall: basicDignity === 'fall',
    peregrine: isPeregrine,
    termRuler,
    inTerm,
    faceRuler: faceData ? faceData.ruler : null,
    inFace: !!inFace,
    triplicityRuler: triplicityData
      ? (isDayChart ? triplicityData.day : triplicityData.night)
      : null,
    triplicityParticipating: triplicityData ? triplicityData.participating : null,
    inTriplicity,
    essentialScore: score,
  };
}
