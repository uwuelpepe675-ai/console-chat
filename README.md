# console.chat — a ChatGPT-style AI chat app

A minimal, self-hosted AI chatbot website: a Node/Express backend that talks
to the Anthropic API, and a plain HTML/CSS/JS frontend (no build step needed).

## What's inside

```
ai-chat-app/
├── backend/
│   ├── server.js        # Express server + /api/chat streaming endpoint
│   ├── package.json
│   └── .env.example     # copy to .env and add your API key
└── frontend/
    ├── index.html        # page layout: sidebar + chat + composer
    ├── style.css          # dark "console" theme
    └── app.js             # chat logic, streaming, local history
```

## Pages / screens this app has

Since it's a single-page app (like ChatGPT), "pages" are really states of one screen:

1. **Empty state** — shown when a chat has no messages yet, with quick-start
   prompt suggestions.
2. **Chat view** — the conversation itself, with your messages on the right
   and the AI's streamed replies on the left.
3. **Sidebar / history** — list of past conversations, a "New chat" button,
   and delete-per-conversation. Stored in the browser's localStorage, so it's
   per-device (no login system in this version).
4. **Composer** — the message input at the bottom, auto-growing textarea,
   Enter to send / Shift+Enter for a new line.

If you want to grow this later, the natural next pages are: a **Settings**
page (model picker, system prompt, theme), a **Login/Signup** page plus a
real database (Postgres, etc.) so history syncs across devices instead of
living in localStorage, and a **Share conversation** page.

## Setup

You'll need [Node.js 18+](https://nodejs.org) installed.

1. Get an API key from https://console.anthropic.com/settings/keys
2. In `backend/`, copy the example env file and add your key:
   ```bash
   cd backend
   cp .env.example .env
   # then open .env and paste your key in
   ```
3. Install dependencies and start the server:
   ```bash
   npm install
   npm start
   ```
4. Open **http://localhost:3000** in your browser. That's it — the backend
   also serves the frontend, so there's nothing else to run.

## How it works

- The browser never talks to Anthropic directly — it POSTs your message to
  your own backend (`/api/chat`), which holds the real API key and streams
  the model's response back as it's generated (Server-Sent Events).
- Conversation history lives in `localStorage` in the browser. Clearing
  browser data clears history. There's no server-side database in this
  starter — that's the first thing to add if you want accounts/sync.
- The model used is set in `backend/.env` (`ANTHROPIC_MODEL`, defaults to
  `claude-sonnet-5`). Swap it for any other model string your API key has
  access to.

## Extending it

- **Accounts + syncing history**: add a database (Postgres/SQLite) and a
  couple of routes for signup/login, then move conversation storage from
  `localStorage` to the DB, keyed by user id.
- **File/image uploads**: Anthropic's API accepts images and PDFs as message
  content — you'd add a file input in the composer and base64-encode the
  file into the request.
- **Multiple models**: turn `modelTag` in the sidebar into a real dropdown
  and pass the chosen model through to `/api/chat`.

## What's new in this pass

The frontend (`frontend/index.html`, `app.js`, `style.css`) got a big upgrade.
Backend (`server.js`) is untouched — it's still the same Gemini streaming proxy.

- **Avatar studio** — build a custom avatar for yourself and the AI: initials,
  an emoji, or an uploaded image, on a circle or square, with a gradient swatch.
  Open it from the sidebar (◍ Avatar studio).
- **Emoji picker** — 😊 button in the composer inserts emoji at your cursor;
  the same picker is reused inside the avatar studio.
- **Richer message formatting** — bold, italics, inline code, links, headers,
  lists, and blockquotes now render, on top of the existing fenced code blocks.
- **Code sandbox actions** on every code block:
  - **▶ Run** (JS/JSX) executes the snippet in a sandboxed iframe and shows
    `console.log` output right under the block — nothing touches the real page.
  - **▶ Preview** (HTML) renders the markup live in an inline iframe.
  - **↗ Sandbox** (HTML/CSS/JS) opens the snippet in a new CodePen tab,
    fully editable, using CodePen's documented prefill endpoint — no API key.
- **Live "thinking" indicator** — a pulsing-dots bubble plays the instant you
  send a message, replaced by the real streamed text the moment tokens arrive,
  plus an elapsed-time readout in the status bar.
