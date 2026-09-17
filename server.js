import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import rentcastHandler from './api/rentcast.js';
import savedListingsHandler from './api/saved-listings.js';
import mapSavedListingsHandler from './api/map-saved-listings.js';
import tractsHandler from './api/tracts.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

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

// In-memory leads storage for /api/geosphere-lead-sync
const capturedLeads = [];
app.post('/api/geosphere-lead-sync', (req, res) => {
  const lead = req.body;
  capturedLeads.unshift(lead);
  if (capturedLeads.length > 100) capturedLeads.pop();
  res.json({ status: 'success', count: capturedLeads.length });
});
app.get('/api/geosphere-lead-sync', (req, res) => {
  res.json({ status: 'success', leads: capturedLeads });
});

// Serve static assets from project root
app.use(express.static(__dirname));

// Single-page application fallback
app.use((req, res) => {
  if (req.method === 'GET') {
    res.sendFile(path.join(__dirname, 'index.html'));
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`GeoSphere Engine server running on http://0.0.0.0:${PORT}`);
});
