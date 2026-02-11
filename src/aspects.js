// src/aspects.js
import { ASPECTS } from './constants.js';

/**
 * Tüm gök cisimleri arasındaki aspektleri hesapla.
 *
 * @param {Array} bodies - Gezegen ve nokta listesi (her biri {name, longitude, speed} içermeli)
 * @returns {Array} Aspekt listesi
 */
export function calculateAspects(bodies) {
  const aspects = [];

  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const body1 = bodies[i];
      const body2 = bodies[j];

      // Node'lar arası aspekt ve South Node aspektlerini atla (çoğu astrolog dahil etmez)
      if (
        (body1.name === 'True Node' && body2.name === 'South Node') ||
        (body1.name === 'South Node' && body2.name === 'True Node')
      ) continue;

      // İki boylam arasındaki açı (0-180°)
      let diff = Math.abs(body1.longitude - body2.longitude);
      if (diff > 180) diff = 360 - diff;

      for (const aspect of ASPECTS) {
        // Güneş veya Ay içeren aspektlerde orb'u %25 genişlet
        let effectiveOrb = aspect.orb;
        const luminaries = ['Sun', 'Moon'];
        if (luminaries.includes(body1.name) || luminaries.includes(body2.name)) {
          effectiveOrb *= 1.25;
        }

        // ASC/MC aspektlerinde orb'u biraz daralt
        const angles = ['Ascendant', 'Midheaven'];
        if (angles.includes(body1.name) || angles.includes(body2.name)) {
          effectiveOrb *= 0.75;
        }

        const deviation = Math.abs(diff - aspect.angle);

        if (deviation <= effectiveOrb) {
          // Applying (yaklaşan) vs Separating (uzaklaşan) tespiti
          const isApplying = determineApplying(body1, body2, aspect.angle);

          aspects.push({
            planet1: body1.name,
            planet1Tr: body1.trName,
            planet2: body2.name,
            planet2Tr: body2.trName,
            type: aspect.name,
            typeTr: aspect.trName,
            symbol: aspect.symbol,
            exactAngle: aspect.angle,
            actualAngle: roundTo(diff, 2),
            orb: roundTo(deviation, 2),
            maxOrb: roundTo(effectiveOrb, 2),
            isApplying,
            strength: calculateAspectStrength(deviation, effectiveOrb),
          });

          // Her çift için sadece bir aspekt (en dar orb'lu)
          break;
        }
      }
    }
  }

  // Orb'a göre sırala (en güçlü aspektler önce)
  return aspects.sort((a, b) => a.orb - b.orb);
}

/**
 * Aspektin yaklaşan mı (applying) uzaklaşan mı (separating) olduğunu belirle.
 * Daha hızlı gezegen yavaş gezegene doğru hareket ediyorsa = applying
 */
function determineApplying(body1, body2, aspectAngle) {
  // Her iki cismin de hız verisi yoksa belirlenemez
  if (body1.speed === undefined || body2.speed === undefined) return null;
  if (body1.speed === 0 && body2.speed === 0) return null;

  // Hızlı gezegen = daha büyük mutlak hız
  const speed1 = Math.abs(body1.speed);
  const speed2 = Math.abs(body2.speed);

  // Göreceli hareket: hızlı gezegen yavaşa yaklaşıyor mu?
  const relativeSpeed = body1.speed - body2.speed;

  let currentDiff = body1.longitude - body2.longitude;
  // 0-360 aralığında normalize et
  if (currentDiff < 0) currentDiff += 360;
  if (currentDiff > 180) currentDiff = 360 - currentDiff;

  // Bir sonraki "adımda" açı aspekt açısına yaklaşacak mı?
  const futureBody1 = body1.longitude + body1.speed * 0.01;
  const futureBody2 = body2.longitude + body2.speed * 0.01;

  let futureDiff = Math.abs(futureBody1 - futureBody2);
  if (futureDiff > 180) futureDiff = 360 - futureDiff;

  const currentDeviation = Math.abs(currentDiff - aspectAngle);
  const futureDeviation = Math.abs(futureDiff - aspectAngle);

  return futureDeviation < currentDeviation;
}

/**
 * Aspekt gücünü 0-100 arasında hesapla.
 * Orb 0° = 100 (tam aspekt), orb = maxOrb = 0 (aspekt sınırında)
 */
function calculateAspectStrength(deviation, maxOrb) {
  if (maxOrb === 0) return 100;
  const strength = Math.round((1 - deviation / maxOrb) * 100);
  return Math.max(0, Math.min(100, strength));
}

function roundTo(num, decimals) {
  return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
}
