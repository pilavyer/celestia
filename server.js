// server.js
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { createRequire } from 'module';
import { calculateNatalChart, calculateRelocationChart } from './src/calculator.js';
import { calculateSynastry } from './src/synastry.js';
import { calculateTransits } from './src/transit.js';
import { calculateTransitHits } from './src/transit-hits.js';
import { calculateElectionScan } from './src/election-scan.js';
import { calculateEclipses } from './src/eclipses.js';
import { calculateAstrocartography } from './src/astrocartography.js';
import { HOUSE_SYSTEMS } from './src/constants.js';
import {
  calculateArabicParts,
  findStarConjunctions,
  calculateChartAsteroids,
  findAsteroidAspects,
  getChartSabianSymbols,
  calculateFirdaria,
  calculateProfections,
} from 'calestia-pro';
import { calculateMedicalChart } from 'celestia-medical';
import { mountAgent } from './src/agent/index.js';

const require = createRequire(import.meta.url);
const { version } = require('./package.json');

const app = express();
// Render/proxy arkasında gerçek istemci IP'si (express-rate-limit'in IP-bazlı
// sayacının tüm kullanıcıları tek LB IP'sinde toplamaması için).
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;

// ========== MIDDLEWARE ==========

// CORS — configurable via CORS_ORIGIN env var (defaults to allow all for development)
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
}));

app.use(express.json());

// Rate limiting — 100 requests per 15 minutes per IP on /api/ routes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});
app.use('/api/', apiLimiter);

// ========== HELPERS ==========

function toInt(value, field) {
  const n = parseInt(value, 10);
  if (Number.isNaN(n)) {
    throw new Error(`Invalid ${field}: "${value}" is not a valid integer`);
  }
  return n;
}

function toFloat(value, field) {
  const n = parseFloat(value);
  if (Number.isNaN(n)) {
    throw new Error(`Invalid ${field}: "${value}" is not a valid number`);
  }
  return n;
}

// ========== HEALTH CHECK ==========
app.get('/health', (req, res) => {
  res.json({ status: 'ok', engine: 'celestia', version });
});

// ========== NATAL CHART CALCULATION ==========
app.post('/api/natal-chart', (req, res) => {
  try {
    const {
      year, month, day, hour, minute,
      latitude, longitude, timezone,
      houseSystem, nodeType, lilithType
    } = req.body;

    // Required field validation
    const required = { year, month, day, hour, minute, latitude, longitude, timezone };
    const missing = Object.entries(required)
      .filter(([key, val]) => val === undefined || val === null)
      .map(([key]) => key);

    if (missing.length > 0) {
      return res.status(400).json({
        error: 'Missing fields',
        missing,
        example: {
          year: 1990, month: 7, day: 15, hour: 14, minute: 30,
          latitude: 41.01, longitude: 28.97,
          timezone: 'Europe/Istanbul',
          houseSystem: 'P'
        }
      });
    }

    const chart = calculateNatalChart({
      year: toInt(year, 'year'),
      month: toInt(month, 'month'),
      day: toInt(day, 'day'),
      hour: toInt(hour, 'hour'),
      minute: toInt(minute, 'minute'),
      latitude: toFloat(latitude, 'latitude'),
      longitude: toFloat(longitude, 'longitude'),
      timezone,
      houseSystem: houseSystem || 'P',
      nodeType: nodeType || 'true',
      lilithType: lilithType || 'mean',
    });

    res.json(chart);

  } catch (error) {
    console.error('Calculation error:', error.message);
    res.status(400).json({
      error: error.message,
      hint: 'Use IANA format for timezone (e.g.: "Europe/Istanbul", "America/New_York")'
    });
  }
});