- **Message toolbar** — hover a message to copy it, edit-and-resend (user
  messages), regenerate (last AI reply), delete, or react with an emoji.
- **Slash commands** — `/help`, `/roll`, `/flip`, `/8ball`, `/joke`,
  `/theme <name>`, `/clear` all run instantly, no API call.
- **Persona presets** — one-click personality + name swaps (Nova, Pixel,
  Sage, Glitch, Professor…), available on the empty state and in Settings.
- **Theme presets** — six ready-made color themes, plus the existing custom
  color pickers.
- **Sidebar search** and **export chat to Markdown**.

## Round 3: Scenario Studio + a much deeper sandbox

- **🎭 Scenario studio** — build a roleplay scenario in any universe (a show,
  book, game, or something original). Type in the series, hit **🔍 Research
  setting** to have the AI summarize the world from its own knowledge (fully
  editable), add named characters with their own **🔍 Research** button for
  how they speak/act, pick a language, an optional starting arc/point in the
  story, and optionally write yourself in as a new character with a backstory
  and an established relationship to the existing cast (e.g. "the
  protagonist's older brother"). Hitting **🎬 Begin scenario** spins up a new
  tagged conversation with all of that baked into its own system prompt and
  the AI opens the scene in character. Every scenario conversation carries a
  small banner over the chat reminding you which world/character/arc you're
  in. Note: "research" here means the model recalling what it already knows,
  not a live web crawl — it says so if it isn't confident about a title.
- **🤖 AI pair-programmer in the sandbox** got easier to reach and use.
- **Sandbox templates** — Blank, Hello World, Counter, Canvas doodle, Fetch
  API demo — one click to load a starting point.
- **Save/load named sandboxes** — keep as many little projects as you want,
  independent of your current unsaved work.
- **⛶ Fullscreen** sandbox mode (Esc to exit), **line numbers**, **Ctrl/Cmd+Enter**
  to run, **⬇ Download** as a standalone `.html` file, and **↶ Undo** for
  both manual resets and AI edits.
- Sandbox code now **persists automatically** across page reloads.

## Round 4: Accounts, so you (and your phone) can log in

The app now requires logging in — email + password, one account per person —
and conversations are stored server-side instead of just in the browser.
That's what makes "use it from my phone too" work: log into the same
account from any device and your history is there.

**What changed:**
- `backend/db.js` — a SQLite file (`backend/data.sqlite`) with two tables:
  `users` and `conversations` (one JSON blob of conversations per user).
- `backend/auth.js` — signup/login/logout, session held in an httpOnly
  cookie (a signed JWT, 30-day expiry). Passwords are hashed with bcrypt,
  never stored in plain text.
- `/api/chat`, `/api/image`, `/api/quota`, and the new `/api/conversations`
  (GET/PUT) now all require being logged in.
- `frontend/index.html` / `app.js` — a login/signup screen gates the app;
  conversations load from the server on login and every save now also
  pushes to the server (debounced), with `localStorage` kept as a same-device
  cache/offline fallback.

**Before running it:**
```bash
cd backend
npm install
```
Then make sure `backend/.env` has a `JWT_SECRET` set (a long random string —
`.env.example` has the one-liner to generate it) in addition to your existing
GEMINI/GROQ keys.

**To actually use it from your phone**, the server needs to be reachable from
outside `localhost`. Easiest paths, roughly in order of effort:
- **Railway** or **Render** — connect the GitHub repo, they detect the
  Node app automatically, you paste your `.env` values into their dashboard's
  environment variables UI (never commit `.env` itself — it's in
  `.gitignore`). Both have a free/cheap tier that's plenty for personal use.
  One thing to check on either: SQLite needs a *persistent* disk/volume, or
  the database resets on every redeploy — both platforms support attaching
  one, it's just an extra setting.
- **Fly.io** — similar deal, a bit more CLI-driven, also supports a
  persistent volume for the SQLite file.
- **Your own machine** — run it at home and either port-forward, or use a
  tunnel like Tailscale (easiest, private) or Cloudflare Tunnel (also free,
  gives you a real HTTPS URL) so your phone can reach it without exposing
  your router.

Once it's deployed, hit "Log in" on your phone, use the same email/password
you signed up with on desktop, and your conversations show up.
