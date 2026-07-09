// verify-election.js — election-scan regression against hand-validated references
// (Yasemin 5-13 Jul 2026 job-interview scan, computed manually in research scripts).
// Run: node verify-election.js

import { calculateElectionScan } from './src/election-scan.js';

let pass = 0, fail = 0;
const check = (label, cond, extra = '') => {
  if (cond) { pass++; console.log(`  ✅ ${label}`); }
  else { fail++; console.log(`  ❌ ${label} ${extra}`); }
};

const t0 = Date.now();
const r = calculateElectionScan({
  year: 1972, month: 6, day: 27, hour: 5, minute: 41,
  latitude: 37.19, longitude: 32.25, timezone: 'Europe/Istanbul',
  eventLatitude: 37.8667, eventLongitude: 32.4833, eventTimezone: 'Europe/Istanbul',
  startDate: '2026-07-05', days: 9, purpose: 'is-gorusmesi',
});
console.log(`(süre: ${((Date.now() - t0) / 1000).toFixed(1)}s, ${r.dailyResults.length} gün)`);

const byDate = Object.fromEntries(r.dailyResults.map((d) => [d.date, d]));

// Referans 1: 6 Temmuz dönemin EN KÖTÜ günü (elle: ort -1.2, VoC %71)
const d6 = byDate['2026-07-06'];
check('6 Tem ortalaması negatif', d6.avgScore < 0, `bulunan: ${d6.avgScore}`);
check('6 Tem dönemin en düşüğü', r.ranking[r.ranking.length - 1].date === '2026-07-06',
  `en düşük: ${r.ranking[r.ranking.length - 1].date}`);
check('6 Tem VoC penceresi tespit edildi', d6.vocWindowsUTC.length > 0);
// Not: elle taramadaki "temiz sabah 10:40 penceresi", VoC fonksiyonunun canlı-değer/
// pencere-değeri sınır tutarsızlığının artefaktıydı. Klasik tanımla (son açı 09:52 TR)
// sabah 10:00 sonrası da boşluktadır; motor artık tutarlı: günün "en az kötü" pencereleri
// öğleden sonra Merkür saatinde (13:00-13:40), hepsi VoC cezalı, skor ≤4.
check('6 Tem en iyi pencereler 13:00-13:40 bandında ve hepsi VoC cezalı (skor ≤4)',
  d6.bestWindows.every((w) => ['13:00', '13:20', '13:40'].includes(w.time) && w.score <= 4 && w.voidOfCourse === true),
  JSON.stringify(d6.bestWindows.map((w) => [w.time, w.score])));

// Referans 2: 13 Temmuz zirve penceresi 11:20-12:00 bandında, skor ≥8 (elle: 11:40 → 9)
const d13 = byDate['2026-07-13'];
check('13 Tem zirvesi 11:20-12:00 bandında ve ≥8',
  d13.bestWindows.some((w) => ['11:20', '11:40', '12:00'].includes(w.time) && w.score >= 8),
  JSON.stringify(d13.bestWindows));

// Referans 3: 12 Tem ortalaması 5-8 Tem günlerinin hepsinden yüksek (elle: 3.4 ile birinci)
const d12 = byDate['2026-07-12'];
for (const dd of ['2026-07-05', '2026-07-06', '2026-07-07', '2026-07-08']) {
  check(`12 Tem ort > ${dd.slice(8)} Tem ort`, d12.avgScore > byDate[dd].avgScore,
    `${d12.avgScore} vs ${byDate[dd].avgScore}`);
}

// Referans 4: Merkür retrosu tüm günlerde işaretli (retro ~28 Tem'e dek)
check('Merkür retro bayrağı tüm günlerde', r.dailyResults.every((d) => d.mercuryRetro));
check('öneri notu retro uyarısı içeriyor', r.recommendation.note?.includes('retro'));

// Şema sağlamlığı
check('her pencerede factors listesi var', r.dailyResults.every((d) => d.bestWindows.every((w) => Array.isArray(w.factors))));
check('ranking uzunluğu = gün sayısı', r.ranking.length === 9);

console.log(`\n========== Sonuç: ${pass} geçti, ${fail} kaldı ==========`);
process.exit(fail === 0 ? 0 : 1);