// ========== SYNASTRY CALCULATION ==========
app.post('/api/synastry', (req, res) => {
  try {
    const { person1, person2 } = req.body;

    if (!person1 || !person2) {
      return res.status(400).json({
        error: 'Missing data: person1 and person2 objects are required',
        example: {
          person1: {
            year: 1998, month: 11, day: 25, hour: 10, minute: 17,
            latitude: 41.2867, longitude: 36.33,
            timezone: 'Europe/Istanbul', houseSystem: 'P'
          },
          person2: {
            year: 2000, month: 3, day: 15, hour: 14, minute: 30,
            latitude: 39.9208, longitude: 32.8541,
            timezone: 'Europe/Istanbul', houseSystem: 'P'
          }
        }
      });
    }

    // Required field validation for both persons
    const requiredFields = ['year', 'month', 'day', 'hour', 'minute', 'latitude', 'longitude', 'timezone'];

    for (const [label, person] of [['person1', person1], ['person2', person2]]) {
      const missing = requiredFields.filter(f => person[f] === undefined || person[f] === null);
      if (missing.length > 0) {
        return res.status(400).json({
          error: `Missing fields for ${label}`,
          missing,
        });
      }
    }

    const result = calculateSynastry(
      {
        year: toInt(person1.year, 'person1.year'),
        month: toInt(person1.month, 'person1.month'),
        day: toInt(person1.day, 'person1.day'),
        hour: toInt(person1.hour, 'person1.hour'),
        minute: toInt(person1.minute, 'person1.minute'),
        latitude: toFloat(person1.latitude, 'person1.latitude'),
        longitude: toFloat(person1.longitude, 'person1.longitude'),
        timezone: person1.timezone,
        houseSystem: person1.houseSystem || 'P',
      },
      {
        year: toInt(person2.year, 'person2.year'),
        month: toInt(person2.month, 'person2.month'),
        day: toInt(person2.day, 'person2.day'),
        hour: toInt(person2.hour, 'person2.hour'),
        minute: toInt(person2.minute, 'person2.minute'),
        latitude: toFloat(person2.latitude, 'person2.latitude'),
        longitude: toFloat(person2.longitude, 'person2.longitude'),
        timezone: person2.timezone,
        houseSystem: person2.houseSystem || 'P',
      }
    );

    res.json(result);

  } catch (error) {
    console.error('Synastry calculation error:', error.message);
    res.status(400).json({
      error: error.message,
      hint: 'Check birth data for both persons'
    });
  }
});

// ========== RELOCATION CHART ==========
app.post('/api/relocation', (req, res) => {
  try {
    const {
      year, month, day, hour, minute,
      latitude, longitude, timezone,
      houseSystem,
      newLatitude, newLongitude, newHouseSystem
    } = req.body;

    // Required field validation (natal birth data + new location)
    const required = { year, month, day, hour, minute, latitude, longitude, timezone, newLatitude, newLongitude };
    const missing = Object.entries(required)
      .filter(([key, val]) => val === undefined || val === null)
      .map(([key]) => key);

    if (missing.length > 0) {
      return res.status(400).json({
        error: 'Missing fields',
        missing,
        example: {
          year: 1990, month: 7, day: 15, hour: 14, minute: 30,
          latitude: 41.01, longitude: 28.97,
          timezone: 'Europe/Istanbul',
          houseSystem: 'P',
          newLatitude: 40.7128, newLongitude: -74.0060,
          newHouseSystem: 'P'
        }
      });
    }

    // First calculate natal chart
    const natalChart = calculateNatalChart({
      year: toInt(year, 'year'),
      month: toInt(month, 'month'),
      day: toInt(day, 'day'),
      hour: toInt(hour, 'hour'),
      minute: toInt(minute, 'minute'),
      latitude: toFloat(latitude, 'latitude'),
      longitude: toFloat(longitude, 'longitude'),
      timezone,
      houseSystem: houseSystem || 'P',
    });

    // Calculate relocation chart
    const result = calculateRelocationChart(
      natalChart,
      toFloat(newLatitude, 'newLatitude'),
      toFloat(newLongitude, 'newLongitude'),
      newHouseSystem || houseSystem || 'P'
    );

    res.json(result);

  } catch (error) {
    console.error('Relocation calculation error:', error.message);
    res.status(400).json({
      error: error.message,
      hint: 'Provide natal birth data + new location coordinates'
    });
  }
});

