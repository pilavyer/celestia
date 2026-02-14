# Celestia → AstroAK Backend Integration Guide

This document contains step-by-step instructions for integrating the Celestia astrology engine into the AstroAK backend (Express.js, Render.com). Goal: completely remove AstrologyAPI (paid third-party service) and replace it with Celestia's local calculation functions.

## Prerequisites

- **Celestia repo:** `github.com/pilavyer/celestia` (AGPL-3.0, public)
- **AstroAK backend:** `backend/server.js` (Express.js, Render.com)
- **Current flow:** Frontend → Next.js API routes → Backend → AstrologyAPI
- **Target flow:** Frontend → Next.js API routes → Backend → Celestia (local import)
- **NO changes to frontend** — Backend will continue returning the same response format

## Architecture Overview

```
AstroAK Backend (Render.com)
├── server.js              ← Existing Express app (endpoints will change)
├── celestia/              ← NEW: Celestia engine
│   ├── src/
│   │   ├── calculator.js
│   │   ├── synastry.js
│   │   ├── transit.js
│   │   ├── aspects.js
│   │   ├── dignities.js
│   │   ├── timezone.js
│   │   ├── utils.js
│   │   └── constants.js
│   └── ephe/              ← Swiss Ephemeris data files
├── data/
│   └── retrogrades.json   ← Existing (will not change)
└── package.json           ← sweph + luxon dependencies will be added
```

---

## STEP 1: Copy Celestia files to the backend

### Instructions:

1. Create the `celestia/` directory in the AstroAK backend folder:
   ```bash
   cd /path/to/astroak/backend
   mkdir -p celestia
   ```

2. Copy the `src/` and `ephe/` directories from the Celestia repo:
   ```bash
   cp -r /path/to/calestia/src celestia/
   cp -r /path/to/calestia/ephe celestia/
   ```

3. Add these dependencies to `backend/package.json` (if not already present):
   ```json
   "sweph": "2.10.3-4",
   "luxon": "^3.0.0"
   ```

4. Add `"type": "module"` to `backend/package.json`. If the backend currently uses CommonJS (require/module.exports), **there are two options:**

   **Option A (Recommended):** Migrate the backend to ES modules — convert all `require()` → `import`, `module.exports` → `export`

   **Option B:** Convert Celestia's src files to CommonJS — more work, not recommended

   **NOTE:** The existing backend uses `require()` (CommonJS). Celestia uses `import/export` (ES modules). This incompatibility must be resolved.

5. Run `npm install` and verify that the `sweph` native addon compiles successfully.

### Verification:
- `ls backend/celestia/src/` → should show 8 JS files
- `ls backend/celestia/ephe/` → should show `.se1` ephemeris files
- `npm install` should complete without errors
- `node -e "import('sweph')"` should work (ES module test) OR `node -e "require('sweph')"` (CommonJS)

### Expected Output:
- File structure screenshot or `ls` output
- Did `npm install` succeed?
- Is the backend currently CommonJS (require) or ES modules (import)?

---

## STEP 2: Migrate backend to ES Modules (CommonJS → ESM)

### Why:
Celestia uses `import/export`. The backend uses `require()`. Mixing these in the same project causes issues.

### Instructions:

1. Add `"type": "module"` to `backend/package.json`

2. Convert the `require()` statements at the top of `backend/server.js` to `import`:

   **Before (CommonJS):**
   ```js
   require('dotenv').config();
   const express = require('express');
   const cors = require('cors');
   const rateLimit = require('express-rate-limit');
   const OpenAI = require('openai');
   const { DateTime } = require('luxon');
   const fs = require('fs');
   const path = require('path');
   ```

   **After (ES Modules):**
   ```js
   import 'dotenv/config';
   import express from 'express';
   import cors from 'cors';
   import rateLimit from 'express-rate-limit';
   import OpenAI from 'openai';
   import { DateTime } from 'luxon';
   import fs from 'fs';
   import path from 'path';
   import { fileURLToPath } from 'url';

   const __filename = fileURLToPath(import.meta.url);
   const __dirname = path.dirname(__filename);
   ```

3. Convert any remaining `require()` calls in the rest of the file to `import`.

