// src/aspects.js
import { ASPECTS } from './constants.js';
import { roundTo } from './utils.js';

/**
 * Calculate aspects between all celestial bodies.
 *
 * @param {Array} bodies - List of planets and points (each must contain {name, longitude, speed})
 * @returns {Array} List of aspects
 */
export function calculateAspects(bodies) {
  const aspects = [];

  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const body1 = bodies[i];
      const body2 = bodies[j];

      // Skip inter-Node aspects and South Node aspects (most astrologers exclude these)
      if (
        (body1.name === 'True Node' && body2.name === 'South Node') ||
        (body1.name === 'South Node' && body2.name === 'True Node')
      ) continue;

      // Angular distance between two longitudes (0-180°)
      let diff = Math.abs(body1.longitude - body2.longitude);
      if (diff > 180) diff = 360 - diff;

      for (const aspect of ASPECTS) {
        // Widen orb by 25% for aspects involving the Sun or Moon
        let effectiveOrb = aspect.orb;
        const luminaries = ['Sun', 'Moon'];
        if (luminaries.includes(body1.name) || luminaries.includes(body2.name)) {
          effectiveOrb *= 1.25;
        }

        // Slightly narrow the orb for ASC/MC aspects
        const angles = ['Ascendant', 'Midheaven'];
        if (angles.includes(body1.name) || angles.includes(body2.name)) {
          effectiveOrb *= 0.75;
        }

        const deviation = Math.abs(diff - aspect.angle);

        if (deviation <= effectiveOrb) {
          // Determine whether the aspect is applying or separating
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

          // Only one aspect per pair (the one with the tightest orb)
          break;
        }
      }
    }
  }

  // Sort by orb (strongest aspects first)
  return aspects.sort((a, b) => a.orb - b.orb);
}

/**
 * Calculate aspects between two different charts (cross-chart / synastry aspects).
 * Rectangular loop: each planet in A x each planet in B.
 *
 * @param {Array} bodiesA - Celestial bodies of person 1
 * @param {Array} bodiesB - Celestial bodies of person 2
 * @returns {Array} List of cross-aspects
 */
export function calculateCrossAspects(bodiesA, bodiesB, { orbScale = 1.0 } = {}) {
  const aspects = [];

  for (const bodyA of bodiesA) {
    for (const bodyB of bodiesB) {
      // Angular distance between two longitudes (0-180°)
      let diff = Math.abs(bodyA.longitude - bodyB.longitude);
      if (diff > 180) diff = 360 - diff;

      for (const aspect of ASPECTS) {
        // Apply orbScale (0.5 for transits, 1.0 for synastry)
        let effectiveOrb = aspect.orb * orbScale;
        const luminaries = ['Sun', 'Moon'];
        if (luminaries.includes(bodyA.name) || luminaries.includes(bodyB.name)) {
          effectiveOrb *= 1.25;
        }

        // Slightly narrow the orb for ASC/MC aspects
        const angles = ['Ascendant', 'Midheaven'];
        if (angles.includes(bodyA.name) || angles.includes(bodyB.name)) {
          effectiveOrb *= 0.75;
        }

        const deviation = Math.abs(diff - aspect.angle);

        if (deviation <= effectiveOrb) {
          const isApplying = determineApplying(bodyA, bodyB, aspect.angle);

          aspects.push({
            planet1: bodyA.name,
            planet1Tr: bodyA.trName,
            planet2: bodyB.name,
            planet2Tr: bodyB.trName,
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

          // Only one aspect per pair (the one with the tightest orb)
          break;
        }
      }
    }
  }

  // Sort by orb (strongest aspects first)
  return aspects.sort((a, b) => a.orb - b.orb);
}

/**
 * Determine whether an aspect is applying or separating.
 * If the faster planet is moving toward the slower planet = applying.
 */
function determineApplying(body1, body2, aspectAngle) {
  // Cannot determine if neither body has speed data
  if (body1.speed === undefined || body2.speed === undefined) return null;
  if (body1.speed === 0 && body2.speed === 0) return null;

  // Faster planet = greater absolute speed
  const speed1 = Math.abs(body1.speed);
  const speed2 = Math.abs(body2.speed);

  // Relative motion: is the faster planet approaching the slower one?
  const relativeSpeed = body1.speed - body2.speed;

  let currentDiff = body1.longitude - body2.longitude;
  // Normalize to 0-360 range
  if (currentDiff < 0) currentDiff += 360;
  if (currentDiff > 180) currentDiff = 360 - currentDiff;

  // Will the angle approach the aspect angle in the next "step"?
  const futureBody1 = body1.longitude + body1.speed * 0.01;
  const futureBody2 = body2.longitude + body2.speed * 0.01;

  let futureDiff = Math.abs(futureBody1 - futureBody2);
  if (futureDiff > 180) futureDiff = 360 - futureDiff;

  const currentDeviation = Math.abs(currentDiff - aspectAngle);
  const futureDeviation = Math.abs(futureDiff - aspectAngle);

  return futureDeviation < currentDeviation;
}

/**
 * Calculate aspect strength on a 0-100 scale.
 * Orb 0° = 100 (exact aspect), orb = maxOrb = 0 (at the aspect boundary).
 */
function calculateAspectStrength(deviation, maxOrb) {
  if (maxOrb === 0) return 100;
  const strength = Math.round((1 - deviation / maxOrb) * 100);
  return Math.max(0, Math.min(100, strength));
}

