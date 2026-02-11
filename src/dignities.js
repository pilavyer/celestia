// src/dignities.js

/**
 * Geleneksel gezegen dignite (onur/düşüş) tablosu.
 * Domicile = Gezegen kendi burcunda (en güçlü)
 * Exaltation = Yüceltildiği burç
 * Detriment = Zıt burç (zayıf)
 * Fall = Düşüş burcu (en zayıf)
 * Peregrine = Hiçbiri değilse
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

/**
 * Gezegenin bulunduğu burçtaki dignite durumunu döndürür.
 *
 * @param {string} planetName - Gezegen adı (İngilizce)
 * @param {string} sign - Burç adı (İngilizce)
 * @returns {string|null} 'domicile' | 'exaltation' | 'detriment' | 'fall' | 'peregrine' | null
 */
export function getDignity(planetName, sign) {
  const table = DIGNITY_TABLE[planetName];
  if (!table) return null; // Chiron, Node'lar vs. için dignite yok

  if (table.domicile.includes(sign))   return 'domicile';
  if (table.exaltation.includes(sign)) return 'exaltation';
  if (table.detriment.includes(sign))  return 'detriment';
  if (table.fall.includes(sign))       return 'fall';
  return 'peregrine';
}

/**
 * Türkçe dignite karşılığı
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
