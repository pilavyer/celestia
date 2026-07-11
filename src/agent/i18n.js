// src/agent/i18n.js
// User-visible status/error strings for the agent's SSE events, localized to
// the site's report languages. The payload's `locale` field picks the table;
// fallback chain: exact → base language ("de-AT"→"de") → en → tr.

const STRINGS = {
  tr: {
    start: 'Sorunu analiz ediyorum…',
    writing: 'Yorum yazılıyor…',
    tool: {
      get_natal_profile: 'Doğum haritası hesaplanıyor…',
      get_transit_hits: 'Günün gökyüzü açıları hesaplanıyor…',
      scan_transit_period: 'Dönem transitleri taranıyor…',
      get_synastry: 'Uyum analizi hesaplanıyor…',
      scan_best_days: 'En uygun günler taranıyor…',
      _default: 'Hesaplanıyor…',
    },
    error: {
      timeout: 'Yanıt zaman aşımına uğradı. Lütfen tekrar deneyin.',
      turnFail: 'Yorum üretilirken bir sorun oluştu. Lütfen tekrar deneyin.',
    },
  },
  en: {
    start: 'Analyzing your question…',
    writing: 'Writing your reading…',
    tool: {
      get_natal_profile: 'Calculating the birth chart…',
      get_transit_hits: "Calculating today's sky aspects…",
      scan_transit_period: "Scanning the period's transits…",
      get_synastry: 'Calculating compatibility…',
      scan_best_days: 'Scanning for the best days…',
      _default: 'Calculating…',
    },
    error: {
      timeout: 'The response timed out. Please try again.',
      turnFail: 'Something went wrong while generating the reading. Please try again.',
    },
  },
  de: {
    start: 'Ich analysiere deine Frage…',
    writing: 'Deutung wird verfasst…',
    tool: {
      get_natal_profile: 'Geburtshoroskop wird berechnet…',
      get_transit_hits: 'Aktuelle Transite werden berechnet…',
      scan_transit_period: 'Transite des Zeitraums werden gescannt…',
      get_synastry: 'Kompatibilität wird berechnet…',
      scan_best_days: 'Beste Tage werden gesucht…',
      _default: 'Wird berechnet…',
    },
    error: {
      timeout: 'Zeitüberschreitung. Bitte versuche es erneut.',
      turnFail: 'Beim Erstellen der Deutung ist ein Fehler aufgetreten. Bitte versuche es erneut.',
    },
  },
  fr: {
    start: "J'analyse ta question…",
    writing: "Rédaction de l'interprétation…",
    tool: {
      get_natal_profile: 'Calcul du thème natal…',
      get_transit_hits: 'Calcul des aspects du ciel…',
      scan_transit_period: 'Analyse des transits de la période…',
      get_synastry: 'Calcul de la compatibilité…',
      scan_best_days: 'Recherche des meilleurs jours…',
      _default: 'Calcul en cours…',
    },
    error: {
      timeout: 'Délai dépassé. Merci de réessayer.',
      turnFail: "Une erreur est survenue pendant la génération. Merci de réessayer.",
    },
  },
  pt: {
    start: 'Analisando sua pergunta…',
    writing: 'Escrevendo sua interpretação…',
    tool: {
      get_natal_profile: 'Calculando o mapa natal…',
      get_transit_hits: 'Calculando os aspectos do céu de hoje…',
      scan_transit_period: 'Analisando os trânsitos do período…',
      get_synastry: 'Calculando a compatibilidade…',
      scan_best_days: 'Buscando os melhores dias…',
      _default: 'Calculando…',
    },
    error: {
      timeout: 'O tempo de resposta esgotou. Tente novamente.',
      turnFail: 'Ocorreu um problema ao gerar a interpretação. Tente novamente.',
    },
  },
  es: {
    start: 'Analizando tu pregunta…',
    writing: 'Escribiendo tu interpretación…',
    tool: {
      get_natal_profile: 'Calculando la carta natal…',
      get_transit_hits: 'Calculando los aspectos del cielo…',
      scan_transit_period: 'Escaneando los tránsitos del período…',
      get_synastry: 'Calculando la compatibilidad…',
      scan_best_days: 'Buscando los mejores días…',
      _default: 'Calculando…',
    },
    error: {
      timeout: 'Se agotó el tiempo de espera. Inténtalo de nuevo.',
      turnFail: 'Ocurrió un problema al generar la interpretación. Inténtalo de nuevo.',
    },
  },
};

export function agentStrings(locale) {
  const l = String(locale || 'tr').toLowerCase();
  return STRINGS[l] || STRINGS[l.split('-')[0]] || STRINGS.en;
}
