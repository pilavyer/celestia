// src/agent/provider-gemini.js
// Gemini implementation of the provider interface used by the orchestrator.
// Interface: createChat({system, declarations, history}) => { send(parts) => {functionCalls, text, usage} }

import { GoogleGenAI } from '@google/genai';

/** Defensive functionCall extraction (SDK getter varsa onu, yoksa parts'tan). */
function extractFunctionCalls(resp) {
  if (Array.isArray(resp.functionCalls) && resp.functionCalls.length) return resp.functionCalls;
  const parts = resp.candidates?.[0]?.content?.parts || [];
  return parts.filter((p) => p.functionCall).map((p) => p.functionCall);
}

function extractText(resp) {
  if (typeof resp.text === 'string' && resp.text.length) return resp.text;
  const parts = resp.candidates?.[0]?.content?.parts || [];
  return parts.filter((p) => typeof p.text === 'string').map((p) => p.text).join('');
}

export function createGeminiProvider({ apiKey, model = 'gemini-2.5-flash' }) {
  if (!apiKey) throw new Error('GEMINI_API_KEY tanımlı değil');
  const ai = new GoogleGenAI({ apiKey });

  return {
    createChat({ system, declarations, history = [] }) {
      const chat = ai.chats.create({
        model,
        config: {
          systemInstruction: system,
          tools: [{ functionDeclarations: declarations }],
          // Deterministik yorum istemiyoruz ama uçuk yaratıcılık da istemiyoruz:
          temperature: 0.6,
        },
        history: history.map((h) => ({
          role: (h.role === 'model' || h.role === 'assistant') ? 'model' : 'user',
          parts: [{ text: String(h.text || '').slice(0, 4000) }],
        })),
      });

      return {
        async send(parts) {
          const resp = await chat.sendMessage({ message: parts });
          return {
            functionCalls: extractFunctionCalls(resp),
            text: extractText(resp),
            usage: resp.usageMetadata,
          };
        },
      };
    },
  };
}
