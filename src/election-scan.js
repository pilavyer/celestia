// src/election-scan.js
// Single-call electional scan: scores day×time windows for a stated purpose.
// Scoring model ported verbatim from the validated research scripts
// (planetary hour + event-chart Moon house + ASC sign + angular benefics/malefics
// + transiting-Moon→natal aspects + Void-of-Course penalty).

import { calculateNatalChart } from './calculator.js';
import { calculateVoidOfCourseMoon } from './transit.js';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// --- Ağırlık setleri (araştırma betikleriyle birebir; amaç bazlı ince ayar) ---
const BASE = {
  hour: { Mercury: 3, Jupiter: 3, Sun: 2, Venus: 1, Moon: 1, Saturn: -2, Mars: -2 },
  moonHouse: { 10: 3, 1: 2, 6: 2, 11: 1, 3: 1, 9: 1, 7: 1, 2: 0, 4: 0, 5: 0, 8: -1, 12: -2 },
  ascSign: { Virgo: 2, Gemini: 2, Capricorn: 2, Leo: 2, Libra: 1, Cancer: 1, Sagittarius: 1 },
  vocPenalty: -5,
};

const PURPOSES = {
  'is-gorusmesi': { ...BASE },
  genel: { ...BASE },
  nikah: {
    ...BASE,
    hour: { ...BASE.hour, Venus: 3, Mercury: 2 },
    moonHouse: { ...BASE.moonHouse, 7: 3, 5: 2 },
    ascSign: { ...BASE.ascSign, Libra: 2, Taurus: 2 },
    vocPenalty: -6,
  },
  imza: {
    ...BASE,
    hour: { ...BASE.hour, Mercury: 4 },
    vocPenalty: -6,
  },
  seyahat: {
    ...BASE,
    moonHouse: { ...BASE.moonHouse, 9: 2, 3: 2 },
  },
  tasinma: {
    ...BASE,
    moonHouse: { ...BASE.moonHouse, 4: 3, 2: 1 },
    ascSign: { ...BASE.ascSign, Taurus: 2, Cancer: 2 },
    vocPenalty: -6,
  },
  lansman: {
    ...BASE,
    hour: { ...BASE.hour, Sun: 3, Mercury: 3 },
    moonHouse: { ...BASE.moonHouse, 10: 3, 1: 3, 11: 2 },
    ascSign: { ...BASE.ascSign, Leo: 3 },
    vocPenalty: -6,
  },
  'saglik-randevusu': {
    ...BASE,
    hour: { ...BASE.hour, Saturn: -3, Mars: -3, Jupiter: 3, Venus: 2 },
    moonHouse: { ...BASE.moonHouse, 6: 1, 12: -3, 8: -2 },
    vocPenalty: -7,
  },
  teklif: {
    ...BASE,
    hour: { ...BASE.hour, Venus: 3, Moon: 2 },
    moonHouse: { ...BASE.moonHouse, 5: 3, 7: 3 },
    ascSign: { ...BASE.ascSign, Libra: 2, Taurus: 2, Leo: 2 },
    vocPenalty: -6,
  },
};

const DOW_TR = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
const BENEFIC_TARGETS = ['Sun', 'Mercury', 'Venus', 'Jupiter', 'Midheaven', 'Ascendant', 'Moon'];
const MALEFIC_TARGETS = ['Saturn', 'Mars', 'Pluto'];
const SOFT = new Set([0, 60, 120]);
const HARD = new Set([0, 90, 180]);

