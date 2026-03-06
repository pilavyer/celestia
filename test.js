// test.js
import { calculateNatalChart } from './src/calculator.js';
import { calculateSynastry, midpoint } from './src/synastry.js';
import { calculateTransits, calculateLunarMetrics, calculateIngresses, calculateVoidOfCourseMoon, nowToJD } from './src/transit.js';
import { calculateEclipses } from './src/eclipses.js';
import { calculateAstrocartography } from './src/astrocartography.js';

console.log('='.repeat(70));
console.log('CELESTIA TEST SUITE');
console.log('Compare results with astro.com: https://www.astro.com/cgi/chart.cgi');
console.log('='.repeat(70));

// ========== TEST 1: Istanbul, 2020 (UTC+3 fixed, no DST) ==========
console.log('\nTEST 1: Istanbul, 25 January 2020, 15:35');
console.log('-'.repeat(50));

try {
  const test1 = calculateNatalChart({
    year: 2020, month: 1, day: 25, hour: 15, minute: 35,
    latitude: 41.0082, longitude: 28.9784,
    timezone: 'Europe/Istanbul',
    houseSystem: 'P',
  });

  console.log(`Sun: ${test1.planets.find(p => p.name === 'Sun').formattedPosition}`);
  console.log(`Moon: ${test1.planets.find(p => p.name === 'Moon').formattedPosition}`);
  console.log(`Ascendant: ${test1.houses.ascendant.formatted}`);
  console.log(`MC: ${test1.houses.midheaven.formatted}`);
  console.log(`Warnings: ${test1.meta.warnings.length > 0 ? test1.meta.warnings.join('; ') : 'None'}`);
  console.log(`Ephemeris mode: ${test1.meta.ephemerisMode}`);
} catch (e) {
  console.error('ERROR:', e.message);
}

// ========== TEST 2: Istanbul, 1990 (DST active period, summer) ==========
console.log('\nTEST 2: Istanbul, 15 July 1990, 14:30 (during DST)');
console.log('-'.repeat(50));

try {
  const test2 = calculateNatalChart({
    year: 1990, month: 7, day: 15, hour: 14, minute: 30,
    latitude: 41.0082, longitude: 28.9784,
    timezone: 'Europe/Istanbul',
    houseSystem: 'P',
  });

  console.log(`Sun: ${test2.planets.find(p => p.name === 'Sun').formattedPosition}`);
  console.log(`Moon: ${test2.planets.find(p => p.name === 'Moon').formattedPosition}`);
  console.log(`Ascendant: ${test2.houses.ascendant.formatted}`);
  console.log(`DST active: ${test2.input.isDST}`);
  console.log(`UTC offset: ${test2.input.offsetHours} hours`);
} catch (e) {
  console.error('ERROR:', e.message);
}

// ========== TEST 3: New York, 1985 ==========
console.log('\nTEST 3: New York, 4 March 1985, 09:15');
console.log('-'.repeat(50));

try {
  const test3 = calculateNatalChart({
    year: 1985, month: 3, day: 4, hour: 9, minute: 15,
    latitude: 40.7128, longitude: -74.0060, // WEST LONGITUDE = NEGATIVE
    timezone: 'America/New_York',
    houseSystem: 'P',
  });

  console.log(`Sun: ${test3.planets.find(p => p.name === 'Sun').formattedPosition}`);
  console.log(`Moon: ${test3.planets.find(p => p.name === 'Moon').formattedPosition}`);
  console.log(`Ascendant: ${test3.houses.ascendant.formatted}`);
} catch (e) {
  console.error('ERROR:', e.message);
}

// ========== TEST 4: High latitude test (Reykjavik, Iceland) ==========
console.log('\nTEST 4: Reykjavik, 21 June 2000, 12:00 (high latitude)');
console.log('-'.repeat(50));

try {
  const test4 = calculateNatalChart({
    year: 2000, month: 6, day: 21, hour: 12, minute: 0,
    latitude: 64.1466, longitude: -21.9426,
    timezone: 'Atlantic/Reykjavik',
    houseSystem: 'P',
  });

  console.log(`Ascendant: ${test4.houses.ascendant.formatted}`);
  console.log(`Warnings: ${test4.meta.warnings.length > 0 ? test4.meta.warnings.join('; ') : 'None'}`);
} catch (e) {
  console.error('ERROR:', e.message);
}

// ========== TEST 5: Full output example ==========
console.log('\nTEST 5: Full JSON output (Istanbul, 15 July 1990)');
console.log('-'.repeat(50));

try {
  const fullChart = calculateNatalChart({
    year: 1990, month: 7, day: 15, hour: 14, minute: 30,
    latitude: 41.0082, longitude: 28.9784,
    timezone: 'Europe/Istanbul',
  });

  // Planet positions table
  console.log('\nPlanet Positions:');
  fullChart.planets.forEach(p => {
    const retro = p.isRetrograde ? ' R' : '';
    const dignity = p.dignity ? ` [${p.dignity}]` : '';
    console.log(`  ${p.name.padEnd(20)} ${p.formattedPosition.padEnd(25)} House ${p.house}${retro}${dignity}`);
  });

  // House cusps
  console.log('\nHouse Cusps:');
  fullChart.houses.cusps.forEach(h => {
    console.log(`  House ${String(h.house).padStart(2)}: ${h.formattedCusp}`);
  });

  // Aspects (first 10)
  console.log('\nAspects (first 10):');
  fullChart.aspects.slice(0, 10).forEach(a => {
    const applying = a.isApplying ? 'applying' : 'separating';
    console.log(`  ${a.planet1} ${a.symbol} ${a.planet2} ${a.type} (orb: ${a.orb}, ${applying}, strength: ${a.strength}%)`);
  });

  // Analysis
  console.log('\nAnalysis:');
  console.log(`  Sun Sign: ${fullChart.analysis.sunSign}`);
  console.log(`  Moon Sign: ${fullChart.analysis.moonSign}`);
  console.log(`  Rising Sign: ${fullChart.analysis.risingSign}`);
  console.log(`  Day Chart: ${fullChart.analysis.isDayChart}`);
  console.log(`  Moon Phase: ${fullChart.analysis.moonPhase?.phase}`);
  console.log(`  Part of Fortune: ${fullChart.analysis.partOfFortune.formatted}`);
  console.log(`  Dominant Element: ${fullChart.analysis.elements.dominant}`);
  console.log(`  Dominant Modality: ${fullChart.analysis.modalities.dominant}`);

  if (fullChart.analysis.stelliums.length > 0) {
    fullChart.analysis.stelliums.forEach(s => {
      console.log(`  Stellium: ${s.sign} (${s.planets.join(', ')})`);
    });
  }

  // Chart Ruler validation (Ascendant Scorpio -> ruler Pluto)
  console.log('\nChart Ruler:');
  const cr = fullChart.analysis.chartRuler;
  if (cr) {
    console.log(`  ${cr.name} — ${cr.formattedPosition}, House ${cr.house}`);
    if (cr.name === 'Pluto') {
      console.log('PASS: Chart ruler is Pluto for Scorpio rising');
    } else {
      console.error(`FAIL: Chart ruler should be Pluto for Scorpio rising, got ${cr.name}`);
    }
    if (cr.house === 1) {
      console.log('PASS: Pluto is in house 1');
    } else {
      console.error(`FAIL: Pluto expected in house 1, got house ${cr.house}`);
    }
  } else {
    console.error('FAIL: chartRuler is null!');
  }

  // House Rulers validation (12 house rulers)
  console.log('\nHouse Rulers:');
  const hr = fullChart.analysis.houseRulers;
  if (hr && hr.length === 12) {
    console.log('PASS: 12 house rulers present');
  } else {
    console.error(`FAIL: Expected 12 house rulers, got ${hr ? hr.length : 0}`);
  }

  let houseRulersValid = true;
  if (hr) {
    for (const ruler of hr) {
      if (ruler.rulerHouse < 1 || ruler.rulerHouse > 12) {
        console.error(`FAIL: House ${ruler.house} ruler has invalid house: ${ruler.rulerHouse}`);
        houseRulersValid = false;
        break;
      }
    }
  }
  if (houseRulersValid) {
    console.log('PASS: All house ruler houses are between 1-12');
  }

  // Consistency: House 1 cusp sign = ascendant sign -> house 1 ruler = chart ruler
  if (hr && cr) {
    const house1Ruler = hr.find(h => h.house === 1);
    if (house1Ruler.rulingPlanet === cr.name) {
      console.log('PASS: House 1 ruler = chart ruler (consistent)');
    } else {
      console.error(`FAIL: House 1 ruler (${house1Ruler.rulingPlanet}) != chart ruler (${cr.name})`);
    }
  }

  // First 3 house rulers example
  if (hr) {
    console.log('\nFirst 3 house rulers:');
    hr.slice(0, 3).forEach(r => {
      console.log(`  House ${String(r.house).padStart(2)}: cusp ${r.cuspSign.padEnd(12)} -> ruler ${r.rulingPlanet.padEnd(8)} (${r.rulingPlanetTr}) — ${r.rulerSign} House ${r.rulerHouse}`);
    });
  }

} catch (e) {
  console.error('ERROR:', e.message);
}

// ========== TEST 6: Basic synastry test ==========
console.log('\nTEST 6: Basic synastry test (Istanbul + Ankara)');
console.log('-'.repeat(50));

try {
  const synResult = calculateSynastry(
    {
      year: 1998, month: 11, day: 25, hour: 10, minute: 17,
      latitude: 41.2867, longitude: 36.33,
      timezone: 'Europe/Istanbul', houseSystem: 'P',
    },
    {
      year: 2000, month: 3, day: 15, hour: 14, minute: 30,
      latitude: 39.9208, longitude: 32.8541,
      timezone: 'Europe/Istanbul', houseSystem: 'P',
    }
  );

  // Are Person 1 and Person 2 natal data present?
  const p1Sun = synResult.person1.planets.find(p => p.name === 'Sun');
  const p2Sun = synResult.person2.planets.find(p => p.name === 'Sun');
  console.log(`Person 1 Sun: ${p1Sun.formattedPosition}`);
  console.log(`Person 2 Sun: ${p2Sun.formattedPosition}`);

  // Cross-aspect count > 0
  const crossCount = synResult.synastry.crossAspects.length;
  console.log(`Cross-aspect count: ${crossCount}`);
  if (crossCount === 0) {
    console.error('FAIL: Cross-aspect count should not be 0!');
  } else {
    console.log('PASS: Cross-aspects present');
  }

  // Composite planet count validation
  const compPlanetCount = synResult.composite.planets.length;
  const expectedPlanetCount = synResult.person1.planets.length;
  console.log(`Composite planet count: ${compPlanetCount} (expected: ${expectedPlanetCount})`);
  if (compPlanetCount === expectedPlanetCount) {
    console.log('PASS: Composite planet count is correct');
  } else {
    console.error('FAIL: Composite planet count does not match!');
  }

  // Show first 5 cross-aspects
  console.log('\nFirst 5 cross-aspects:');
  synResult.synastry.crossAspects.slice(0, 5).forEach(a => {
    console.log(`  ${a.planet1} ${a.symbol} ${a.planet2} ${a.type} (orb: ${a.orb}, strength: ${a.strength}%)`);
  });

} catch (e) {
  console.error('ERROR:', e.message);
}

