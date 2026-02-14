// test.js
import { calculateNatalChart } from './src/calculator.js';
import { calculateSynastry, midpoint } from './src/synastry.js';
import { calculateTransits, calculateLunarMetrics, nowToJD } from './src/transit.js';

console.log('='.repeat(70));
console.log('CELESTIA TEST SUITI');
console.log('Sonuclari astro.com ile karsilastir: https://www.astro.com/cgi/chart.cgi');
console.log('='.repeat(70));

// ========== TEST 1: Istanbul, 2020 (UTC+3 sabit, DST yok) ==========
console.log('\nTEST 1: Istanbul, 25 Ocak 2020, 15:35');
console.log('-'.repeat(50));

try {
  const test1 = calculateNatalChart({
    year: 2020, month: 1, day: 25, hour: 15, minute: 35,
    latitude: 41.0082, longitude: 28.9784,
    timezone: 'Europe/Istanbul',
    houseSystem: 'P',
  });

  console.log(`Gunes: ${test1.planets.find(p => p.name === 'Sun').formattedPosition}`);
  console.log(`Ay: ${test1.planets.find(p => p.name === 'Moon').formattedPosition}`);
  console.log(`Yukselen: ${test1.houses.ascendant.formatted}`);
  console.log(`MC: ${test1.houses.midheaven.formatted}`);
  console.log(`Uyarilar: ${test1.meta.warnings.length > 0 ? test1.meta.warnings.join('; ') : 'Yok'}`);
  console.log(`Ephemeris modu: ${test1.meta.ephemerisMode}`);
} catch (e) {
  console.error('HATA:', e.message);
}

// ========== TEST 2: Istanbul, 1990 (DST aktif donem, yaz) ==========
console.log('\nTEST 2: Istanbul, 15 Temmuz 1990, 14:30 (DST doneminde)');
console.log('-'.repeat(50));

try {
  const test2 = calculateNatalChart({
    year: 1990, month: 7, day: 15, hour: 14, minute: 30,
    latitude: 41.0082, longitude: 28.9784,
    timezone: 'Europe/Istanbul',
    houseSystem: 'P',
  });

  console.log(`Gunes: ${test2.planets.find(p => p.name === 'Sun').formattedPosition}`);
  console.log(`Ay: ${test2.planets.find(p => p.name === 'Moon').formattedPosition}`);
  console.log(`Yukselen: ${test2.houses.ascendant.formatted}`);
  console.log(`DST aktif mi: ${test2.input.isDST}`);
  console.log(`UTC offset: ${test2.input.offsetHours} saat`);
} catch (e) {
  console.error('HATA:', e.message);
}

// ========== TEST 3: New York, 1985 ==========
console.log('\nTEST 3: New York, 4 Mart 1985, 09:15');
console.log('-'.repeat(50));

try {
  const test3 = calculateNatalChart({
    year: 1985, month: 3, day: 4, hour: 9, minute: 15,
    latitude: 40.7128, longitude: -74.0060, // BATI BOYLAM = NEGATIF
    timezone: 'America/New_York',
    houseSystem: 'P',
  });

  console.log(`Gunes: ${test3.planets.find(p => p.name === 'Sun').formattedPosition}`);
  console.log(`Ay: ${test3.planets.find(p => p.name === 'Moon').formattedPosition}`);
  console.log(`Yukselen: ${test3.houses.ascendant.formatted}`);
} catch (e) {
  console.error('HATA:', e.message);
}

// ========== TEST 4: Yuksek enlem testi (Reykjavik, Izlanda) ==========
console.log('\nTEST 4: Reykjavik, 21 Haziran 2000, 12:00 (yuksek enlem)');
console.log('-'.repeat(50));

try {
  const test4 = calculateNatalChart({
    year: 2000, month: 6, day: 21, hour: 12, minute: 0,
    latitude: 64.1466, longitude: -21.9426,
    timezone: 'Atlantic/Reykjavik',
    houseSystem: 'P',
  });

  console.log(`Yukselen: ${test4.houses.ascendant.formatted}`);
  console.log(`Uyarilar: ${test4.meta.warnings.length > 0 ? test4.meta.warnings.join('; ') : 'Yok'}`);
} catch (e) {
  console.error('HATA:', e.message);
}

// ========== TEST 5: Tam cikti ornegi ==========
console.log('\nTEST 5: Tam JSON ciktisi (Istanbul, 15 Temmuz 1990)');
console.log('-'.repeat(50));

try {
  const fullChart = calculateNatalChart({
    year: 1990, month: 7, day: 15, hour: 14, minute: 30,
    latitude: 41.0082, longitude: 28.9784,
    timezone: 'Europe/Istanbul',
  });

  // Gezegen pozisyonlari tablosu
  console.log('\nGezegen Pozisyonlari:');
  fullChart.planets.forEach(p => {
    const retro = p.isRetrograde ? ' R' : '';
    const dignity = p.dignity ? ` [${p.dignity}]` : '';
    console.log(`  ${p.trName.padEnd(20)} ${p.formattedPosition.padEnd(25)} Ev ${p.house}${retro}${dignity}`);
  });

  // Ev sinirlari
  console.log('\nEv Sinirlari:');
  fullChart.houses.cusps.forEach(h => {
    console.log(`  Ev ${String(h.house).padStart(2)}: ${h.formattedCusp}`);
  });

  // Aspektler (ilk 10)
  console.log('\nAspektler (ilk 10):');
  fullChart.aspects.slice(0, 10).forEach(a => {
    const applying = a.isApplying ? 'yaklasan' : 'uzaklasan';
    console.log(`  ${a.planet1} ${a.symbol} ${a.planet2} ${a.type} (orb: ${a.orb}, ${applying}, guc: ${a.strength}%)`);
  });

  // Analiz
  console.log('\nAnaliz:');
  console.log(`  Gunes Burcu: ${fullChart.analysis.sunSign}`);
  console.log(`  Ay Burcu: ${fullChart.analysis.moonSign}`);
  console.log(`  Yukselen: ${fullChart.analysis.risingSign}`);
  console.log(`  Gunduz Haritasi: ${fullChart.analysis.isDayChart}`);
  console.log(`  Ay Fazi: ${fullChart.analysis.moonPhase?.phaseTr}`);
  console.log(`  Part of Fortune: ${fullChart.analysis.partOfFortune.formatted}`);
  console.log(`  Baskin Element: ${fullChart.analysis.elements.dominant}`);
  console.log(`  Baskin Modalite: ${fullChart.analysis.modalities.dominant}`);

  if (fullChart.analysis.stelliums.length > 0) {
    fullChart.analysis.stelliums.forEach(s => {
      console.log(`  Stellium: ${s.sign} (${s.planets.join(', ')})`);
    });
  }

  // Chart Ruler dogrulama (Yukselen Scorpio → ruler Pluto)
  console.log('\nChart Ruler (Harita Lordu):');
  const cr = fullChart.analysis.chartRuler;
  if (cr) {
    console.log(`  ${cr.trName} (${cr.name}) — ${cr.formattedPosition}, Ev ${cr.house}`);
    if (cr.name === 'Pluto') {
      console.log('BASARILI: Scorpio yukselen icin harita lordu Pluto');
    } else {
      console.error(`HATA: Scorpio yukselen icin harita lordu Pluto olmali, ${cr.name} geldi!`);
    }
    if (cr.house === 1) {
      console.log('BASARILI: Pluto ev 1\'de');
    } else {
      console.error(`HATA: Pluto ev 1'de bekleniyor, ev ${cr.house} geldi!`);
    }
  } else {
    console.error('HATA: chartRuler null!');
  }

  // House Rulers dogrulama (12 ev lordu)
  console.log('\nEv Lordlari:');
  const hr = fullChart.analysis.houseRulers;
  if (hr && hr.length === 12) {
    console.log('BASARILI: 12 ev lordu mevcut');
  } else {
    console.error(`HATA: 12 ev lordu bekleniyor, ${hr ? hr.length : 0} geldi!`);
  }

  let houseRulersValid = true;
  if (hr) {
    for (const ruler of hr) {
      if (ruler.rulerHouse < 1 || ruler.rulerHouse > 12) {
        console.error(`HATA: Ev ${ruler.house} lordunun evi gecersiz: ${ruler.rulerHouse}`);
        houseRulersValid = false;
        break;
      }
    }
  }
  if (houseRulersValid) {
    console.log('BASARILI: Tum ev lordlarinin evi 1-12 arasinda');
  }

  // Tutarlilik: Ev 1 cusp sign = yukselen burcu → ev 1 lordu = harita lordu
  if (hr && cr) {
    const house1Ruler = hr.find(h => h.house === 1);
    if (house1Ruler.rulingPlanet === cr.name) {
      console.log('BASARILI: Ev 1 lordu = harita lordu (tutarli)');
    } else {
      console.error(`HATA: Ev 1 lordu (${house1Ruler.rulingPlanet}) != harita lordu (${cr.name})`);
    }
  }

  // Ilk 3 ev lordu ornegi
  if (hr) {
    console.log('\nIlk 3 ev lordu:');
    hr.slice(0, 3).forEach(r => {
      console.log(`  Ev ${String(r.house).padStart(2)}: cusp ${r.cuspSign.padEnd(12)} -> lord ${r.rulingPlanet.padEnd(8)} (${r.rulingPlanetTr}) — ${r.rulerSign} Ev ${r.rulerHouse}`);
    });
  }

} catch (e) {
  console.error('HATA:', e.message);
}