function angDiff(a, b) {
  let d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

function moonAspect(moonLon, targetLon, orb = 2.5) {
  const d = angDiff(moonLon, targetLon);
  for (const deg of [0, 60, 90, 120, 180]) {
    if (Math.abs(d - deg) <= orb) return deg;
  }
  return null;
}

/**
 * Electional scan over a date range.
 *
 * @param {object} params - natal fields (year..timezone, houseSystem optional) plus:
 * @param {string} params.startDate - "YYYY-MM-DD"
 * @param {number} params.days - 1-31
 * @param {string} [params.purpose='genel'] - is-gorusmesi | nikah | imza | seyahat | genel
 * @param {number} [params.eventLatitude]  - event location (default: natal)
 * @param {number} [params.eventLongitude]
 * @param {string} [params.eventTimezone]
 * @param {number} [params.startHour=8] @param {number} [params.endHour=18]
 * @param {number} [params.stepMinutes=20]
 */
export function calculateElectionScan(params) {
  const {
    year, month, day, hour, minute, latitude, longitude, timezone,
    startDate, purpose = 'genel',
    eventLatitude = latitude, eventLongitude = longitude, eventTimezone = timezone,
    startHour = 8, endHour = 18, stepMinutes = 20,
  } = params;
  const days = Math.max(1, Math.min(31, Math.round(Number(params.days) || 30)));

  if (!DATE_RE.test(String(startDate))) {
    throw new Error(`Invalid startDate: "${startDate}". Expected format: YYYY-MM-DD`);
  }
  if (!PURPOSES[purpose]) {
    throw new Error(`Invalid purpose: "${purpose}". Valid: ${Object.keys(PURPOSES).join(', ')}`);
  }
  const W = PURPOSES[purpose];

  // Natal noktalar (Ay açıları için hedefler)
  const natal = calculateNatalChart({
    year, month, day, hour, minute, latitude, longitude, timezone, houseSystem: 'P',
  });
  const targets = {};
  for (const p of natal.planets) {
    if (['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Pluto'].includes(p.name)) {
      targets[p.name] = p.longitude;
    }
  }
  targets.Ascendant = natal.houses.ascendant.longitude;
  targets.Midheaven = natal.houses.midheaven.longitude;

  const [sy, sm, sd] = startDate.split('-').map(Number);
  const results = [];
  // VoC önbelleği: Ay burç değiştirene dek pencere sabittir
  let vocCache = null;

  for (let d = 0; d < days; d++) {
    const dt = new Date(Date.UTC(sy, sm - 1, sd + d));
    const dy = dt.getUTCFullYear(); const dm = dt.getUTCMonth() + 1; const dd = dt.getUTCDate();
    const dateStr = `${dy}-${String(dm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;

    const windows = [];
    const vocWindows = new Set();
    let mercuryRetro = false;
    let moonSignNoon = '';

    for (let m = startHour * 60; m <= endHour * 60; m += stepMinutes) {
      const hh = Math.floor(m / 60); const mm = m % 60;
      const c = calculateNatalChart({
        year: dy, month: dm, day: dd, hour: hh, minute: mm,
        latitude: eventLatitude, longitude: eventLongitude,
        timezone: eventTimezone, houseSystem: 'P',
      });
      const jdET = c.meta.julianDayET;
      const moon = c.planets.find((p) => p.name === 'Moon');
      const merc = c.planets.find((p) => p.name === 'Mercury');
      const jup = c.planets.find((p) => p.name === 'Jupiter');
      const mars = c.planets.find((p) => p.name === 'Mars');
      const sat = c.planets.find((p) => p.name === 'Saturn');
      if (hh === 12 && mm === 0) {
        mercuryRetro = merc.isRetrograde;
        moonSignNoon = moon.sign;
      }

      let score = 0;
      const factors = [];

      const ph = c.analysis.planetaryHour?.planet;
      const hs = W.hour[ph] ?? 0;
      score += hs;
      if (hs !== 0) factors.push(`${ph} saati (${hs > 0 ? '+' : ''}${hs})`);

      const ascS = W.ascSign[c.houses.ascendant.sign] ?? 0;
      score += ascS;
      if (ascS) factors.push(`${c.houses.ascendant.sign} yükseliyor (+${ascS})`);

      const mh = W.moonHouse[moon.house] ?? 0;
      score += mh;
      if (mh) factors.push(`Ay ${moon.house}. evde (${mh > 0 ? '+' : ''}${mh})`);

      const ANGULAR = [1, 10, 7, 4];
      if (ANGULAR.includes(jup.house)) { score += 2; factors.push('Jüpiter köşede (+2)'); }
      if (ANGULAR.includes(merc.house)) { score += 1; factors.push(`Merkür köşede${merc.isRetrograde ? ' ℞' : ''} (+1)`); }
      if (ANGULAR.includes(mars.house)) { score -= 2; factors.push('Mars köşede (-2)'); }
      if (ANGULAR.includes(sat.house)) { score -= 1; factors.push('Satürn köşede (-1)'); }

      for (const [tn, tl] of Object.entries(targets)) {
        const deg = moonAspect(moon.longitude, tl);
        if (deg === null) continue;
        if (BENEFIC_TARGETS.includes(tn) && SOFT.has(deg)) {
          score += 1; factors.push(`Ay→natal ${tn} uyumlu (+1)`);
        } else if (MALEFIC_TARGETS.includes(tn) && HARD.has(deg)) {
          score -= 1; factors.push(`Ay→natal ${tn} sert (-1)`);
        }
      }

      // VoC — CANLI isVoidOfCourse değeri esas alınır (referans betiklerle birebir);
      // önbellek yalnızca bir sonraki durum-değişim sınırına kadar geçerli.
      const stepUTC = Date.parse(c.input.utcTime);
      if (!vocCache || stepUTC >= vocCache.nextBoundary) {
        const v = calculateVoidOfCourseMoon(jdET);
        const bounds = [v.vocStartTime, v.vocEndTime, v.nextIngress?.time]
          .map((t) => (t ? Date.parse(t) : NaN))
          .filter((t) => !Number.isNaN(t) && t > stepUTC);
        vocCache = {
          isVoc: v.isVoidOfCourse,
          vocStart: v.vocStartTime,
          vocEnd: v.vocEndTime,
          nextBoundary: bounds.length ? Math.min(...bounds) : stepUTC + 12 * 3600e3,
        };
      }
      const inVoc = vocCache.isVoc;
      if (inVoc) {
        score += W.vocPenalty;
        factors.push(`Ay boşlukta (${W.vocPenalty})`);
        vocWindows.add(`${(vocCache.vocStart || '').slice(11, 16)}Z→${(vocCache.vocEnd || '').slice(11, 16)}Z`);
      }

      windows.push({ time: `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`, score, factors, voidOfCourse: inVoc || undefined });
    }

    const avg = windows.reduce((a, w) => a + w.score, 0) / windows.length;
    const best = [...windows].sort((a, b) => b.score - a.score).slice(0, 3);
    results.push({
      date: dateStr,
      dayOfWeek: DOW_TR[dt.getUTCDay()],
      avgScore: Math.round(avg * 10) / 10,
      bestWindows: best.map((w) => ({ ...w, factors: w.factors.slice(0, 4) })),
      moonSignNoon,
      mercuryRetro,
      vocWindowsUTC: [...vocWindows],
    });
  }

  const ranked = [...results].sort((a, b) => b.avgScore - a.avgScore);
  return {
    purpose,
    startDate,
    days,
    eventLocation: { latitude: eventLatitude, longitude: eventLongitude, timezone: eventTimezone },
    dailyResults: results,
    ranking: ranked.map((r) => ({ date: r.date, dayOfWeek: r.dayOfWeek, avgScore: r.avgScore, topWindow: r.bestWindows[0] })),
    recommendation: {
      bestDay: ranked[0]?.date,
      bestWindow: ranked[0]?.bestWindows[0],
      note: results.some((r) => r.mercuryRetro)
        ? 'Dönemde Merkür retrosu var: imza/kesin karar için yazılı teyit ve esneklik önerilir.'
        : undefined,
    },
    meta: {
      scoreRange: 'ham skor (yaklaşık -9..+9); yüksek daha iyi',
      engine: 'Celestia election-scan',
      windowsPerDay: Math.floor(((endHour - startHour) * 60) / stepMinutes) + 1,
      totalWindowsScanned: days * (Math.floor(((endHour - startHour) * 60) / stepMinutes) + 1),
    },
  };
}
