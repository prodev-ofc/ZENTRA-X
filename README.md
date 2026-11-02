# ZENTRAX — LEGENDARY PRO

**One Universe. Infinite Entertainment.**  
Built by **PRODEV OFC**.

ZENTRAX is a media discovery and personal-library platform. This repository is now dedicated to ZENTRAX; the previous starter/bot application files have been replaced.

## Current foundation

- Premium responsive discovery dashboard.
- Express 5 API and health endpoint.
- Catalogue search and media-type filters.
- Persistent server-side watchlist stored in a JSON file.
- Optional live movie and TV metadata through The Movie Database (TMDB).
- Honest demo mode when no metadata API key is configured.
- Docker and GitHub Actions setup.

## Requirements

- Node.js 20 or newer.
- npm.

## Run locally

```bash
npm install
cp .env.example .env
npm start
```

Open http://localhost:4173.

On Termux, run the same commands from the cloned repository directory. Keep the server process running while using the dashboard.

## Optional live catalogue

1. Create an API key through your TMDB account.
2. Add it to `.env` as `TMDB_API_KEY=your_key`.
3. Restart ZENTRAX.

TMDB attribution and branding requirements apply when using its API. See https://www.themoviedb.org/documentation/api/terms-of-use.

## API

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Service status and provider mode |
| GET | `/api/config` | Public feature flags |
| GET | `/api/catalog` | Catalogue; supports `?q=search` |
| GET | `/api/watchlist` | Read saved titles |
| PUT | `/api/watchlist/:id` | Toggle a title in the saved library |
| DELETE | `/api/watchlist` | Clear the saved library |

## Project structure

```text
ZENTRA-X/
├── .github/workflows/node.js.yml
├── public/
│   ├── app.js
│   ├── index.html
│   └── styles.css
├── .env.example
├── Dockerfile
├── package.json
├── server.js
└── README.md
```

## Roadmap

1. Foundation and discovery UI — current.
2. Real media-provider integrations and title/episode detail adapters.
3. Authorized streaming sources and playback.
4. Real download worker with queue persistence, safe destination handling and progress events.
5. RSS automation with validated feeds and scheduled jobs.
6. Authentication, user roles and admin observability.
7. Deployment profiles, tests, backups and production hardening.

**Important:** Streaming, provider integrations, downloads and RSS automation are not implemented in this foundation milestone. The interface does not pretend demo data or simulated progress is real media activity. Connect only media sources you own or are authorized to access.

© 2026 PRODEV OFC
