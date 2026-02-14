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
