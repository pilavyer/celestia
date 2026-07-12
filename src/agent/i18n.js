// src/agent/i18n.js
// User-visible status/error strings for the agent's SSE events, localized to
// the site's report languages. The payload's `locale` field picks the table;
// fallback chain: exact → base language ("de-AT"→"de") → en → tr.

const STRINGS = {
  tr: {
    start: 'Gökyüzü haritanı okuyorum…',
    writing: 'Yıldızların söyledikleri yorumlanıyor…',
    tool: {
      get_natal_profile: 'Gökyüzü haritan çıkarılıyor…',
      get_transit_hits: 'Bugünün göğü haritanla karşılaştırılıyor…',
      scan_transit_period: 'Dönem gökyüzü taranıyor…',
      get_synastry: 'İki harita karşılaştırılıyor…',
      scan_best_days: 'En uygun günler taranıyor…',
      _default: 'Hesaplanıyor…',
    },
    error: {
      timeout: 'Yanıt zaman aşımına uğradı. Lütfen tekrar deneyin.',
      turnFail: 'Yorum üretilirken bir sorun oluştu. Lütfen tekrar deneyin.',
    },
  },
  en: {
    start: 'Reading your sky chart…',
    writing: 'Interpreting what the stars say…',
    tool: {
      get_natal_profile: 'Drawing out your birth chart…',
      get_transit_hits: "Comparing today's sky with your chart…",
      scan_transit_period: 'Scanning the sky over the period…',
      get_synastry: 'Comparing the two charts…',
      scan_best_days: 'Scanning for the best days…',
      _default: 'Calculating…',
    },
    error: {
      timeout: 'The response timed out. Please try again.',
      turnFail: 'Something went wrong while generating the reading. Please try again.',
    },
  },
  de: {
    start: 'Ich lese deine Himmelskarte…',
    writing: 'Die Botschaft der Sterne wird gedeutet…',
    tool: {
      get_natal_profile: 'Dein Geburtshoroskop wird erstellt…',
      get_transit_hits: 'Der heutige Himmel wird mit deinem Horoskop verglichen…',
      scan_transit_period: 'Transite des Zeitraums werden gescannt…',
      get_synastry: 'Die beiden Horoskope werden verglichen…',
      scan_best_days: 'Beste Tage werden gesucht…',
      _default: 'Wird berechnet…',
    },
    error: {
      timeout: 'Zeitüberschreitung. Bitte versuche es erneut.',
      turnFail: 'Beim Erstellen der Deutung ist ein Fehler aufgetreten. Bitte versuche es erneut.',
    },
  },
  fr: {
    start: 'Je lis ta carte du ciel…',
    writing: 'Interprétation du message des étoiles…',
    tool: {
      get_natal_profile: 'Élaboration de ton thème natal…',
      get_transit_hits: 'Comparaison du ciel du jour avec ton thème…',
      scan_transit_period: 'Analyse des transits de la période…',
      get_synastry: 'Comparaison des deux thèmes…',
      scan_best_days: 'Recherche des meilleurs jours…',
      _default: 'Calcul en cours…',
    },
    error: {
      timeout: 'Délai dépassé. Merci de réessayer.',
      turnFail: "Une erreur est survenue pendant la génération. Merci de réessayer.",
    },
  },
  pt: {
    start: 'Lendo o seu mapa do céu…',
    writing: 'Interpretando o que dizem as estrelas…',
    tool: {
      get_natal_profile: 'Traçando o seu mapa natal…',
      get_transit_hits: 'Comparando o céu de hoje com o seu mapa…',
      scan_transit_period: 'Analisando os trânsitos do período…',
      get_synastry: 'Comparando os dois mapas…',
      scan_best_days: 'Buscando os melhores dias…',
      _default: 'Calculando…',
    },
    error: {
      timeout: 'O tempo de resposta esgotou. Tente novamente.',
      turnFail: 'Ocorreu um problema ao gerar a interpretação. Tente novamente.',
    },
  },
  es: {
    start: 'Leyendo tu carta del cielo…',
    writing: 'Interpretando lo que dicen las estrellas…',
    tool: {
      get_natal_profile: 'Trazando tu carta natal…',
      get_transit_hits: 'Comparando el cielo de hoy con tu carta…',
      scan_transit_period: 'Escaneando los tránsitos del período…',
      get_synastry: 'Comparando las dos cartas…',
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
