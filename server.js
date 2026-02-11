// server.js
import express from 'express';
import cors from 'cors';
import { calculateNatalChart } from './src/calculator.js';
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

// ========== DESTEKLENEN EV SİSTEMLERİ ==========
app.get('/api/house-systems', (req, res) => {
  res.json(HOUSE_SYSTEMS);
});

// ========== SUNUCUYU BAŞLAT ==========
app.listen(PORT, () => {
  console.log(`Celestia Engine calisiyor: http://localhost:${PORT}`);
  console.log(`API endpoint: POST http://localhost:${PORT}/api/natal-chart`);
  console.log(`Saglik kontrolu: GET http://localhost:${PORT}/health`);
});
