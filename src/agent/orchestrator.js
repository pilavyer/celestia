// src/agent/orchestrator.js
// Provider-agnostic agent loop: model → tool calls → model → ... → final text.
// The provider is injected (Gemini in production, a scripted mock in tests).

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { TOOL_DECLARATIONS, executeTool } from './tools.js';
import { agentStrings } from './i18n.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DOCTRINE = readFileSync(path.join(__dirname, 'doctrine.md'), 'utf8');

/**
 * Run one agent turn.
 *
 * @param {object} opts
 * @param {object} opts.provider - { createChat({system, declarations, history}) => { send(parts) => {functionCalls, text, usage} } }
 * @param {object} opts.request  - { message, people[], history[], locale }
 * @param {function} opts.emit   - (event, data) => void  (SSE bridge)
 * @param {number} [opts.maxToolCalls=8]
 * @returns {{ text, toolCallCount, toolTrace, usage }}
 */
export async function runAgentTurn({ provider, request, emit, maxToolCalls = 8 }) {
  const { message, people = [], history = [], locale = 'tr' } = request;
  const S = agentStrings(locale);

  const peopleMap = new Map(people.map((p) => [p.id, p]));
  const today = new Date().toISOString().slice(0, 10);

  const roster = people.map((p) => {
    const selfMark = p.isSelf || /kendim/i.test(p.label) ? ' ← KULLANICININ KENDİSİ' : '';
    return `- id:"${p.id}" → ${p.label}${selfMark}`;
  }).join('\n') || '(kişi verilmedi)';
  const contextHeader = [
    `Bugünün tarihi: ${today}`,
    `Yanıt dili: ${locale}`,
    `Kayıtlı kişiler (araçlarda personId olarak bu id'leri kullan):`,
    roster,
  ].join('\n');

  const chat = provider.createChat({
    system: `${DOCTRINE}\n\n---\n${contextHeader}`,
    declarations: TOOL_DECLARATIONS,
    history,
  });

  emit('status', { stage: 'start', message: S.start });

  let streamedChars = 0;
  const onChunk = (piece) => {
    // Yalnızca araçsız (nihai cevap) turlarının metni canlı akar;
    // araç-çağrılı turların metni provider tarafında zaten akıtılmaz.
    streamedChars += piece.length;
    emit('delta', { text: piece });
  };

  let response = await chat.send([{ text: message }], onChunk);
  let toolCallCount = 0;
  const toolTrace = [];
  const visuals = {};
  let action;
  let suggestions;
  const HARMONIOUS = new Set(['Trine', 'Sextile']);
  const CHALLENGING = new Set(['Square', 'Opposition', 'Quincunx']);
  const usage = { inputTokens: 0, outputTokens: 0 };
  const addUsage = (u) => {
    if (!u) return;
    usage.inputTokens += u.promptTokenCount || 0;
    usage.outputTokens += u.candidatesTokenCount || 0;
  };
  addUsage(response.usage);

  while (response.functionCalls?.length) {
    if (toolCallCount + response.functionCalls.length > maxToolCalls) {
      // Budget exhausted: answer with what we have instead of erroring out.
      response = await chat.send([{
        text: '[SISTEM] Araç çağrısı bütçesi doldu. Eldeki verilerle en iyi cevabını ver; '
          + 'eksik kalan hesapları dürüstçe belirt.',
      }], onChunk);
      addUsage(response.usage);
      break;
    }

    const responseParts = [];
    for (const fc of response.functionCalls) {
      toolCallCount++;
      if (fc.name === 'suggest_followups') {
        const qs = Array.isArray(fc.args?.questions) ? fc.args.questions : [];
        suggestions = qs.filter((q) => typeof q === 'string' && q.trim())
          .map((q) => q.trim().slice(0, 80)).slice(0, 3);
        if (!suggestions.length) suggestions = undefined;
      } else if (fc.name === 'suggest_add_person') {
        action = {
          type: 'addPersonSuggested',
          name: String(fc.args?.name || '').slice(0, 120) || undefined,
          date: /^\d{4}-\d{2}-\d{2}$/.test(fc.args?.date || '') ? fc.args.date : undefined,
          time: /^\d{2}:\d{2}$/.test(fc.args?.time || '') ? fc.args.time : undefined,
          city: String(fc.args?.city || '').slice(0, 80) || undefined,
        };
      } else {
        emit('status', { stage: 'tool', tool: fc.name, message: S.tool[fc.name] || S.tool._default });
      }
      const result = executeTool(fc, { peopleMap, today });
      if (result?.error) console.warn(`[AGENT-TOOL-FAIL] ${fc.name}:`, result.error);
      // Görsel panel verisi: site, açı listesini natal sayfası bileşeniyle çizer
      if (!result?.error && fc.name === 'get_transit_hits' && Array.isArray(result.hits)) {
        visuals.aspects = {
          person: result.person,
          moment: result.moment?.localTime,
          items: result.hits.slice(0, 10).map((h) => ({
            // transiting temiz gezegen adı; retro ayrı boolean (glif eşlemesi için)
            transiting: String(h.transiting).replace(' ℞', ''),
            retro: String(h.transiting).includes('℞') || undefined,
            aspect: h.aspect, natalPoint: h.natalPoint,
            orb: h.orb, exact: !!h.exact,
            nature: HARMONIOUS.has(h.aspect) ? 'harmonious' : CHALLENGING.has(h.aspect) ? 'challenging' : 'neutral',
          })),
        };
      }
      if (!result?.error && fc.name === 'get_natal_profile' && result.chart) {
        const c = result.chart;
        visuals.natalChart = {
          person: result.person,
          planets: c.planets,
          ascendant: c.ascendant,
          midheaven: c.midheaven,
          elements: c.elementCounts,
          modalities: c.modalityCounts,
          stelliums: c.stelliums,
          tightAspects: c.tightAspects,
          chartRuler: c.chartRuler,
        };
      }
      if (!result?.error && fc.name === 'scan_best_days' && Array.isArray(result.ranking)) {
        visuals.bestDays = {
          person: result.person, purpose: result.purpose,
          items: result.ranking.slice(0, 7).map((x) => {
            const dow = new Date(`${x.date}T00:00:00Z`).getUTCDay();
            return {
              date: x.date, day: x.day, bestTime: x.bestTime, avgScore: x.avgScore,
              isWeekend: (dow === 0 || dow === 6) || undefined,
              factors: (x.keyFactors || []).slice(0, 3),
            };
          }),
        };
      }
      toolTrace.push({ tool: fc.name, args: fc.args, ok: !result?.error });
      responseParts.push({ functionResponse: { name: fc.name, response: { result } } });
    }
    emit('status', { stage: 'writing', message: S.writing });
    response = await chat.send(responseParts, onChunk);
    addUsage(response.usage);
  }

  const text = response.text || '';
  // Streaming desteklemeyen provider'lar (ör. test mock'u) için geri-uyum:
  if (streamedChars === 0 && text) emit('delta', { text });
  return { text, toolCallCount, toolTrace, usage, streamedChars, visuals, action, suggestions };
}
