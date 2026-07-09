// src/agent/provider-gemini.js
// Gemini implementation of the provider interface used by the orchestrator.
// Interface: createChat({system, declarations, history}) =>
//   { send(parts, onChunk?) => {functionCalls, text, usage} }
// send() streams: onChunk(textPiece) fires as text arrives (typing effect).

import { GoogleGenAI } from '@google/genai';

function chunkFunctionCalls(chunk) {
  if (Array.isArray(chunk.functionCalls) && chunk.functionCalls.length) return chunk.functionCalls;
  const parts = chunk.candidates?.[0]?.content?.parts || [];
  return parts.filter((p) => p.functionCall).map((p) => p.functionCall);
}

function chunkText(chunk) {
  if (typeof chunk.text === 'string' && chunk.text.length) return chunk.text;
  const parts = chunk.candidates?.[0]?.content?.parts || [];
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
        async send(parts, onChunk) {
          const stream = await chat.sendMessageStream({ message: parts });
          const functionCalls = [];
          let text = '';
          let usage;
          for await (const chunk of stream) {
            const piece = chunkText(chunk);
            if (piece) {
              text += piece;
              // Araç çağrısı içeren turlarda metin akıtma (nadiren karışık gelir);
              // sadece o ana dek functionCall görülmediyse canlı akıt.
              if (onChunk && functionCalls.length === 0) onChunk(piece);
            }
            functionCalls.push(...chunkFunctionCalls(chunk));
            if (chunk.usageMetadata) usage = chunk.usageMetadata;
          }
          return { functionCalls, text, usage };
        },
      };
    },
  };
}
