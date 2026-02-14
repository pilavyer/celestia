// src/constants.js

// Zodiac sign names — index starts at 0 (0° = beginning of Aries)
export const SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
];

// Turkish zodiac sign names (optional, for locale support)
export const SIGNS_TR = [
  'Koç', 'Boğa', 'İkizler', 'Yengeç', 'Aslan', 'Başak',
  'Terazi', 'Akrep', 'Yay', 'Oğlak', 'Kova', 'Balık'
];

// Swiss Ephemeris celestial body IDs
export const CELESTIAL_BODIES = [
  { id: 0,  name: 'Sun',       trName: 'Güneş' },
  { id: 1,  name: 'Moon',      trName: 'Ay' },
  { id: 2,  name: 'Mercury',   trName: 'Merkür' },
  { id: 3,  name: 'Venus',     trName: 'Venüs' },
  { id: 4,  name: 'Mars',      trName: 'Mars' },
  { id: 5,  name: 'Jupiter',   trName: 'Jüpiter' },
  { id: 6,  name: 'Saturn',    trName: 'Satürn' },
  { id: 7,  name: 'Uranus',    trName: 'Uranüs' },
  { id: 8,  name: 'Neptune',   trName: 'Neptün' },
  { id: 9,  name: 'Pluto',     trName: 'Plüton' },
  { id: 15, name: 'Chiron',    trName: 'Chiron' },
  { id: 11, name: 'True Node', trName: 'Kuzey Ay Düğümü' },
  { id: 12, name: 'Lilith',    trName: 'Lilith' },
];

// Aspect definitions
// orb = tolerance in degrees (widened by 25% for Sun and Moon)
export const ASPECTS = [
  { name: 'Conjunction',  angle: 0,   orb: 8,   symbol: '☌', trName: 'Kavuşum' },
  { name: 'Opposition',   angle: 180, orb: 8,   symbol: '☍', trName: 'Karşıt' },
  { name: 'Trine',        angle: 120, orb: 7,   symbol: '△', trName: 'Üçgen' },
  { name: 'Square',       angle: 90,  orb: 7,   symbol: '□', trName: 'Kare' },
  { name: 'Sextile',      angle: 60,  orb: 5,   symbol: '⚹', trName: 'Altıgen' },
  { name: 'Quincunx',     angle: 150, orb: 2.5, symbol: '⚻', trName: 'Quincunx' },
  { name: 'Semi-sextile', angle: 30,  orb: 1.5, symbol: '⚺', trName: 'Yarı Altıgen' },
];

// Supported house systems
// Swiss Ephemeris uses single character codes
export const HOUSE_SYSTEMS = {
  'P': { name: 'Placidus',       description: 'Most common Western system (default)' },
  'K': { name: 'Koch',           description: 'Similar to Placidus, preferred by some European astrologers' },
  'W': { name: 'Whole Sign',     description: 'Oldest system, Hellenistic astrology. Works at all latitudes' },
  'E': { name: 'Equal',          description: 'Each house is 30°, starting from ASC' },
  'B': { name: 'Alcabitius',     description: 'Medieval Arabian astrology' },
  'R': { name: 'Regiomontanus',  description: 'Preferred in horary astrology' },
  'O': { name: 'Porphyry',       description: 'Simplest quadrant system' },
  'C': { name: 'Campanus',       description: 'Space-based division' },
};

// Element and modality classification
export const ELEMENTS = {
  Fire:  ['Aries', 'Leo', 'Sagittarius'],
  Earth: ['Taurus', 'Virgo', 'Capricorn'],
  Air:   ['Gemini', 'Libra', 'Aquarius'],
  Water: ['Cancer', 'Scorpio', 'Pisces'],
};

export const MODALITIES = {
  Cardinal: ['Aries', 'Cancer', 'Libra', 'Capricorn'],
  Fixed:    ['Taurus', 'Leo', 'Scorpio', 'Aquarius'],
  Mutable:  ['Gemini', 'Virgo', 'Sagittarius', 'Pisces'],
};

// Modern sign rulers (sign → ruling planet)
export const SIGN_RULERS = {
  Aries: 'Mars',
  Taurus: 'Venus',
  Gemini: 'Mercury',
  Cancer: 'Moon',
  Leo: 'Sun',
  Virgo: 'Mercury',
  Libra: 'Venus',
  Scorpio: 'Pluto',
  Sagittarius: 'Jupiter',
  Capricorn: 'Saturn',
  Aquarius: 'Uranus',
  Pisces: 'Neptune',
};
