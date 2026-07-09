// src/agent/orchestrator.js
// Provider-agnostic agent loop: model → tool calls → model → ... → final text.
// The provider is injected (Gemini in production, a scripted mock in tests).

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { TOOL_DECLARATIONS, executeTool } from './tools.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DOCTRINE = readFileSync(path.join(__dirname, 'doctrine.md'), 'utf8');

const STATUS_TR = {
  get_natal_profile: 'Doğum haritası hesaplanıyor…',
  get_transit_hits: 'Günün gökyüzü açıları hesaplanıyor…',
  scan_transit_period: 'Dönem transitleri taranıyor…',
  get_synastry: 'Uyum analizi hesaplanıyor…',
  scan_best_days: 'En uygun günler taranıyor…',
};

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

  emit('status', { stage: 'start', message: 'Sorunu analiz ediyorum…' });

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
      emit('status', { stage: 'tool', tool: fc.name, message: STATUS_TR[fc.name] || 'Hesaplanıyor…' });
      const result = executeTool(fc, { peopleMap, today });
      toolTrace.push({ tool: fc.name, args: fc.args, ok: !result?.error });
      responseParts.push({ functionResponse: { name: fc.name, response: { result } } });
    }
    emit('status', { stage: 'writing', message: 'Yorum yazılıyor…' });
    response = await chat.send(responseParts, onChunk);
    addUsage(response.usage);
  }

  const text = response.text || '';
  // Streaming desteklemeyen provider'lar (ör. test mock'u) için geri-uyum:
  if (streamedChars === 0 && text) emit('delta', { text });
  return { text, toolCallCount, toolTrace, usage, streamedChars };
}