// ========== TRANSIT CALCULATION ==========
app.post('/api/transits', (req, res) => {
  try {
    const {
      year, month, day, hour, minute,
      latitude, longitude, timezone,
      houseSystem,
      days, startDate, topN
    } = req.body;

    // Required field validation
    const required = { year, month, day, hour, minute, latitude, longitude, timezone };
    const missing = Object.entries(required)
      .filter(([key, val]) => val === undefined || val === null)
      .map(([key]) => key);

    if (missing.length > 0) {
      return res.status(400).json({
        error: 'Missing fields',
        missing,
        example: {
          year: 1998, month: 11, day: 25, hour: 10, minute: 17,
          latitude: 41.2867, longitude: 36.33,
          timezone: 'Europe/Istanbul',
          houseSystem: 'P',
          days: 30, startDate: '2026-02-12', topN: 10
        }
      });
    }

    // days validation
    const periodDays = days ? toInt(days, 'days') : 30;
    if (periodDays < 1 || periodDays > 365) {
      return res.status(400).json({
        error: 'days must be between 1 and 365',
      });
    }

    const result = calculateTransits(
      {
        year: toInt(year, 'year'),
        month: toInt(month, 'month'),
        day: toInt(day, 'day'),
        hour: toInt(hour, 'hour'),
        minute: toInt(minute, 'minute'),
        latitude: toFloat(latitude, 'latitude'),
        longitude: toFloat(longitude, 'longitude'),
        timezone,
        houseSystem: houseSystem || 'P',
      },
      {
        days: periodDays,
        startDate: startDate || null,
        topN: topN ? toInt(topN, 'topN') : 10,
      }
    );

    res.json(result);

  } catch (error) {
    console.error('Transit calculation error:', error.message);
    res.status(400).json({
      error: error.message,
      hint: 'Check natal birth data'
    });
  }
});

// ========== ECLIPSE CALCULATION ==========
app.post('/api/eclipses', (req, res) => {
  try {
    const { year, startDate, endDate, natal } = req.body;

    // At least year or startDate+endDate is required
    if (!year && (!startDate || !endDate)) {
      return res.status(400).json({
        error: 'Either year or startDate+endDate is required',
        example: {
          year: 2026,
        },
        exampleWithRange: {
          startDate: '2026-01-01',
          endDate: '2026-12-31',
        },
      });
    }

    // Validate year if provided
    if (year !== undefined) {
      const y = toInt(year, 'year');
      if (y < 1800 || y > 2400) {
        return res.status(400).json({
          error: 'year must be between 1800 and 2400',
        });
      }
    }

    // Build params
    const params = {};
    if (year) params.year = toInt(year, 'year');
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    // Optional natal data for aspect calculation
    if (natal) {
      // Validate natal data
      const requiredFields = ['year', 'month', 'day', 'hour', 'minute', 'latitude', 'longitude', 'timezone'];
      const missing = requiredFields.filter(f => natal[f] === undefined || natal[f] === null);
      if (missing.length > 0) {
        return res.status(400).json({
          error: 'Missing natal fields',
          missing,
        });
      }

      // Calculate natal chart for aspect comparison
      const natalChart = calculateNatalChart({
        year: toInt(natal.year, 'natal.year'),
        month: toInt(natal.month, 'natal.month'),
        day: toInt(natal.day, 'natal.day'),
        hour: toInt(natal.hour, 'natal.hour'),
        minute: toInt(natal.minute, 'natal.minute'),
        latitude: toFloat(natal.latitude, 'natal.latitude'),
        longitude: toFloat(natal.longitude, 'natal.longitude'),
        timezone: natal.timezone,
        houseSystem: natal.houseSystem || 'P',
      });
      params.natal = natalChart;
    }

    const result = calculateEclipses(params);
    res.json(result);

  } catch (error) {
    console.error('Eclipse calculation error:', error.message);
    res.status(400).json({
      error: error.message,
    });
  }
});

