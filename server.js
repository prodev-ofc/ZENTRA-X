'use strict';

require('dotenv').config();

const express = require('express');
const path = require('node:path');
const fs = require('node:fs/promises');

const app = express();
const PORT = Number(process.env.PORT || 4173);
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');
const DATA_DIR = path.join(ROOT, 'data');
const WATCHLIST_FILE = path.join(DATA_DIR, 'watchlist.json');
const MEDIA_DIR = path.resolve(ROOT, process.env.MEDIA_DIR || 'media');
const MEDIA_EXTENSIONS = new Set(['.mp4', '.m4v', '.webm', '.ogv', '.ogg']);

app.disable('x-powered-by');
app.use(express.json({ limit: '32kb' }));
app.use(express.static(PUBLIC_DIR, { extensions: ['html'] }));

// Express static supports byte ranges, allowing seekable browser playback.
app.use('/media', express.static(MEDIA_DIR, { acceptRanges: true, dotfiles: 'deny', fallthrough: false, index: false, maxAge: 0 }));

const demoCatalog = [
  {
    id: 'demo-001',
    title: 'The Silent Horizon',
    overview: 'A deep-space crew discovers a signal that appears to remember every person who hears it.',
    type: 'movie',
    year: 2025,
    rating: 8.4,
    genre: 'Science Fiction',
    poster: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=700&auto=format&fit=crop&q=85',
    backdrop: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=1600&auto=format&fit=crop&q=85',
    source: 'ZENTRAX demo catalogue',
    demo: true
  },
  {
    id: 'demo-002',
    title: 'Neon Ronin',
    overview: 'In a city ruled by machine clans, a wandering swordsman searches for the last human archive.',
    type: 'anime',
    year: 2025,
    rating: 9.1,
    genre: 'Action / Anime',
    poster: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=700&auto=format&fit=crop&q=85',
    backdrop: 'https://images.unsplash.com/photo-1519608487953-e999c86e7455?w=1600&auto=format&fit=crop&q=85',
    source: 'ZENTRAX demo catalogue',
    demo: true
  },
  {
    id: 'demo-003',
    title: 'The Last Protocol',
    overview: 'A cybersecurity analyst finds a hidden protocol buried inside a global broadcast network.',
    type: 'series',
    year: 2024,
    rating: 8.7,
    genre: 'Thriller',
    poster: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=700&auto=format&fit=crop&q=85',
    backdrop: 'https://images.unsplash.com/photo-1519608487953-e999c86e7455?w=1600&auto=format&fit=crop&q=85',
    source: 'ZENTRAX demo catalogue',
    demo: true
  },
  {
    id: 'demo-004',
    title: 'Beyond the Blue',
    overview: 'An oceanographer follows an unexplained signal into an uncharted trench.',
    type: 'movie',
    year: 2023,
    rating: 8.2,
    genre: 'Adventure',
    poster: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=700&auto=format&fit=crop&q=85',
    backdrop: 'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?w=1600&auto=format&fit=crop&q=85',
    source: 'ZENTRAX demo catalogue',
    demo: true
  },
  {
    id: 'demo-005',
    title: 'Crimson District',
    overview: 'Two detectives investigate a series of impossible events across a rain-soaked metropolis.',
    type: 'series',
    year: 2024,
    rating: 8.5,
    genre: 'Crime / Mystery',
    poster: 'https://images.unsplash.com/photo-1519608487953-e999c86e7455?w=700&auto=format&fit=crop&q=85',
    backdrop: 'https://images.unsplash.com/photo-1519608487953-e999c86e7455?w=1600&auto=format&fit=crop&q=85',
    source: 'ZENTRAX demo catalogue',
    demo: true
  },
  {
    id: 'demo-006',
    title: 'Skybound Academy',
    overview: 'Young pilots train among floating cities where every flight changes the map.',
    type: 'anime',
    year: 2023,
    rating: 8.8,
    genre: 'Fantasy / Anime',
    poster: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=700&auto=format&fit=crop&q=85',
    backdrop: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1600&auto=format&fit=crop&q=85',
    source: 'ZENTRAX demo catalogue',
    demo: true
  }
];

async function listLocalMedia() {
  await fs.mkdir(MEDIA_DIR, { recursive: true });
  const entries = await fs.readdir(MEDIA_DIR, { withFileTypes: true });
  const media = [];
  for (const entry of entries) {
    if (!entry.isFile() || entry.name.startsWith('.')) continue;
    const extension = path.extname(entry.name).toLowerCase();
    if (!MEDIA_EXTENSIONS.has(extension)) continue;
    const stat = await fs.stat(path.join(MEDIA_DIR, entry.name));
    media.push({ id: entry.name, title: path.basename(entry.name, extension).replace(/[._-]+/g, ' '), type: 'local', extension: extension.slice(1), size: stat.size, url: '/media/' + encodeURIComponent(entry.name) });
  }
  return media.sort((a, b) => a.title.localeCompare(b.title));
}

