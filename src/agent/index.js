// src/agent/index.js
// Express mount for the Calestia Uzmanı agent: POST /api/agent/ask (SSE).
// Security model: service-to-service shared key (X-Agent-Key). End-user auth &
// beta-flag checks happen on the AstroAK backend, which is the only caller.
// This module must never take down the calculation API: everything is isolated.

import { timingSafeEqual, randomBytes } from 'crypto';
import { runAgentTurn } from './orchestrator.js';
import { agentStrings } from './i18n.js';
import { createGeminiProvider } from './provider-gemini.js';

function safeKeyCompare(given, expected) {
  const a = Buffer.from(String(given ?? ''));
  const b = Buffer.from(String(expected));
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// Model emekliliğine dayanıklılık: Google bir modeli kapatırsa (404 "no longer
// available") sıradaki adaya otomatik geçilir; çalışan model önbelleğe alınır.
const MODEL_FALLBACKS = ['gemini-3-flash-preview', 'gemini-3.1-flash-lite', 'gemini-2.5-flash-lite', 'gemini-2.0-flash'];
let activeModel = null;
const isModelGone = (err) => /NOT_FOUND|no longer available/i.test(err?.message || '');
function modelCandidates() {
  return [...new Set([activeModel, process.env.AGENT_GEMINI_MODEL, ...MODEL_FALLBACKS].filter(Boolean))];
}

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
  if (counters.byUid.size > 5000) counters.byUid.clear(); // bellek tavanı (beta ölçeği çok üstü)
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
  if (typeof p.year === 'number' && (p.year < 1800 || p.year > 2400)) errs.push(`people[${i}].year 1800-2400 aralığında olmalı (efemeris kapsamı)`);
  if (typeof p.month === 'number' && (p.month < 1 || p.month > 12)) errs.push(`people[${i}].month 1-12 olmalı`);
  if (typeof p.day === 'number' && (p.day < 1 || p.day > 31)) errs.push(`people[${i}].day 1-31 olmalı`);
  if (typeof p.hour === 'number' && (p.hour < 0 || p.hour > 23)) errs.push(`people[${i}].hour 0-23 olmalı`);
  if (typeof p.minute === 'number' && (p.minute < 0 || p.minute > 59)) errs.push(`people[${i}].minute 0-59 olmalı`);
  if (typeof p.latitude === 'number' && Math.abs(p.latitude) > 90) errs.push(`people[${i}].latitude -90..90 olmalı`);
  if (typeof p.longitude === 'number' && Math.abs(p.longitude) > 180) errs.push(`people[${i}].longitude -180..180 olmalı`);
  if (p.timezone && p.timezone.length > 64) errs.push(`people[${i}].timezone çok uzun`);
  if (typeof p.label === 'string' && p.label.length > 120) errs.push(`people[${i}].label 120 karakteri aşamaz`);
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
    if (!safeKeyCompare(req.get('x-agent-key'), sharedKey)) {
      const got = String(req.get('x-agent-key') || '(boş)');
      console.warn(`[AGENT-403-KEY] anahtar uyuşmazlığı (gelen: ${got.slice(0, 8)}… uzunluk=${got.length}, beklenen uzunluk=${sharedKey.length})`);
      return res.status(403).json({ code: 'AGENT-403-KEY', error: 'Yetkisiz' });
    }

    // --- Validation ---
    const { uid, sessionId, message, people, history, locale } = req.body || {};
    const errors = [];
    if (typeof uid !== 'string' || !uid) errors.push('uid eksik');
    if (typeof uid === 'string' && uid.length > 128) errors.push('uid 128 karakteri aşamaz');
    if (sessionId !== undefined && (typeof sessionId !== 'string' || sessionId.length > 128)) errors.push('sessionId geçersiz');
    if (locale !== undefined && !/^[a-zA-Z-]{2,10}$/.test(String(locale))) errors.push('locale geçersiz');
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
    const reqId = randomBytes(4).toString('hex');
    const startedAt = Date.now();
    console.log(`Agent ask[${reqId}]: uid=${uid} locale=${locale || 'tr'} people=${people?.length || 0} history=${history?.length || 0} msgLen=${message.length}`);

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
    let finished = false;
    res.on('close', () => {
      closed = true;
      if (!finished) console.warn(`[AGENT-ABORT][${reqId}] uid=${uid} istemci bağlantıyı kapattı (${Date.now() - startedAt}ms)`);
    });
    const send = (event, data) => {
      if (closed) return;
      // DATA-ONLY SSE: olay tipi 'event:' satırında DEĞİL, JSON'daki 'type'
      // alanında taşınır. Böylece "blok 'data: ' ile başlamalı" varsayımı yapan
      // ayrıştırıcılar dahil her SSE istemcisiyle uyumludur.
      res.write(`data: ${JSON.stringify({ type: event, ...data })}\n\n`);
    };
    const heartbeat = setInterval(() => { if (!closed) res.write(': ping\n\n'); }, 15_000);

    try {
      const timeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Zaman aşımı — lütfen tekrar deneyin')), TURN_TIMEOUT_MS);
      });

      let result;
      if (provider) {
        result = await Promise.race([runAgentTurn({
          provider,
          request: { message: message.trim(), people, history, locale },
          emit: send,
          maxToolCalls: parseInt(process.env.AGENT_MAX_TOOL_CALLS || '8', 10),
        }), timeout]);
      } else {
        const candidates = modelCandidates();
        let lastErr;
        for (const model of candidates.slice(0, 3)) {
          try {
            const turn = runAgentTurn({
              provider: createGeminiProvider({ apiKey: process.env.GEMINI_API_KEY, model }),
              request: { message: message.trim(), people, history, locale },
              emit: send,
              maxToolCalls: parseInt(process.env.AGENT_MAX_TOOL_CALLS || '8', 10),
            });
            result = await Promise.race([turn, timeout]);
            if (activeModel !== model) console.log(`[AGENT-MODEL] aktif model: ${model}`);
            activeModel = model;
            lastErr = null;
            break;
          } catch (err) {
            lastErr = err;
            if (isModelGone(err)) {
              console.warn(`[AGENT-MODEL-GONE] ${model} kullanılamıyor, sıradaki denenecek`);
              continue;
            }
            throw err;
          }
        }
        if (lastErr) throw lastErr;
      }

      finished = true;
      send('done', {
        requestId: reqId,
        sessionId: sessionId || null,
        toolCalls: result.toolCallCount,
        toolTrace: result.toolTrace,
        usage: result.usage,
        quota: { usedToday: counters.byUid.get(uid) || 0, dailyLimit: uidMax },
        visuals: Object.keys(result.visuals || {}).length ? result.visuals : undefined,
        action: result.action,
        suggestions: result.suggestions,
        // Fiyat kademesi ipucu: tarama araçları (election/period scan) daha maliyetli
        // hissiyat/işlem sınıfıdır; site kademeli yıldız fiyatı uygulayabilsin diye.
        costClass: result.toolTrace.some((t) => ['scan_best_days', 'scan_transit_period'].includes(t.tool)) ? 'scan' : 'light',
      });
      console.log(`Agent done[${reqId}]: uid=${uid} toolCalls=${result.toolCallCount} in=${result.usage.inputTokens} out=${result.usage.outputTokens} ${Date.now() - startedAt}ms`);
    } catch (err) {
      finished = true;
      const isTimeout = err.message.includes('Zaman aşımı');
      const code = isTimeout ? 'AGENT-TIMEOUT' : 'AGENT-TURN-FAIL';
      console.error(`[${code}][${reqId}] uid=${uid} ${Date.now() - startedAt}ms:`, err.message);
      const E = agentStrings(locale).error;
      send('error', { code, message: isTimeout ? E.timeout : E.turnFail });
    } finally {
      clearInterval(heartbeat);
      if (!closed) res.end();
    }
  });

  console.log('Agent: /api/agent/ask aktif');
  return true;
}
