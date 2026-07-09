// src/agent/compact.js
// Compact, token-efficient views of engine outputs for LLM consumption.
// Full REST responses are large; the agent only needs the interpretive signal.

const r1 = (n) => (typeof n === 'number' ? Math.round(n * 10) / 10 : n);

const CORE_PLANETS = [
  'Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
  'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto', 'Chiron', 'True Node',
];

export function compactChart(chart) {
  return {
    planets: chart.planets
      .filter((p) => CORE_PLANETS.includes(p.name))
      .map((p) => ({
        name: p.name,
        sign: p.sign,
        deg: r1(p.longitude % 30),
        house: p.house,
        dignity: p.dignity || undefined,
        retro: p.isRetrograde || undefined,
      })),
    ascendant: { sign: chart.houses.ascendant.sign, deg: r1(chart.houses.ascendant.longitude % 30) },
    midheaven: { sign: chart.houses.midheaven.sign, deg: r1(chart.houses.midheaven.longitude % 30) },
    isDayChart: chart.analysis?.isDayChart,
    moonPhase: chart.analysis?.moonPhase?.phase,
    dominantElement: chart.analysis?.elements?.dominant,
    dominantModality: chart.analysis?.modalities?.dominant,
    stelliums: chart.analysis?.stelliums?.map((s) => `${s.sign}: ${s.planets.join('+')}`),
    chartRuler: chart.analysis?.chartRuler?.planet,
  };
}

export function compactEnrichment({ arabicParts, fixedStars, firdaria, profections }) {
  const KEY_PARTS = ['Part of Fortune', 'Part of Spirit', 'Part of Eros',
    'Part of Marriage (Men)', 'Part of Marriage (Women)'];
  const partsList = arabicParts?.parts || arabicParts || [];
  const stars = fixedStars?.conjunctions || fixedStars || [];
  return {
    arabicParts: partsList
      .filter((p) => KEY_PARTS.includes(p.name))
      .map((p) => ({ name: p.trName || p.name, sign: p.sign, deg: r1(p.longitude % 30), house: p.house })),
    fixedStars: stars.slice(0, 5).map((s) => ({
      star: s.star || s.starName, point: s.point || s.planet, orb: r1(s.orb),
    })),
    firdaria: firdaria ? {
      major: firdaria.activePeriod?.planet,
      majorEnds: firdaria.activePeriod?.endDate,
      sub: firdaria.activeSubPeriod?.subPlanet || firdaria.activeSubPeriod?.planet,
      subEnds: firdaria.activeSubPeriod?.endDate,
    } : undefined,
    profection: profections ? {
      age: profections.profectionMeta?.age,
      annualHouse: profections.annual?.house,
      annualSign: profections.annual?.sign,
      yearLord: profections.annual?.ruler,
      monthlyHouse: profections.monthly?.house,
    } : undefined,
  };
}

export function compactTransitHits(result, maxHits = 20) {
  return {
    moment: result.transitMoment,
    hits: result.transits.slice(0, maxHits).map((h) => ({
      t: h.transitPlanet + (h.isRetrograde ? ' ℞' : ''),
      asp: h.type,
      n: h.natalPoint,
      orb: r1(h.orb),
      exact: h.isExact || undefined,
      applying: h.isApplying || undefined,
    })),
    moon: {
      sign: result.lunar.moonSign,
      voidOfCourse: result.lunar.isVoidOfCourse,
      vocUntil: result.lunar.isVoidOfCourse ? (result.lunar.nextIngress?.time || result.lunar.vocEndTime) : undefined,
    },
    retrogrades: result.retrogrades,
  };
}

export function compactTransitScan(result, maxItems = 15) {
  return {
    periodDays: result.periodDays,
    importantTransits: (result.importantTransits || []).slice(0, maxItems).map((t) => ({
      t: t.transitPlanet, asp: t.type, n: t.natalPlanet, orb: r1(t.orb), strength: t.strength,
    })),
    ingresses: (result.ingresses || []).slice(0, 10).map((i) => ({
      planet: i.planet, from: i.fromSign, to: i.toSign, at: i.exactTime,
    })),
    retrogrades: (result.retrogrades || []).map((p) => (typeof p === 'string' ? p : p.planet)),
  };
}

export function compactSynastry(result) {
  const KEY = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Pluto', 'Ascendant', 'Midheaven'];
  const cross = (result.synastry?.crossAspects || [])
    .filter((a) => KEY.includes(a.planet1) && KEY.includes(a.planet2))
    .sort((a, b) => a.orb - b.orb)
    .slice(0, 14)
    .map((a) => ({ p1: a.planet1, asp: a.type, p2: a.planet2, orb: r1(a.orb) }));
  const pick = (chart, name) => {
    const p = chart?.planets?.find((x) => x.name === name);
    return p ? `${p.sign} ${r1(p.longitude % 30)}°` : undefined;
  };
  return {
    score: result.synastry?.score,
    keyCrossAspects: cross,
    composite: result.composite ? {
      sun: pick(result.composite, 'Sun'),
      moon: pick(result.composite, 'Moon'),
      venus: pick(result.composite, 'Venus'),
      saturn: pick(result.composite, 'Saturn'),
    } : undefined,
    davison: result.davison ? {
      date: result.davison.midpointDate,
      sun: pick(result.davison, 'Sun'),
      moon: pick(result.davison, 'Moon'),
      venus: pick(result.davison, 'Venus'),
    } : undefined,
  };
}