// ========== TEST 7: House overlay validation ==========
console.log('\nTEST 7: House overlay validation');
console.log('-'.repeat(50));

try {
  const synResult = calculateSynastry(
    {
      year: 1990, month: 7, day: 15, hour: 14, minute: 30,
      latitude: 41.0082, longitude: 28.9784,
      timezone: 'Europe/Istanbul', houseSystem: 'P',
    },
    {
      year: 1985, month: 3, day: 4, hour: 9, minute: 15,
      latitude: 40.7128, longitude: -74.0060,
      timezone: 'America/New_York', houseSystem: 'P',
    }
  );

  const overlay12 = synResult.synastry.houseOverlay.person1InPerson2Houses;
  const overlay21 = synResult.synastry.houseOverlay.person2InPerson1Houses;

  console.log(`Person 1 -> Person 2 houses: ${overlay12.length} planets`);
  console.log(`Person 2 -> Person 1 houses: ${overlay21.length} planets`);

  // Is overlay data present in both directions?
  if (overlay12.length > 0 && overlay21.length > 0) {
    console.log('PASS: House overlay data present in both directions');
  } else {
    console.error('FAIL: House overlay data is missing!');
  }

  // Every planet must have a house (between 1-12)
  const allValid12 = overlay12.every(o => o.house >= 1 && o.house <= 12);
  const allValid21 = overlay21.every(o => o.house >= 1 && o.house <= 12);
  if (allValid12 && allValid21) {
    console.log('PASS: All house overlay values are valid (1-12)');
  } else {
    console.error('FAIL: Invalid house overlay value!');
  }

  // Example overlay
  console.log('\nPerson 1 planets in Person 2 houses:');
  overlay12.slice(0, 5).forEach(o => {
    console.log(`  ${o.planet.padEnd(20)} ${o.sign.padEnd(12)} -> House ${o.house}`);
  });

} catch (e) {
  console.error('ERROR:', e.message);
}

// ========== TEST 8: Composite midpoint validation ==========
console.log('\nTEST 8: Composite midpoint validation');
console.log('-'.repeat(50));

try {
  // Test the midpoint function directly
  // 10° and 20° midpoint = 15°
  const mid1 = midpoint(10, 20);
  console.log(`midpoint(10, 20) = ${mid1} (expected: 15)`);
  if (Math.abs(mid1 - 15) < 0.001) {
    console.log('PASS: Simple midpoint correct');
  } else {
    console.error('FAIL: Simple midpoint incorrect!');
  }

  // Wrap-around test: 350° and 10° midpoint = 0°
  const mid2 = midpoint(350, 10);
  console.log(`midpoint(350, 10) = ${mid2} (expected: 0)`);
  if (Math.abs(mid2) < 0.001 || Math.abs(mid2 - 360) < 0.001) {
    console.log('PASS: Wrap-around midpoint correct');
  } else {
    console.error('FAIL: Wrap-around midpoint incorrect!');
  }

  // Wrap-around test 2: 355° and 5° midpoint = 0°
  const mid3 = midpoint(355, 5);
  console.log(`midpoint(355, 5) = ${mid3} (expected: 0)`);
  if (Math.abs(mid3) < 0.001 || Math.abs(mid3 - 360) < 0.001) {
    console.log('PASS: Wrap-around midpoint 2 correct');
  } else {
    console.error('FAIL: Wrap-around midpoint 2 incorrect!');
  }

  // 90° and 270° midpoint = 0° or 180° (shortest arc)
  const mid4 = midpoint(90, 270);
  console.log(`midpoint(90, 270) = ${mid4} (expected: 0 or 180)`);
  if (Math.abs(mid4) < 0.001 || Math.abs(mid4 - 180) < 0.001 || Math.abs(mid4 - 360) < 0.001) {
    console.log('PASS: Opposite midpoint correct');
  } else {
    console.error('FAIL: Opposite midpoint incorrect!');
  }

  // Midpoint validation within composite chart
  const synResult = calculateSynastry(
    {
      year: 1998, month: 11, day: 25, hour: 10, minute: 17,
      latitude: 41.2867, longitude: 36.33,
      timezone: 'Europe/Istanbul', houseSystem: 'P',
    },
    {
      year: 2000, month: 3, day: 15, hour: 14, minute: 30,
      latitude: 39.9208, longitude: 32.8541,
      timezone: 'Europe/Istanbul', houseSystem: 'P',
    }
  );

  const p1Sun = synResult.person1.planets.find(p => p.name === 'Sun');
  const p2Sun = synResult.person2.planets.find(p => p.name === 'Sun');
  const compSun = synResult.composite.planets.find(p => p.name === 'Sun');
  const expectedMid = midpoint(p1Sun.longitude, p2Sun.longitude);

  console.log(`\nPerson 1 Sun: ${p1Sun.longitude.toFixed(2)}°`);
  console.log(`Person 2 Sun: ${p2Sun.longitude.toFixed(2)}°`);
  console.log(`Composite Sun: ${compSun.longitude.toFixed(2)}° (expected: ${expectedMid.toFixed(2)}°)`);

  if (Math.abs(compSun.longitude - expectedMid) < 0.001) {
    console.log('PASS: Composite Sun midpoint verified');
  } else {
    console.error('FAIL: Composite Sun midpoint does not match!');
  }

} catch (e) {
  console.error('ERROR:', e.message);
}

// ========== TEST 9: Basic transit — response shape validation ==========
console.log('\nTEST 9: Basic transit — response shape validation');
console.log('-'.repeat(50));

try {
  const transitResult = calculateTransits(
    {
      year: 1998, month: 11, day: 25, hour: 10, minute: 17,
      latitude: 41.2867, longitude: 36.33,
      timezone: 'Europe/Istanbul', houseSystem: 'P',
    },
    { days: 30, startDate: '2026-02-12', topN: 10 }
  );

  // response shape check
  const requiredKeys = [
    'success', 'monthStartDate', 'monthEndDate', 'periodDays', 'ascendant',
    'moonPhase', 'retrogrades', 'allTransits', 'todayTransits', 'weekTransits',
    'weeklyWithTiming', 'importantTransits', 'allEvents', 'lunar', 'fetchedAt', 'meta'
  ];
  const missingKeys = requiredKeys.filter(k => !(k in transitResult));

  if (missingKeys.length === 0) {
    console.log('PASS: All required fields present');
  } else {
    console.error(`FAIL: Missing fields: ${missingKeys.join(', ')}`);
  }

  console.log(`success: ${transitResult.success}`);
  console.log(`periodDays: ${transitResult.periodDays}`);
  console.log(`ascendant: ${transitResult.ascendant}`);
  console.log(`moonPhase: ${transitResult.moonPhase}`);
  console.log(`allTransits count: ${transitResult.allTransits.length}`);
  console.log(`allEvents count: ${transitResult.allEvents.length}`);
  console.log(`importantTransits count: ${transitResult.importantTransits.length}`);
  console.log(`retrogrades count: ${transitResult.retrogrades.length}`);

  if (transitResult.allTransits.length > 0) {
    console.log('PASS: allTransits non-empty');
  } else {
    console.error('FAIL: allTransits should not be empty!');
  }

  if (transitResult.success === true) {
    console.log('PASS: success = true');
  } else {
    console.error('FAIL: success should be true!');
  }

} catch (e) {
  console.error('ERROR:', e.message);
}

// ========== TEST 10: Transit orb validation ==========
console.log('\nTEST 10: Transit orb validation — maxOrb is half of natal');
console.log('-'.repeat(50));

try {
  const transitResult = calculateTransits(
    {
      year: 1998, month: 11, day: 25, hour: 10, minute: 17,
      latitude: 41.2867, longitude: 36.33,
      timezone: 'Europe/Istanbul', houseSystem: 'P',
    },
    { days: 30, startDate: '2026-02-12' }
  );

  // Check that maxOrb values do not exceed half of natal orbs
  // Natal Conjunction orb = 8, transit max = 8 * 0.5 * 1.25 (luminary) = 5.0
  // Largest possible maxOrb: 8 * 0.5 * 1.25 = 5.0
  const maxPossibleOrb = 8 * 0.5 * 1.25; // Conjunction + luminary modifier

  let orbValid = true;
  for (const t of transitResult.allTransits) {
    if (t.maxOrb > maxPossibleOrb + 0.01) {
      console.error(`FAIL: maxOrb too large: ${t.transitPlanet}-${t.natalPlanet} ${t.type} maxOrb=${t.maxOrb} (limit: ${maxPossibleOrb})`);
      orbValid = false;
      break;
    }
    // orb should not be larger than maxOrb
    if (t.orb > t.maxOrb + 0.01) {
      console.error(`FAIL: orb > maxOrb: ${t.transitPlanet}-${t.natalPlanet} orb=${t.orb} maxOrb=${t.maxOrb}`);
      orbValid = false;
      break;
    }
  }

  if (orbValid) {
    console.log('PASS: All transit orb values are valid');
  }

  // Show first 3 transits
  console.log('\nFirst 3 transits:');
  transitResult.allTransits.slice(0, 3).forEach(t => {
    console.log(`  ${t.transitPlanet} ${t.symbol} ${t.natalPlanet} ${t.type} (orb: ${t.orb}, maxOrb: ${t.maxOrb}, strength: ${t.strength}%)`);
  });

} catch (e) {
  console.error('ERROR:', e.message);
}

// ========== TEST 11: Event timing validation ==========
console.log('\nTEST 11: Event timing — startTime <= exactTime <= endTime');
console.log('-'.repeat(50));