// ========== TEST 6: Temel synastry testi ==========
console.log('\nTEST 6: Temel synastry testi (Istanbul + Ankara)');
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

  // Kisi 1 ve Kisi 2 natal verileri mevcut mu?
  const p1Sun = synResult.person1.planets.find(p => p.name === 'Sun');
  const p2Sun = synResult.person2.planets.find(p => p.name === 'Sun');
  console.log(`Kisi 1 Gunes: ${p1Sun.formattedPosition}`);
  console.log(`Kisi 2 Gunes: ${p2Sun.formattedPosition}`);

  // Cross-aspect sayisi > 0
  const crossCount = synResult.synastry.crossAspects.length;
  console.log(`Cross-aspekt sayisi: ${crossCount}`);
  if (crossCount === 0) {
    console.error('HATA: Cross-aspekt sayisi 0 olmamali!');
  } else {
    console.log('BASARILI: Cross-aspektler mevcut');
  }

  // Composite planet sayisi dogrulama
  const compPlanetCount = synResult.composite.planets.length;
  const expectedPlanetCount = synResult.person1.planets.length;
  console.log(`Composite gezegen sayisi: ${compPlanetCount} (beklenen: ${expectedPlanetCount})`);
  if (compPlanetCount === expectedPlanetCount) {
    console.log('BASARILI: Composite gezegen sayisi dogru');
  } else {
    console.error('HATA: Composite gezegen sayisi eslesmiyor!');
  }

  // İlk 5 cross-aspekti goster
  console.log('\nIlk 5 cross-aspekt:');
  synResult.synastry.crossAspects.slice(0, 5).forEach(a => {
    console.log(`  ${a.planet1} ${a.symbol} ${a.planet2} ${a.type} (orb: ${a.orb}, guc: ${a.strength}%)`);
  });

} catch (e) {
  console.error('HATA:', e.message);
}

// ========== TEST 7: House overlay dogrulamasi ==========
console.log('\nTEST 7: House overlay dogrulamasi');
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

  console.log(`Kisi 1 -> Kisi 2 evleri: ${overlay12.length} gezegen`);
  console.log(`Kisi 2 -> Kisi 1 evleri: ${overlay21.length} gezegen`);

  // Her iki yonde de overlay verisi var mi?
  if (overlay12.length > 0 && overlay21.length > 0) {
    console.log('BASARILI: Her iki yonde house overlay verisi mevcut');
  } else {
    console.error('HATA: House overlay verisi eksik!');
  }

  // Her gezegenin bir evi olmali (1-12 arasi)
  const allValid12 = overlay12.every(o => o.house >= 1 && o.house <= 12);
  const allValid21 = overlay21.every(o => o.house >= 1 && o.house <= 12);
  if (allValid12 && allValid21) {
    console.log('BASARILI: Tum house overlay degerleri gecerli (1-12)');
  } else {
    console.error('HATA: Gecersiz house overlay degeri!');
  }

  // Ornek overlay
  console.log('\nKisi 1 gezegenleri Kisi 2 evlerinde:');
  overlay12.slice(0, 5).forEach(o => {
    console.log(`  ${o.planetTr.padEnd(20)} ${o.sign.padEnd(12)} -> Ev ${o.house}`);
  });

} catch (e) {
  console.error('HATA:', e.message);
}

// ========== TEST 8: Composite midpoint dogrulamasi ==========
console.log('\nTEST 8: Composite midpoint dogrulamasi');
console.log('-'.repeat(50));

try {
  // Midpoint fonksiyonunu dogrudan test et
  // 10° ve 20° midpoint = 15°
  const mid1 = midpoint(10, 20);
  console.log(`midpoint(10, 20) = ${mid1} (beklenen: 15)`);
  if (Math.abs(mid1 - 15) < 0.001) {
    console.log('BASARILI: Basit midpoint dogru');
  } else {
    console.error('HATA: Basit midpoint yanlis!');
  }

  // Wrap-around test: 350° ve 10° midpoint = 0°
  const mid2 = midpoint(350, 10);
  console.log(`midpoint(350, 10) = ${mid2} (beklenen: 0)`);
  if (Math.abs(mid2) < 0.001 || Math.abs(mid2 - 360) < 0.001) {
    console.log('BASARILI: Wrap-around midpoint dogru');
  } else {
    console.error('HATA: Wrap-around midpoint yanlis!');
  }

  // Wrap-around test 2: 355° ve 5° midpoint = 0°
  const mid3 = midpoint(355, 5);
  console.log(`midpoint(355, 5) = ${mid3} (beklenen: 0)`);
  if (Math.abs(mid3) < 0.001 || Math.abs(mid3 - 360) < 0.001) {
    console.log('BASARILI: Wrap-around midpoint 2 dogru');
  } else {
    console.error('HATA: Wrap-around midpoint 2 yanlis!');
  }

  // 90° ve 270° midpoint = 0° veya 180° (kisa yol)
  const mid4 = midpoint(90, 270);
  console.log(`midpoint(90, 270) = ${mid4} (beklenen: 0 veya 180)`);
  if (Math.abs(mid4) < 0.001 || Math.abs(mid4 - 180) < 0.001 || Math.abs(mid4 - 360) < 0.001) {
    console.log('BASARILI: Karsit midpoint dogru');
  } else {
    console.error('HATA: Karsit midpoint yanlis!');
  }

  // Composite chart icindeki midpoint dogrulama
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

  console.log(`\nKisi 1 Gunes: ${p1Sun.longitude.toFixed(2)}°`);
  console.log(`Kisi 2 Gunes: ${p2Sun.longitude.toFixed(2)}°`);
  console.log(`Composite Gunes: ${compSun.longitude.toFixed(2)}° (beklenen: ${expectedMid.toFixed(2)}°)`);

  if (Math.abs(compSun.longitude - expectedMid) < 0.001) {
    console.log('BASARILI: Composite Gunes midpoint dogrulandi');
  } else {
    console.error('HATA: Composite Gunes midpoint eslesmiyor!');
  }

} catch (e) {
  console.error('HATA:', e.message);
}

// ========== TEST 9: Temel transit — response shape doğrulama ==========
console.log('\nTEST 9: Temel transit — response shape dogrulama');
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

  // response shape kontrol
  const requiredKeys = [
    'success', 'monthStartDate', 'monthEndDate', 'periodDays', 'ascendant',
    'moonPhase', 'retrogrades', 'allTransits', 'todayTransits', 'weekTransits',
    'weeklyWithTiming', 'importantTransits', 'allEvents', 'lunar', 'fetchedAt', 'meta'
  ];
  const missingKeys = requiredKeys.filter(k => !(k in transitResult));

  if (missingKeys.length === 0) {
    console.log('BASARILI: Tum zorunlu alanlar mevcut');
  } else {
    console.error(`HATA: Eksik alanlar: ${missingKeys.join(', ')}`);
  }

  console.log(`success: ${transitResult.success}`);
  console.log(`periodDays: ${transitResult.periodDays}`);
  console.log(`ascendant: ${transitResult.ascendant}`);
  console.log(`moonPhase: ${transitResult.moonPhase}`);
  console.log(`allTransits sayisi: ${transitResult.allTransits.length}`);
  console.log(`allEvents sayisi: ${transitResult.allEvents.length}`);
  console.log(`importantTransits sayisi: ${transitResult.importantTransits.length}`);
  console.log(`retrogrades sayisi: ${transitResult.retrogrades.length}`);

  if (transitResult.allTransits.length > 0) {
    console.log('BASARILI: allTransits non-empty');
  } else {
    console.error('HATA: allTransits bos olmamali!');
  }

  if (transitResult.success === true) {
    console.log('BASARILI: success = true');
  } else {
    console.error('HATA: success true olmali!');
  }

} catch (e) {
  console.error('HATA:', e.message);
}