4. Convert `module.exports` to `export` if present (unlikely — server.js usually doesn't export).

### Verification:
- `node server.js` should work (with existing AstrologyAPI — Celestia not connected yet)
- All existing endpoints should continue working
- No frontend behavior should change

### Expected Output:
- Does `node server.js` start successfully?
- Do existing natal/synastry/transit endpoints still work?

---

## STEP 3: Add Celestia imports and write adapter functions

### Instructions:

Add Celestia imports at the top of `server.js`:

```js
import { calculateNatalChart } from './celestia/src/calculator.js';
import { calculateSynastry } from './celestia/src/synastry.js';
import { calculateTransits, calculateLunarMetrics, nowToJD } from './celestia/src/transit.js';
```

Then add these adapter functions inside `server.js` (BEFORE the endpoints):

```js
// ============================================
// Celestia → AstroAK Response Adapter
// ============================================

/**
 * Convert Celestia natal chart result to AstroAK frontend format.
 * NO changes required on the frontend.
 */
function adaptNatalResponse(celestiaResult) {
  // Planets: Convert Celestia format to AstroAK format
  const planets = celestiaResult.planets.map(p => ({
    name: p.name,
    sign: p.sign,
    fullDegree: p.longitude,
    normDegree: p.degree + p.minute / 60 + p.second / 3600,
    isRetro: p.isRetrograde,
    house: p.house,
  }));

  // Houses: Convert Celestia format to AstroAK format
  const houses = celestiaResult.houses.cusps.map(h => ({
    houseId: h.house,
    sign: h.sign,
    startDegree: h.cusp,
    endDegree: null, // Celestia doesn't have endDegree, frontend doesn't use it anyway
  }));

  // Aspects: Convert Celestia format to AstroAK format
  const aspects = celestiaResult.aspects.map(a => ({
    aspecting_planet: a.planet1,
    aspected_planet: a.planet2,
    type: a.type,
    orb: a.orb,
  }));

  return {
    success: true,
    chart: null, // SVG wheel chart — not available in Celestia, to be resolved separately
    planets,
    houses,
    aspects,
    // Celestia's extra data (very valuable for AI context)
    analysis: celestiaResult.analysis,
    meta: celestiaResult.meta,
  };
}

/**
 * Convert Celestia synastry result to AstroAK frontend format.
 */
function adaptSynastryResponse(celestiaResult) {
  const adaptPlanets = (planets) => planets.map(p => ({
    name: p.name,
    sign: p.sign,
    full_degree: p.longitude,
    norm_degree: p.degree + p.minute / 60 + p.second / 3600,
    is_retro: p.isRetrograde,
    house: p.house,
  }));

  const adaptHouses = (cusps) => cusps.map(h => ({
    houseId: h.house,
    sign: h.sign,
    startDegree: h.cusp,
    endDegree: null,
  }));

  // Cross-aspects → synastry.aspects format
  const aspects = celestiaResult.synastry.crossAspects.map(a => ({
    aspecting_planet: a.planet1,
    aspected_planet: a.planet2,
    type: a.type,
    orb: a.orb,
  }));

  return {
    success: true,
    synastry: {
      first: adaptPlanets(celestiaResult.person1.planets),
      second: adaptPlanets(celestiaResult.person2.planets),
      aspects: aspects,
      // Additional bonus data (valuable for AI context even if frontend doesn't use it)
      houseOverlay: celestiaResult.synastry.houseOverlay,
      composite: celestiaResult.composite,
    },
    houses1: adaptHouses(celestiaResult.person1.houses.cusps),
    houses2: adaptHouses(celestiaResult.person2.houses.cusps),
  };
}

/**
 * Convert Celestia transit result to AstroAK frontend format.
 */
function adaptTransitResponse(celestiaResult) {
  const adaptTransitList = (list) => list.map(t => ({
    date: t.date,
    transit_planet: t.transitPlanet,
    natal_planet: t.natalPlanet,
    type: t.type,
    orb: t.orb,
    // Extra Celestia data
    strength: t.strength,
    maxOrb: t.maxOrb,
  }));

  const adaptTimingList = (list) => list.map(t => ({
    transit_planet: t.transitPlanet,
    natal_planet: t.natalPlanet,
    type: t.type,
    orb: t.orb,
    strength: t.strength,
    start_time: t.startTime,
    exact_time: t.exactTime,
    end_time: t.endTime,
  }));

  return {
    success: true,
    monthStartDate: celestiaResult.monthStartDate,
    monthEndDate: celestiaResult.monthEndDate,
    ascendant: celestiaResult.ascendant,
    moonPhase: celestiaResult.moonPhase,
    retrogrades: celestiaResult.retrogrades,
    allTransits: adaptTransitList(celestiaResult.allTransits),
    todayTransits: adaptTransitList(celestiaResult.todayTransits),
    weekTransits: adaptTransitList(celestiaResult.weekTransits),
    weeklyWithTiming: adaptTimingList(celestiaResult.weeklyWithTiming),
    importantTransits: adaptTimingList(celestiaResult.importantTransits),
    allEvents: adaptTimingList(celestiaResult.allEvents),
    lunar: celestiaResult.lunar,
    fetchedAt: celestiaResult.fetchedAt,
  };
}
```

### Verification:
- `node server.js` should start without errors (imports should work)
- Endpoints are not changed yet, existing AstrologyAPI is still active

### Expected Output:
- Any import errors?
- Does `node server.js` start?

---

## STEP 4: Switch endpoints to Celestia

### Instructions:

Switch each endpoint one by one. Test each one after switching.

### 4a: `/api/natal` endpoint

Remove existing AstrologyAPI calls, use Celestia:

```js
app.post('/api/natal', async (req, res) => {
  try {
    const { day, month, year, hour, min, lat, lon, tzone, timezoneName } = req.body;

    if (!day || !month || !year || hour === undefined || min === undefined || !lat || !lon) {
      return res.status(400).json({ error: 'Missing required birth data fields' });
    }

    // Use IANA timezone (Celestia expects IANA, not numeric offset)
    if (!timezoneName) {
      return res.status(400).json({
        error: 'timezoneName (IANA format) is required',
        example: 'Europe/Istanbul'
      });
    }

    const chart = calculateNatalChart({
      year: parseInt(year),
      month: parseInt(month),
      day: parseInt(day),
      hour: parseInt(hour),
      minute: parseInt(min),
      latitude: parseFloat(lat),
      longitude: parseFloat(lon),
      timezone: timezoneName,
      houseSystem: 'P',
    });

    const response = adaptNatalResponse(chart);

    // Include birthData for compatibility
    response.birthData = {
      day: parseInt(day),
      month: parseInt(month),
      year: parseInt(year),
      hour: parseInt(hour),
      min: parseInt(min),
      lat: parseFloat(lat),
      lon: parseFloat(lon),
      tzone: parseFloat(tzone || 0),
    };

    res.json(response);
  } catch (error) {
    log.error('Natal Chart Error:', error.message);
    res.status(400).json({ error: error.message });
  }
});
```

### 4b: `/api/synastry` endpoint

```js
app.post('/api/synastry', async (req, res) => {
  try {
    const { person1, person2 } = req.body;

    if (!person1 || !person2) {
      return res.status(400).json({ error: 'Both person1 and person2 birth data required' });
    }

    if (!person1.timezoneName || !person2.timezoneName) {
      return res.status(400).json({ error: 'timezoneName required for both persons' });
    }

    const result = calculateSynastry(
      {
        year: parseInt(person1.year),
        month: parseInt(person1.month),
        day: parseInt(person1.day),
        hour: parseInt(person1.hour),
        minute: parseInt(person1.min),
        latitude: parseFloat(person1.lat),
        longitude: parseFloat(person1.lon),
        timezone: person1.timezoneName,
        houseSystem: 'P',
      },
      {
        year: parseInt(person2.year),
        month: parseInt(person2.month),
        day: parseInt(person2.day),
        hour: parseInt(person2.hour),
        minute: parseInt(person2.min),
        latitude: parseFloat(person2.lat),
        longitude: parseFloat(person2.lon),
        timezone: person2.timezoneName,
        houseSystem: 'P',
      }
    );

    res.json(adaptSynastryResponse(result));
  } catch (error) {
    log.error('Synastry Error:', error.message);
    res.status(400).json({ error: error.message });
  }
});
```

### 4c: `/api/transits` endpoint

```js
app.post('/api/transits', async (req, res) => {
  try {
    const birthData = req.body.birthData || req.body;

    if (!birthData || !birthData.day || !birthData.month || !birthData.year) {
      return res.status(400).json({ error: 'Birth data required' });
    }

    const timezoneName = birthData.timezoneName || req.body.timezoneName;
    if (!timezoneName) {
      return res.status(400).json({ error: 'timezoneName required' });
    }

    const hour = birthData.hour;
    const min = birthData.min ?? birthData.minute;
    const lat = birthData.lat ?? birthData.latitude;
    const lon = birthData.lon ?? birthData.longitude;

    const result = calculateTransits(
      {
        year: parseInt(birthData.year),
        month: parseInt(birthData.month),
        day: parseInt(birthData.day),
        hour: parseInt(hour),
        minute: parseInt(min),
        latitude: parseFloat(lat),
        longitude: parseFloat(lon),
        timezone: timezoneName,
        houseSystem: 'P',
      },
      {
        days: 30,
        startDate: null,  // start from today
        topN: 10,
      }
    );

    res.json(adaptTransitResponse(result));
  } catch (error) {
    log.error('Transit Error:', error.message);
    res.status(400).json({ error: error.message });
  }
});
```

### 4d: `/api/lunar-metrics` endpoint

```js
app.post('/api/lunar-metrics', async (req, res) => {
  try {
    const { day, month, year, hour, min, lat, lon, tzone } = req.body;

    if (!day || !month || !year) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Use Celestia's lunar metrics function
    const { dateToJD, calculateLunarMetrics: calcLunar } = await import('./celestia/src/transit.js');
    const jd = dateToJD(parseInt(year), parseInt(month), parseInt(day), parseInt(hour || 12));
    const lunar = calcLunar(jd);

    res.json({
      moonSign: lunar.moonSign,
      moonPhase: lunar.moonPhase,
      moonIllumination: lunar.moonIllumination,
      illumination: lunar.moonIllumination,
      moonDay: lunar.moonDay,
      moonAgeInDays: lunar.moonAgeInDays,
      isSuperMoon: lunar.isSuperMoon,
      withinPerigee: lunar.withinPerigee,
      withinApogee: lunar.withinApogee,
    });
  } catch (error) {
    log.error('Lunar Metrics Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch lunar metrics' });
  }
});
```

### 4e: `/api/current-planets` endpoint

This endpoint already uses `data/retrogrades.json` (local). **No change needed.** However, you can optionally add Celestia's real-time retrograde detection (optional).

### 4f: `/api/natal-wheel-chart` endpoint

This endpoint fetched SVG from AstrologyAPI. **Celestia does not generate SVGs.** Options:
- (a) Remove this endpoint entirely, don't show wheel chart on frontend
- (b) Keep AstrologyAPI only for this endpoint
- (c) Integrate an open-source SVG chart renderer (in the future)

**Recommended:** For now, use option (b) — keep AstrologyAPI only for SVG, all other calculations come from Celestia. Later migrate to (c) for full independence.

### Verification (for each endpoint):
- Send a request from the existing frontend to the endpoint
- Is the response format correct? (Does the frontend display correctly?)
- Is the AI context generated correctly?
- Compare with the old AstrologyAPI response

### Expected Output:
- Test results for each endpoint
- Any display issues on the frontend?
- Share any error messages

---

## STEP 5: Cleanup and deploy

### Instructions:

1. Remove AstrologyAPI-related code:
   - `fetchWithTimeout` AstrologyAPI calls
   - `ASTROLOGY_API_USER_ID` and `ASTROLOGY_API_KEY` references (except SVG)
   - AstrologyAPI check from `validateConfig()`

2. Render.com environment variables:
   - `ASTROLOGY_API_USER_ID` → keep if SVG endpoint is retained, otherwise remove
   - `ASTROLOGY_API_KEY` → same
   - No new env vars needed (Celestia doesn't use any API keys)

3. Render.com build settings:
   - Build command: `npm install` (should be sufficient for sweph native compilation)
   - Node.js version: must be 18+
   - If you get sweph compilation errors: `apt-get install build-essential` or enable "Native Build" option on Render.com

4. Deploy and test all endpoints.

### Verification:
- Is the Render.com build successful?
- Do all endpoints work in production?
- Is the frontend working normally?
- Has AstrologyAPI billing stopped?

---

## CRITICAL NOTE: timezoneName Requirement

Celestia expects an IANA timezone string (`"Europe/Istanbul"`), not a numeric offset (`3`).

The AstroAK frontend already sends `timezoneName` (from the geo-details API). However, older records may not have `timezoneName`.

**Fallback strategy:** If `timezoneName` is missing, DO NOT attempt to guess an IANA timezone from the numeric offset using the existing `calculateTimezoneOffset` function in reverse — this is unreliable. Instead:
1. Ensure `timezoneName` is always sent from the frontend
2. For older records: ask the user to re-select their city (one-time)

---

## Response Format Summary

### Natal — Format expected by AstroAK:
```json
{
  "success": true,
  "chart": null,
  "planets": [
    { "name": "Sun", "sign": "Cancer", "fullDegree": 112.7, "normDegree": 22.7, "isRetro": false, "house": 9 }
  ],
  "houses": [
    { "houseId": 1, "sign": "Scorpio", "startDegree": 215.03, "endDegree": null }
  ],
  "aspects": [
    { "aspecting_planet": "Sun", "aspected_planet": "Moon", "type": "Square", "orb": 0.25 }
  ],
  "birthData": { ... }
}
```

### Synastry — Format expected by AstroAK:
```json
{
  "success": true,
  "synastry": {
    "first": [ ... planets ... ],
    "second": [ ... planets ... ],
    "aspects": [ ... cross-aspects ... ]
  },
  "houses1": [ ... ],
  "houses2": [ ... ]
}
```

### Transit — Format expected by AstroAK:
```json
{
  "success": true,
  "monthStartDate": "12-2-2026",
  "monthEndDate": "14-3-2026",
  "ascendant": "Capricorn",
  "moonPhase": "Waning Crescent",
  "retrogrades": [ ... ],
  "allTransits": [ { "date": "...", "transit_planet": "...", "natal_planet": "...", "type": "..." } ],
  "todayTransits": [ ... ],
  "weekTransits": [ ... ],
  "weeklyWithTiming": [ ... ],
  "importantTransits": [ ... ],
  "lunar": { "moonSign": "...", "moonPhase": "...", "moonIllumination": 24.1, ... },
  "fetchedAt": "2026-02-12T..."
}
```
