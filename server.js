// server.js
import express from 'express';
import cors from 'cors';
import { calculateNatalChart } from './src/calculator.js';
import { calculateSynastry } from './src/synastry.js';
import { calculateTransits } from './src/transit.js';
import { HOUSE_SYSTEMS } from './src/constants.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ========== SAĞLIK KONTROLÜ ==========
app.get('/health', (req, res) => {
  res.json({ status: 'ok', engine: 'celestia', version: '1.0.0' });
});

// ========== DOĞUM HARİTASI HESAPLA ==========
app.post('/api/natal-chart', (req, res) => {
  try {
    const {
      year, month, day, hour, minute,
      latitude, longitude, timezone,
      houseSystem
    } = req.body;

    // Zorunlu alan kontrolü
    const required = { year, month, day, hour, minute, latitude, longitude, timezone };
    const missing = Object.entries(required)
      .filter(([key, val]) => val === undefined || val === null)
      .map(([key]) => key);

    if (missing.length > 0) {
      return res.status(400).json({
        error: 'Eksik alanlar',
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
      year: parseInt(year),
      month: parseInt(month),
      day: parseInt(day),
      hour: parseInt(hour),
      minute: parseInt(minute),
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      timezone,
      houseSystem: houseSystem || 'P',
    });

    res.json(chart);

  } catch (error) {
    console.error('Hesaplama hatasi:', error.message);
    res.status(400).json({
      error: error.message,
      hint: 'Timezone icin IANA formati kullanin (orn: "Europe/Istanbul", "America/New_York")'
    });
  }
});

// ========== SYNASTRY HESAPLA ==========
app.post('/api/synastry', (req, res) => {
  try {
    const { person1, person2 } = req.body;

    if (!person1 || !person2) {
      return res.status(400).json({
        error: 'Eksik veri: person1 ve person2 nesneleri gerekli',
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

    // Her iki kişi için zorunlu alan kontrolü
    const requiredFields = ['year', 'month', 'day', 'hour', 'minute', 'latitude', 'longitude', 'timezone'];

    for (const [label, person] of [['person1', person1], ['person2', person2]]) {
      const missing = requiredFields.filter(f => person[f] === undefined || person[f] === null);
      if (missing.length > 0) {
        return res.status(400).json({
          error: `${label} icin eksik alanlar`,
          missing,
        });
      }
    }

    const result = calculateSynastry(
      {
        year: parseInt(person1.year),
        month: parseInt(person1.month),
        day: parseInt(person1.day),
        hour: parseInt(person1.hour),
        minute: parseInt(person1.minute),
        latitude: parseFloat(person1.latitude),
        longitude: parseFloat(person1.longitude),
        timezone: person1.timezone,
        houseSystem: person1.houseSystem || 'P',
      },
      {
        year: parseInt(person2.year),
        month: parseInt(person2.month),
        day: parseInt(person2.day),
        hour: parseInt(person2.hour),
        minute: parseInt(person2.minute),
        latitude: parseFloat(person2.latitude),
        longitude: parseFloat(person2.longitude),
        timezone: person2.timezone,
        houseSystem: person2.houseSystem || 'P',
      }
    );

    res.json(result);

  } catch (error) {
    console.error('Synastry hesaplama hatasi:', error.message);
    res.status(400).json({
      error: error.message,
      hint: 'Her iki kisi icin dogum bilgilerini kontrol edin'
    });
  }
});

// ========== TRANSİT HESAPLA ==========
app.post('/api/transits', (req, res) => {
  try {
    const {
      year, month, day, hour, minute,
      latitude, longitude, timezone,
      houseSystem,
      days, startDate, topN
    } = req.body;

    // Zorunlu alan kontrolü
    const required = { year, month, day, hour, minute, latitude, longitude, timezone };
    const missing = Object.entries(required)
      .filter(([key, val]) => val === undefined || val === null)
      .map(([key]) => key);

    if (missing.length > 0) {
      return res.status(400).json({
        error: 'Eksik alanlar',
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

    // days validasyonu
    const periodDays = days ? parseInt(days) : 30;
    if (periodDays < 1 || periodDays > 365) {
      return res.status(400).json({
        error: 'days 1-365 arasinda olmali',
      });
    }

    const result = calculateTransits(
      {
        year: parseInt(year),
        month: parseInt(month),
        day: parseInt(day),
        hour: parseInt(hour),
        minute: parseInt(minute),
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        timezone,
        houseSystem: houseSystem || 'P',
      },
      {
        days: periodDays,
        startDate: startDate || null,
        topN: topN ? parseInt(topN) : 10,
      }
    );

    res.json(result);

  } catch (error) {
    console.error('Transit hesaplama hatasi:', error.message);
    res.status(400).json({
      error: error.message,
      hint: 'Natal dogum bilgilerini kontrol edin'
    });
  }
});

// ========== DESTEKLENEN EV SİSTEMLERİ ==========
app.get('/api/house-systems', (req, res) => {
  res.json(HOUSE_SYSTEMS);
});

// ========== SUNUCUYU BAŞLAT ==========
app.listen(PORT, () => {
  console.log(`Celestia Engine calisiyor: http://localhost:${PORT}`);
  console.log(`API endpoint: POST http://localhost:${PORT}/api/natal-chart`);
  console.log(`API endpoint: POST http://localhost:${PORT}/api/synastry`);
  console.log(`API endpoint: POST http://localhost:${PORT}/api/transits`);
  console.log(`Saglik kontrolu: GET http://localhost:${PORT}/health`);
});