// ========== TEST 10: Transit orb doğrulama ==========
console.log('\nTEST 10: Transit orb dogrulama — maxOrb natal\'in yarisi');
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

  // maxOrb değerlerinin natal'in yarısından büyük olmadığını kontrol et
  // Natal Conjunction orb = 8, transit max = 8 * 0.5 * 1.25 (luminary) = 5.0
  // En büyük olası maxOrb: 8 * 0.5 * 1.25 = 5.0
  const maxPossibleOrb = 8 * 0.5 * 1.25; // Conjunction + luminary modifier

  let orbValid = true;
  for (const t of transitResult.allTransits) {
    if (t.maxOrb > maxPossibleOrb + 0.01) {
      console.error(`HATA: maxOrb cok buyuk: ${t.transitPlanet}-${t.natalPlanet} ${t.type} maxOrb=${t.maxOrb} (limit: ${maxPossibleOrb})`);
      orbValid = false;
      break;
    }
    // orb, maxOrb'dan buyuk olmamali
    if (t.orb > t.maxOrb + 0.01) {
      console.error(`HATA: orb > maxOrb: ${t.transitPlanet}-${t.natalPlanet} orb=${t.orb} maxOrb=${t.maxOrb}`);
      orbValid = false;
      break;
    }
  }

  if (orbValid) {
    console.log('BASARILI: Tum transit orb degerleri gecerli');
  }

  // İlk 3 transit'i goster
  console.log('\nIlk 3 transit:');
  transitResult.allTransits.slice(0, 3).forEach(t => {
    console.log(`  ${t.transitPlanet} ${t.symbol} ${t.natalPlanet} ${t.type} (orb: ${t.orb}, maxOrb: ${t.maxOrb}, guc: ${t.strength}%)`);
  });

} catch (e) {
  console.error('HATA:', e.message);
}

// ========== TEST 11: Event timing doğrulama ==========
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
        console.error(`HATA: startTime > exactTime: ${ev.transitPlanet} ${ev.symbol} ${ev.natalPlanet}`);
        console.error(`  startTime: ${ev.startTime}, exactTime: ${ev.exactTime}`);
        timingValid = false;
        break;
      }
      if (ev.exactTime > ev.endTime) {
        console.error(`HATA: exactTime > endTime: ${ev.transitPlanet} ${ev.symbol} ${ev.natalPlanet}`);
        console.error(`  exactTime: ${ev.exactTime}, endTime: ${ev.endTime}`);
        timingValid = false;
        break;
      }
    }
  }

  if (timingValid) {
    console.log(`BASARILI: ${checkedCount} event'te timing tutarli (startTime <= exactTime <= endTime)`);
  }

  // İlk timing ornegi
  const firstWithTiming = transitResult.allEvents.find(ev => ev.startTime && ev.exactTime && ev.endTime);
  if (firstWithTiming) {
    console.log(`\nOrnek event timing:`);
    console.log(`  ${firstWithTiming.transitPlanet} ${firstWithTiming.symbol} ${firstWithTiming.natalPlanet} ${firstWithTiming.type}`);
    console.log(`  start:  ${firstWithTiming.startTime}`);
    console.log(`  exact:  ${firstWithTiming.exactTime}`);
    console.log(`  end:    ${firstWithTiming.endTime}`);
  }

} catch (e) {
  console.error('HATA:', e.message);
}

// ========== TEST 12: Lunar metrics doğrulama ==========
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
    console.error(`HATA: moonIllumination 0-100 disinda: ${lunar.moonIllumination}`);
    lunarValid = false;
  }

  if (lunar.moonDay < 1 || lunar.moonDay > 30) {
    console.error(`HATA: moonDay 1-30 disinda: ${lunar.moonDay}`);
    lunarValid = false;
  }

  if (lunar.moonAgeInDays < 0 || lunar.moonAgeInDays > 29.53) {
    console.error(`HATA: moonAgeInDays 0-29.53 disinda: ${lunar.moonAgeInDays}`);
    lunarValid = false;
  }

  const validPhases = ['New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous',
                       'Full Moon', 'Waning Gibbous', 'Last Quarter', 'Waning Crescent'];
  if (!validPhases.includes(lunar.moonPhase)) {
    console.error(`HATA: Gecersiz moonPhase: ${lunar.moonPhase}`);
    lunarValid = false;
  }

  if (lunarValid) {
    console.log('BASARILI: Tum lunar metrics degerleri gecerli');
  }

} catch (e) {
  console.error('HATA:', e.message);
}

// ========== TEST 13: Transit midpoint / bilinen aspekt kontrolü ==========
console.log('\nTEST 13: Transit aspekt aci dogrulamasi');
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

  // Her transit'in type'ina uygun maxOrb kontrol et
  const aspectAngles = {
    'Conjunction': 0, 'Opposition': 180, 'Trine': 120,
    'Square': 90, 'Sextile': 60, 'Quincunx': 150, 'Semi-sextile': 30
  };

  let aspectValid = true;
  for (const t of transitResult.allTransits) {
    if (!(t.type in aspectAngles)) {
      console.error(`HATA: Bilinmeyen aspekt tipi: ${t.type}`);
      aspectValid = false;
      break;
    }
    // strength 0-100 arasi olmali
    if (t.strength < 0 || t.strength > 100) {
      console.error(`HATA: strength 0-100 disinda: ${t.strength} (${t.transitPlanet} ${t.type} ${t.natalPlanet})`);
      aspectValid = false;
      break;
    }
  }

  if (aspectValid) {
    console.log(`BASARILI: ${transitResult.allTransits.length} transit aspektin tumu gecerli tiplerde ve strength 0-100 arasinda`);
  }

  // meta kontrolu
  if (transitResult.meta.transitOrbScale === 0.5) {
    console.log('BASARILI: transitOrbScale = 0.5 (natal\'in yarisi)');
  } else {
    console.error(`HATA: transitOrbScale yanlis: ${transitResult.meta.transitOrbScale}`);
  }

  if (transitResult.meta.engine === 'Celestia (Swiss Ephemeris)') {
    console.log('BASARILI: engine = Celestia (Swiss Ephemeris)');
  } else {
    console.error(`HATA: engine yanlis: ${transitResult.meta.engine}`);
  }

} catch (e) {
  console.error('HATA:', e.message);
}

// ========== TIBBI ASTROLOJİ TESTLERİ (14-20) ==========
// Test verisi: Istanbul, 15 Temmuz 1990, 14:30 (Test 5 ile aynı)

let medChart;
try {
  medChart = calculateNatalChart({
    year: 1990, month: 7, day: 15, hour: 14, minute: 30,
    latitude: 41.0082, longitude: 28.9784,
    timezone: 'Europe/Istanbul',
  });
} catch (e) {
  console.error('HATA: Tibbi astroloji test haritasi olusturulamadi:', e.message);
}

// ========== TEST 14: Body Areas ==========
console.log('\nTEST 14: Body Areas — gezegen bodyAreas + ev healthDomain');
console.log('-'.repeat(50));

if (medChart) {
  try {
    let test14Valid = true;

    // Her ana gezegende bodyAreas array olmali
    const mainPlanetNames = ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto'];
    for (const name of mainPlanetNames) {
      const planet = medChart.planets.find(p => p.name === name);
      if (!planet) {
        console.error(`HATA: ${name} bulunamadi!`);
        test14Valid = false;
        break;
      }
      if (!Array.isArray(planet.bodyAreas) || planet.bodyAreas.length === 0) {
        console.error(`HATA: ${name} icin bodyAreas bos veya yok!`);
        test14Valid = false;
        break;
      }
    }

    // Her evde healthDomain string olmali
    for (const house of medChart.houses.cusps) {
      if (typeof house.healthDomain !== 'string' || house.healthDomain.length === 0) {
        console.error(`HATA: Ev ${house.house} icin healthDomain bos veya yok!`);
        test14Valid = false;
        break;
      }
    }

    if (test14Valid) {
      console.log('BASARILI: Tum ana gezegenlerde bodyAreas ve tum evlerde healthDomain mevcut');
      // Ornek cikti
      const sun = medChart.planets.find(p => p.name === 'Sun');
      console.log(`  Sun bodyAreas: ${sun.bodyAreas.join(', ')}`);
      console.log(`  Ev 6 healthDomain: ${medChart.houses.cusps.find(h => h.house === 6).healthDomain}`);
    }
  } catch (e) {
    console.error('HATA:', e.message);
  }
}

// ========== TEST 15: Combustion ==========
console.log('\nTEST 15: Combustion — Sun null, digerleri valid status');
console.log('-'.repeat(50));