async function readWatchlist() {
  try {
    return JSON.parse(await fs.readFile(WATCHLIST_FILE, 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return [];
  }
}

async function writeWatchlist(items) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(WATCHLIST_FILE, JSON.stringify(items, null, 2));
}

async function getCatalog(query = '') {
  const key = process.env.TMDB_API_KEY;
  if (!key) {
    const normalized = query.trim().toLowerCase();
    return demoCatalog.filter(item =>
      !normalized ||
      item.title.toLowerCase().includes(normalized) ||
      item.genre.toLowerCase().includes(normalized) ||
      item.overview.toLowerCase().includes(normalized)
    );
  }

  const url = new URL('https://api.themoviedb.org/3/trending/all/week');
  url.searchParams.set('api_key', key);
  if (query.trim()) {
    const searchUrl = new URL('https://api.themoviedb.org/3/search/multi');
    searchUrl.searchParams.set('api_key', key);
    searchUrl.searchParams.set('query', query.trim());
    const response = await fetch(searchUrl);
    if (!response.ok) throw new Error('TMDB search request failed');
    const payload = await response.json();
    return (payload.results || []).filter(item => item.media_type !== 'person').map(normalizeTmdb);
  }

  const response = await fetch(url);
  if (!response.ok) throw new Error('TMDB trending request failed');
  const payload = await response.json();
  return (payload.results || []).filter(item => item.media_type !== 'person').map(normalizeTmdb);
}

function normalizeTmdb(item) {
  const isMovie = item.media_type === 'movie' || Boolean(item.title);
  return {
    id: String(item.id),
    title: item.title || item.name || 'Untitled',
    overview: item.overview || 'No description available.',
    type: isMovie ? 'movie' : item.media_type === 'tv' ? 'series' : 'anime',
    year: Number((item.release_date || item.first_air_date || '').slice(0, 4)) || null,
    rating: Number(item.vote_average || 0).toFixed(1),
    genre: item.media_type === 'tv' ? 'TV Series' : item.media_type === 'movie' ? 'Movie' : 'Anime / Other',
    poster: item.poster_path ? 'https://image.tmdb.org/t/p/w500' + item.poster_path : '',
    backdrop: item.backdrop_path ? 'https://image.tmdb.org/t/p/w1280' + item.backdrop_path : '',
    source: 'The Movie Database (TMDB)',
    demo: false
  };
}

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'ZENTRAX',
    edition: 'LEGENDARY PRO',
    developer: 'PRODEV OFC',
    catalogProvider: process.env.TMDB_API_KEY ? 'tmdb' : 'demo'
  });
});

app.get('/api/catalog', async (req, res) => {
  try {
    const items = await getCatalog(String(req.query.q || '').slice(0, 100));
    res.json({ items, count: items.length, provider: process.env.TMDB_API_KEY ? 'tmdb' : 'demo' });
  } catch (error) {
    console.error('[catalog]', error.message);
    res.status(502).json({ error: 'Catalogue provider is temporarily unavailable.' });
  }
});

app.get('/api/media', async (req, res) => {
  try {
    const items = await listLocalMedia();
    res.json({ items, count: items.length, source: 'local-media-directory' });
  } catch (error) {
    console.error('[media]', error.message);
    res.status(500).json({ error: 'Could not read the local media library.' });
  }
});

app.get('/api/watchlist', async (req, res) => {
  try {
    res.json({ items: await readWatchlist() });
  } catch {
    res.status(500).json({ error: 'Could not read the watchlist.' });
  }
});

app.put('/api/watchlist/:id', async (req, res) => {
  const id = String(req.params.id).slice(0, 80);
  const item = req.body?.item;
  if (!item || String(item.id) !== id || typeof item.title !== 'string') {
    return res.status(400).json({ error: 'A valid catalogue item is required.' });
  }

  try {
    const current = await readWatchlist();
    const next = current.some(entry => String(entry.id) === id)
      ? current.filter(entry => String(entry.id) !== id)
      : [...current, item];
    await writeWatchlist(next);
    res.json({ items: next, saved: next.some(entry => String(entry.id) === id) });
  } catch {
    res.status(500).json({ error: 'Could not update the watchlist.' });
  }
});

app.delete('/api/watchlist', async (req, res) => {
  try {
    await writeWatchlist([]);
    res.json({ items: [] });
  } catch {
    res.status(500).json({ error: 'Could not clear the watchlist.' });
  }
});

app.get('/api/config', (req, res) => {
  res.json({
    appName: 'ZENTRAX',
    edition: 'LEGENDARY PRO',
    developer: 'PRODEV OFC',
    tagline: 'One Universe. Infinite Entertainment.',
    features: {
      liveCatalog: Boolean(process.env.TMDB_API_KEY),
      watchlistPersistence: true,
      mediaStreaming: true,
      downloads: false,
      rssAutomation: false
    }
  });
});

app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('⚡ ZENTRAX LEGENDARY PRO');
  console.log('   by PRODEV OFC');
  console.log('   http://localhost:' + PORT);
  console.log('   Catalogue: ' + (process.env.TMDB_API_KEY ? 'TMDB live API' : 'demo mode'));
});
