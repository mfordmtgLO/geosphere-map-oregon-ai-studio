import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import rentcastHandler from './api/rentcast.js';
import savedListingsHandler from './api/saved-listings.js';
import mapSavedListingsHandler from './api/map-saved-listings.js';
import tractsHandler from './api/tracts.js';
import usdaIncomeLimitsHandler from './api/usda-income-limits.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Middleware
app.use((req, res, next) => {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet, noimageindex');
  next();
});
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve robots.txt explicitly to prevent search indexing and AI scraping
app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.sendFile(path.join(__dirname, 'robots.txt'));
});

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Adapt Vercel serverless function to Express middleware
function wrapHandler(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (err) {
      console.error('API route error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: err.message || 'Internal Server Error' });
      }
    }
  };
}

// API Routes
app.all('/api/rentcast', wrapHandler(rentcastHandler));
app.all('/api/saved-listings', wrapHandler(savedListingsHandler));
app.all('/api/map-saved-listings', wrapHandler(mapSavedListingsHandler));
app.all('/api/tracts', wrapHandler(tractsHandler));
app.all('/api/usda-income-limits', wrapHandler(usdaIncomeLimitsHandler));

// Dev-adapter-only lead capture: in-memory, ephemeral (lost on restart),
// capped at 100 entries. NOT a production PII store — do not use this for
// real buyer data, and do not re-add a GET readback route here.
const capturedLeads = [];
app.post('/api/geosphere-lead-sync', (req, res) => {
  const lead = req.body;
  capturedLeads.unshift(lead);
  if (capturedLeads.length > 100) capturedLeads.pop();
  res.json({ status: 'success', count: capturedLeads.length });
});

// Serve static assets from project root
app.use(express.static(__dirname));

// Explicit routes for SPA entry points
app.get(['/dashboard', '/crm', '/map'], (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Single-page application fallback
app.use((req, res) => {
  if (req.method === 'GET' || req.method === 'HEAD') {
    res.sendFile(path.join(__dirname, 'index.html'));
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`GeoSphere Engine server running on http://0.0.0.0:${PORT}`);
});
