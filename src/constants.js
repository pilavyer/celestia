// src/constants.js

// Burç isimleri — index 0'dan başlar (0° = Koç başlangıcı)
export const SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
];

// Türkçe burç isimleri (opsiyonel, locale desteği için)
export const SIGNS_TR = [
  'Koç', 'Boğa', 'İkizler', 'Yengeç', 'Aslan', 'Başak',
  'Terazi', 'Akrep', 'Yay', 'Oğlak', 'Kova', 'Balık'
];

// Swiss Ephemeris gök cismi ID'leri
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

// Aspekt tanımları
// orb = tolerans derecesi (Güneş ve Ay için %25 genişletilir)
export const ASPECTS = [
  { name: 'Conjunction',  angle: 0,   orb: 8,   symbol: '☌', trName: 'Kavuşum' },
  { name: 'Opposition',   angle: 180, orb: 8,   symbol: '☍', trName: 'Karşıt' },
  { name: 'Trine',        angle: 120, orb: 7,   symbol: '△', trName: 'Üçgen' },
  { name: 'Square',       angle: 90,  orb: 7,   symbol: '□', trName: 'Kare' },
  { name: 'Sextile',      angle: 60,  orb: 5,   symbol: '⚹', trName: 'Altıgen' },
  { name: 'Quincunx',     angle: 150, orb: 2.5, symbol: '⚻', trName: 'Quincunx' },
  { name: 'Semi-sextile', angle: 30,  orb: 1.5, symbol: '⚺', trName: 'Yarı Altıgen' },
];

// Desteklenen ev sistemleri
// Swiss Ephemeris tek karakter kodları kullanır
export const HOUSE_SYSTEMS = {
  'P': { name: 'Placidus',       description: 'En yaygın Batı sistemi (varsayılan)' },
  'K': { name: 'Koch',           description: 'Placidus\'a benzer, bazı Avrupa astrologları tercih eder' },
  'W': { name: 'Whole Sign',     description: 'En eski sistem, Hellenistik astroloji. Tüm enlemlerde çalışır' },
  'E': { name: 'Equal',          description: 'Her ev 30°, ASC\'den başlar' },
  'B': { name: 'Alcabitius',     description: 'Orta Çağ Arap astrolojisi' },
  'R': { name: 'Regiomontanus',  description: 'Horary astrolojide tercih edilir' },
  'O': { name: 'Porphyry',       description: 'En basit quadrant sistemi' },
  'C': { name: 'Campanus',       description: 'Mekan bazlı bölünme' },
};

// Element ve modalite sınıflandırması
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

// Modern burç yöneticileri (sign → ruling planet)
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
