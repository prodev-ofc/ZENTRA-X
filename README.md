# ZENTRAX — LEGENDARY PRO

**One Universe. Infinite Entertainment.**  
Built by **PRODEV OFC**.

ZENTRAX is a media discovery and personal-library platform. This repository is now dedicated to ZENTRAX; the previous starter/bot application files have been replaced.

## Current foundation

- Premium responsive discovery dashboard.
- Express 5 API and health endpoint.
- Catalogue search and media-type filters.
- Persistent server-side watchlist stored in a JSON file.
- Local media library with HTML5 playback and HTTP byte-range seeking for authorized files.
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
| GET | `/api/media` | List supported files in the local media directory |
| PUT | `/api/watchlist/:id` | Toggle a title in the saved library |
| DELETE | `/api/watchlist` | Clear the saved library |

## Authorized local streaming

Place video files you own or are authorized to access in the `media/` directory. Supported extensions are `.mp4`, `.m4v`, `.webm`, `.ogv` and `.ogg`. Open **Local Media** in the dashboard to play them. The server exposes only supported regular files through `/media/` and uses Express static byte-range support so browser playback can seek without fetching the entire file.

Set `MEDIA_DIR` in `.env` to use a different directory. Keep this directory private and do not place copyrighted material there unless you have the rights to use it. For Docker, mount a persistent host directory at `/app/media`.

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
3. Authorized local media playback — implemented.
4. Remote authorized provider adapters and playback integrations.
5. Real download worker with queue persistence, safe destination handling and progress events.
6. RSS automation with validated feeds and scheduled jobs.
7. Authentication, user roles and admin observability.
8. Deployment profiles, tests, backups and production hardening.

**Important:** Local-file playback is implemented; remote provider integrations, downloads and RSS automation are not. TMDB supplies metadata, not playback rights or streams. Connect only media sources and files you own or are authorized to access.

© 2026 PRODEV OFC