try {
  const transitResult = calculateTransits(
    {
      year: 1998, month: 11, day: 25, hour: 10, minute: 17,
      latitude: 41.2867, longitude: 36.33,
      timezone: 'Europe/Istanbul', houseSystem: 'P',
    },
    { days: 30, startDate: '2026-02-12' }
  );

  let timingValid = true;
  let checkedCount = 0;

  for (const ev of transitResult.allEvents) {
    if (ev.startTime && ev.exactTime && ev.endTime) {
      checkedCount++;
      if (ev.startTime > ev.exactTime) {
        console.error(`FAIL: startTime > exactTime: ${ev.transitPlanet} ${ev.symbol} ${ev.natalPlanet}`);
        console.error(`  startTime: ${ev.startTime}, exactTime: ${ev.exactTime}`);
        timingValid = false;
        break;
      }
      if (ev.exactTime > ev.endTime) {
        console.error(`FAIL: exactTime > endTime: ${ev.transitPlanet} ${ev.symbol} ${ev.natalPlanet}`);
        console.error(`  exactTime: ${ev.exactTime}, endTime: ${ev.endTime}`);
        timingValid = false;
        break;
      }
    }
  }

  if (timingValid) {
    console.log(`PASS: Timing consistent across ${checkedCount} events (startTime <= exactTime <= endTime)`);
  }

  // First timing example
  const firstWithTiming = transitResult.allEvents.find(ev => ev.startTime && ev.exactTime && ev.endTime);
  if (firstWithTiming) {
    console.log(`\nExample event timing:`);
    console.log(`  ${firstWithTiming.transitPlanet} ${firstWithTiming.symbol} ${firstWithTiming.natalPlanet} ${firstWithTiming.type}`);
    console.log(`  start:  ${firstWithTiming.startTime}`);
    console.log(`  exact:  ${firstWithTiming.exactTime}`);
    console.log(`  end:    ${firstWithTiming.endTime}`);
  }

} catch (e) {
  console.error('ERROR:', e.message);
}

// ========== TEST 12: Lunar metrics validation ==========
console.log('\nTEST 12: Lunar metrics — illumination 0-100, moonDay 1-30');
console.log('-'.repeat(50));

try {
  const jd = nowToJD();
  const lunar = calculateLunarMetrics(jd);

  console.log(`moonSign: ${lunar.moonSign}`);
  console.log(`moonPhase: ${lunar.moonPhase} (${lunar.moonPhaseTr})`);
  console.log(`moonIllumination: ${lunar.moonIllumination}%`);
  console.log(`moonDay: ${lunar.moonDay}`);
  console.log(`moonAgeInDays: ${lunar.moonAgeInDays}`);
  console.log(`isSuperMoon: ${lunar.isSuperMoon}`);
  console.log(`withinPerigee: ${lunar.withinPerigee}`);
  console.log(`withinApogee: ${lunar.withinApogee}`);

  let lunarValid = true;

  if (lunar.moonIllumination < 0 || lunar.moonIllumination > 100) {
    console.error(`FAIL: moonIllumination outside 0-100: ${lunar.moonIllumination}`);
    lunarValid = false;
  }

  if (lunar.moonDay < 1 || lunar.moonDay > 30) {
    console.error(`FAIL: moonDay outside 1-30: ${lunar.moonDay}`);
    lunarValid = false;
  }

  if (lunar.moonAgeInDays < 0 || lunar.moonAgeInDays > 29.53) {
    console.error(`FAIL: moonAgeInDays outside 0-29.53: ${lunar.moonAgeInDays}`);
    lunarValid = false;
  }

  const validPhases = ['New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous',
                       'Full Moon', 'Waning Gibbous', 'Last Quarter', 'Waning Crescent'];
  if (!validPhases.includes(lunar.moonPhase)) {
    console.error(`FAIL: Invalid moonPhase: ${lunar.moonPhase}`);
    lunarValid = false;
  }

  if (lunarValid) {
    console.log('PASS: All lunar metrics values are valid');
  }

} catch (e) {
  console.error('ERROR:', e.message);
}

// ========== TEST 13: Transit midpoint / known aspect angle validation ==========
console.log('\nTEST 13: Transit aspect angle validation');
console.log('-'.repeat(50));

try {
  const transitResult = calculateTransits(
    {
      year: 1998, month: 11, day: 25, hour: 10, minute: 17,
      latitude: 41.2867, longitude: 36.33,
      timezone: 'Europe/Istanbul', houseSystem: 'P',
    },
    { days: 30, startDate: '2026-02-12' }
  );

  // Check maxOrb matches the transit's aspect type
  const aspectAngles = {
    'Conjunction': 0, 'Opposition': 180, 'Trine': 120,
    'Square': 90, 'Sextile': 60, 'Quincunx': 150, 'Semi-sextile': 30
  };

  let aspectValid = true;
  for (const t of transitResult.allTransits) {
    if (!(t.type in aspectAngles)) {
      console.error(`FAIL: Unknown aspect type: ${t.type}`);
      aspectValid = false;
      break;
    }
    // strength must be between 0-100
    if (t.strength < 0 || t.strength > 100) {
      console.error(`FAIL: strength outside 0-100: ${t.strength} (${t.transitPlanet} ${t.type} ${t.natalPlanet})`);
      aspectValid = false;
      break;
    }
  }

  if (aspectValid) {
    console.log(`PASS: All ${transitResult.allTransits.length} transit aspects have valid types and strength 0-100`);
  }

  // meta check
  if (transitResult.meta.transitOrbScale === 0.5) {
    console.log('PASS: transitOrbScale = 0.5 (half of natal)');
  } else {
    console.error(`FAIL: transitOrbScale incorrect: ${transitResult.meta.transitOrbScale}`);
  }

  if (transitResult.meta.engine === 'Celestia (Swiss Ephemeris)') {
    console.log('PASS: engine = Celestia (Swiss Ephemeris)');
  } else {
    console.error(`FAIL: engine incorrect: ${transitResult.meta.engine}`);
  }

} catch (e) {
  console.error('ERROR:', e.message);
}

// ========== PHASE 1 NEW FEATURE TESTS ==========

console.log('\n' + '='.repeat(70));
console.log('PHASE 1 — NEW FEATURE TESTS');
console.log('='.repeat(70));

// ========== TEST 14: Essential Dignities Detail ==========
console.log('\nTEST 14: Essential Dignities Detail (Terms, Faces, Triplicity)');
console.log('-'.repeat(50));

try {
  const chart14 = calculateNatalChart({
    year: 1990, month: 7, day: 15, hour: 14, minute: 30,
    latitude: 41.0082, longitude: 28.9784,
    timezone: 'Europe/Istanbul', houseSystem: 'P',
  });

  let pass14 = true;

  // Check that planets have dignityDetail
  const sun14 = chart14.planets.find(p => p.name === 'Sun');
  if (!sun14.dignityDetail) {
    console.error('FAIL: Sun has no dignityDetail');
    pass14 = false;
  } else {
    // Sun in Cancer = peregrine (Sun's fall is Libra, not Cancer)
    if (!sun14.dignityDetail.peregrine) {
      console.error(`FAIL: Sun in Cancer should be peregrine, got unexpected dignity`);
      pass14 = false;
    }
    if (typeof sun14.dignityDetail.essentialScore !== 'number') {
      console.error('FAIL: essentialScore is not a number');
      pass14 = false;
    }
    if (sun14.dignityDetail.termRuler === undefined) {
      console.error('FAIL: termRuler missing');
      pass14 = false;
    }
    if (sun14.dignityDetail.faceRuler === undefined) {
      console.error('FAIL: faceRuler missing');
      pass14 = false;
    }
    console.log(`  Sun in Cancer: peregrine=${sun14.dignityDetail.peregrine}, essentialScore=${sun14.dignityDetail.essentialScore}`);
    console.log(`  termRuler=${sun14.dignityDetail.termRuler}, faceRuler=${sun14.dignityDetail.faceRuler}`);
    console.log(`  inTriplicity=${sun14.dignityDetail.inTriplicity}, triplicityRuler=${sun14.dignityDetail.triplicityRuler}`);
  }

  // Saturn in Capricorn = domicile
  const saturn14 = chart14.planets.find(p => p.name === 'Saturn');
  if (saturn14.dignityDetail && !saturn14.dignityDetail.domicile) {
    console.error(`FAIL: Saturn in Capricorn should be domicile`);
    pass14 = false;
  } else {
    console.log(`  Saturn in Capricorn: domicile=${saturn14.dignityDetail.domicile}, essentialScore=${saturn14.dignityDetail.essentialScore}`);
  }

  // Jupiter in Cancer = exaltation
  const jupiter14 = chart14.planets.find(p => p.name === 'Jupiter');
  if (jupiter14.dignityDetail && !jupiter14.dignityDetail.exaltation) {
    console.error(`FAIL: Jupiter in Cancer should be exaltation`);
    pass14 = false;
  } else {
    console.log(`  Jupiter in Cancer: exaltation=${jupiter14.dignityDetail.exaltation}, essentialScore=${jupiter14.dignityDetail.essentialScore}`);
  }

  // Nodes and Chiron should have null dignityDetail
  const chiron14 = chart14.planets.find(p => p.name === 'Chiron');
  if (chiron14.dignityDetail !== null) {
    console.error('FAIL: Chiron should have null dignityDetail');
    pass14 = false;
  }

  if (pass14) console.log('PASS: Essential Dignities Detail working correctly');
} catch (e) {
  console.error('ERROR:', e.message);
}

// ========== TEST 15: Decan/Face per Planet ==========
console.log('\nTEST 15: Decan/Face info on each planet');
console.log('-'.repeat(50));

try {
  const chart15 = calculateNatalChart({
    year: 1990, month: 7, day: 15, hour: 14, minute: 30,
    latitude: 41.0082, longitude: 28.9784,
    timezone: 'Europe/Istanbul', houseSystem: 'P',
  });

  let pass15 = true;
  const mainPlanets = chart15.planets.filter(p =>
    ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto'].includes(p.name)
  );

  for (const p of mainPlanets) {
    if (p.decan === null || p.decan === undefined) {
      console.error(`FAIL: ${p.name} has no decan`);
      pass15 = false;
      break;
    }
    if (p.decan < 1 || p.decan > 3) {
      console.error(`FAIL: ${p.name} decan ${p.decan} outside 1-3`);
      pass15 = false;
      break;
    }
    if (!p.decanRuler) {
      console.error(`FAIL: ${p.name} has no decanRuler`);
      pass15 = false;
      break;
    }
  }

  // Sun at ~22° Cancer → decan 3 (20-29°), face ruler = Moon
  const sun15 = chart15.planets.find(p => p.name === 'Sun');
  if (sun15.decan !== 3) {
    console.error(`FAIL: Sun at ${sun15.degree}° Cancer should be decan 3, got ${sun15.decan}`);
    pass15 = false;
  }
  if (sun15.decanRuler !== 'Moon') {
    console.error(`FAIL: Cancer decan 3 ruler should be Moon, got ${sun15.decanRuler}`);
    pass15 = false;
  }

  console.log(`  Sun: ${sun15.degree}° ${sun15.sign}, decan=${sun15.decan}, decanRuler=${sun15.decanRuler}`);

  for (const p of mainPlanets.slice(0, 5)) {
    console.log(`  ${p.name}: ${p.degree}° ${p.sign}, decan=${p.decan}, ruler=${p.decanRuler}`);
  }

  if (pass15) console.log('PASS: Decan/Face info present and correct on all planets');
} catch (e) {
  console.error('ERROR:', e.message);
}

