// server.js
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { createRequire } from 'module';
import { calculateNatalChart } from './src/calculator.js';
import { calculateSynastry } from './src/synastry.js';
import { calculateTransits } from './src/transit.js';
import { HOUSE_SYSTEMS } from './src/constants.js';

const require = createRequire(import.meta.url);
const { version } = require('./package.json');

const app = express();
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
      houseSystem
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

// ========== SUPPORTED HOUSE SYSTEMS ==========
app.get('/api/house-systems', (req, res) => {
  res.json(HOUSE_SYSTEMS);
});

// ========== START SERVER ==========
app.listen(PORT, () => {
  console.log(`Celestia Engine running: http://localhost:${PORT}`);
  console.log(`API endpoint: POST http://localhost:${PORT}/api/natal-chart`);
  console.log(`API endpoint: POST http://localhost:${PORT}/api/synastry`);
  console.log(`API endpoint: POST http://localhost:${PORT}/api/transits`);
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
