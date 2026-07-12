// src/agent/tools.js
// Tool declarations (Gemini functionDeclarations format) + in-process executors.
// People are referenced by personId (resolved from the request's people[] roster)
// so the model never re-types birth data — eliminating a whole hallucination class.

import { calculateNatalChart } from '../calculator.js';
import { calculateSynastry } from '../synastry.js';
import { calculateTransits } from '../transit.js';
import { calculateTransitHits } from '../transit-hits.js';
import { calculateElectionScan } from '../election-scan.js';
import {
  calculateArabicParts,
  findStarConjunctions,
  calculateFirdaria,
  calculateProfections,
} from 'calestia-pro';
import {
  compactChart, compactEnrichment, compactTransitHits,
  compactTransitScan, compactSynastry,
} from './compact.js';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const TOOL_DECLARATIONS = [
  {
    name: 'get_natal_profile',
    description: 'Bir kişinin doğum haritası özeti: gezegenler (burç/ev/dignity), yükselen/MC, '
      + 'element-modalite dengesi, Arap noktaları, sabit yıldızlar, ve verilen tarih için '
      + 'profeksiyon (yıl lordu) + firdaria (dönem lordu). Karakter ve "hayat saati" soruları için temel araç.',
    parameters: {
      type: 'OBJECT',
      properties: {
        personId: { type: 'STRING', description: 'people[] listesindeki kişi id\'si' },
        targetDate: { type: 'STRING', description: 'Profeksiyon/firdaria için tarih, YYYY-MM-DD. Genellikle sorunun geçtiği tarih veya bugün.' },
      },
      required: ['personId'],
    },
  },
  {
    name: 'get_transit_hits',
    description: 'Belirli bir gün/saatte gökyüzü gezegenlerinin kişinin natal noktalarına yaptığı '
      + 'TÜM açılar (orb sıralı, retro ve applying işaretli) + o anki Ay durumu (boşlukta/VoC mi). '
      + '"Bu gün nasıl / bu tarih uygun mu" soruları için temel araç.',
    parameters: {
      type: 'OBJECT',
      properties: {
        personId: { type: 'STRING' },
        date: { type: 'STRING', description: 'YYYY-MM-DD' },
        time: { type: 'STRING', description: 'HH:mm (yerel, kişinin zaman dilimi). Verilmezse 12:00.' },
      },
      required: ['personId', 'date'],
    },
  },
  {
    name: 'scan_transit_period',
    description: 'Bir tarih aralığındaki önemli transitleri tarar: en güçlü transit temaları, '
      + 'burç geçişleri (ingress) ve retro gezegenler. "Önümüzdeki ay/dönem nasıl" soruları için.',
    parameters: {
      type: 'OBJECT',
      properties: {
        personId: { type: 'STRING' },
        startDate: { type: 'STRING', description: 'YYYY-MM-DD' },
        days: { type: 'NUMBER', description: 'Tarama süresi gün (1-92)' },
      },
      required: ['personId', 'startDate', 'days'],
    },
  },
  {
    name: 'scan_best_days',
    description: 'Bir tarih aralığında (1-31 gün; TAM AY tek çağrıda taranabilir) belirli bir amaç için EN UYGUN gün ve saat '
      + 'pencerelerini skorlar: gün sıralaması, her günün en iyi 3 penceresi (gerekçeli), '
      + 'VoC ve Merkür retro uyarıları. "Hangi gün daha iyi / ne zaman yapayım" soruları için '
      + 'TEK çağrı yeterlidir — günleri ayrı ayrı hesaplama.',
    parameters: {
      type: 'OBJECT',
      properties: {
        personId: { type: 'STRING' },
        startDate: { type: 'STRING', description: 'YYYY-MM-DD' },
        days: { type: 'NUMBER', description: 'Taranacak gün sayısı (1-31). Verilmezse 30 gün taranır; kullanıcı belirli bir aralık söylemediyse boş bırak.' },
        purpose: { type: 'STRING', description: 'is-gorusmesi | nikah | imza | seyahat | tasinma | lansman | saglik-randevusu | teklif | genel' },
        weekendsOnly: { type: 'BOOLEAN', description: 'Kullanıcı hafta sonu/tatil günü istiyorsa true: yalnız Cumartesi+Pazar taranır' },
      },
      required: ['personId', 'startDate'],
    },
  },
  {
    name: 'suggest_add_person',
    description: 'SESSİZ SİNYAL ARACI (kullanıcıya görünmez): Kullanıcı, kayıtlı OLMAYAN bir kişi '
      + 'hakkında analiz istediğinde ve sen kişinin Kişilerim\'e eklenmesini önerdiğinde bu aracı '
      + 'da çağır — sitede "Kişi ekle" kısayolu belirir ve verdiğin bilgilerle form önceden dolar. '
      + 'Kullanıcının mesajında geçen bilgileri aynen aktar; bilinmeyeni boş bırak, UYDURMA.',
    parameters: {
      type: 'OBJECT',
      properties: {
        name: { type: 'STRING', description: 'Kişinin adı (mesajda geçtiği haliyle)' },
        date: { type: 'STRING', description: 'Doğum tarihi YYYY-MM-DD (mesajda varsa; "02.01.1998" -> "1998-01-02")' },
        time: { type: 'STRING', description: 'Doğum saati HH:mm (mesajda varsa)' },
        city: { type: 'STRING', description: 'Doğum şehri (mesajda varsa, metin olarak)' },
      },
      required: ['name'],
    },
  },
  {
    name: 'suggest_followups',
    description: 'SESSİZ SİNYAL ARACI (kullanıcıya görünmez): Astrolojik analiz içeren her '
      + 'cevabından hemen ÖNCE çağır — kullanıcının doğal olarak soracağı 2-3 KISA takip '
      + 'sorusunu ilet (kullanıcının dilinde, her biri ≤60 karakter, cevabın içeriğine özgü). '
      + 'Selamlaşma/red/kısa bilgi cevaplarında çağırma.',
    parameters: {
      type: 'OBJECT',
      properties: {
        questions: { type: 'ARRAY', items: { type: 'STRING' }, description: '2-3 kısa takip sorusu' },
      },
      required: ['questions'],
    },
  },
  {
    name: 'get_synastry',
    description: 'İki kişi arasındaki ilişki analizi: uyum skoru, kilit çapraz açılar, kompozit '
      + 've Davison ilişki haritası özetleri. Uyum/ilişki soruları için.',
    parameters: {
      type: 'OBJECT',
      properties: {
        personId1: { type: 'STRING' },
        personId2: { type: 'STRING' },
      },
      required: ['personId1', 'personId2'],
    },
  },
];