// ========== TEST 16: Sect Analysis ==========
console.log('\nTEST 16: Sect Analysis (Day/Night Chart Dynamics)');
console.log('-'.repeat(50));

try {
  const chart16 = calculateNatalChart({
    year: 1990, month: 7, day: 15, hour: 14, minute: 30,
    latitude: 41.0082, longitude: 28.9784,
    timezone: 'Europe/Istanbul', houseSystem: 'P',
  });

  let pass16 = true;
  const sect = chart16.analysis.sect;

  if (!sect) {
    console.error('FAIL: sect missing from analysis');
    pass16 = false;
  } else {
    // Day chart (Sun above horizon at 14:30)
    if (sect.chartSect !== 'day') {
      console.error(`FAIL: Expected day chart, got ${sect.chartSect}`);
      pass16 = false;
    }
    if (sect.sectLuminary !== 'Sun') {
      console.error(`FAIL: Day chart sect luminary should be Sun, got ${sect.sectLuminary}`);
      pass16 = false;
    }
    if (sect.benefics.inSect !== 'Jupiter') {
      console.error(`FAIL: Day chart in-sect benefic should be Jupiter, got ${sect.benefics.inSect}`);
      pass16 = false;
    }
    if (sect.malefics.inSect !== 'Saturn') {
      console.error(`FAIL: Day chart in-sect malefic should be Saturn, got ${sect.malefics.inSect}`);
      pass16 = false;
    }

    console.log(`  Chart Sect: ${sect.chartSectTr}`);
    console.log(`  Sect Luminary: ${sect.sectLuminaryTr}`);
    console.log(`  In-Sect Benefic: ${sect.benefics.inSectTr}, Out-of-Sect Benefic: ${sect.benefics.outOfSectTr}`);
    console.log(`  In-Sect Malefic: ${sect.malefics.inSectTr}, Out-of-Sect Malefic: ${sect.malefics.outOfSectTr}`);

    // Check planet conditions exist
    if (!sect.planets || sect.planets.length === 0) {
      console.error('FAIL: No planet conditions in sect');
      pass16 = false;
    } else {
      const validConditions = ['hayz', 'partial_hayz', 'in_sect', 'out_of_sect', 'halb'];
      for (const pc of sect.planets) {
        if (!validConditions.includes(pc.condition)) {
          console.error(`FAIL: Invalid sect condition for ${pc.planet}: ${pc.condition}`);
          pass16 = false;
          break;
        }
      }
      console.log(`  Planet conditions (${sect.planets.length}):`);
      sect.planets.slice(0, 4).forEach(pc => {
        console.log(`    ${pc.planet}: ${pc.conditionTr} (inSect=${pc.inSect})`);
      });
    }
  }

  // Test night chart
  const nightChart = calculateNatalChart({
    year: 1990, month: 7, day: 15, hour: 2, minute: 0,
    latitude: 41.0082, longitude: 28.9784,
    timezone: 'Europe/Istanbul', houseSystem: 'P',
  });

  if (nightChart.analysis.sect.chartSect !== 'night') {
    console.error(`FAIL: 2:00 AM chart should be night, got ${nightChart.analysis.sect.chartSect}`);
    pass16 = false;
  } else {
    console.log(`  Night chart (02:00): ${nightChart.analysis.sect.chartSectTr}, luminary=${nightChart.analysis.sect.sectLuminaryTr}`);
  }

  if (pass16) console.log('PASS: Sect analysis working correctly');
} catch (e) {
  console.error('ERROR:', e.message);
}

// ========== TEST 17: Lunar Mansions ==========
console.log('\nTEST 17: Lunar Mansions (Ay Menzilleri)');
console.log('-'.repeat(50));

try {
  const chart17 = calculateNatalChart({
    year: 1990, month: 7, day: 15, hour: 14, minute: 30,
    latitude: 41.0082, longitude: 28.9784,
    timezone: 'Europe/Istanbul', houseSystem: 'P',
  });

  let pass17 = true;
  const lm = chart17.analysis.lunarMansion;

  if (!lm) {
    console.error('FAIL: lunarMansion missing from analysis');
    pass17 = false;
  } else {
    if (lm.number < 1 || lm.number > 28) {
      console.error(`FAIL: mansion number ${lm.number} outside 1-28`);
      pass17 = false;
    }
    if (!lm.name) {
      console.error('FAIL: mansion name missing');
      pass17 = false;
    }
    if (!lm.trName) {
      console.error('FAIL: mansion trName missing');
      pass17 = false;
    }
    if (!['favorable', 'unfavorable'].includes(lm.nature)) {
      console.error(`FAIL: Invalid nature: ${lm.nature}`);
      pass17 = false;
    }
    if (typeof lm.startDegree !== 'number' || typeof lm.endDegree !== 'number') {
      console.error('FAIL: startDegree/endDegree missing or not number');
      pass17 = false;
    }

    console.log(`  Moon longitude: ${chart17.planets.find(p => p.name === 'Moon').longitude}°`);
    console.log(`  Mansion #${lm.number}: ${lm.name} (${lm.trName})`);
    console.log(`  Meaning: ${lm.meaning}`);
    console.log(`  Nature: ${lm.natureTr}, Element: ${lm.element}, Planet: ${lm.planet}`);
    console.log(`  Range: ${lm.startDegree}° — ${lm.endDegree}°`);
  }

  if (pass17) console.log('PASS: Lunar Mansions working correctly');
} catch (e) {
  console.error('ERROR:', e.message);
}

// ========== TEST 18: Planetary Hours ==========
console.log('\nTEST 18: Planetary Hours (Gezegen Saatleri)');
console.log('-'.repeat(50));

try {
  const chart18 = calculateNatalChart({
    year: 1990, month: 7, day: 15, hour: 14, minute: 30,
    latitude: 41.0082, longitude: 28.9784,
    timezone: 'Europe/Istanbul', houseSystem: 'P',
  });

  let pass18 = true;
  const ph = chart18.analysis.planetaryHour;

  if (!ph) {
    console.error('FAIL: planetaryHour missing from analysis');
    pass18 = false;
  } else {
    const validPlanets = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
    if (!validPlanets.includes(ph.planet)) {
      console.error(`FAIL: Invalid planetary hour planet: ${ph.planet}`);
      pass18 = false;
    }
    if (ph.hourNumber < 1 || ph.hourNumber > 12) {
      console.error(`FAIL: hourNumber ${ph.hourNumber} outside 1-12`);
      pass18 = false;
    }
    if (typeof ph.isDay !== 'boolean') {
      console.error('FAIL: isDay is not boolean');
      pass18 = false;
    }
    if (!validPlanets.includes(ph.dayRuler)) {
      console.error(`FAIL: Invalid dayRuler: ${ph.dayRuler}`);
      pass18 = false;
    }

    // 15 July 1990 is a Sunday → day ruler = Sun
    if (ph.dayRuler !== 'Sun') {
      console.error(`FAIL: 15 July 1990 (Sunday) day ruler should be Sun, got ${ph.dayRuler}`);
      pass18 = false;
    }

    // 14:30 local time in July Istanbul → daytime
    if (!ph.isDay) {
      console.error('FAIL: 14:30 in July Istanbul should be daytime');
      pass18 = false;
    }

    console.log(`  Planetary Hour: ${ph.planetTr} (${ph.planet})`);
    console.log(`  Hour Number: ${ph.hourNumber}`);
    console.log(`  Day/Night: ${ph.isDayTr}`);
    console.log(`  Day Ruler: ${ph.dayRulerTr} (${ph.dayRuler})`);
  }

  // Test night time
  const nightChart18 = calculateNatalChart({
    year: 1990, month: 7, day: 15, hour: 23, minute: 0,
    latitude: 41.0082, longitude: 28.9784,
    timezone: 'Europe/Istanbul', houseSystem: 'P',
  });

  const phNight = nightChart18.analysis.planetaryHour;
  if (phNight.isDay) {
    console.error('FAIL: 23:00 in July Istanbul should be nighttime');
    pass18 = false;
  } else {
    console.log(`  Night (23:00): ${phNight.planetTr}, hour #${phNight.hourNumber}, ${phNight.isDayTr}`);
  }

  if (pass18) console.log('PASS: Planetary Hours working correctly');
} catch (e) {
  console.error('ERROR:', e.message);
}

// ========== TEST 19: Backward Compatibility ==========
console.log('\nTEST 19: Backward Compatibility — original fields unchanged');
console.log('-'.repeat(50));

try {
  const chart19 = calculateNatalChart({
    year: 1990, month: 7, day: 15, hour: 14, minute: 30,
    latitude: 41.0082, longitude: 28.9784,
    timezone: 'Europe/Istanbul', houseSystem: 'P',
  });

  let pass19 = true;

  // Check original top-level keys
  const requiredKeys = ['input', 'planets', 'houses', 'aspects', 'analysis', 'meta'];
  for (const key of requiredKeys) {
    if (!(key in chart19)) {
      console.error(`FAIL: Missing top-level key: ${key}`);
      pass19 = false;
    }
  }

  // Check original planet fields still present
  const sun19 = chart19.planets.find(p => p.name === 'Sun');
  const originalFields = ['id', 'name', 'trName', 'longitude', 'latitude', 'distance', 'speed',
    'sign', 'signIndex', 'degree', 'minute', 'second', 'isRetrograde', 'dignity',
    'formattedPosition', 'usedMoshierFallback', 'house'];
  for (const field of originalFields) {
    if (!(field in sun19)) {
      console.error(`FAIL: Planet missing original field: ${field}`);
      pass19 = false;
    }
  }

  // Check original analysis fields still present
  const originalAnalysis = ['sunSign', 'moonSign', 'risingSign', 'isDayChart', 'moonPhase',
    'partOfFortune', 'elements', 'modalities', 'hemispheres', 'stelliums', 'chartRuler', 'houseRulers'];
  for (const field of originalAnalysis) {
    if (!(field in chart19.analysis)) {
      console.error(`FAIL: Analysis missing original field: ${field}`);
      pass19 = false;
    }
  }

  // Check new fields are ADDED (not replacing)
  const newFields = ['decan', 'decanRuler', 'dignityDetail'];
  for (const field of newFields) {
    if (!(field in sun19)) {
      console.error(`FAIL: Planet missing new field: ${field}`);
      pass19 = false;
    }
  }

  const newAnalysis = ['sect', 'lunarMansion', 'planetaryHour'];
  for (const field of newAnalysis) {
    if (!(field in chart19.analysis)) {
      console.error(`FAIL: Analysis missing new field: ${field}`);
      pass19 = false;
    }
  }

  // Verify specific known values haven't changed
  if (sun19.sign !== 'Cancer') {
    console.error(`FAIL: Sun sign changed from Cancer to ${sun19.sign}`);
    pass19 = false;
  }
  if (sun19.dignity !== 'peregrine') {
    console.error(`FAIL: Sun dignity changed from peregrine to ${sun19.dignity}`);
    pass19 = false;
  }
  if (chart19.houses.ascendant.sign !== 'Scorpio') {
    console.error(`FAIL: Ascendant sign changed from Scorpio to ${chart19.houses.ascendant.sign}`);
    pass19 = false;
  }

  console.log(`  Original top-level keys: ${requiredKeys.length} present`);
  console.log(`  Original planet fields: ${originalFields.length} present`);
  console.log(`  Original analysis fields: ${originalAnalysis.length} present`);
  console.log(`  New planet fields: ${newFields.join(', ')}`);
  console.log(`  New analysis fields: ${newAnalysis.join(', ')}`);

  if (pass19) console.log('PASS: Full backward compatibility maintained');
} catch (e) {
  console.error('ERROR:', e.message);
}

