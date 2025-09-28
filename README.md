This project automates the creation of YouTube Shorts using locally hosted AI tools. Simply prompt a topic, and the system will generate a script with Ollama 3.2, convert it to speech with HeadTTS, and automatically produce a video with FFmpeg—complete with background music, subtitles, and smooth syncing. Everything runs locally for full control, privacy, and zero cloud costs. Created in February 2025. 


## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Text-to-Speech with HeadTTS

This project uses [HeadTTS](https://github.com/met4citizen/HeadTTS), a free JavaScript text-to-speech solution that provides high-quality neural speech synthesis. The integration allows for generating natural-sounding voice overs for your short videos.

### Using HeadTTS

To start the HeadTTS server along with the development server:

```bash
npm run dev:with-tts
```

Alternatively, you can manage the HeadTTS server separately:

```bash
# Start the HeadTTS server
npm run headtts:start

# Stop the HeadTTS server
npm run headtts:stop

# YouTube Shorts generator (Next.js)

Youtube Shorts Generator is a developer-focused Next.js application that automates creation of short vertical videos (YouTube Shorts / Reels) from a subject prompt. It combines an LLM (via Ollama) for script generation, HeadTTS for neural text-to-speech, and FFmpeg to assemble and subtitle final shorts.

This README covers quick start, architecture, available API routes, and developer workflows so you can run and extend the project locally.

## Highlights
- Script generation using an on-prem Ollama model (llama3.2).
- HeadTTS integration for high-quality neural TTS voices.
- APIs to generate scripts, descriptions, convert text-to-speech, and produce final shorts with optional background music and burned-in subtitles.
- Uses Next.js app router (Route Handlers) and stores generated outputs under `public/generated_shorts` and `temporary_files`.

## Quick Start (development)

Prerequisites
- Node.js (18+ recommended)
- npm
- ffmpeg (available on PATH)
- Optional: Ollama installed and running locally at http://localhost:11434 for LLM generation

Install dependencies and run in dev mode:

```powershell
cd "d:\\Github Projects\\ShortsGenerator\\lilyshorts"
npm install
# Start HeadTTS and the Next dev server together
npm run dev:with-tts
# Or run the full stack (Ollama + HeadTTS + Next)
npm run devfull
```

Open http://localhost:3000 in your browser. The dashboard (TTS tester and short generation UI) is available at `/dashboard`.

Available npm scripts (from `package.json`)
- `npm run dev` — Next.js development server (turbopack)
- `npm run build` — Build for production
- `npm run start` — Start built app
- `npm run headtts:start` — Start HeadTTS server (scripts/headtts-server.js)
- `npm run dev:with-tts` — Start HeadTTS + Next dev server (Concurrently)
- `npm run devfull` — Start Ollama + HeadTTS + Next dev server

Note: `postinstall` runs a HeadTTS check script in this project.

## Project structure (important folders)
- `app/` — Next.js app router (pages, route handlers, dashboard UI)
- `app/api/` — Server API routes (script generation, TTS, short creation, subtitles, assets)
- `lib/` — Helpers for HeadTTS and other utilities
- `scripts/` — Helper scripts (HeadTTS server launcher, etc.)
- `public/assets/` — Static media (videos, music)
- `public/generated_shorts/` — Permanently copied short videos
- `temporary_files/` — Per-job temporary working directories

## Key API routes
These are server route handlers (Next.js route.ts files) used by the frontend and programmatic calls.

- POST /api/generate-script — Generates a script for a subject using Ollama (see `app/api/generate-script/improved-route.ts`).
- POST /api/generate-description — Given a script, generate a short title & description using Ollama.
- POST /api/text-to-speech — Convert text to speech using HeadTTS; returns a jobId and audio URL (see `app/api/text-to-speech/route.ts`).
- GET /api/text-to-speech/audio/[jobId] — Serves the generated TTS audio file for a job.
- POST /api/generate-shorts — Main orchestration for creating a short: generates script, TTS, picks video/music, assembles with FFmpeg, burns subtitles, and copies final output to `public/generated_shorts`.
- POST /api/create-short — Lower-level route to combine provided video/audio/music into a short (uses FFmpeg).
- POST /api/burn-subtitles — Burns subtitles onto a given video file (used internally by generate-shorts).
- POST /api/download-youtube — Helper to download a YouTube video (yt-dlp integration); used to populate `public/assets/videos`.
- POST /api/assets — Lists or manages available static assets (videos, music) under `public/assets/`.
- POST /api/open-folder — Utility route to open a folder in the host environment (development convenience).

When calling these routes programmatically from outside the server, prefix with the host, e.g. `http://localhost:3000/api/generate-shorts`.

## HeadTTS integration
- The repo includes `scripts/headtts-server.js` which launches the HeadTTS node server located at `lib/headtts` on port 8882 by default. It writes `lib/headtts/server.pid` so it can be stopped later.
- Start HeadTTS manually: `npm run headtts:start`.
- The TTS route handlers call helper functions found under `lib/` to ensure the HeadTTS server is available and to convert text to audio files placed in `temporary_files/<jobId>/`.

Available TTS voices are managed inside the HeadTTS server and the TTS tester UI in the dashboard — check `HEADTTS_GUIDE.md` for more details.

## Ollama / LLM usage
- Script and description generation send prompts to Ollama running locally (default: http://127.0.0.1:11434). The improved script generator uses `llama3.2`.
- If you don't have Ollama available, the code contains fallbacks and clear error paths; but for best quality, run Ollama locally and ensure the model name matches (llama3.2 in the code).

## Notes on FFmpeg and media processing
- FFmpeg is required on PATH. The server uses ffmpeg subprocesses to:
	- Resize/crop videos to vertical 9:16 when needed.
	- Mix audio (TTS + background music) and combine with video.
	- Burn subtitles onto the final video via a separate route.

If ffmpeg fails, the APIs attempt reasonable fallbacks (silent audio placeholders, copying non-subtitled output), and write error logs to `temporary_files/<jobId>/`.

## Development tips
- Use `npm run dev:with-tts` for quicker local testing with HeadTTS.
- Use `npm run devfull` to also spawn Ollama if you have it installed and available as an executable 'ollama' command.
- Check the `temporary_files/<jobId>/` folder for intermediate artifacts and logs when something goes wrong.
- When debugging API handlers, inspect server logs printed to the terminal; many routes log detailed per-job progress and errors.

## Contributing
- Issues and pull requests are welcome. Suggested improvements:
	- Add unit/integration tests for route handlers.
	- Dockerize HeadTTS & Ollama dev environment for reproducible local setup.
	- Add authentication for the API if exposing it beyond local use.

## Security & privacy
- This project runs local model servers (HeadTTS and Ollama). Be careful exposing these services to public networks — they can run arbitrary code or expose data.

## Troubleshooting
- HeadTTS server not starting: confirm `lib/headtts` exists and contains `modules/headtts-node.mjs`. Check `lib/headtts/server.pid` and server stdout in your terminal.
- Ollama errors: ensure Ollama is installed and models are available. The code expects a running API at `http://127.0.0.1:11434`.
- FFmpeg errors: verify ffmpeg is installed and in PATH. Run `ffmpeg -version` in your shell.

## License
This repository does not include a license file; add one if you want to open source it. Otherwise treat it as private code (package.json sets `private: true`).

---

If you'd like, I can also:
- Add example curl commands for each API route.
- Add a small CONTRIBUTING.md and templates.
- Create a Dockerfile to run HeadTTS and/or Ollama for easier onboarding.

Tell me which of those you'd like next and I will add them.