// ========== ASTROCARTOGRAPHY ==========
app.post('/api/astrocartography', (req, res) => {
  try {
    const {
      year, month, day, hour, minute,
      latitude, longitude, timezone,
      houseSystem,
      longitudeStep, planets, lineTypes
    } = req.body;

    // Required field validation
    const required = { year, month, day, hour, minute, latitude, longitude, timezone };
    const missing = Object.entries(required)
      .filter(([key, val]) => val === undefined || val === null)
      .map(([key]) => key);

    if (missing.length > 0) {
      return res.status(400).json({
        error: 'Missing fields',
        missing,
        example: {
          year: 1990, month: 7, day: 15, hour: 14, minute: 30,
          latitude: 41.01, longitude: 28.97,
          timezone: 'Europe/Istanbul',
          houseSystem: 'P',
          longitudeStep: 10,
        }
      });
    }

    const chart = calculateNatalChart({
      year: toInt(year, 'year'),
      month: toInt(month, 'month'),
      day: toInt(day, 'day'),
      hour: toInt(hour, 'hour'),
      minute: toInt(minute, 'minute'),
      latitude: toFloat(latitude, 'latitude'),
      longitude: toFloat(longitude, 'longitude'),
      timezone,
      houseSystem: houseSystem || 'P',
    });

    const acgOptions = {};
    if (longitudeStep) acgOptions.longitudeStep = toInt(longitudeStep, 'longitudeStep');
    if (planets) acgOptions.planets = planets;
    if (lineTypes) acgOptions.lineTypes = lineTypes;

    const result = calculateAstrocartography(chart, acgOptions);
    res.json(result);

  } catch (error) {
    console.error('Astrocartography error:', error.message);
    res.status(400).json({
      error: error.message,
    });
  }
});