if (medChart) {
  try {
    let test15Valid = true;

    // Sun icin combustion null olmali
    const sun = medChart.planets.find(p => p.name === 'Sun');
    if (sun.combustion !== null) {
      console.error('HATA: Sun icin combustion null olmali!');
      test15Valid = false;
    }

    // Diger gezegenler icin valid status
    const validStatuses = ['cazimi', 'combust', 'under_beams', 'free'];
    const otherPlanets = medChart.planets.filter(p =>
      !['Sun', 'True Node', 'South Node', 'Lilith'].includes(p.name)
    );

    for (const planet of otherPlanets) {
      if (!planet.combustion) {
        console.error(`HATA: ${planet.name} icin combustion null!`);
        test15Valid = false;
        break;
      }
      if (!validStatuses.includes(planet.combustion.status)) {
        console.error(`HATA: ${planet.name} icin gecersiz combustion status: ${planet.combustion.status}`);
        test15Valid = false;
        break;
      }
      if (typeof planet.combustion.distanceToSun !== 'number') {
        console.error(`HATA: ${planet.name} icin distanceToSun number degil!`);
        test15Valid = false;
        break;
      }
    }

    if (test15Valid) {
      console.log('BASARILI: Sun null, diger gezegenlerde valid combustion status');
      // Ornek
      const mercury = medChart.planets.find(p => p.name === 'Mercury');
      console.log(`  Mercury: ${mercury.combustion.status} (${mercury.combustion.statusTr}), mesafe: ${mercury.combustion.distanceToSun}°`);
    }
  } catch (e) {
    console.error('HATA:', e.message);
  }
}

// ========== TEST 16: Critical Degrees ==========
console.log('\nTEST 16: Critical Degrees — null veya valid array');
console.log('-'.repeat(50));

if (medChart) {
  try {
    let test16Valid = true;
    let critCount = 0;

    for (const planet of medChart.planets) {
      if (planet.criticalDegree !== null) {
        if (!Array.isArray(planet.criticalDegree)) {
          console.error(`HATA: ${planet.name} criticalDegree array degil!`);
          test16Valid = false;
          break;
        }
        for (const cd of planet.criticalDegree) {
          if (!cd.type || !cd.typeTr || typeof cd.degree !== 'number') {
            console.error(`HATA: ${planet.name} criticalDegree formati yanlis!`);
            test16Valid = false;
            break;
          }
        }
        if (!test16Valid) break;
        critCount++;
      }
    }

    if (test16Valid) {
      console.log(`BASARILI: criticalDegree formati dogru (${critCount} gezegen kritik derecede)`);
      // Kritik derecedeki gezegenleri goster
      medChart.planets.filter(p => p.criticalDegree).forEach(p => {
        p.criticalDegree.forEach(cd => {
          console.log(`  ${p.name}: ${cd.typeTr} (${cd.degree}°)`);
        });
      });
    }
  } catch (e) {
    console.error('HATA:', e.message);
  }
}

// ========== TEST 17: Speed Analysis ==========
console.log('\nTEST 17: Speed Analysis — 10 ana gezegen valid classification');
console.log('-'.repeat(50));

if (medChart) {
  try {
    let test17Valid = true;
    const validClassifications = ['stationary', 'slow', 'fast', 'average'];
    const mainPlanetNames = ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto'];

    for (const name of mainPlanetNames) {
      const planet = medChart.planets.find(p => p.name === name);
      if (!planet.speedAnalysis) {
        console.error(`HATA: ${name} icin speedAnalysis null!`);
        test17Valid = false;
        break;
      }
      if (!validClassifications.includes(planet.speedAnalysis.classification)) {
        console.error(`HATA: ${name} icin gecersiz classification: ${planet.speedAnalysis.classification}`);
        test17Valid = false;
        break;
      }
      if (planet.speedAnalysis.ratio < 0) {
        console.error(`HATA: ${name} icin ratio negatif: ${planet.speedAnalysis.ratio}`);
        test17Valid = false;
        break;
      }
    }

    // True Node, South Node, Lilith icin null olmali
    for (const name of ['True Node', 'South Node', 'Lilith']) {
      const planet = medChart.planets.find(p => p.name === name);
      if (planet && planet.speedAnalysis !== null) {
        console.error(`HATA: ${name} icin speedAnalysis null olmali!`);
        test17Valid = false;
        break;
      }
    }

    if (test17Valid) {
      console.log('BASARILI: 10 ana gezegende valid speedAnalysis, Node/Lilith null');
      // Ornek
      const mars = medChart.planets.find(p => p.name === 'Mars');
      console.log(`  Mars: ${mars.speedAnalysis.classificationTr} (ratio: ${mars.speedAnalysis.ratio}, hiz: ${mars.speedAnalysis.currentSpeed}°/gun)`);
    }
  } catch (e) {
    console.error('HATA:', e.message);
  }
}

// ========== TEST 18: Profection ==========
console.log('\nTEST 18: Profection — age, activeHouse, yearLord');
console.log('-'.repeat(50));

if (medChart) {
  try {
    const prof = medChart.analysis.medicalAstrology.profection;
    let test18Valid = true;

    if (typeof prof.age !== 'number' || prof.age < 0) {
      console.error(`HATA: age gecersiz: ${prof.age}`);
      test18Valid = false;
    }

    const expectedHouse = (prof.age % 12) + 1;
    if (prof.activeHouse !== expectedHouse) {
      console.error(`HATA: activeHouse beklenen ${expectedHouse}, gelen ${prof.activeHouse}`);
      test18Valid = false;
    }

    if (!prof.yearLord) {
      console.error('HATA: yearLord null!');
      test18Valid = false;
    }

    if (!prof.activeSign) {
      console.error('HATA: activeSign null!');
      test18Valid = false;
    }

    if (test18Valid) {
      console.log(`BASARILI: Profection dogru — yas: ${prof.age}, ev: ${prof.activeHouse}, yil lordu: ${prof.yearLord} (${prof.yearLordTr})`);
      console.log(`  Aktif burc: ${prof.activeSign}, yil lordu burcu: ${prof.yearLordSign}, evi: ${prof.yearLordHouse}`);
    }
  } catch (e) {
    console.error('HATA:', e.message);
  }
}

// ========== TEST 19: Medical Arabic Parts ==========
console.log('\nTEST 19: Medical Arabic Parts — 6 nokta, longitude 0-360, house 1-12');
console.log('-'.repeat(50));

if (medChart) {
  try {
    const parts = medChart.analysis.medicalAstrology.arabicParts;
    let test19Valid = true;

    if (!Array.isArray(parts) || parts.length !== 6) {
      console.error(`HATA: 6 arabic part bekleniyor, ${parts ? parts.length : 0} geldi!`);
      test19Valid = false;
    }

    if (test19Valid) {
      for (const part of parts) {
        if (part.longitude < 0 || part.longitude > 360) {
          console.error(`HATA: ${part.name} longitude 0-360 disinda: ${part.longitude}`);
          test19Valid = false;
          break;
        }
        if (part.house < 1 || part.house > 12) {
          console.error(`HATA: ${part.name} house 1-12 disinda: ${part.house}`);
          test19Valid = false;
          break;
        }
        if (!part.sign || !part.formatted) {
          console.error(`HATA: ${part.name} sign veya formatted eksik!`);
          test19Valid = false;
          break;
        }
      }
    }

    if (test19Valid) {
      console.log('BASARILI: 6 tibbi Arap noktasi, tum degerler gecerli');
      parts.forEach(p => {
        console.log(`  ${p.trName.padEnd(25)} ${p.formatted.padEnd(20)} Ev ${p.house}`);
      });
    }
  } catch (e) {
    console.error('HATA:', e.message);
  }
}

// ========== TEST 20: Antiscia ==========
console.log('\nTEST 20: Antiscia — points, formul dogrulamasi, hiddenConnections');
console.log('-'.repeat(50));