function resolvePerson(peopleMap, personId) {
  const p = peopleMap.get(personId);
  if (!p) {
    throw new Error(`Bilinmeyen personId: "${personId}". Mevcut kişiler: ${[...peopleMap.keys()].join(', ')}`);
  }
  return p;
}

function chartParams(person, houseSystem = 'P') {
  return {
    year: person.year, month: person.month, day: person.day,
    hour: person.hour, minute: person.minute,
    latitude: person.latitude, longitude: person.longitude,
    timezone: person.timezone, houseSystem,
  };
}

const EXECUTORS = {
  get_natal_profile({ args, peopleMap, today }) {
    const person = resolvePerson(peopleMap, args.personId);
    const targetDate = args.targetDate && DATE_RE.test(args.targetDate) ? args.targetDate : today;
    const chart = calculateNatalChart(chartParams(person));
    const arabicParts = calculateArabicParts(chart);
    const fixedStars = findStarConjunctions(chart);
    const firdaria = calculateFirdaria({
      year: person.year, month: person.month, day: person.day,
      isDayChart: chart.analysis?.isDayChart ?? true,
      targetDate,
    });
    const profections = calculateProfections(chart, targetDate);
    return {
      person: person.label,
      targetDate,
      polarHousesUnstable: Math.abs(person.latitude) > 66.5,
      chart: compactChart(chart),
      ...compactEnrichment({ arabicParts, fixedStars, firdaria, profections }),
    };
  },

  get_transit_hits({ args, peopleMap }) {
    const person = resolvePerson(peopleMap, args.personId);
    if (!DATE_RE.test(String(args.date))) throw new Error('date formatı YYYY-MM-DD olmalı');
    const result = calculateTransitHits({
      ...chartParams(person),
      date: args.date,
      time: args.time && /^\d{2}:\d{2}$/.test(args.time) ? args.time : undefined,
    });
    return { person: person.label, ...compactTransitHits(result) };
  },

  scan_transit_period({ args, peopleMap }) {
    const person = resolvePerson(peopleMap, args.personId);
    if (!DATE_RE.test(String(args.startDate))) throw new Error('startDate formatı YYYY-MM-DD olmalı');
    const days = Math.max(1, Math.min(92, Math.round(Number(args.days) || 30)));
    const result = calculateTransits(chartParams(person), { days, startDate: args.startDate, topN: 15 });
    return { person: person.label, startDate: args.startDate, ...compactTransitScan(result) };
  },

  scan_best_days({ args, peopleMap }) {
    const person = resolvePerson(peopleMap, args.personId);
    if (!DATE_RE.test(String(args.startDate))) throw new Error('startDate formatı YYYY-MM-DD olmalı');
    const r = calculateElectionScan({
      ...chartParams(person),
      startDate: args.startDate,
      days: args.days,
      purpose: ['is-gorusmesi', 'nikah', 'imza', 'seyahat', 'tasinma', 'lansman', 'saglik-randevusu', 'teklif', 'genel'].includes(args.purpose) ? args.purpose : 'genel',
      weekendsOnly: args.weekendsOnly === true,
    });
    // Kompakt görünüm: sıralama + gün başına en iyi pencere + uyarılar
    return {
      person: person.label,
      purpose: r.purpose,
      scanned: { days: r.days, windowsPerDay: r.meta.windowsPerDay, totalWindows: r.meta.totalWindowsScanned },
      SUNUM_TALIMATI: `1) Bu konuşmada tarama kapsamını daha önce anlatmadıysan İLK cümlende belirt ve TARİH ARALIĞINI YILIYLA söyle (örnek: "${r.startDate} ile başlayan ${r.days} günü (${r.meta.windowsPerDay} zaman dilimi, toplam ${r.meta.totalWindowsScanned} pencere) AstroAk motoruyla tek tek taradım."); zaten anlattıysan tekrarlamadan doğrudan cevaba geç. 2) DERİNLİK ZORUNLU: önerdiğin EN İYİ gün için get_transit_hits çağır ve o günün 2-3 GERÇEK açısını orb dereceleriyle ver; kişinin yıl lordu/firdaria bağlamını bir cümleyle öneriye bağla (bilmiyorsan get_natal_profile çağır). Sadece saat+gezegen saati söylemek YETERSİZDİR. 3) Skorları '8/10' gibi ölçekleme; göreli anlat. Em dash (—) kullanma.`,
      ranking: r.ranking.map((x) => ({
        date: x.date, day: x.dayOfWeek, avgScore: x.avgScore,
        bestTime: x.topWindow?.time, bestScore: x.topWindow?.score,
        keyFactors: x.topWindow?.factors?.slice(0, 3),
      })),
      recommendation: r.recommendation,
      warnings: {
        mercuryRetroDays: r.dailyResults.filter((d) => d.mercuryRetro).map((d) => d.date),
        vocInfo: 'Ay-boşluğu cezaları pencere skorlarına dahil edilmiştir',
      },
    };
  },

  suggest_followups({ args }) {
    return { ok: true };
  },

  suggest_add_person({ args }) {
    // Yürütme yok: sinyal orkestratörde yakalanıp done.action olarak siteye gider.
    return { ok: true };
  },

  get_synastry({ args, peopleMap }) {
    const p1 = resolvePerson(peopleMap, args.personId1);
    const p2 = resolvePerson(peopleMap, args.personId2);
    const result = calculateSynastry(chartParams(p1), chartParams(p2));
    return { person1: p1.label, person2: p2.label, ...compactSynastry(result) };
  },
};

/**
 * Execute a tool call safely. Errors are returned as data (not thrown) so the
 * model can recover — a failed tool must never kill the agent turn.
 */
export function executeTool({ name, args }, context) {
  const executor = EXECUTORS[name];
  if (!executor) return { error: `Bilinmeyen araç: ${name}` };
  try {
    return executor({ args: args || {}, ...context });
  } catch (err) {
    return { error: err.message };
  }
}
