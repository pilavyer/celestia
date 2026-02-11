// src/timezone.js
import { DateTime } from 'luxon';

/**
 * Doğum zamanını yerel saatten UTC'ye çevirir.
 *
 * KRİTİK NOTLAR:
 * - Ham UTC offset (örn. "+3") KULLANMA, her zaman IANA timezone ID kullan
 * - IANA ID'ler tarihsel DST değişikliklerini kodlar
 * - Türkiye örneği: 2016 öncesi UTC+2/+3 (DST), 2016 sonrası sabit UTC+3
 *
 * @param {number} year - Doğum yılı
 * @param {number} month - Doğum ayı (1-12, JavaScript'in 0-based Date'inden farklı!)
 * @param {number} day - Doğum günü
 * @param {number} hour - Doğum saati (0-23)
 * @param {number} minute - Doğum dakikası (0-59)
 * @param {string} timezone - IANA timezone ID (örn: "Europe/Istanbul", "America/New_York")
 * @returns {object} UTC bilgileri ve uyarılar
 */
export function birthTimeToUTC(year, month, day, hour, minute, timezone) {
  // IANA timezone doğrulama
  const testZone = DateTime.now().setZone(timezone);
  if (!testZone.isValid) {
    throw new Error(`Geçersiz timezone: "${timezone}". IANA formatı kullanın (örn: "Europe/Istanbul")`);
  }

  // Yerel zamanı oluştur
  const local = DateTime.fromObject(
    { year, month, day, hour, minute, second: 0 },
    { zone: timezone }
  );

  // DST spring-forward gap kontrolü
  // Örnek: Saat 02:00'den 03:00'e atladığında 02:30 geçersizdir
  if (!local.isValid) {
    throw new Error(
      `Geçersiz zaman: ${year}-${month}-${day} ${hour}:${minute} "${timezone}" timezone'unda mevcut değil. ` +
      `Muhtemelen yaz saati geçişi nedeniyle bu saat atlanmış. ` +
      `Sebep: ${local.invalidReason}. Açıklama: ${local.invalidExplanation}`
    );
  }

  // UTC'ye dönüştür
  const utc = local.toUTC();

  // Uyarılar oluştur
  const warnings = [];

  if (year < 1970) {
    warnings.push(
      '1970 öncesi timezone verileri güvenilir olmayabilir. ' +
      'astro.com atlas ile çapraz kontrol önerilir.'
    );
  }

  if (year < 1883 && timezone.startsWith('America/')) {
    warnings.push(
      '1883 öncesi ABD\'de standart zaman dilimleri yoktu. ' +
      'Yerel güneş saati (LMT) kullanılıyor olabilir.'
    );
  }

  // DST fall-back ambiguity kontrolü (aynı saat iki kez yaşanır)
  // Luxon bu durumda ilk oluşumu (DST saatini) tercih eder
  const oneHourLater = local.plus({ hours: 1 });
  if (local.offset !== oneHourLater.offset && local.isInDST) {
    warnings.push(
      'Bu zaman DST geçiş saatine denk geliyor. ' +
      'Aynı saat iki kez yaşanmış olabilir (DST ve standart). ' +
      'DST versiyonu kullanıldı.'
    );
  }

  return {
    utcYear: utc.year,
    utcMonth: utc.month,
    utcDay: utc.day,
    utcHour: utc.hour,
    utcMinute: utc.minute,
    utcSecond: utc.second,
    // Ondalıklı saat (Swiss Ephemeris'in julday fonksiyonu için)
    utcDecimalHour: utc.hour + utc.minute / 60 + utc.second / 3600,
    // Offset bilgisi (dakika cinsinden)
    offsetMinutes: local.offset,
    offsetHours: local.offset / 60,
    // DST durumu
    isDST: local.isInDST,
    // Orijinal girdi (debug için)
    originalInput: {
      localTime: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
      timezone,
      utcTime: utc.toISO(),
    },
    // Uyarılar
    warnings,
  };
}

/**
 * Koordinatlardan IANA timezone tahmin et.
 * NOT: Bu basit bir yaklaşım. Production'da Google Time Zone API veya
 * timezonefinder gibi bir servis kullanmak daha doğru olur.
 *
 * Bilinen önemli timezone'lar:
 * - Türkiye: "Europe/Istanbul" (tüm Türkiye için geçerli, 2016'dan beri UTC+3 sabit)
 * - Doğu ABD: "America/New_York"
 * - Batı ABD: "America/Los_Angeles"
 * - Brezilya: "America/Sao_Paulo"
 * - Hindistan: "Asia/Kolkata"
 */
export function getTimezoneInfo(timezone) {
  const now = DateTime.now().setZone(timezone);
  return {
    timezone,
    currentOffset: now.offset / 60,
    isDST: now.isInDST,
    abbreviation: now.offsetNameShort,
    longName: now.offsetNameLong,
  };
}