if (medChart) {
  try {
    const antiscia = medChart.analysis.medicalAstrology.antiscia;
    let test20Valid = true;

    // points sayisi = gezegen sayisi
    if (antiscia.points.length !== medChart.planets.length) {
      console.error(`HATA: antiscia points sayisi (${antiscia.points.length}) != gezegen sayisi (${medChart.planets.length})`);
      test20Valid = false;
    }

    // Formul dogrulamasi: antiscion = (180 - lon + 360) % 360
    for (const point of antiscia.points) {
      const expectedAnti = (180 - point.longitude + 360) % 360;
      if (Math.abs(point.antiscion.longitude - expectedAnti) > 0.001) {
        console.error(`HATA: ${point.planet} antiscion formul hatasi: beklenen ${expectedAnti.toFixed(4)}, gelen ${point.antiscion.longitude}`);
        test20Valid = false;
        break;
      }

      // Contra-antiscion: (360 - lon) % 360
      const expectedContra = (360 - point.longitude) % 360;
      if (Math.abs(point.contraAntiscion.longitude - expectedContra) > 0.001) {
        console.error(`HATA: ${point.planet} contra-antiscion formul hatasi: beklenen ${expectedContra.toFixed(4)}, gelen ${point.contraAntiscion.longitude}`);
        test20Valid = false;
        break;
      }
    }

    // hiddenConnections array olmali
    if (!Array.isArray(antiscia.hiddenConnections)) {
      console.error('HATA: hiddenConnections array degil!');
      test20Valid = false;
    }

    if (test20Valid) {
      console.log(`BASARILI: ${antiscia.points.length} antiscia noktasi, formul dogru, ${antiscia.hiddenConnections.length} gizli baglanti`);
      // Ornek
      const sun = antiscia.points.find(p => p.planet === 'Sun');
      if (sun) {
        console.log(`  Sun antiscion: ${sun.antiscion.formatted}, contra: ${sun.contraAntiscion.formatted}`);
      }
      if (antiscia.hiddenConnections.length > 0) {
        const hc = antiscia.hiddenConnections[0];
        console.log(`  Ilk gizli baglanti: ${hc.planet1} <-> ${hc.planet2} (${hc.typeTr}, orb: ${hc.orb}°)`);
      }
    }
  } catch (e) {
    console.error('HATA:', e.message);
  }
}

// ========== GEZEGEN GÜÇ SKORU TESTLERİ (21-23) ==========

// ========== TEST 21: Planetary Strength — temel skor ve breakdown ==========
console.log('\nTEST 21: Planetary Strength — totalScore, breakdown, strength label');
console.log('-'.repeat(50));

if (medChart) {
  try {
    let test21Valid = true;
    const validStrengths = ['very_strong', 'strong', 'moderate', 'weak', 'very_weak'];
    const mainPlanetNames = ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto'];

    for (const name of mainPlanetNames) {
      const planet = medChart.planets.find(p => p.name === name);
      const ps = planet.planetaryStrength;

      if (!ps) {
        console.error(`HATA: ${name} icin planetaryStrength null!`);
        test21Valid = false;
        break;
      }
      if (typeof ps.totalScore !== 'number') {
        console.error(`HATA: ${name} totalScore number degil!`);
        test21Valid = false;
        break;
      }
      if (!validStrengths.includes(ps.strength)) {
        console.error(`HATA: ${name} gecersiz strength: ${ps.strength}`);
        test21Valid = false;
        break;
      }
      if (typeof ps.breakdown !== 'object') {
        console.error(`HATA: ${name} breakdown obje degil!`);
        test21Valid = false;
        break;
      }
      if (!ps.strengthTr) {
        console.error(`HATA: ${name} strengthTr eksik!`);
        test21Valid = false;
        break;
      }
    }

    // True Node, South Node, Lilith icin null olmali
    for (const name of ['True Node', 'South Node', 'Lilith']) {
      const planet = medChart.planets.find(p => p.name === name);
      if (planet && planet.planetaryStrength !== null) {
        console.error(`HATA: ${name} icin planetaryStrength null olmali!`);
        test21Valid = false;
        break;
      }
    }

    if (test21Valid) {
      console.log('BASARILI: 10 ana gezegende valid planetaryStrength, Node/Lilith null');
      // Tablo ciktisi
      console.log('\n  Gezegen Guc Tablosu:');
      for (const name of mainPlanetNames) {
        const planet = medChart.planets.find(p => p.name === name);
        const ps = planet.planetaryStrength;
        const scoreStr = ps.totalScore >= 0 ? `+${ps.totalScore}` : `${ps.totalScore}`;
        console.log(`  ${name.padEnd(10)} ${scoreStr.padStart(4)} (${ps.strengthTr})`);
      }
    }
  } catch (e) {
    console.error('HATA:', e.message);
  }
}

// ========== TEST 22: Breakdown bileşenleri — skor toplamı tutarlılığı ==========
console.log('\nTEST 22: Breakdown bileşenleri — totalScore = sum(breakdown)');
console.log('-'.repeat(50));

if (medChart) {
  try {
    let test22Valid = true;
    const mainPlanetNames = ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto'];

    for (const name of mainPlanetNames) {
      const planet = medChart.planets.find(p => p.name === name);
      const ps = planet.planetaryStrength;
      const breakdownSum = Object.values(ps.breakdown).reduce((a, b) => a + b, 0);

      if (Math.abs(breakdownSum - ps.totalScore) > 0.01) {
        console.error(`HATA: ${name} breakdown toplami (${breakdownSum}) != totalScore (${ps.totalScore})`);
        test22Valid = false;
        break;
      }

      // Her breakdown degeri bilinen kategorilerden biri olmali
      const validKeys = [
        'domicile', 'exaltation', 'detriment', 'fall', 'triplicity', 'term', 'face', 'peregrine',
        'angular', 'succedent', 'cadent',
        'retrograde', 'cazimi', 'combust', 'under_beams',
        'stationary', 'slow', 'fast',
      ];
      for (const key of Object.keys(ps.breakdown)) {
        if (!validKeys.includes(key)) {
          console.error(`HATA: ${name} bilinmeyen breakdown key: ${key}`);
          test22Valid = false;
          break;
        }
      }
      if (!test22Valid) break;

      // Her gezegende tam olarak 1 ev kategorisi olmali (angular/succedent/cadent)
      const houseKeys = ['angular', 'succedent', 'cadent'].filter(k => k in ps.breakdown);
      if (houseKeys.length !== 1) {
        console.error(`HATA: ${name} ev kategorisi sayisi ${houseKeys.length} (beklenen 1)`);
        test22Valid = false;
        break;
      }
    }

    if (test22Valid) {
      console.log('BASARILI: Tum gezegenlerde breakdown toplami = totalScore ve kategoriler gecerli');
      // Ornek breakdown
      const jupiter = medChart.planets.find(p => p.name === 'Jupiter');
      console.log(`  Jupiter breakdown: ${JSON.stringify(jupiter.planetaryStrength.breakdown)}`);
    }
  } catch (e) {
    console.error('HATA:', e.message);
  }
}

// ========== TEST 23: Bilinen dignity dogrulamasi ==========
console.log('\nTEST 23: Bilinen dignity dogrulamasi — Saturn domicile, Jupiter exaltation');
console.log('-'.repeat(50));

if (medChart) {
  try {
    let test23Valid = true;

    // Saturn Capricorn'da = domicile (+5 olmali breakdown'da)
    const saturn = medChart.planets.find(p => p.name === 'Saturn');
    if (saturn.sign === 'Capricorn') {
      if (saturn.planetaryStrength.breakdown.domicile !== 5) {
        console.error(`HATA: Saturn Capricorn'da domicile +5 olmali, ${saturn.planetaryStrength.breakdown.domicile} geldi!`);
        test23Valid = false;
      }
    }

    // Jupiter Cancer'da = exaltation (+4 olmali breakdown'da)
    const jupiter = medChart.planets.find(p => p.name === 'Jupiter');
    if (jupiter.sign === 'Cancer') {
      if (jupiter.planetaryStrength.breakdown.exaltation !== 4) {
        console.error(`HATA: Jupiter Cancer'da exaltation +4 olmali, ${jupiter.planetaryStrength.breakdown.exaltation} geldi!`);
        test23Valid = false;
      }
    }

    // Pluto Scorpio'da = domicile (+5 olmali)
    const pluto = medChart.planets.find(p => p.name === 'Pluto');
    if (pluto.sign === 'Scorpio') {
      if (pluto.planetaryStrength.breakdown.domicile !== 5) {
        console.error(`HATA: Pluto Scorpio'da domicile +5 olmali, ${pluto.planetaryStrength.breakdown.domicile} geldi!`);
        test23Valid = false;
      }
    }

    // Mars Taurus'ta = detriment (-5 olmali)
    const mars = medChart.planets.find(p => p.name === 'Mars');
    if (mars.sign === 'Taurus') {
      if (mars.planetaryStrength.breakdown.detriment !== -5) {
        console.error(`HATA: Mars Taurus'ta detriment -5 olmali, ${mars.planetaryStrength.breakdown.detriment} geldi!`);
        test23Valid = false;
      }
    }

    // Neptune Capricorn'da = fall (-4 olmali)
    const neptune = medChart.planets.find(p => p.name === 'Neptune');
    if (neptune.sign === 'Capricorn') {
      if (neptune.planetaryStrength.breakdown.fall !== -4) {
        console.error(`HATA: Neptune Capricorn'da fall -4 olmali, ${neptune.planetaryStrength.breakdown.fall} geldi!`);
        test23Valid = false;
      }
    }

    // Retrograde gezegenlerde retrograde -5 olmali
    const retroPlanets = medChart.planets.filter(p =>
      p.isRetrograde && p.planetaryStrength && !['True Node', 'South Node', 'Lilith'].includes(p.name)
    );
    for (const rp of retroPlanets) {
      if (rp.planetaryStrength.breakdown.retrograde !== -5) {
        console.error(`HATA: ${rp.name} retrograde -5 olmali!`);
        test23Valid = false;
        break;
      }
    }

    if (test23Valid) {
      console.log('BASARILI: Bilinen dignity/debility degerleri dogru');
      console.log(`  Saturn (${saturn.sign}): domicile=${saturn.planetaryStrength.breakdown.domicile || 'N/A'}, toplam=${saturn.planetaryStrength.totalScore}`);
      console.log(`  Jupiter (${jupiter.sign}): exaltation=${jupiter.planetaryStrength.breakdown.exaltation || 'N/A'}, toplam=${jupiter.planetaryStrength.totalScore}`);
      console.log(`  Mars (${mars.sign}): detriment=${mars.planetaryStrength.breakdown.detriment || 'N/A'}, toplam=${mars.planetaryStrength.totalScore}`);
      console.log(`  Retrograde gezegen sayisi: ${retroPlanets.length} (hepsinde -5)`);
    }
  } catch (e) {
    console.error('HATA:', e.message);
  }
}

