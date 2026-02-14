// test.js
import { calculateNatalChart } from './src/calculator.js';
import { calculateSynastry, midpoint } from './src/synastry.js';
import { calculateTransits, calculateLunarMetrics, nowToJD } from './src/transit.js';

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

console.log('\n' + '='.repeat(70));
console.log('Tests completed. Don\'t forget to compare results with astro.com!');
console.log('='.repeat(70));