// ========== ENRICHED NATAL CHART ==========
// ========== ELECTION SCAN (single-call scored day/time windows) ==========
app.post('/api/election-scan', (req, res) => {
  try {
    const {
      year, month, day, hour, minute, latitude, longitude, timezone,
      startDate, days, purpose, eventLatitude, eventLongitude, eventTimezone,
      startHour, endHour, stepMinutes,
    } = req.body;

    const required = { year, month, day, hour, minute, latitude, longitude, timezone, startDate };
    const missing = Object.entries(required)
      .filter(([, val]) => val === undefined || val === null)
      .map(([key]) => key);
    if (missing.length > 0) {
      return res.status(400).json({ error: 'Missing fields', missing });
    }

    const result = calculateElectionScan({
      year: toInt(year, 'year'), month: toInt(month, 'month'), day: toInt(day, 'day'),
      hour: toInt(hour, 'hour'), minute: toInt(minute, 'minute'),
      latitude: toFloat(latitude, 'latitude'), longitude: toFloat(longitude, 'longitude'),
      timezone, startDate, days, purpose,
      eventLatitude, eventLongitude, eventTimezone, startHour, endHour, stepMinutes,
    });
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ========== TRANSIT HITS (single-call aggregation for agent consumers) ==========
app.post('/api/transit-hits', (req, res) => {
  try {
    const {
      year, month, day, hour, minute, latitude, longitude, timezone,
      houseSystem, date, time, orbScale, includeAngles,
    } = req.body;

    const required = { year, month, day, hour, minute, latitude, longitude, timezone, date };
    const missing = Object.entries(required)
      .filter(([, val]) => val === undefined || val === null)
      .map(([key]) => key);

    if (missing.length > 0) {
      return res.status(400).json({ error: 'Missing fields', missing });
    }

    const result = calculateTransitHits({
      year: toInt(year, 'year'),
      month: toInt(month, 'month'),
      day: toInt(day, 'day'),
      hour: toInt(hour, 'hour'),
      minute: toInt(minute, 'minute'),
      latitude: toFloat(latitude, 'latitude'),
      longitude: toFloat(longitude, 'longitude'),
      timezone,
      houseSystem: houseSystem || 'P',
      date,
      time,
      orbScale,
      includeAngles,
    });

    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/natal-chart-enriched', (req, res) => {
  try {
    const {
      year, month, day, hour, minute,
      latitude, longitude, timezone,
      houseSystem, nodeType, lilithType,
      targetDate: targetDateParam, fixedStarOrb
    } = req.body;

    if (targetDateParam !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(String(targetDateParam))) {
      return res.status(400).json({ error: 'Invalid targetDate. Expected format: YYYY-MM-DD' });
    }
    if (fixedStarOrb !== undefined && (typeof fixedStarOrb !== 'number' || fixedStarOrb <= 0 || fixedStarOrb > 10)) {
      return res.status(400).json({ error: 'Invalid fixedStarOrb. Expected a number in (0, 10]' });
    }

    const required = { year, month, day, hour, minute, latitude, longitude, timezone };
    const missing = Object.entries(required)
      .filter(([, val]) => val === undefined || val === null)
      .map(([key]) => key);

    if (missing.length > 0) {
      return res.status(400).json({ error: 'Missing fields', missing });
    }

    const params = {
      year: toInt(year, 'year'),
      month: toInt(month, 'month'),
      day: toInt(day, 'day'),
      hour: toInt(hour, 'hour'),
      minute: toInt(minute, 'minute'),
      latitude: toFloat(latitude, 'latitude'),
      longitude: toFloat(longitude, 'longitude'),
      timezone,
      houseSystem: houseSystem || 'P',
      nodeType: nodeType || 'true',
      lilithType: lilithType || 'mean',
    };

    const natalChart = calculateNatalChart(params);

    // Pro enrichments
    const arabicParts = calculateArabicParts(natalChart);
    const fixedStars = fixedStarOrb !== undefined
      ? findStarConjunctions(natalChart, { orb: fixedStarOrb })
      : findStarConjunctions(natalChart);
    const asteroids = calculateChartAsteroids(natalChart);
    const asteroidAspects = findAsteroidAspects(asteroids, natalChart.planets);
    const sabianSymbols = getChartSabianSymbols(natalChart);

    const isDayChart = natalChart.analysis?.isDayChart ?? true;

    const today = new Date();
    const targetDate = targetDateParam
      || `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const firdaria = calculateFirdaria({
      year: params.year,
      month: params.month,
      day: params.day,
      isDayChart,
      targetDate,
    });

    const profections = calculateProfections(natalChart, targetDate);

    res.json({
      ...natalChart,
      enrichment: {
        arabicParts,
        fixedStars,
        asteroids,
        asteroidAspects,
        sabianSymbols,
        firdaria,
        profections,
        meta: {
          targetDate,
          fixedStarOrb: fixedStarOrb ?? 1.5,
        },
      },
    });

  } catch (error) {
    console.error('Enriched natal calculation error:', error.message);
    res.status(400).json({
      error: error.message,
      hint: 'Use IANA format for timezone (e.g.: "Europe/Istanbul", "America/New_York")'
    });
  }
});

// ========== MEDICAL CHART ==========
app.post('/api/medical-chart', (req, res) => {
  try {
    const {
      year, month, day, hour, minute,
      latitude, longitude, timezone,
      houseSystem
    } = req.body;

    const required = { year, month, day, hour, minute, latitude, longitude, timezone };
    const missing = Object.entries(required)
      .filter(([, val]) => val === undefined || val === null)
      .map(([key]) => key);

    if (missing.length > 0) {
      return res.status(400).json({ error: 'Missing fields', missing });
    }

    const chart = calculateMedicalChart({
      year: toInt(year, 'year'),
      month: toInt(month, 'month'),
      day: toInt(day, 'day'),
      hour: toInt(hour, 'hour'),
      minute: toInt(minute, 'minute'),
      latitude: toFloat(latitude, 'latitude'),
      longitude: toFloat(longitude, 'longitude'),
      timezone,
      houseSystem: houseSystem || 'P',
    });

    res.json(chart);

  } catch (error) {
    console.error('Medical chart calculation error:', error.message);
    res.status(400).json({
      error: error.message,
      hint: 'Use IANA format for timezone (e.g.: "Europe/Istanbul", "America/New_York")'
    });
  }
});

// ========== ENRICHED SYNASTRY ==========
app.post('/api/synastry-enriched', (req, res) => {
  try {
    const { person1, person2 } = req.body;

    if (!person1 || !person2) {
      return res.status(400).json({
        error: 'Missing data: person1 and person2 objects are required',
      });
    }

    const requiredFields = ['year', 'month', 'day', 'hour', 'minute', 'latitude', 'longitude', 'timezone'];

    for (const [label, person] of [['person1', person1], ['person2', person2]]) {
      const missing = requiredFields.filter(f => person[f] === undefined || person[f] === null);
      if (missing.length > 0) {
        return res.status(400).json({ error: `Missing fields for ${label}`, missing });
      }
    }

    const p1Params = {
      year: toInt(person1.year, 'person1.year'),
      month: toInt(person1.month, 'person1.month'),
      day: toInt(person1.day, 'person1.day'),
      hour: toInt(person1.hour, 'person1.hour'),
      minute: toInt(person1.minute, 'person1.minute'),
      latitude: toFloat(person1.latitude, 'person1.latitude'),
      longitude: toFloat(person1.longitude, 'person1.longitude'),
      timezone: person1.timezone,
      houseSystem: person1.houseSystem || 'P',
    };
    const p2Params = {
      year: toInt(person2.year, 'person2.year'),
      month: toInt(person2.month, 'person2.month'),
      day: toInt(person2.day, 'person2.day'),
      hour: toInt(person2.hour, 'person2.hour'),
      minute: toInt(person2.minute, 'person2.minute'),
      latitude: toFloat(person2.latitude, 'person2.latitude'),
      longitude: toFloat(person2.longitude, 'person2.longitude'),
      timezone: person2.timezone,
      houseSystem: person2.houseSystem || 'P',
    };

    const synastryResult = calculateSynastry(p1Params, p2Params);

    // Calculate full natal charts for pro enrichments (synastry person objects lack meta.julianDayET)
    const p1Chart = calculateNatalChart(p1Params);
    const p2Chart = calculateNatalChart(p2Params);

    const p1ArabicParts = calculateArabicParts(p1Chart);
    const p2ArabicParts = calculateArabicParts(p2Chart);

    const p1Asteroids = calculateChartAsteroids(p1Chart);
    const p2Asteroids = calculateChartAsteroids(p2Chart);

    // Cross-asteroid aspects: person1 asteroids × person2 planets and vice versa
    const p1AsteroidsCrossP2 = findAsteroidAspects(p1Asteroids, p2Chart.planets);
    const p2AsteroidsCrossP1 = findAsteroidAspects(p2Asteroids, p1Chart.planets);

    res.json({
      ...synastryResult,
      enrichment: {
        person1: {
          arabicParts: p1ArabicParts,
          asteroids: p1Asteroids,
        },
        person2: {
          arabicParts: p2ArabicParts,
          asteroids: p2Asteroids,
        },
        crossAsteroidAspects: {
          person1AsteroidsToP2Planets: p1AsteroidsCrossP2,
          person2AsteroidsToP1Planets: p2AsteroidsCrossP1,
        },
      },
    });

  } catch (error) {
    console.error('Enriched synastry calculation error:', error.message);
    res.status(400).json({
      error: error.message,
      hint: 'Check birth data for both persons'
    });
  }
});

// ========== SUPPORTED HOUSE SYSTEMS ==========
app.get('/api/house-systems', (req, res) => {
  res.json(HOUSE_SYSTEMS);
});

// ========== START SERVER ==========
// Bozuk JSON gövdesi: HTML hata sayfası yerine kodlu temiz JSON
app.use((err, req, res, next) => {
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ code: 'API-400-BODY', error: 'Geçersiz JSON gövdesi' });
  }
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ code: 'API-413-BODY', error: 'İstek gövdesi çok büyük' });
  }
  next(err);
});

// ========== CALESTIA UZMANI AGENT (env-gated: AGENT_ENABLED=true) ==========
mountAgent(app);

app.listen(PORT, () => {
  console.log(`Celestia Engine running: http://localhost:${PORT}`);
  console.log(`API endpoint: POST http://localhost:${PORT}/api/natal-chart`);
  console.log(`API endpoint: POST http://localhost:${PORT}/api/natal-chart-enriched`);
  console.log(`API endpoint: POST http://localhost:${PORT}/api/medical-chart`);
  console.log(`API endpoint: POST http://localhost:${PORT}/api/synastry`);
  console.log(`API endpoint: POST http://localhost:${PORT}/api/synastry-enriched`);
  console.log(`API endpoint: POST http://localhost:${PORT}/api/relocation`);
  console.log(`API endpoint: POST http://localhost:${PORT}/api/transits`);
  console.log(`API endpoint: POST http://localhost:${PORT}/api/eclipses`);
  console.log(`API endpoint: POST http://localhost:${PORT}/api/astrocartography`);
  console.log(`Health check: GET http://localhost:${PORT}/health`);
});

// ========== PROCESS ERROR HANDLERS ==========
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
  process.exit(1);
});