// ========== FIXED STARS & DECLINATION TESTLERİ (24-28) ==========

// ========== TEST 24: Fixed Stars — kavuşum tespiti ==========
console.log('\nTEST 24: Fixed Stars — kavusum tespiti');
console.log('-'.repeat(50));

if (medChart) {
  try {
    const fixedStars = medChart.analysis.medicalAstrology.fixedStars;
    let test24Valid = true;

    if (!Array.isArray(fixedStars)) {
      console.error('HATA: fixedStars array degil!');
      test24Valid = false;
    }

    for (const fs of fixedStars) {
      if (!fs.star || !fs.planet || typeof fs.orb !== 'number') {
        console.error('HATA: fixedStar formati yanlis!');
        test24Valid = false;
        break;
      }
      if (!fs.severity || !fs.medicalEffect || !Array.isArray(fs.bodyArea)) {
        console.error(`HATA: ${fs.star}-${fs.planet} eksik alan!`);
        test24Valid = false;
        break;
      }
      if (typeof fs.starLongitude !== 'number' || fs.starLongitude < 0 || fs.starLongitude > 360) {
        console.error(`HATA: ${fs.star} longitude gecersiz: ${fs.starLongitude}`);
        test24Valid = false;
        break;
      }
    }

    if (test24Valid) {
      console.log(`BASARILI: ${fixedStars.length} fixed star kavusumu bulundu, format dogru`);
      fixedStars.forEach(fs => {
        console.log(`  ${fs.star.padEnd(18)} ${fs.starFormatted.padEnd(18)} <-> ${fs.planet.padEnd(10)} orb: ${fs.orb}° (${fs.severity})`);
      });
    }
  } catch (e) {
    console.error('HATA:', e.message);
  }
}

// ========== TEST 25: Declination — degerler ve format ==========
console.log('\nTEST 25: Declination — degerler ve format');
console.log('-'.repeat(50));

if (medChart) {
  try {
    const decs = medChart.analysis.medicalAstrology.declinations;
    let test25Valid = true;

    if (!Array.isArray(decs) || decs.length !== medChart.planets.length) {
      console.error(`HATA: declinations sayisi (${decs?.length}) != gezegen sayisi (${medChart.planets.length})`);
      test25Valid = false;
    }

    if (test25Valid) {
      for (const dec of decs) {
        if (!dec.name) {
          console.error('HATA: declination name eksik!');
          test25Valid = false;
          break;
        }
        if (dec.declination !== null && (typeof dec.declination !== 'number' || Math.abs(dec.declination) > 90)) {
          console.error(`HATA: ${dec.name} declination gecersiz: ${dec.declination}`);
          test25Valid = false;
          break;
        }
        if (typeof dec.isOutOfBounds !== 'boolean') {
          console.error(`HATA: ${dec.name} isOutOfBounds boolean degil!`);
          test25Valid = false;
          break;
        }
      }
    }

    if (test25Valid) {
      console.log(`BASARILI: ${decs.length} gezegen icin declination hesaplandi, format dogru`);
      // Ilk 5
      decs.slice(0, 5).forEach(d => {
        const oob = d.isOutOfBounds ? ' [OOB]' : '';
        console.log(`  ${d.name.padEnd(12)} dec: ${(d.declination >= 0 ? '+' : '') + d.declination}°${oob}`);
      });
    }
  } catch (e) {
    console.error('HATA:', e.message);
  }
}

// ========== TEST 26: Planet declination alanları ==========
console.log('\nTEST 26: Planet declination alanlari — her gezegene eklenmis mi');
console.log('-'.repeat(50));

if (medChart) {
  try {
    let test26Valid = true;

    for (const planet of medChart.planets) {
      if (typeof planet.declination !== 'number') {
        // South Node null olabilir
        if (planet.name === 'South Node' && planet.declination !== undefined) continue;
        if (planet.declination === null) continue;
        console.error(`HATA: ${planet.name} declination number degil: ${planet.declination}`);
        test26Valid = false;
        break;
      }
      if (typeof planet.isOutOfBounds !== 'boolean') {
        console.error(`HATA: ${planet.name} isOutOfBounds boolean degil!`);
        test26Valid = false;
        break;
      }
      // OOB gezegenlerde oobMedicalNote olmali
      if (planet.isOutOfBounds && !planet.oobMedicalNote) {
        console.error(`HATA: ${planet.name} OOB ama oobMedicalNote yok!`);
        test26Valid = false;
        break;
      }
    }

    if (test26Valid) {
      console.log('BASARILI: Tum gezegenlerde declination alanlari mevcut');
      const oobPlanets = medChart.planets.filter(p => p.isOutOfBounds);
      if (oobPlanets.length > 0) {
        console.log(`  OOB gezegenler: ${oobPlanets.map(p => p.name + ' (' + p.declination + '°)').join(', ')}`);
      } else {
        console.log('  OOB gezegen yok');
      }
    }
  } catch (e) {
    console.error('HATA:', e.message);
  }
}

// ========== TEST 27: Parallel aspektler ==========
console.log('\nTEST 27: Parallel aspektler — type, orb, effect');
console.log('-'.repeat(50));

if (medChart) {
  try {
    const parallels = medChart.analysis.medicalAstrology.parallelAspects;
    let test27Valid = true;

    if (!Array.isArray(parallels)) {
      console.error('HATA: parallelAspects array degil!');
      test27Valid = false;
    }

    if (test27Valid) {
      for (const pa of parallels) {
        if (!['parallel', 'contra_parallel'].includes(pa.type)) {
          console.error(`HATA: gecersiz parallel type: ${pa.type}`);
          test27Valid = false;
          break;
        }
        if (!['conjunction', 'opposition'].includes(pa.effect)) {
          console.error(`HATA: gecersiz effect: ${pa.effect}`);
          test27Valid = false;
          break;
        }
        if (typeof pa.orb !== 'number' || pa.orb < 0 || pa.orb > 1.0) {
          console.error(`HATA: ${pa.planet1}-${pa.planet2} orb gecersiz: ${pa.orb}`);
          test27Valid = false;
          break;
        }
        if (typeof pa.declination1 !== 'number' || typeof pa.declination2 !== 'number') {
          console.error(`HATA: ${pa.planet1}-${pa.planet2} declination number degil!`);
          test27Valid = false;
          break;
        }
      }
    }

    if (test27Valid) {
      const parCount = parallels.filter(p => p.type === 'parallel').length;
      const cparCount = parallels.filter(p => p.type === 'contra_parallel').length;
      console.log(`BASARILI: ${parallels.length} parallel aspekt (${parCount} parallel, ${cparCount} contra-parallel)`);
      // Ilk 5
      parallels.slice(0, 5).forEach(pa => {
        console.log(`  ${pa.planet1.padEnd(10)} ${pa.typeTr.padEnd(15)} ${pa.planet2.padEnd(10)} orb: ${pa.orb}° (${pa.effect})`);
      });
    }
  } catch (e) {
    console.error('HATA:', e.message);
  }
}

