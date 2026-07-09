// src/agent/index.js
// Express mount for the Calestia Uzmanı agent: POST /api/agent/ask (SSE).
// Security model: service-to-service shared key (X-Agent-Key). End-user auth &
// beta-flag checks happen on the AstroAK backend, which is the only caller.
// This module must never take down the calculation API: everything is isolated.

import { runAgentTurn } from './orchestrator.js';
import { createGeminiProvider } from './provider-gemini.js';

const MAX_MESSAGE_LEN = 2000;
const MAX_PEOPLE = 40; // = AstroAK hesap limiti (normal kullanıcının TÜM kişileri sığar)
const MAX_HISTORY = 20;
const TURN_TIMEOUT_MS = 180_000;

// In-memory daily counters (ikinci savunma hattı; birincisi site tarafındaki Upstash).
const counters = { day: '', global: 0, byUid: new Map() };
function checkAndCount(uid, globalMax, uidMax) {
  const today = new Date().toISOString().slice(0, 10);
  if (counters.day !== today) {
    counters.day = today;
    counters.global = 0;
    counters.byUid.clear();
  }
  if (counters.global >= globalMax) return 'global';
  const uidCount = counters.byUid.get(uid) || 0;
  if (uidCount >= uidMax) return 'uid';
  counters.global++;
  counters.byUid.set(uid, uidCount + 1);
  return null;
}

function validatePerson(p, i) {
  const errs = [];
  if (!p || typeof p !== 'object') return [`people[${i}] geçersiz`];
  if (typeof p.id !== 'string' || !p.id) errs.push(`people[${i}].id eksik`);
  if (typeof p.label !== 'string' || !p.label) errs.push(`people[${i}].label eksik`);
  for (const f of ['year', 'month', 'day', 'hour', 'minute', 'latitude', 'longitude']) {
    if (typeof p[f] !== 'number' || Number.isNaN(p[f])) errs.push(`people[${i}].${f} sayı olmalı`);
  }
  if (typeof p.timezone !== 'string' || !p.timezone.includes('/')) errs.push(`people[${i}].timezone IANA formatında olmalı`);
  if (p.isSelf !== undefined && typeof p.isSelf !== 'boolean') errs.push(`people[${i}].isSelf boolean olmalı`);
  return errs;
}

export function mountAgent(app, { provider } = {}) {
  if (process.env.AGENT_ENABLED !== 'true') {
    console.log('Agent: devre dışı (AGENT_ENABLED != "true")');
    return false;
  }
  const sharedKey = process.env.AGENT_SHARED_KEY;
  const globalMax = parseInt(process.env.AGENT_DAILY_MAX || '300', 10);
  const uidMax = parseInt(process.env.AGENT_UID_DAILY_MAX || '100', 10);

  app.post('/api/agent/ask', async (req, res) => {
    // --- Auth (servisler arası) ---
    if (!sharedKey) {
      return res.status(503).json({ code: 'AGENT-503-CONFIG', error: 'Agent yapılandırılmamış (AGENT_SHARED_KEY eksik)' });
    }
    if (req.get('x-agent-key') !== sharedKey) {
      const got = String(req.get('x-agent-key') || '(boş)');
      console.warn(`[AGENT-403-KEY] anahtar uyuşmazlığı (gelen: ${got.slice(0, 8)}… uzunluk=${got.length}, beklenen uzunluk=${sharedKey.length})`);
      return res.status(403).json({ code: 'AGENT-403-KEY', error: 'Yetkisiz' });
    }

    // --- Validation ---
    const { uid, sessionId, message, people, history, locale } = req.body || {};
    const errors = [];
    if (typeof uid !== 'string' || !uid) errors.push('uid eksik');
    if (typeof message !== 'string' || !message.trim()) errors.push('message eksik');
    if (typeof message === 'string' && message.length > MAX_MESSAGE_LEN) errors.push(`message ${MAX_MESSAGE_LEN} karakteri aşamaz`);
    if (people !== undefined) {
      if (!Array.isArray(people) || people.length > MAX_PEOPLE) errors.push(`people en fazla ${MAX_PEOPLE} kişi olabilir`);
      else people.forEach((p, i) => errors.push(...validatePerson(p, i)));
    }
    if (history !== undefined && (!Array.isArray(history) || history.length > MAX_HISTORY)) {
      errors.push(`history en fazla ${MAX_HISTORY} tur olabilir`);
    }
    if (errors.length) {
      console.warn('[AGENT-400-VALIDATION]', JSON.stringify(errors));
      return res.status(400).json({ code: 'AGENT-400-VALIDATION', error: 'Geçersiz istek', details: errors });
    }
    console.log(`Agent ask: uid=${uid} people=${people?.length || 0} history=${history?.length || 0} msgLen=${message.length}`);

    // --- Günlük limitler ---
    const limitHit = checkAndCount(uid, globalMax, uidMax);
    if (limitHit) {
      console.warn(`[AGENT-429-${limitHit === 'uid' ? 'UID' : 'GLOBAL'}] uid=${uid}`);
      return res.status(429).json({
        code: limitHit === 'uid' ? 'AGENT-429-UID' : 'AGENT-429-GLOBAL',
        error: limitHit === 'uid' ? 'Günlük kullanım limitine ulaşıldı' : 'Servis günlük kapasitesine ulaştı',
      });
    }

    // --- SSE kurulumu ---
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    let closed = false;
    res.on('close', () => { closed = true; });
    const send = (event, data) => {
      if (closed) return;
      // DATA-ONLY SSE: olay tipi 'event:' satırında DEĞİL, JSON'daki 'type'
      // alanında taşınır. Böylece "blok 'data: ' ile başlamalı" varsayımı yapan
      // ayrıştırıcılar dahil her SSE istemcisiyle uyumludur.
      res.write(`data: ${JSON.stringify({ type: event, ...data })}\n\n`);
    };
    const heartbeat = setInterval(() => { if (!closed) res.write(': ping\n\n'); }, 15_000);

    try {
      const activeProvider = provider || createGeminiProvider({
        apiKey: process.env.GEMINI_API_KEY,
        model: process.env.AGENT_GEMINI_MODEL || 'gemini-2.5-flash',
      });

      const turn = runAgentTurn({
        provider: activeProvider,
        request: { message: message.trim(), people, history, locale },
        emit: send,
        maxToolCalls: parseInt(process.env.AGENT_MAX_TOOL_CALLS || '8', 10),
      });
      const timeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Zaman aşımı — lütfen tekrar deneyin')), TURN_TIMEOUT_MS);
      });

      const result = await Promise.race([turn, timeout]);

      send('done', {
        sessionId: sessionId || null,
        toolCalls: result.toolCallCount,
        toolTrace: result.toolTrace,
        usage: result.usage,
      });
      console.log(`Agent done: uid=${uid} toolCalls=${result.toolCallCount} in=${result.usage.inputTokens} out=${result.usage.outputTokens}`);
    } catch (err) {
      const isTimeout = err.message.includes('Zaman aşımı');
      const code = isTimeout ? 'AGENT-TIMEOUT' : 'AGENT-TURN-FAIL';
      console.error(`[${code}] uid=${uid}:`, err.message);
      send('error', { code, message: isTimeout
        ? 'Yanıt zaman aşımına uğradı. Lütfen tekrar deneyin.'
        : 'Yorum üretilirken bir sorun oluştu. Lütfen tekrar deneyin.' });
    } finally {
      clearInterval(heartbeat);
      if (!closed) res.end();
    }
  });

  console.log('Agent: /api/agent/ask aktif');
  return true;
}
