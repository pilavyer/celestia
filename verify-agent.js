// verify-agent.js — Agent loop verification with a scripted mock provider.
// Tests the full orchestrator + real tool executors WITHOUT needing GEMINI_API_KEY.
// Run: node verify-agent.js

import { runAgentTurn, DOCTRINE } from './src/agent/orchestrator.js';
import { executeTool, TOOL_DECLARATIONS } from './src/agent/tools.js';

let pass = 0, fail = 0;
const check = (label, cond, extra = '') => {
  if (cond) { pass++; console.log(`  ✅ ${label}`); }
  else { fail++; console.log(`  ❌ ${label} ${extra}`); }
};

const PEOPLE = [
  { id: 'yasemin', label: 'Yasemin (anne)', year: 1972, month: 6, day: 27, hour: 5, minute: 41, latitude: 37.19, longitude: 32.25, timezone: 'Europe/Istanbul' },
  { id: 'rasit', label: 'Raşit', year: 1998, month: 11, day: 25, hour: 10, minute: 22, latitude: 41.2867, longitude: 36.33, timezone: 'Europe/Istanbul' },
];
const peopleMap = new Map(PEOPLE.map((p) => [p.id, p]));

console.log('— 1) Doktrin ve araç tanımları —');
check('doktrin yüklendi', DOCTRINE.includes('MUTLAK KURAL'));
check('6 araç tanımlı', TOOL_DECLARATIONS.length === 6);
check('şema formatı Gemini uyumlu (OBJECT)', TOOL_DECLARATIONS.every((t) => t.parameters.type === 'OBJECT'));

console.log('— 2) Araç yürütücüleri (gerçek hesap, bilinen değerler) —');
const natal = executeTool({ name: 'get_natal_profile', args: { personId: 'yasemin', targetDate: '2026-07-06' } }, { peopleMap, today: '2026-07-06' });
check('natal: Güneş Yengeç', natal.chart?.planets?.find((p) => p.name === 'Sun')?.sign === 'Cancer', JSON.stringify(natal.chart?.planets?.[0]));
check('natal: profeksiyon Ev 7 / Satürn', natal.profection?.annualHouse === 7 && natal.profection?.yearLord === 'Saturn', JSON.stringify(natal.profection));
check('natal: firdaria Jüpiter/Mars', natal.firdaria?.major === 'Jupiter' && natal.firdaria?.sub === 'Mars', JSON.stringify(natal.firdaria));

const hits = executeTool({ name: 'get_transit_hits', args: { personId: 'yasemin', date: '2026-07-06', time: '12:00' } }, { peopleMap, today: '2026-07-06' });
check('transit-hits: VoC true', hits.moon?.voidOfCourse === true, JSON.stringify(hits.moon));
check('transit-hits: Satürn☍Uranüs exact listede', hits.hits?.some((h) => h.transiting.startsWith('Saturn') && h.natalPoint === 'Uranus' && h.orb < 0.3));

const scan = executeTool({ name: 'scan_transit_period', args: { personId: 'rasit', startDate: '2026-07-08', days: 7 } }, { peopleMap, today: '2026-07-08' });
check('scan: önemli transit listesi dolu', Array.isArray(scan.importantTransits) && scan.importantTransits.length > 0);

const syn = executeTool({ name: 'get_synastry', args: { personId1: 'yasemin', personId2: 'rasit' } }, { peopleMap, today: '2026-07-06' });
check('synastry: skor + çapraz açılar', typeof syn.score?.score === 'number' && syn.keyCrossAspects?.length > 0);

const bad = executeTool({ name: 'get_transit_hits', args: { personId: 'bilinmeyen', date: '2026-07-06' } }, { peopleMap, today: '2026-07-06' });
check('hata yolu: bilinmeyen kişi fırlatmıyor, error objesi dönüyor', typeof bad.error === 'string');

console.log('— 3) Orkestratör döngüsü (mock provider) —');
function mockProvider(script) {
  let step = 0;
  return {
    createChat({ system }) {
      check('sistem promptu doktrin + kişi listesi içeriyor',
        system.includes('MUTLAK KURAL') && system.includes('id:"yasemin"'));
      return {
        async send(parts) {
          const s = script[step++];
          if (s.expectFunctionResponse) {
            const fr = parts.find((p) => p.functionResponse);
            check(`adım ${step}: functionResponse geldi (${s.expectFunctionResponse})`,
              fr?.functionResponse?.name === s.expectFunctionResponse,
              JSON.stringify(parts).slice(0, 120));
            if (s.assertResult) s.assertResult(fr.functionResponse.response.result);
          }
          return { functionCalls: s.functionCalls || [], text: s.text || '', usage: { promptTokenCount: 100, candidatesTokenCount: 50 } };
        },
      };
    },
  };
}

const events = [];
const result = await runAgentTurn({
  provider: mockProvider([
    { functionCalls: [{ name: 'get_transit_hits', args: { personId: 'yasemin', date: '2026-07-06' } }] },
    { expectFunctionResponse: 'get_transit_hits',
      assertResult: (r) => check('araç sonucu modele kompakt döndü', r.moon?.voidOfCourse === true && r.hits?.length <= 20),
      text: 'YORUM: 6 Temmuz öğleden sonra Ay boşlukta...' },
  ]),
  request: { message: '6 Temmuz annem için nasıl?', people: PEOPLE, locale: 'tr' },
  emit: (e, d) => events.push([e, d]),
});
check('final metin döndü', result.text.startsWith('YORUM'));
check('toolCallCount = 1', result.toolCallCount === 1);
check('status olayı yayınlandı', events.some(([e, d]) => e === 'status' && d.tool === 'get_transit_hits'));
check('usage toplandı', result.usage.inputTokens === 200 && result.usage.outputTokens === 100);

console.log('— 4) Araç bütçesi taşması —');
const loopy = await runAgentTurn({
  provider: mockProvider([
    { functionCalls: [{ name: 'get_transit_hits', args: { personId: 'yasemin', date: '2026-07-06' } }] },
    { functionCalls: [{ name: 'get_transit_hits', args: { personId: 'yasemin', date: '2026-07-07' } }] },
    // 2. araç isteği bütçeyi aşar -> orkestratör functionResponse DEĞİL,
    // "[SISTEM] bütçe doldu" metni göndermeli (tasarım gereği):
    { text: 'Bütçe dolunca eldeki veriyle cevap.' },
  ]),
  request: { message: 'test', people: PEOPLE, locale: 'tr' },
  emit: () => {},
  maxToolCalls: 1,
});
check('bütçe aşımında zarif kapanış', loopy.text.includes('Bütçe') && loopy.toolCallCount === 1);

console.log(`\n========== Sonuç: ${pass} geçti, ${fail} kaldı ==========`);
process.exit(fail === 0 ? 0 : 1);
