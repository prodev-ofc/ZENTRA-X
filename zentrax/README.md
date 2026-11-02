# ZENTRAX — LEGENDARY PRO

**One Universe. Infinite Entertainment.**  
Built by **PRODEV OFC**.

ZENTRAX is a media discovery and personal-library platform. This application lives in its own `zentrax/` directory so the existing WhatsApp bot at the repository root remains untouched.

## Current milestone

- Premium responsive discovery dashboard.
- Express API and health endpoint.
- Catalogue search and type filters.
- Persistent server-side watchlist (JSON file).
- Optional live movie/TV metadata through The Movie Database (TMDB).
- Honest demo mode when no metadata API key is configured.

## Requirements

- Node.js 20 or newer.
- npm.

## Run locally

From the repository root:

```bash
cd zentrax
npm install
cp .env.example .env
npm start
```

Open http://localhost:4173.

On Termux, use the same commands. Keep the server process running while you use the dashboard.

## Optional live catalogue

1. Create an API key through your TMDB account.
2. Put it in `zentrax/.env` as `TMDB_API_KEY=your_key`.
3. Restart the server.

The server reads environment variables supplied by the host. For local `.env` loading without an environment manager, export the value before starting:

```bash
export TMDB_API_KEY="your_key"
npm start
```

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

## Roadmap

1. Foundation and discovery UI — current.
2. Real media-provider integrations and title/episode detail adapters.
3. Authorized streaming sources and playback.
4. Real download worker with queue persistence, safe destination handling and progress events.
5. RSS automation with validated feeds and scheduled jobs.
6. Authentication, user roles and admin observability.
7. Deployment profiles, tests, backups and production hardening.

**Important:** Streaming, downloading and RSS automation are not implemented in this foundation milestone. The interface does not pretend that demo data or simulated progress is real media activity. Connect only media sources you own or are authorized to access.

## Repository layout

```text
ZENTRA-X/
├── index.js              # Existing WhatsApp bot entry point (preserved)
├── package.json          # Existing bot package (preserved)
└── zentrax/
    ├── package.json
    ├── server.js
    ├── .env.example
    └── public/
        ├── index.html
        ├── styles.css
        └── app.js
```

© 2026 PRODEV OFC
