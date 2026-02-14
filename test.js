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

console.log('\n' + '='.repeat(70));
console.log('Testler tamamlandi. Sonuclari astro.com ile karsilastirmayi unutma!');
console.log('='.repeat(70));