// ========== TEST 28: Declination OOB tutarlılığı ==========
console.log('\nTEST 28: Declination OOB tutarliligi — |dec| > 23.44 = OOB');
console.log('-'.repeat(50));

if (medChart) {
  try {
    const decs = medChart.analysis.medicalAstrology.declinations;
    let test28Valid = true;

    for (const dec of decs) {
      if (dec.declination === null) continue;
      const shouldBeOOB = Math.abs(dec.declination) > 23.44;
      if (dec.isOutOfBounds !== shouldBeOOB) {
        console.error(`HATA: ${dec.name} dec=${dec.declination}, OOB=${dec.isOutOfBounds}, beklenen=${shouldBeOOB}`);
        test28Valid = false;
        break;
      }
      if (dec.isOutOfBounds) {
        const expectedDir = dec.declination > 23.44 ? 'north' : 'south';
        if (dec.oobDirection !== expectedDir) {
          console.error(`HATA: ${dec.name} OOB direction=${dec.oobDirection}, beklenen=${expectedDir}`);
          test28Valid = false;
          break;
        }
      }
    }

    if (test28Valid) {
      console.log('BASARILI: OOB tutarliligi dogru (|dec| > 23.44° = OOB)');
    }
  } catch (e) {
    console.error('HATA:', e.message);
  }
}

// ========== TEST 29: Secondary Progressions — temel yapı ve doğrulama ==========
console.log('\nTEST 29: Secondary Progressions — age, progressed Moon, solar arc');
console.log('-'.repeat(50));

if (medChart) {
  try {
    const sp = medChart.analysis.medicalAstrology.secondaryProgressions;
    let test29Valid = true;

    if (!sp || typeof sp !== 'object') {
      console.error('HATA: secondaryProgressions objesi yok!');
      test29Valid = false;
    }

    if (test29Valid) {
      // Yaş kontrolü (1990 doğumlu, ~35 yaşında olmalı)
      if (typeof sp.ageInYears !== 'number' || sp.ageInYears < 34 || sp.ageInYears > 37) {
        console.error(`HATA: ageInYears beklenen aralıkta degil: ${sp.ageInYears}`);
        test29Valid = false;
      }

      // Solar arc kontrolü (yaklaşık yaş kadar derece ilerlemeli)
      if (typeof sp.solarArc !== 'number' || sp.solarArc < 30 || sp.solarArc > 40) {
        console.error(`HATA: solarArc beklenen aralikta degil: ${sp.solarArc}`);
        test29Valid = false;
      }

      // Progressed Moon kontrolü
      if (!sp.progressedMoon || typeof sp.progressedMoon.sign !== 'string') {
        console.error('HATA: progressedMoon.sign yok!');
        test29Valid = false;
      }
      if (!sp.progressedMoon.healthTheme || typeof sp.progressedMoon.healthTheme !== 'string') {
        console.error('HATA: progressedMoon.healthTheme yok!');
        test29Valid = false;
      }

      // Progressed planets kontrolü
      if (!Array.isArray(sp.planets) || sp.planets.length < 10) {
        console.error(`HATA: progressed planets eksik: ${sp.planets?.length}`);
        test29Valid = false;
      }
    }

    if (test29Valid) {
      console.log(`BASARILI: age=${sp.ageInYears.toFixed(1)}, solarArc=${sp.solarArc.toFixed(2)}°, progMoon=${sp.progressedMoon.sign}`);
      console.log(`  Progressed ASC: ${sp.ascendant.formatted}`);
      console.log(`  Progressed MC: ${sp.midheaven.formatted}`);
      console.log(`  Health theme: ${sp.progressedMoon.healthTheme}`);
    }
  } catch (e) {
    console.error('HATA:', e.message);
  }
}

// ========== TEST 30: Secondary Progressions — aspektler ==========
console.log('\nTEST 30: Progressed Aspects to Natal — format ve orb');
console.log('-'.repeat(50));

if (medChart) {
  try {
    const sp = medChart.analysis.medicalAstrology.secondaryProgressions;
    let test30Valid = true;

    if (!Array.isArray(sp.aspectsToNatal)) {
      console.error('HATA: aspectsToNatal array degil!');
      test30Valid = false;
    }

    if (test30Valid) {
      const validAspects = ['Conjunction', 'Opposition', 'Trine', 'Square', 'Sextile'];
      for (const a of sp.aspectsToNatal) {
        if (!validAspects.includes(a.aspect)) {
          console.error(`HATA: gecersiz aspekt tipi: ${a.aspect}`);
          test30Valid = false;
          break;
        }
        if (typeof a.orb !== 'number' || a.orb < 0 || a.orb > 1.0) {
          console.error(`HATA: ${a.progressed}-${a.natal} orb gecersiz: ${a.orb}`);
          test30Valid = false;
          break;
        }
        if (!a.progressed || !a.natal) {
          console.error('HATA: progressed veya natal alan eksik');
          test30Valid = false;
          break;
        }
      }
    }

    if (test30Valid) {
      console.log(`BASARILI: ${sp.aspectsToNatal.length} progressed aspekt bulundu`);
      sp.aspectsToNatal.slice(0, 5).forEach(a => {
        console.log(`  P.${a.progressed.padEnd(10)} ${a.aspect.padEnd(12)} N.${a.natal.padEnd(10)} orb: ${a.orb}°`);
      });
    }
  } catch (e) {
    console.error('HATA:', e.message);
  }
}

// ========== TEST 31: Solar Return — güneş hassasiyeti ve harita ==========
console.log('\nTEST 31: Solar Return — sun accuracy < 0.01° ve harita yapisi');
console.log('-'.repeat(50));

if (medChart) {
  try {
    const sr = medChart.analysis.medicalAstrology.solarReturn;
    let test31Valid = true;

    if (!sr || typeof sr !== 'object') {
      console.error('HATA: solarReturn objesi yok!');
      test31Valid = false;
    }

    if (test31Valid) {
      // Sun accuracy kontrolü
      if (sr.sunAccuracy > 0.01) {
        console.error(`HATA: sunAccuracy cok yuksek: ${sr.sunAccuracy}° (beklenen < 0.01°)`);
        test31Valid = false;
      }

      // Chart yapısı kontrolü
      if (!sr.chart || !Array.isArray(sr.chart.planets) || sr.chart.planets.length < 10) {
        console.error('HATA: SR chart.planets eksik!');
        test31Valid = false;
      }

      // ASC ve MC kontrolü
      if (!sr.chart.ascendant || typeof sr.chart.ascendant.longitude !== 'number') {
        console.error('HATA: SR ascendant eksik!');
        test31Valid = false;
      }
      if (!sr.chart.midheaven || typeof sr.chart.midheaven.longitude !== 'number') {
        console.error('HATA: SR midheaven eksik!');
        test31Valid = false;
      }

      // SR yılı kontrolü
      if (typeof sr.year !== 'number' || sr.year < 2025 || sr.year > 2027) {
        console.error(`HATA: SR year beklenmiyor: ${sr.year}`);
        test31Valid = false;
      }

      // Gezegen ev konumları kontrolü
      if (test31Valid) {
        for (const p of sr.chart.planets) {
          if (typeof p.house !== 'number' || p.house < 1 || p.house > 12) {
            console.error(`HATA: SR ${p.name} house gecersiz: ${p.house}`);
            test31Valid = false;
            break;
          }
        }
      }
    }

    if (test31Valid) {
      const natalSunLon = medChart.planets.find(p => p.name === 'Sun').longitude;
      const srSunLon = sr.chart.planets.find(p => p.name === 'Sun').longitude;
      console.log(`BASARILI: SR ${sr.year}, sunAccuracy=${sr.sunAccuracy}°`);
      console.log(`  Natal Sun: ${natalSunLon.toFixed(4)}° | SR Sun: ${srSunLon.toFixed(4)}°`);
      console.log(`  SR ASC: ${sr.chart.ascendant.formatted} | SR MC: ${sr.chart.midheaven.formatted}`);
      console.log(`  Tarih: ${sr.exactDatetime}`);
    }
  } catch (e) {
    console.error('HATA:', e.message);
  }
}

// ========== TEST 32: Solar Return — sağlık analizi ==========
console.log('\nTEST 32: Solar Return Health Analysis — yapı ve alanlar');
console.log('-'.repeat(50));

