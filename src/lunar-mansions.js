// src/lunar-mansions.js — 28 Lunar Mansions (Ay Menzilleri)
// Based on the traditional Arabic/Islamic equal-division system (360° / 28 = 12.857142857°)

const MANSION_SIZE = 360 / 28; // 12.857142857...°

/**
 * 28 Lunar Mansions with Arabic and Turkish names.
 * Each mansion spans exactly 12°51'26" of ecliptic longitude starting from 0° Aries.
 */
const MANSIONS = [
  { number: 1,  name: 'Al-Sharatain', trName: 'Boynuzlar',         meaning: 'Yeni başlangıçlar, seyahat, ilaç kullanımı', nature: 'favorable',   element: 'Fire',  planet: 'Mars'   },
  { number: 2,  name: 'Al-Butain',    trName: 'Küçük Karın',       meaning: 'Hazine arama, tarım, kişisel ilişkiler',      nature: 'unfavorable', element: 'Fire',  planet: 'Venus'  },
  { number: 3,  name: 'Al-Thurayya',  trName: 'Ülker (Süreyya)',   meaning: 'Deniz yolculuğu, avcılık, simya',             nature: 'favorable',   element: 'Fire',  planet: 'Mercury'},
  { number: 4,  name: 'Al-Dabaran',   trName: 'Takipçi',           meaning: 'Düşmanlık, ayrılık, yıkım',                  nature: 'unfavorable', element: 'Earth', planet: 'Moon'   },
  { number: 5,  name: "Al-Haq'a",     trName: 'Beyaz Nokta',       meaning: 'Öğrenme, sağlık, binalar, seyahat',           nature: 'favorable',   element: 'Earth', planet: 'Sun'    },
  { number: 6,  name: "Al-Han'a",     trName: 'İşaret',            meaning: 'Aşk, dostluk, avcılık',                      nature: 'favorable',   element: 'Earth', planet: 'Jupiter'},
  { number: 7,  name: 'Al-Dhira',     trName: 'Kol',               meaning: 'Ticaret, hasat, kazanç, aşk',                nature: 'favorable',   element: 'Air',   planet: 'Saturn' },
  { number: 8,  name: 'Al-Nathra',    trName: 'Burun Deliği',      meaning: 'Aşk ve dostluk, seyahat, ticaret',           nature: 'favorable',   element: 'Air',   planet: 'Mars'   },
  { number: 9,  name: 'Al-Tarf',      trName: 'Bakış',             meaning: 'Zararlı, hastalık ve engellerden kaçınma',    nature: 'unfavorable', element: 'Air',   planet: 'Venus'  },
  { number: 10, name: 'Al-Jabha',     trName: 'Alın',              meaning: 'Aşk, iyileşme, yardım isteme',               nature: 'favorable',   element: 'Water', planet: 'Mercury'},
  { number: 11, name: 'Al-Zubra',     trName: 'Yele',              meaning: 'Ticaret, seyahat, hasat, koruma',             nature: 'favorable',   element: 'Water', planet: 'Moon'   },
  { number: 12, name: 'Al-Sarfa',     trName: 'Değişim',           meaning: 'Tarım, iyileşme, ortaklık',                  nature: 'favorable',   element: 'Water', planet: 'Sun'    },
  { number: 13, name: 'Al-Awwa',      trName: 'Havlayan',          meaning: 'Ticaret, hasat, seyahat',                    nature: 'favorable',   element: 'Fire',  planet: 'Jupiter'},
  { number: 14, name: 'Al-Simak',     trName: 'Silahsız',          meaning: 'Aşk, evlilik, iyileşme, seyahat',            nature: 'favorable',   element: 'Fire',  planet: 'Saturn' },
  { number: 15, name: 'Al-Ghafr',     trName: 'Örtü',              meaning: 'Hazine, kuyu kazma, yeraltı işleri',          nature: 'favorable',   element: 'Fire',  planet: 'Mars'   },
  { number: 16, name: 'Al-Zubana',    trName: 'Kıskaçlar',         meaning: 'Ticaret, evlilik engeli, zararlı',            nature: 'unfavorable', element: 'Earth', planet: 'Venus'  },
  { number: 17, name: 'Al-Iklil',     trName: 'Taç',               meaning: 'İyileşme, dostluk, binalar',                 nature: 'favorable',   element: 'Earth', planet: 'Mercury'},
  { number: 18, name: 'Al-Qalb',      trName: 'Kalp',              meaning: 'Komplo, hile, düşmanlık, firar',             nature: 'unfavorable', element: 'Earth', planet: 'Moon'   },
  { number: 19, name: 'Al-Shaula',    trName: 'İğne',              meaning: 'Kuşatma, avcılık, düşmanla mücadele',        nature: 'unfavorable', element: 'Air',   planet: 'Sun'    },
  { number: 20, name: "Al-Na'aim",    trName: 'Devekuşları',       meaning: 'Hayvan evcilleştirme, kuyu, seyahat',        nature: 'favorable',   element: 'Air',   planet: 'Jupiter'},
  { number: 21, name: 'Al-Balda',     trName: 'Boş Yer',           meaning: 'Tarım, hasat, binalar, seyahat',             nature: 'favorable',   element: 'Air',   planet: 'Saturn' },
  { number: 22, name: "Sa'd al-Dhabih", trName: 'Kasabın Talihi',  meaning: 'Kaçış, iyileşme, özgürlük',                  nature: 'favorable',   element: 'Water', planet: 'Mars'   },
  { number: 23, name: "Sa'd Bula",    trName: 'Yutanın Talihi',    meaning: 'İyileşme, evlilik, koruma, seyahat',         nature: 'favorable',   element: 'Water', planet: 'Venus'  },
  { number: 24, name: "Sa'd al-Su'ud",trName: 'Talihli Yıldız',    meaning: 'Evlilik, tarım, ticaret, ittifak',           nature: 'favorable',   element: 'Water', planet: 'Mercury'},
  { number: 25, name: "Sa'd al-Akhbiya", trName: 'Çadırların Talihi', meaning: 'Kuşatma, intikam, yıkım',                nature: 'unfavorable', element: 'Fire',  planet: 'Moon'   },
  { number: 26, name: 'Al-Fargh al-Muqaddam', trName: 'Ön Oluk',   meaning: 'Birlik, aşk, iyileşme, seyahat',            nature: 'favorable',   element: 'Fire',  planet: 'Sun'    },
  { number: 27, name: "Al-Fargh al-Mu'akhkhar", trName: 'Arka Oluk', meaning: 'Ticaret, tarım, hasat, iyileşme',          nature: 'favorable',   element: 'Fire',  planet: 'Jupiter'},
  { number: 28, name: 'Batn al-Hut',  trName: 'Balığın Karnı',     meaning: 'Ticaret, hasat, aşk, evlilik',              nature: 'favorable',   element: 'Earth', planet: 'Saturn' },
];

/**
 * Returns the lunar mansion for a given ecliptic longitude.
 * Uses the equal-division system (each mansion = 360/28 degrees).
 *
 * @param {number} longitude - Moon's ecliptic longitude (0-360°)
 * @returns {object} Lunar mansion data
 */
export function getLunarMansion(longitude) {
  let lon = longitude % 360;
  if (lon < 0) lon += 360;

  const index = Math.floor(lon / MANSION_SIZE);
  const mansion = MANSIONS[index];

  const startDegree = index * MANSION_SIZE;
  const endDegree = startDegree + MANSION_SIZE;
  const positionInMansion = lon - startDegree;

  return {
    number: mansion.number,
    name: mansion.name,
    trName: mansion.trName,
    meaning: mansion.meaning,
    nature: mansion.nature,
    natureTr: mansion.nature === 'favorable' ? 'Olumlu' : 'Olumsuz',
    element: mansion.element,
    planet: mansion.planet,
    startDegree: Math.round(startDegree * 1000000) / 1000000,
    endDegree: Math.round(endDegree * 1000000) / 1000000,
    positionInMansion: Math.round(positionInMansion * 1000000) / 1000000,
  };
}