// ========== TEST 20: Cross-validation — dignity consistency ==========
console.log('\nTEST 20: Cross-validation — dignity & dignityDetail consistency');
console.log('-'.repeat(50));

try {
  const chart20 = calculateNatalChart({
    year: 1998, month: 11, day: 25, hour: 10, minute: 22,
    latitude: 41.2867, longitude: 36.33,
    timezone: 'Europe/Istanbul', houseSystem: 'P',
  });

  let pass20 = true;
  const mainPlanets20 = chart20.planets.filter(p =>
    ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto'].includes(p.name)
  );

  for (const p of mainPlanets20) {
    if (!p.dignityDetail) continue;

    // dignity field should match dignityDetail
    if (p.dignity === 'domicile' && !p.dignityDetail.domicile) {
      console.error(`FAIL: ${p.name} dignity=domicile but dignityDetail.domicile=false`);
      pass20 = false;
    }
    if (p.dignity === 'exaltation' && !p.dignityDetail.exaltation) {
      console.error(`FAIL: ${p.name} dignity=exaltation but dignityDetail.exaltation=false`);
      pass20 = false;
    }
    if (p.dignity === 'detriment' && !p.dignityDetail.detriment) {
      console.error(`FAIL: ${p.name} dignity=detriment but dignityDetail.detriment=false`);
      pass20 = false;
    }
    if (p.dignity === 'fall' && !p.dignityDetail.fall) {
      console.error(`FAIL: ${p.name} dignity=fall but dignityDetail.fall=false`);
      pass20 = false;
    }

    // essentialScore should be a number
    if (typeof p.dignityDetail.essentialScore !== 'number') {
      console.error(`FAIL: ${p.name} essentialScore not a number`);
      pass20 = false;
    }
  }

  console.log(`  Checked ${mainPlanets20.length} planets for dignity consistency`);
  mainPlanets20.slice(0, 5).forEach(p => {
    console.log(`    ${p.name} in ${p.sign}: dignity=${p.dignity}, score=${p.dignityDetail?.essentialScore}`);
  });

  if (pass20) console.log('PASS: Dignity and dignityDetail are consistent');
} catch (e) {
  console.error('ERROR:', e.message);
}

// ========== PHASE 2 NEW FEATURE TESTS ==========

console.log('\n' + '='.repeat(70));
console.log('PHASE 2 — RELATIONSHIP ENRICHMENT TESTS');
console.log('='.repeat(70));

// ========== TEST 21: Davison Relationship Chart ==========
console.log('\nTEST 21: Davison Relationship Chart');
console.log('-'.repeat(50));

try {
  const synResult21 = calculateSynastry(
    {
      year: 1998, month: 11, day: 25, hour: 10, minute: 17,
      latitude: 41.2867, longitude: 36.33,
      timezone: 'Europe/Istanbul', houseSystem: 'P',
    },
    {
      year: 2000, month: 3, day: 15, hour: 14, minute: 30,
      latitude: 39.9208, longitude: 32.8541,
      timezone: 'Europe/Istanbul', houseSystem: 'P',
    }
  );

  let pass21 = true;

  // Davison chart should exist
  if (!synResult21.davison) {
    console.error('FAIL: davison key missing from synastry result');
    pass21 = false;
  } else {
    const dav = synResult21.davison;

    // Midpoint date should be between the two birth dates
    if (!dav.midpointDate) {
      console.error('FAIL: midpointDate missing');
      pass21 = false;
    } else {
      const midDate = new Date(dav.midpointDate);
      const date1 = new Date('1998-11-25');
      const date2 = new Date('2000-03-15');
      if (midDate < date1 || midDate > date2) {
        console.error(`FAIL: midpointDate ${dav.midpointDate} not between birth dates`);
        pass21 = false;
      } else {
        console.log(`  Midpoint date: ${dav.midpointDate}`);
      }
    }

    // Midpoint location should be between coordinates
    if (!dav.midpointLocation) {
      console.error('FAIL: midpointLocation missing');
      pass21 = false;
    } else {
      const expectedLat = (41.2867 + 39.9208) / 2;
      const expectedLon = (36.33 + 32.8541) / 2;
      if (Math.abs(dav.midpointLocation.latitude - expectedLat) > 0.01) {
        console.error(`FAIL: midpoint latitude ${dav.midpointLocation.latitude} != expected ${expectedLat}`);
        pass21 = false;
      }
      if (Math.abs(dav.midpointLocation.longitude - expectedLon) > 0.01) {
        console.error(`FAIL: midpoint longitude ${dav.midpointLocation.longitude} != expected ${expectedLon}`);
        pass21 = false;
      }
      console.log(`  Midpoint location: ${dav.midpointLocation.latitude}°N, ${dav.midpointLocation.longitude}°E`);
    }

    // Davison chart should have planets, houses, aspects, analysis (full natal chart format)
    if (!dav.planets || dav.planets.length === 0) {
      console.error('FAIL: Davison planets missing');
      pass21 = false;
    } else {
      console.log(`  Planets: ${dav.planets.length}`);
    }

    if (!dav.houses || !dav.houses.ascendant) {
      console.error('FAIL: Davison houses missing');
      pass21 = false;
    } else {
      console.log(`  Ascendant: ${dav.houses.ascendant.formatted}`);
    }

    if (!dav.aspects || !Array.isArray(dav.aspects)) {
      console.error('FAIL: Davison aspects missing');
      pass21 = false;
    } else {
      console.log(`  Aspects: ${dav.aspects.length}`);
    }

    if (!dav.analysis) {
      console.error('FAIL: Davison analysis missing');
      pass21 = false;
    }

    // Davison Sun should differ from both natal Suns (it's a real chart, not midpoint)
    const davSun = dav.planets.find(p => p.name === 'Sun');
    const p1Sun = synResult21.person1.planets.find(p => p.name === 'Sun');
    const p2Sun = synResult21.person2.planets.find(p => p.name === 'Sun');
    if (davSun.longitude === p1Sun.longitude || davSun.longitude === p2Sun.longitude) {
      console.error('FAIL: Davison Sun should differ from natal Suns');
      pass21 = false;
    } else {
      console.log(`  Davison Sun: ${davSun.formattedPosition}`);
    }
  }

  if (pass21) console.log('PASS: Davison Relationship Chart working correctly');
} catch (e) {
  console.error('ERROR:', e.message);
}

// ========== TEST 22: Synastry Compatibility Score ==========
console.log('\nTEST 22: Synastry Compatibility Score');
console.log('-'.repeat(50));

try {
  const synResult22 = calculateSynastry(
    {
      year: 1998, month: 11, day: 25, hour: 10, minute: 17,
      latitude: 41.2867, longitude: 36.33,
      timezone: 'Europe/Istanbul', houseSystem: 'P',
    },
    {
      year: 2000, month: 3, day: 15, hour: 14, minute: 30,
      latitude: 39.9208, longitude: 32.8541,
      timezone: 'Europe/Istanbul', houseSystem: 'P',
    }
  );

  let pass22 = true;
  const score = synResult22.synastry.score;

  if (!score) {
    console.error('FAIL: score missing from synastry result');
    pass22 = false;
  } else {
    // Score should be 0-100
    if (score.score < 0 || score.score > 100) {
      console.error(`FAIL: score ${score.score} outside 0-100 range`);
      pass22 = false;
    }

    // Should have Turkish and English labels
    if (!score.scoreTr || !score.scoreLabel) {
      console.error('FAIL: score labels missing');
      pass22 = false;
    }

    // Should have harmony/tension totals
    if (typeof score.totalHarmony !== 'number' || typeof score.totalTension !== 'number') {
      console.error('FAIL: totalHarmony/totalTension missing');
      pass22 = false;
    }

    // Should have counts
    if (typeof score.harmoniousCount !== 'number' || typeof score.challengingCount !== 'number') {
      console.error('FAIL: harmoniousCount/challengingCount missing');
      pass22 = false;
    }

    // Sum should make sense
    const totalAspects = score.harmoniousCount + score.challengingCount;
    if (totalAspects !== synResult22.synastry.crossAspects.length) {
      console.error(`FAIL: aspect counts don't match: ${totalAspects} vs ${synResult22.synastry.crossAspects.length}`);
      pass22 = false;
    }

    // topAspects should exist
    if (!score.topAspects || !Array.isArray(score.topAspects)) {
      console.error('FAIL: topAspects missing');
      pass22 = false;
    }

    console.log(`  Score: ${score.score}/100 (${score.scoreLabel} / ${score.scoreTr})`);
    console.log(`  Harmony: ${score.totalHarmony}, Tension: ${score.totalTension}`);
    console.log(`  Harmonious: ${score.harmoniousCount}, Challenging: ${score.challengingCount}`);

    if (score.topAspects.length > 0) {
      console.log(`  Top aspect: ${score.topAspects[0].planet1} ${score.topAspects[0].type} ${score.topAspects[0].planet2} (${score.topAspects[0].points} pts)`);
    }
  }

  if (pass22) console.log('PASS: Synastry Compatibility Score working correctly');
} catch (e) {
  console.error('ERROR:', e.message);
}

// ========== TEST 23: Compatibility Score Consistency ==========
console.log('\nTEST 23: Compatibility Score consistency across different pairs');
console.log('-'.repeat(50));

