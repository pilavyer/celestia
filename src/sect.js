// src/sect.js — Sect Analysis (Day/Night Chart Dynamics)

/**
 * Sign gender: Masculine (Fire/Air) vs Feminine (Earth/Water)
 */
const SIGN_GENDER = {
  Aries: 'masculine',    Taurus: 'feminine',     Gemini: 'masculine',
  Cancer: 'feminine',    Leo: 'masculine',       Virgo: 'feminine',
  Libra: 'masculine',    Scorpio: 'feminine',    Sagittarius: 'masculine',
  Capricorn: 'feminine', Aquarius: 'masculine',  Pisces: 'feminine',
};

/**
 * Planet sect membership and gender:
 * Day sect: Sun, Jupiter, Saturn (masculine)
 * Night sect: Moon, Venus, Mars (feminine)
 * Mercury: neutral, adopts chart's sect
 */
const PLANET_SECT = {
  Sun:     { sect: 'day',   gender: 'masculine' },
  Moon:    { sect: 'night', gender: 'feminine'  },
  Mercury: { sect: 'neutral', gender: 'neutral' },
  Venus:   { sect: 'night', gender: 'feminine'  },
  Mars:    { sect: 'night', gender: 'masculine' }, // Mars is night sect but masculine gender
  Jupiter: { sect: 'day',   gender: 'masculine' },
  Saturn:  { sect: 'day',   gender: 'masculine' },
};

/**
 * Determine if a planet is above or below the horizon.
 * Above horizon = southern hemisphere (houses 7-12).
 */
function isAboveHorizon(planetHouse) {
  return planetHouse >= 7 && planetHouse <= 12;
}

/**
 * Calculate full sect analysis for the natal chart.
 *
 * @param {Array} planets - Array of planet objects with name, sign, house
 * @param {boolean} isDayChart - Is this a day chart?
 * @returns {object} Sect analysis
 */
export function calculateSect(planets, isDayChart) {
  const chartSect = isDayChart ? 'day' : 'night';

  // Sect luminary
  const sectLuminary = isDayChart ? 'Sun' : 'Moon';

  // Benefics and malefics by sect
  const inSectBenefic = isDayChart ? 'Jupiter' : 'Venus';
  const outOfSectBenefic = isDayChart ? 'Venus' : 'Jupiter';
  const inSectMalefic = isDayChart ? 'Saturn' : 'Mars';
  const outOfSectMalefic = isDayChart ? 'Mars' : 'Saturn';

  // Planet-by-planet sect conditions
  const planetConditions = [];

  for (const planet of planets) {
    const sectInfo = PLANET_SECT[planet.name];
    if (!sectInfo) continue; // Skip Chiron, Nodes, Lilith, etc.

    const signGender = SIGN_GENDER[planet.sign] || 'neutral';
    const above = isAboveHorizon(planet.house);

    // Is planet in sect?
    let inSect;
    if (sectInfo.sect === 'neutral') {
      // Mercury adopts chart sect
      inSect = true;
    } else {
      inSect = (sectInfo.sect === chartSect);
    }

    // Hayz: in sect + correct sign gender + correct hemisphere
    // Day planet: masculine sign + above horizon (day chart)
    // Night planet: feminine sign + below horizon (night chart)
    // Mercury adopts the chart's sect for gender/hemisphere evaluation
    const effectiveSect = sectInfo.sect === 'neutral' ? chartSect : sectInfo.sect;

    let condition;
    if (inSect) {
      const correctGender = (effectiveSect === 'day' && signGender === 'masculine') ||
                            (effectiveSect === 'night' && signGender === 'feminine');
      const correctHemisphere = (effectiveSect === 'day' && above) ||
                                (effectiveSect === 'night' && !above);

      if (correctGender && correctHemisphere) {
        condition = 'hayz';
      } else if (correctGender || correctHemisphere) {
        condition = 'partial_hayz';
      } else {
        condition = 'in_sect';
      }
    } else {
      // Out of sect — check for halb (anti-hayz, worst condition)
      const wrongGender = (effectiveSect === 'day' && signGender === 'feminine') ||
                          (effectiveSect === 'night' && signGender === 'masculine');
      const wrongHemisphere = (effectiveSect === 'day' && !above) ||
                              (effectiveSect === 'night' && above);

      if (wrongGender && wrongHemisphere) {
        condition = 'halb';
      } else {
        condition = 'out_of_sect';
      }
    }

    const conditionTrMap = {
      hayz: 'Hayz (En İyi Durum)',
      partial_hayz: 'Kısmi Hayz',
      in_sect: 'Sektte',
      out_of_sect: 'Sekt Dışı',
      halb: 'Halb (En Kötü Durum)',
    };

    planetConditions.push({
      planet: planet.name,
      planetTr: planet.trName,
      planetSect: sectInfo.sect,
      inSect,
      signGender,
      aboveHorizon: above,
      condition,
      conditionTr: conditionTrMap[condition],
    });
  }

  return {
    chartSect,
    chartSectTr: isDayChart ? 'Gündüz Haritası' : 'Gece Haritası',
    sectLuminary,
    sectLuminaryTr: isDayChart ? 'Güneş' : 'Ay',
    benefics: {
      inSect: inSectBenefic,
      inSectTr: inSectBenefic === 'Jupiter' ? 'Jüpiter' : 'Venüs',
      outOfSect: outOfSectBenefic,
      outOfSectTr: outOfSectBenefic === 'Jupiter' ? 'Jüpiter' : 'Venüs',
    },
    malefics: {
      inSect: inSectMalefic,
      inSectTr: inSectMalefic === 'Saturn' ? 'Satürn' : 'Mars',
      outOfSect: outOfSectMalefic,
      outOfSectTr: outOfSectMalefic === 'Saturn' ? 'Satürn' : 'Mars',
    },
    planets: planetConditions,
  };
}