if (medChart) {
  try {
    const sr = medChart.analysis.medicalAstrology.solarReturn;
    let test32Valid = true;

    if (!sr.healthAnalysis || typeof sr.healthAnalysis !== 'object') {
      console.error('HATA: healthAnalysis objesi yok!');
      test32Valid = false;
    }

    if (test32Valid) {
      const ha = sr.healthAnalysis;

      // yearTheme kontrolü
      if (!ha.yearTheme || !ha.yearTheme.lord || !ha.yearTheme.sign) {
        console.error('HATA: yearTheme.lord veya sign eksik!');
        test32Valid = false;
      }

      // yearlyConstitution kontrolü
      if (!ha.yearlyConstitution || !ha.yearlyConstitution.sign || !Array.isArray(ha.yearlyConstitution.bodyFocus)) {
        console.error('HATA: yearlyConstitution eksik!');
        test32Valid = false;
      }

      // riskLevel kontrolü (0-10)
      if (typeof ha.riskLevel !== 'number' || ha.riskLevel < 0 || ha.riskLevel > 10) {
        console.error(`HATA: riskLevel gecersiz: ${ha.riskLevel}`);
        test32Valid = false;
      }

      // warnings ve protectiveFactors array kontrolü
      if (!Array.isArray(ha.warnings) || !Array.isArray(ha.protectiveFactors)) {
        console.error('HATA: warnings/protectiveFactors array degil!');
        test32Valid = false;
      }
    }

    if (test32Valid) {
      const ha = sr.healthAnalysis;
      console.log(`BASARILI: SR Health Analysis tamamlandi`);
      console.log(`  Year theme: ${ha.yearTheme.lord} in ${ha.yearTheme.sign} (house ${ha.yearTheme.house})`);
      console.log(`  Constitution: ${ha.yearlyConstitution.sign}, bodyFocus: ${ha.yearlyConstitution.bodyFocus.join(', ')}`);
      console.log(`  Risk level: ${ha.riskLevel}/10`);
      if (ha.warnings.length > 0) console.log(`  Warnings: ${ha.warnings.join('; ')}`);
      if (ha.protectiveFactors.length > 0) console.log(`  Protective: ${ha.protectiveFactors.join('; ')}`);
    }
  } catch (e) {
    console.error('HATA:', e.message);
  }
}

// ========== TEST 33: Medical Midpoints — katalog ve yapı ==========
console.log('\nTEST 33: Medical Midpoints — katalog, Mars/Saturn, sign/degree');
console.log('-'.repeat(50));

if (medChart) {
  try {
    const mp = medChart.analysis.medicalAstrology.midpoints;
    let test33Valid = true;

    if (!mp || typeof mp !== 'object') {
      console.error('HATA: midpoints objesi yok!');
      test33Valid = false;
    }

    if (test33Valid) {
      // Medical midpoints array kontrolü
      if (!Array.isArray(mp.medical) || mp.medical.length < 10) {
        console.error(`HATA: medical midpoints eksik: ${mp.medical?.length}`);
        test33Valid = false;
      }

      // Mars/Saturn midpoint kontrolü (critical priority)
      if (!mp.marsSaturnMidpoint) {
        console.error('HATA: marsSaturnMidpoint yok!');
        test33Valid = false;
      } else if (mp.marsSaturnMidpoint.pair !== 'Mars/Saturn') {
        console.error(`HATA: marsSaturnMidpoint pair yanlis: ${mp.marsSaturnMidpoint.pair}`);
        test33Valid = false;
      }

      // Her midpoint'in gerekli alanları
      if (test33Valid) {
        for (const m of mp.medical) {
          if (!m.pair || typeof m.midpoint !== 'number' || !m.sign || typeof m.degree !== 'number') {
            console.error(`HATA: midpoint alanlari eksik: ${m.pair}`);
            test33Valid = false;
            break;
          }
          if (m.midpoint < 0 || m.midpoint >= 360) {
            console.error(`HATA: midpoint longitude gecersiz: ${m.midpoint}`);
            test33Valid = false;
            break;
          }
          if (!m.meaning || !m.medical) {
            console.error(`HATA: ${m.pair} meaning/medical eksik!`);
            test33Valid = false;
            break;
          }
        }
      }
    }

    if (test33Valid) {
      console.log(`BASARILI: ${mp.medical.length} tibbi midpoint hesaplandi`);
      console.log(`  Mars/Saturn: ${mp.marsSaturnMidpoint.formatted} (${mp.marsSaturnMidpoint.priority})`);
      mp.medical.slice(0, 3).forEach(m => {
        console.log(`  ${m.pair.padEnd(20)} ${m.formatted.padEnd(18)} ${m.priority}`);
      });
    }
  } catch (e) {
    console.error('HATA:', e.message);
  }
}

// ========== TEST 34: Midpoint Natal Contacts — 90° dial ==========
console.log('\nTEST 34: Midpoint Natal Contacts — 90° dial, orb, contact type');
console.log('-'.repeat(50));

if (medChart) {
  try {
    const mp = medChart.analysis.medicalAstrology.midpoints;
    let test34Valid = true;

    if (!Array.isArray(mp.natalContacts)) {
      console.error('HATA: natalContacts array degil!');
      test34Valid = false;
    }

    if (test34Valid) {
      const validContactTypes = ['direct', 'opposition', 'square'];
      for (const c of mp.natalContacts) {
        if (!validContactTypes.includes(c.contactType)) {
          console.error(`HATA: gecersiz contactType: ${c.contactType}`);
          test34Valid = false;
          break;
        }
        if (typeof c.orb !== 'number' || c.orb < 0 || c.orb > 1.5) {
          console.error(`HATA: ${c.midpoint}-${c.planet} orb gecersiz: ${c.orb}`);
          test34Valid = false;
          break;
        }
        if (!c.midpoint || !c.planet || !c.planetTr) {
          console.error('HATA: contact alanlari eksik!');
          test34Valid = false;
          break;
        }
        if (!c.medical || !c.priority) {
          console.error('HATA: contact medical/priority eksik!');
          test34Valid = false;
          break;
        }
      }
    }

    if (test34Valid) {
      console.log(`BASARILI: ${mp.natalContacts.length} natal contact bulundu (90° dial)`);
      mp.natalContacts.slice(0, 5).forEach(c => {
        console.log(`  ${c.midpoint.padEnd(20)} ${c.contactType.padEnd(12)} ${c.planet.padEnd(10)} orb: ${c.orb}°`);
      });
    }
  } catch (e) {
    console.error('HATA:', e.message);
  }
}

// ========== TEST 35: calcMidpoint wrap-around doğrulaması ==========
console.log('\nTEST 35: calcMidpoint wrap-around — (350°, 10°) ≈ 0°');
console.log('-'.repeat(50));

if (medChart) {
  try {
    // Midpoints objesinden wrap-around mantığını dolaylı test et
    // Tüm midpoint'ler 0-360 arasında olmalı
    const mp = medChart.analysis.medicalAstrology.midpoints;
    let test35Valid = true;

    for (const m of mp.medical) {
      if (m.midpoint < 0 || m.midpoint >= 360) {
        console.error(`HATA: ${m.pair} midpoint aralık dışı: ${m.midpoint}`);
        test35Valid = false;
        break;
      }
      if (m.oppositeMidpoint < 0 || m.oppositeMidpoint >= 360) {
        console.error(`HATA: ${m.pair} oppositeMidpoint aralık dışı: ${m.oppositeMidpoint}`);
        test35Valid = false;
        break;
      }
      // Opposite midpoint = midpoint + 180 (mod 360) kontrolü
      const expectedOpp = (m.midpoint + 180) % 360;
      const oppDiff = Math.abs(m.oppositeMidpoint - expectedOpp);
      if (oppDiff > 0.001) {
        console.error(`HATA: ${m.pair} opposite midpoint tutarsız: ${m.oppositeMidpoint} vs beklenen ${expectedOpp}`);
        test35Valid = false;
        break;
      }
    }

    // Mars/Saturn priority kontrolü
    if (test35Valid && mp.marsSaturnMidpoint) {
      if (mp.marsSaturnMidpoint.priority !== 'critical') {
        console.error(`HATA: Mars/Saturn priority 'critical' olmali, bulundu: ${mp.marsSaturnMidpoint.priority}`);
        test35Valid = false;
      }
    }

    if (test35Valid) {
      console.log('BASARILI: Tum midpoint degerler 0-360 araliginda, opposite = midpoint + 180°');
      console.log(`  Mars/Saturn priority: ${mp.marsSaturnMidpoint.priority}`);
    }
  } catch (e) {
    console.error('HATA:', e.message);
  }
}

console.log('\n' + '='.repeat(70));
console.log('Testler tamamlandi. Sonuclari astro.com ile karsilastirmayi unutma!');
console.log('='.repeat(70));