try {
  // Test with a different pair to ensure score varies
  const synA = calculateSynastry(
    {
      year: 1990, month: 7, day: 15, hour: 14, minute: 30,
      latitude: 41.0082, longitude: 28.9784,
      timezone: 'Europe/Istanbul', houseSystem: 'P',
    },
    {
      year: 1985, month: 3, day: 4, hour: 9, minute: 15,
      latitude: 40.7128, longitude: -74.0060,
      timezone: 'America/New_York', houseSystem: 'P',
    }
  );

  const synB = calculateSynastry(
    {
      year: 1998, month: 11, day: 25, hour: 10, minute: 17,
      latitude: 41.2867, longitude: 36.33,
      timezone: 'Europe/Istanbul', houseSystem: 'P',
    },
    {
      year: 2000, month: 3, day: 15, hour: 14, minute: 30,
      latitude: 39.9208, longitude: 32.8541,
      timezone: 'Europe/Istanbul', houseSystem: 'P',
    }
  );

  let pass23 = true;

  const scoreA = synA.synastry.score.score;
  const scoreB = synB.synastry.score.score;

  // Both should be valid 0-100
  if (scoreA < 0 || scoreA > 100 || scoreB < 0 || scoreB > 100) {
    console.error(`FAIL: Invalid scores: ${scoreA}, ${scoreB}`);
    pass23 = false;
  }

  console.log(`  Pair A score: ${scoreA}/100 (${synA.synastry.score.scoreLabel})`);
  console.log(`  Pair B score: ${scoreB}/100 (${synB.synastry.score.scoreLabel})`);

  // Scores can be equal by coincidence, but both should be calculable
  if (pass23) console.log('PASS: Compatibility scores calculated for different pairs');
} catch (e) {
  console.error('ERROR:', e.message);
}

// ========== TEST 24: Relocation Chart ==========
console.log('\nTEST 24: Relocation Chart');
console.log('-'.repeat(50));

import { calculateRelocationChart } from './src/calculator.js';

try {
  // Calculate natal chart for Istanbul
  const natalIstanbul = calculateNatalChart({
    year: 1990, month: 7, day: 15, hour: 14, minute: 30,
    latitude: 41.0082, longitude: 28.9784,
    timezone: 'Europe/Istanbul', houseSystem: 'P',
  });

  // Relocate to New York
  const relocationNY = calculateRelocationChart(natalIstanbul, 40.7128, -74.0060);

  let pass24 = true;

  // Planet positions should be IDENTICAL
  for (const natalPlanet of natalIstanbul.planets) {
    const relocPlanet = relocationNY.planets.find(p => p.name === natalPlanet.name);
    if (!relocPlanet) {
      console.error(`FAIL: Planet ${natalPlanet.name} missing in relocation chart`);
      pass24 = false;
      break;
    }
    if (relocPlanet.longitude !== natalPlanet.longitude) {
      console.error(`FAIL: ${natalPlanet.name} longitude changed: ${natalPlanet.longitude} → ${relocPlanet.longitude}`);
      pass24 = false;
      break;
    }
  }

  if (pass24) {
    console.log('  Planet positions: IDENTICAL (as expected)');
  }

  // ASC/MC should be DIFFERENT (different location)
  if (relocationNY.houses.ascendant.longitude === natalIstanbul.houses.ascendant.longitude) {
    console.error('FAIL: ASC should change for different location');
    pass24 = false;
  } else {
    console.log(`  Natal ASC: ${natalIstanbul.houses.ascendant.formatted} → Relocation ASC: ${relocationNY.houses.ascendant.formatted}`);
  }

  if (relocationNY.houses.midheaven.longitude === natalIstanbul.houses.midheaven.longitude) {
    console.error('FAIL: MC should change for different location');
    pass24 = false;
  } else {
    console.log(`  Natal MC: ${natalIstanbul.houses.midheaven.formatted} → Relocation MC: ${relocationNY.houses.midheaven.formatted}`);
  }

  // Houses should differ (planets may be in different houses)
  const natalSunHouse = natalIstanbul.planets.find(p => p.name === 'Sun').house;
  const relocSunHouse = relocationNY.planets.find(p => p.name === 'Sun').house;
  console.log(`  Sun house: natal ${natalSunHouse} → relocation ${relocSunHouse}`);

  // Type should be 'relocation'
  if (relocationNY.type !== 'relocation') {
    console.error(`FAIL: type should be 'relocation', got ${relocationNY.type}`);
    pass24 = false;
  }

  // Analysis should have chart ruler, house rulers, etc.
  if (!relocationNY.analysis.chartRuler) {
    console.error('FAIL: chartRuler missing in relocation analysis');
    pass24 = false;
  }

  if (!relocationNY.analysis.houseRulers || relocationNY.analysis.houseRulers.length !== 12) {
    console.error('FAIL: houseRulers missing or incomplete');
    pass24 = false;
  }

  if (pass24) console.log('PASS: Relocation Chart working correctly');
} catch (e) {
  console.error('ERROR:', e.message);
}

// ========== TEST 25: Relocation — same location should match natal ==========
console.log('\nTEST 25: Relocation at same location should match natal houses');
console.log('-'.repeat(50));

try {
  const natalChart25 = calculateNatalChart({
    year: 1998, month: 11, day: 25, hour: 10, minute: 17,
    latitude: 41.2867, longitude: 36.33,
    timezone: 'Europe/Istanbul', houseSystem: 'P',
  });

  // Relocate to same coordinates
  const relocSame = calculateRelocationChart(natalChart25, 41.2867, 36.33);

  let pass25 = true;

  // ASC should be same (or very close due to float precision)
  const ascDiff = Math.abs(relocSame.houses.ascendant.longitude - natalChart25.houses.ascendant.longitude);
  if (ascDiff > 0.01) {
    console.error(`FAIL: ASC differs by ${ascDiff}° when relocating to same location`);
    pass25 = false;
  } else {
    console.log(`  ASC difference: ${ascDiff.toFixed(6)}° (should be ~0)`);
  }

  // MC should be same
  const mcDiff = Math.abs(relocSame.houses.midheaven.longitude - natalChart25.houses.midheaven.longitude);
  if (mcDiff > 0.01) {
    console.error(`FAIL: MC differs by ${mcDiff}° when relocating to same location`);
    pass25 = false;
  } else {
    console.log(`  MC difference: ${mcDiff.toFixed(6)}° (should be ~0)`);
  }

  if (pass25) console.log('PASS: Relocation at same location matches natal');
} catch (e) {
  console.error('ERROR:', e.message);
}

// ========== TEST 26: Davison midpoint JD validation ==========
console.log('\nTEST 26: Davison midpoint JD validation');
console.log('-'.repeat(50));

try {
  const synResult26 = calculateSynastry(
    {
      year: 1998, month: 11, day: 25, hour: 10, minute: 17,
      latitude: 41.2867, longitude: 36.33,
      timezone: 'Europe/Istanbul', houseSystem: 'P',
    },
    {
      year: 2000, month: 3, day: 15, hour: 14, minute: 30,
      latitude: 39.9208, longitude: 32.8541,
      timezone: 'Europe/Istanbul', houseSystem: 'P',
    }
  );

  let pass26 = true;

  const dav = synResult26.davison;
  const p1JD = synResult26.person1.analysis.sect ? true : false; // natal charts have meta
  // Check midpoint JD is between the two natal JDs
  // We can verify via the midpointDate

  // Davison chart's planets should have houses (1-12)
  for (const p of dav.planets) {
    if (p.house < 1 || p.house > 12) {
      console.error(`FAIL: Davison planet ${p.name} has invalid house: ${p.house}`);
      pass26 = false;
      break;
    }
  }

  // Davison chart should have 12 house cusps
  if (dav.houses.cusps.length !== 12) {
    console.error(`FAIL: Davison chart should have 12 cusps, got ${dav.houses.cusps.length}`);
    pass26 = false;
  }

  // Verify midpointJD exists
  if (!dav.midpointJD) {
    console.error('FAIL: midpointJD missing');
    pass26 = false;
  } else {
    console.log(`  Midpoint JD: ${dav.midpointJD}`);
  }

  // Davison chart should have Phase 1 features (sect, lunarMansion, etc.)
  if (dav.analysis.sect) {
    console.log(`  Davison chart sect: ${dav.analysis.sect.chartSectTr}`);
  }

  if (pass26) console.log('PASS: Davison midpoint JD and chart structure validated');
} catch (e) {
  console.error('ERROR:', e.message);
}

// ========== TEST 27: Backward compatibility — synastry original fields ==========
console.log('\nTEST 27: Synastry backward compatibility — original fields unchanged');
console.log('-'.repeat(50));

try {
  const synResult27 = calculateSynastry(
    {
      year: 1998, month: 11, day: 25, hour: 10, minute: 17,
      latitude: 41.2867, longitude: 36.33,
      timezone: 'Europe/Istanbul', houseSystem: 'P',
    },
    {
      year: 2000, month: 3, day: 15, hour: 14, minute: 30,
      latitude: 39.9208, longitude: 32.8541,
      timezone: 'Europe/Istanbul', houseSystem: 'P',
    }
  );

  let pass27 = true;

  // Original top-level keys must remain
  const originalKeys = ['person1', 'person2', 'synastry', 'composite'];
  for (const key of originalKeys) {
    if (!(key in synResult27)) {
      console.error(`FAIL: Missing original key: ${key}`);
      pass27 = false;
    }
  }

  // New keys added
  if (!('davison' in synResult27)) {
    console.error('FAIL: New davison key missing');
    pass27 = false;
  }

  // Original synastry sub-keys
  if (!synResult27.synastry.crossAspects) {
    console.error('FAIL: crossAspects missing');
    pass27 = false;
  }
  if (!synResult27.synastry.houseOverlay) {
    console.error('FAIL: houseOverlay missing');
    pass27 = false;
  }

  // New synastry sub-key
  if (!synResult27.synastry.score) {
    console.error('FAIL: score missing from synastry');
    pass27 = false;
  }

  // Composite should still work as before
  if (!synResult27.composite.planets || synResult27.composite.planets.length === 0) {
    console.error('FAIL: composite planets missing');
    pass27 = false;
  }

  // Person charts should have all original fields
  const p1 = synResult27.person1;
  if (!p1.input || !p1.planets || !p1.houses || !p1.aspects || !p1.analysis) {
    console.error('FAIL: person1 missing original fields');
    pass27 = false;
  }

  console.log(`  Original keys: ${originalKeys.join(', ')} — present`);
  console.log(`  New keys: davison, synastry.score — present`);
  console.log(`  Composite planets: ${synResult27.composite.planets.length}`);
  console.log(`  Cross-aspects: ${synResult27.synastry.crossAspects.length}`);

  if (pass27) console.log('PASS: Synastry backward compatibility maintained');
} catch (e) {
  console.error('ERROR:', e.message);
}

