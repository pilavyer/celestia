// test.js
import { calculateNatalChart } from './src/calculator.js';

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

} catch (e) {
  console.error('HATA:', e.message);
}

console.log('\n' + '='.repeat(70));
console.log('Testler tamamlandi. Sonuclari astro.com ile karsilastirmayi unutma!');
console.log('='.repeat(70));