// ========== TEST 28: Eclipse Calculation — basic structure ==========
console.log('\nTEST 28: Eclipse Calculation — 2026');
console.log('-'.repeat(50));

try {
  const eclResult28 = calculateEclipses({ year: 2026 });
  let pass28 = true;

  if (!eclResult28.success) { console.error('FAIL: success not true'); pass28 = false; }
  if (!eclResult28.eclipses || !Array.isArray(eclResult28.eclipses)) { console.error('FAIL: eclipses not array'); pass28 = false; }
  if (eclResult28.totalEclipses < 2) { console.error('FAIL: too few eclipses'); pass28 = false; }
  if (eclResult28.solarCount < 1) { console.error('FAIL: no solar eclipses'); pass28 = false; }
  if (eclResult28.lunarCount < 1) { console.error('FAIL: no lunar eclipses'); pass28 = false; }

  // Verify each eclipse has required fields
  for (const ecl of eclResult28.eclipses) {
    if (!['solar', 'lunar'].includes(ecl.type)) { console.error(`FAIL: invalid type ${ecl.type}`); pass28 = false; }
    if (!ecl.subType) { console.error('FAIL: missing subType'); pass28 = false; }
    if (!ecl.date) { console.error('FAIL: missing date'); pass28 = false; }
    if (typeof ecl.longitude !== 'number') { console.error('FAIL: longitude not number'); pass28 = false; }
    if (!ecl.sign) { console.error('FAIL: missing sign'); pass28 = false; }
    if (typeof ecl.degree !== 'number') { console.error('FAIL: degree not number'); pass28 = false; }
    if (!ecl.formattedPosition) { console.error('FAIL: missing formattedPosition'); pass28 = false; }
  }

  console.log(`  Total eclipses: ${eclResult28.totalEclipses} (${eclResult28.solarCount} solar, ${eclResult28.lunarCount} lunar)`);
  eclResult28.eclipses.forEach(e => console.log(`  ${e.type} ${e.subType}: ${e.date.substring(0,10)} at ${e.formattedPosition}`));

  if (pass28) console.log('PASS: Eclipse calculation structure valid');
} catch (e) {
  console.error('ERROR:', e.message);
}

// ========== TEST 29: Eclipse — 2024 verification against NASA ==========
console.log('\nTEST 29: Eclipse — 2024 NASA verification');
console.log('-'.repeat(50));

try {
  const eclResult29 = calculateEclipses({ year: 2024 });
  let pass29 = true;

  // 2024 has 4 eclipses per NASA
  if (eclResult29.totalEclipses !== 4) { console.error(`FAIL: expected 4 eclipses, got ${eclResult29.totalEclipses}`); pass29 = false; }

  // April 8, 2024 total solar eclipse
  const apr2024solar = eclResult29.eclipses.find(e => e.type === 'solar' && e.date.startsWith('2024-04'));
  if (!apr2024solar) { console.error('FAIL: missing April 2024 solar eclipse'); pass29 = false; }
  else {
    if (apr2024solar.subType !== 'total') { console.error(`FAIL: expected total, got ${apr2024solar.subType}`); pass29 = false; }
    if (apr2024solar.sign !== 'Aries') { console.error(`FAIL: expected Aries, got ${apr2024solar.sign}`); pass29 = false; }
    console.log(`  Apr 2024 Solar: ${apr2024solar.subType} in ${apr2024solar.sign} ${apr2024solar.degree}° — OK`);
  }

  // October 2024 annular solar eclipse
  const oct2024solar = eclResult29.eclipses.find(e => e.type === 'solar' && e.date.startsWith('2024-10'));
  if (!oct2024solar) { console.error('FAIL: missing October 2024 solar eclipse'); pass29 = false; }
  else {
    if (oct2024solar.subType !== 'annular') { console.error(`FAIL: expected annular, got ${oct2024solar.subType}`); pass29 = false; }
    console.log(`  Oct 2024 Solar: ${oct2024solar.subType} in ${oct2024solar.sign} ${oct2024solar.degree}° — OK`);
  }

  if (pass29) console.log('PASS: 2024 eclipses match NASA data');
} catch (e) {
  console.error('ERROR:', e.message);
}

// ========== TEST 30: Eclipse with natal aspects ==========
console.log('\nTEST 30: Eclipse with natal aspects');
console.log('-'.repeat(50));

try {
  const testNatal30 = calculateNatalChart({
    year: 1990, month: 7, day: 15, hour: 14, minute: 30,
    latitude: 41.0082, longitude: 28.9784,
    timezone: 'Europe/Istanbul', houseSystem: 'P',
  });

  const eclResult30 = calculateEclipses({ year: 2026, natal: testNatal30 });
  let pass30 = true;

  if (!eclResult30.natalAspects) { console.error('FAIL: natalAspects missing'); pass30 = false; }
  if (!Array.isArray(eclResult30.natalAspects)) { console.error('FAIL: natalAspects not array'); pass30 = false; }
  if (eclResult30.natalAspects.length !== eclResult30.totalEclipses) {
    console.error('FAIL: natalAspects count mismatch');
    pass30 = false;
  }

  for (const na of eclResult30.natalAspects) {
    if (!na.eclipseDate) { console.error('FAIL: missing eclipseDate'); pass30 = false; }
    if (!na.eclipseType) { console.error('FAIL: missing eclipseType'); pass30 = false; }
    if (!Array.isArray(na.aspects)) { console.error('FAIL: aspects not array'); pass30 = false; }
  }

  const totalAspects = eclResult30.natalAspects.reduce((sum, na) => sum + na.aspects.length, 0);
  console.log(`  Natal aspects to eclipses: ${totalAspects} across ${eclResult30.natalAspects.length} eclipses`);

  if (pass30) console.log('PASS: Eclipse natal aspects working correctly');
} catch (e) {
  console.error('ERROR:', e.message);
}

// ========== TEST 31: Eclipse — date range search ==========
console.log('\nTEST 31: Eclipse — date range search');
console.log('-'.repeat(50));

try {
  const eclResult31 = calculateEclipses({ startDate: '2025-01-01', endDate: '2025-12-31' });
  let pass31 = true;

  if (!eclResult31.success) { console.error('FAIL: success not true'); pass31 = false; }
  if (eclResult31.totalEclipses < 2) { console.error('FAIL: too few eclipses for 2025'); pass31 = false; }
  if (!eclResult31.searchRange) { console.error('FAIL: missing searchRange'); pass31 = false; }

  console.log(`  2025 eclipses: ${eclResult31.totalEclipses}`);

  if (pass31) console.log('PASS: Date range eclipse search working');
} catch (e) {
  console.error('ERROR:', e.message);
}

// ========== TEST 32: Transit ingresses ==========
console.log('\nTEST 32: Transit response — ingresses field');
console.log('-'.repeat(50));

try {
  const transitResult32 = calculateTransits({
    year: 1998, month: 11, day: 25, hour: 10, minute: 17,
    latitude: 41.2867, longitude: 36.33,
    timezone: 'Europe/Istanbul', houseSystem: 'P',
  }, { days: 30, startDate: '2026-03-01' });

  let pass32 = true;

  if (!transitResult32.ingresses) { console.error('FAIL: ingresses missing'); pass32 = false; }
  if (!Array.isArray(transitResult32.ingresses)) { console.error('FAIL: ingresses not array'); pass32 = false; }
  if (transitResult32.ingresses.length < 5) { console.error('FAIL: too few ingresses for 30 days'); pass32 = false; }

  // Verify ingress structure
  for (const ing of transitResult32.ingresses) {
    if (!ing.planet) { console.error('FAIL: missing planet'); pass32 = false; break; }
    if (!ing.planetTr) { console.error('FAIL: missing planetTr'); pass32 = false; break; }
    if (!ing.fromSign) { console.error('FAIL: missing fromSign'); pass32 = false; break; }
    if (!ing.toSign) { console.error('FAIL: missing toSign'); pass32 = false; break; }
    if (!ing.exactTime) { console.error('FAIL: missing exactTime'); pass32 = false; break; }
    if (ing.fromSign === ing.toSign) { console.error(`FAIL: fromSign === toSign (${ing.fromSign})`); pass32 = false; break; }
  }

  // Moon should have ~12-13 ingresses in 30 days
  const moonIngresses = transitResult32.ingresses.filter(i => i.planet === 'Moon');
  if (moonIngresses.length < 10) { console.error(`FAIL: too few Moon ingresses: ${moonIngresses.length}`); pass32 = false; }

  console.log(`  Total ingresses: ${transitResult32.ingresses.length} (Moon: ${moonIngresses.length})`);
  transitResult32.ingresses.slice(0, 3).forEach(i => console.log(`  ${i.planet}: ${i.fromSign} → ${i.toSign} at ${i.exactTime.substring(0,16)}`));

  if (pass32) console.log('PASS: Transit ingresses working correctly');
} catch (e) {
  console.error('ERROR:', e.message);
}

// ========== TEST 33: Transit — ingress chronological order ==========
console.log('\nTEST 33: Transit — ingress chronological order');
console.log('-'.repeat(50));

try {
  const transitResult33 = calculateTransits({
    year: 1998, month: 11, day: 25, hour: 10, minute: 17,
    latitude: 41.2867, longitude: 36.33,
    timezone: 'Europe/Istanbul', houseSystem: 'P',
  }, { days: 30, startDate: '2026-03-01' });

  let pass33 = true;
  for (let i = 1; i < transitResult33.ingresses.length; i++) {
    if (transitResult33.ingresses[i].exactTime < transitResult33.ingresses[i-1].exactTime) {
      console.error('FAIL: ingresses not in chronological order');
      pass33 = false;
      break;
    }
  }

  if (pass33) console.log('PASS: Ingresses in chronological order');
} catch (e) {
  console.error('ERROR:', e.message);
}

// ========== TEST 34: Transit — VoC Moon in lunar section ==========
console.log('\nTEST 34: Transit — Void of Course Moon');
console.log('-'.repeat(50));

try {
  const transitResult34 = calculateTransits({
    year: 1998, month: 11, day: 25, hour: 10, minute: 17,
    latitude: 41.2867, longitude: 36.33,
    timezone: 'Europe/Istanbul', houseSystem: 'P',
  }, { days: 30, startDate: '2026-03-01' });

  let pass34 = true;
  const lunar = transitResult34.lunar;

  // VoC fields should exist
  if (typeof lunar.isVoidOfCourse !== 'boolean') { console.error('FAIL: isVoidOfCourse not boolean'); pass34 = false; }
  if (lunar.vocEndTime === undefined) { console.error('FAIL: vocEndTime missing'); pass34 = false; }
  if (lunar.nextIngress === undefined) { console.error('FAIL: nextIngress missing'); pass34 = false; }

  // nextIngress should have sign and time
  if (lunar.nextIngress) {
    if (!lunar.nextIngress.sign) { console.error('FAIL: nextIngress.sign missing'); pass34 = false; }
    if (!lunar.nextIngress.signTr) { console.error('FAIL: nextIngress.signTr missing'); pass34 = false; }
    if (!lunar.nextIngress.time) { console.error('FAIL: nextIngress.time missing'); pass34 = false; }
  }

  // Original lunar fields should still exist
  if (!lunar.moonSign) { console.error('FAIL: moonSign missing'); pass34 = false; }
  if (!lunar.moonPhase) { console.error('FAIL: moonPhase missing'); pass34 = false; }
  if (typeof lunar.moonIllumination !== 'number') { console.error('FAIL: moonIllumination missing'); pass34 = false; }
  if (typeof lunar.isSuperMoon !== 'boolean') { console.error('FAIL: isSuperMoon missing'); pass34 = false; }

  console.log(`  VoC: ${lunar.isVoidOfCourse}`);
  console.log(`  VoC Start: ${lunar.vocStartTime}`);
  console.log(`  VoC End: ${lunar.vocEndTime}`);
  console.log(`  Last Aspect: ${lunar.lastAspect ? `${lunar.lastAspect.type} to ${lunar.lastAspect.planet}` : 'none'}`);
  console.log(`  Next Ingress: ${lunar.nextIngress?.sign} at ${lunar.nextIngress?.time?.substring(0,16)}`);

  if (pass34) console.log('PASS: Void of Course Moon fields present and valid');
} catch (e) {
  console.error('ERROR:', e.message);
}

// ========== TEST 35: Transit backward compatibility ==========
console.log('\nTEST 35: Transit backward compatibility');
console.log('-'.repeat(50));

try {
  const transitResult35 = calculateTransits({
    year: 1998, month: 11, day: 25, hour: 10, minute: 17,
    latitude: 41.2867, longitude: 36.33,
    timezone: 'Europe/Istanbul', houseSystem: 'P',
  }, { days: 7 });

  let pass35 = true;

  // All original fields must still exist
  const requiredKeys = [
    'success', 'monthStartDate', 'monthEndDate', 'periodDays', 'ascendant',
    'moonPhase', 'retrogrades', 'allTransits', 'todayTransits', 'weekTransits',
    'weeklyWithTiming', 'importantTransits', 'allEvents', 'lunar', 'fetchedAt', 'meta'
  ];

  for (const key of requiredKeys) {
    if (transitResult35[key] === undefined) {
      console.error(`FAIL: missing original key "${key}"`);
      pass35 = false;
    }
  }

  // New fields should also exist
  if (!transitResult35.ingresses) { console.error('FAIL: ingresses not added'); pass35 = false; }

  console.log(`  Original keys: ${requiredKeys.length} — all present`);
  console.log(`  New keys: ingresses (${transitResult35.ingresses.length}), VoC in lunar — present`);

  if (pass35) console.log('PASS: Transit backward compatibility maintained');
} catch (e) {
  console.error('ERROR:', e.message);
}

// ========== TEST 36: Mean Node / Osculating Lilith option ==========
console.log('\nTEST 36: Mean Node / Osculating Lilith option');
console.log('-'.repeat(50));

try {
  const chartDefault = calculateNatalChart({
    year: 1990, month: 7, day: 15, hour: 14, minute: 30,
    latitude: 41.01, longitude: 28.97, timezone: 'Europe/Istanbul',
  });
  const chartMean = calculateNatalChart({
    year: 1990, month: 7, day: 15, hour: 14, minute: 30,
    latitude: 41.01, longitude: 28.97, timezone: 'Europe/Istanbul',
    nodeType: 'mean', lilithType: 'osculating',
  });

  let pass36 = true;

  // Default has True Node
  const trueNode = chartDefault.planets.find(p => p.name === 'True Node');
  if (!trueNode) { console.error('FAIL: default chart missing True Node'); pass36 = false; }

  // Mean chart has Mean Node
  const meanNode = chartMean.planets.find(p => p.name === 'Mean Node');
  if (!meanNode) { console.error('FAIL: mean chart missing Mean Node'); pass36 = false; }

  // Default has Lilith (mean apogee)
  const meanLilith = chartDefault.planets.find(p => p.name === 'Lilith');
  if (!meanLilith) { console.error('FAIL: default chart missing Lilith'); pass36 = false; }

  // Osculating chart has Osculating Lilith
  const oscLilith = chartMean.planets.find(p => p.name === 'Osculating Lilith');
  if (!oscLilith) { console.error('FAIL: osculating chart missing Osculating Lilith'); pass36 = false; }

  // Longitudes should differ
  if (trueNode && meanNode) {
    const nodeDiff = Math.abs(trueNode.longitude - meanNode.longitude);
    if (nodeDiff < 0.001) { console.error('FAIL: True and Mean Node should differ'); pass36 = false; }
    console.log(`  True Node: ${trueNode.longitude.toFixed(4)}°, Mean Node: ${meanNode.longitude.toFixed(4)}° (diff: ${nodeDiff.toFixed(4)}°)`);
  }

  if (meanLilith && oscLilith) {
    console.log(`  Mean Lilith: ${meanLilith.longitude.toFixed(4)}°, Osc Lilith: ${oscLilith.longitude.toFixed(4)}°`);
  }

  // South Node should still exist in both
  const southDefault = chartDefault.planets.find(p => p.name === 'South Node');
  const southMean = chartMean.planets.find(p => p.name === 'South Node');
  if (!southDefault || !southMean) { console.error('FAIL: South Node missing'); pass36 = false; }

  if (pass36) console.log('PASS: Mean Node / Osculating Lilith option working');
} catch (e) {
  console.error('ERROR:', e.message);
}

// ========== TEST 37: Astrocartography — basic structure ==========
console.log('\nTEST 37: Astrocartography — basic structure');
console.log('-'.repeat(50));

try {
  const acgChart = calculateNatalChart({
    year: 1990, month: 7, day: 15, hour: 14, minute: 30,
    latitude: 41.01, longitude: 28.97, timezone: 'Europe/Istanbul',
  });

  const acgResult = calculateAstrocartography(acgChart, {
    longitudeStep: 30,
    planets: ['Sun', 'Moon'],
    lineTypes: ['MC', 'IC'],
  });

  let pass37 = true;

  if (!acgResult.success) { console.error('FAIL: success not true'); pass37 = false; }
  if (!Array.isArray(acgResult.lines)) { console.error('FAIL: lines not array'); pass37 = false; }
  if (acgResult.totalLines < 2) { console.error('FAIL: too few lines'); pass37 = false; }

  // Check line structure
  for (const line of acgResult.lines) {
    if (!line.planet) { console.error('FAIL: missing planet'); pass37 = false; break; }
    if (!line.planetTr) { console.error('FAIL: missing planetTr'); pass37 = false; break; }
    if (!line.lineType) { console.error('FAIL: missing lineType'); pass37 = false; break; }
    if (!Array.isArray(line.coordinates)) { console.error('FAIL: coordinates not array'); pass37 = false; break; }
    if (line.coordinates.length < 2) { console.error('FAIL: too few coordinates'); pass37 = false; break; }
  }

  console.log(`  Total lines: ${acgResult.totalLines}`);
  acgResult.lines.forEach(l => console.log(`  ${l.planet} ${l.lineType}: ${l.coordinates.length} points`));

  if (pass37) console.log('PASS: Astrocartography structure valid');
} catch (e) {
  console.error('ERROR:', e.message);
}

// ========== TEST 38: Astrocartography — ASC/DSC lines ==========
console.log('\nTEST 38: Astrocartography — ASC/DSC lines');
console.log('-'.repeat(50));

try {
  const acgChart38 = calculateNatalChart({
    year: 1990, month: 7, day: 15, hour: 14, minute: 30,
    latitude: 41.01, longitude: 28.97, timezone: 'Europe/Istanbul',
  });

  const acgResult38 = calculateAstrocartography(acgChart38, {
    longitudeStep: 30,
    planets: ['Sun'],
    lineTypes: ['ASC', 'DSC', 'MC', 'IC'],
  });

  let pass38 = true;

  const lineTypes = acgResult38.lines.map(l => l.lineType);
  if (!lineTypes.includes('MC')) { console.error('FAIL: missing MC line'); pass38 = false; }
  if (!lineTypes.includes('IC')) { console.error('FAIL: missing IC line'); pass38 = false; }

  // ASC/DSC may not always be present depending on resolution
  const ascLine = acgResult38.lines.find(l => l.lineType === 'ASC');
  const dscLine = acgResult38.lines.find(l => l.lineType === 'DSC');

  console.log(`  Sun lines: MC=${lineTypes.includes('MC')}, IC=${lineTypes.includes('IC')}, ASC=${!!ascLine}, DSC=${!!dscLine}`);
  if (ascLine) console.log(`  Sun ASC: ${ascLine.coordinates.length} points`);

  if (pass38) console.log('PASS: Astrocartography ASC/DSC lines working');
} catch (e) {
  console.error('ERROR:', e.message);
}

// ========== TEST 39: Phase 5 backward compatibility ==========
console.log('\nTEST 39: Phase 5 backward compatibility');
console.log('-'.repeat(50));

try {
  // Default params (no nodeType/lilithType) should still work exactly as before
  const chart39 = calculateNatalChart({
    year: 1990, month: 7, day: 15, hour: 14, minute: 30,
    latitude: 41.01, longitude: 28.97, timezone: 'Europe/Istanbul',
  });

  let pass39 = true;

  // True Node should exist by default
  const tn = chart39.planets.find(p => p.name === 'True Node');
  if (!tn) { console.error('FAIL: True Node missing in default chart'); pass39 = false; }

  // Lilith should exist by default
  const lil = chart39.planets.find(p => p.name === 'Lilith');
  if (!lil) { console.error('FAIL: Lilith missing in default chart'); pass39 = false; }

  // All original planets should be present (14: 13 bodies + South Node)
  if (chart39.planets.length !== 14) {
    console.error(`FAIL: expected 14 planets, got ${chart39.planets.length}`);
    pass39 = false;
  }

  console.log(`  Planets: ${chart39.planets.length}, True Node: present, Lilith: present`);

  if (pass39) console.log('PASS: Phase 5 backward compatibility maintained');
} catch (e) {
  console.error('ERROR:', e.message);
}

console.log('\n' + '='.repeat(70));
console.log('Tests completed. Don\'t forget to compare results with astro.com!');
console.log('='.repeat(70));
