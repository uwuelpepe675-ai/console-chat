// server.js — backend for the chat app
// Handles: serving the frontend, and proxying chat messages to either
// Gemini or Groq, with streaming, so the browser never sees your API key.

require('dotenv').config();
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const db = require('./db');
const { requireAuth, registerAuthRoutes } = require('./auth');

const app = express();
const PORT = process.env.PORT || 3000;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-flash-latest';

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

const DEFAULT_PROVIDER = (process.env.DEFAULT_PROVIDER || 'gemini').toLowerCase();

if (!GEMINI_API_KEY && !GROQ_API_KEY) {
  console.warn('\n⚠️  No GEMINI_API_KEY or GROQ_API_KEY found. Copy .env.example to .env and add at least one.\n');
}

// Groq gives us real rate-limit numbers on every response header — no need
// to fake a "credits" system. We just remember the most recent ones here so
// the frontend can poll /api/quota instead of guessing.
const lastQuota = {
  groq: null, // { limitRequests, remainingRequests, resetRequests, limitTokens, remainingTokens, resetTokens, updatedAt }
};

function readGroqQuotaFromHeaders(headers) {
  const num = (v) => (v === null || v === undefined ? null : Number(v));
  const q = {
    limitRequests: num(headers.get('x-ratelimit-limit-requests')),
    remainingRequests: num(headers.get('x-ratelimit-remaining-requests')),
    resetRequests: headers.get('x-ratelimit-reset-requests'),
    limitTokens: num(headers.get('x-ratelimit-limit-tokens')),
    remainingTokens: num(headers.get('x-ratelimit-remaining-tokens')),
    resetTokens: headers.get('x-ratelimit-reset-tokens'),
    updatedAt: Date.now(),
  };
  // Only keep it if the headers actually gave us something.
  if (q.limitRequests !== null || q.limitTokens !== null) {
    lastQuota.groq = q;
  }
}

app.use(express.json({ limit: '12mb' }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'frontend')));

registerAuthRoutes(app);

// GET/PUT /api/conversations — the whole conversation list for the logged-in
// user, stored as one JSON blob per account (mirrors the old localStorage
// shape 1:1, so the frontend barely had to change).
app.get('/api/conversations', requireAuth, (req, res) => {
  const row = db.prepare('SELECT data FROM conversations WHERE user_id = ?').get(req.user.id);
  res.json({ conversations: row ? JSON.parse(row.data) : [] });
});

app.put('/api/conversations', requireAuth, (req, res) => {
  const { conversations } = req.body || {};
  if (!Array.isArray(conversations)) {
    return res.status(400).json({ error: 'conversations array is required' });
  }
  db.prepare(`
    INSERT INTO conversations (user_id, data, updated_at) VALUES (?, ?, datetime('now'))
    ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at
  `).run(req.user.id, JSON.stringify(conversations));
  res.json({ ok: true });
});

// GET /api/quota — last known rate-limit snapshot per provider, straight
// from that provider's own response headers (real numbers, not estimates).
app.get('/api/quota', requireAuth, (req, res) => {
  res.json({
    groq: lastQuota.groq,
    gemini: null, // Gemini's API doesn't expose quota headers the way Groq does.
  });
});

const GEMINI_IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-3.1-flash-image';

// POST /api/image — Gemini-only, via the Interactions API. body: { prompt, image?: { data, mimeType } }
// image is optional: if present, this is an edit of that image rather than a fresh generation.
app.post('/api/image', requireAuth, async (req, res) => {
  if (!GEMINI_API_KEY) {
    return res.status(400).json({ error: 'Server is missing GEMINI_API_KEY' });
  }
  const { prompt, image } = req.body;
  if (!prompt || !prompt.trim()) {
    return res.status(400).json({ error: 'prompt is required' });
  }

  const directive = image
    ? `Edit the attached image based on this instruction. Output the edited image directly — do not describe it or suggest a prompt: ${prompt}`
    : `Generate this image right now and return it directly. Do not describe the image, do not suggest a prompt for another tool — output the actual image: ${prompt}`;

  const input = [{ type: 'text', text: directive }];
  if (image && image.data) {
    input.push({ type: 'image', mime_type: image.mimeType || 'image/png', data: image.data });
  }

  try {
    const callInteractions = () => fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY,
      },
      body: JSON.stringify({
        model: GEMINI_IMAGE_MODEL,
        input,
        store: false,
        response_format: { type: 'image' },
      }),
    });

    let upstream = await callInteractions();
    if (upstream.status === 503) {
      // Google's image models get "high demand" spikes fairly often — one
      // quick retry clears most of these without bothering the user.
      await new Promise(r => setTimeout(r, 1500));
      upstream = await callInteractions();
    }

    const data = await upstream.json();

    if (!upstream.ok) {
      const msg = data?.error?.message || `Upstream error: ${upstream.status}`;
      return res.status(upstream.status).json({ error: msg });
    }

    // The Interactions API exposes a convenience `output_image` field, but
    // fall back to scanning `steps` for a model_output image block in case
    // that's not present in the raw REST response.
    // The Interactions API is very new and its exact REST response shape
    // isn't fully nailed down yet. Instead of trusting any base64-shaped
    // string, collect every candidate in the response tree and only accept
    // one whose decoded bytes actually start with a real image file
    // signature (PNG/JPEG/GIF/WEBP) — that's the only reliable way to tell
    // real image data apart from some unrelated long base64/hash field.
    function looksLikeImageBytes(base64) {
      try {
        const head = Buffer.from(base64.slice(0, 40), 'base64');
        const hex = head.toString('hex');
        if (hex.startsWith('89504e47')) return true;               // PNG
        if (hex.startsWith('ffd8ff')) return true;                 // JPEG
        if (head.slice(0, 3).toString('ascii') === 'GIF') return true;    // GIF
        if (head.slice(0, 4).toString('ascii') === 'RIFF') return true;   // WEBP (RIFF container)
        return false;
      } catch {
        return false;
      }
    }

    function collectImageCandidates(node, out, depth = 0) {
      if (!node || typeof node !== 'object' || depth > 8) return;
      const mime = node.mime_type || node.mimeType;
      const b64 = node.data || node.bytes_base64 || node.b64_json || node.image_bytes;
      if (typeof b64 === 'string' && b64.length > 500 && /^[A-Za-z0-9+/=]+$/.test(b64.slice(0, 100))) {
        out.push({ mime_type: mime || 'image/png', data: b64 });
      }
      for (const key of Object.keys(node)) {
        const val = node[key];
        if (val && typeof val === 'object') collectImageCandidates(val, out, depth + 1);
      }
    }

    function findCaption(node, depth = 0) {
      if (!node || typeof node !== 'object' || depth > 8) return '';
      if (typeof node.output_text === 'string') return node.output_text;
      if (node.type === 'text' && typeof node.text === 'string') return node.text;
      for (const key of Object.keys(node)) {
        const val = node[key];
        if (val && typeof val === 'object') {
          const found = findCaption(val, depth + 1);
          if (found) return found;
        }
      }
      return '';
    }

    const candidates = [];
    collectImageCandidates(data, candidates);
    const imageBlock = candidates.find(c => looksLikeImageBytes(c.data));
    const caption = findCaption(data);

    if (!imageBlock) {
      console.error(`No valid image bytes found (${candidates.length} base64 candidates checked). Raw keys:`, Object.keys(data));
      console.error('Full response (truncated):', JSON.stringify(data).slice(0, 2000));
      return res.status(502).json({
        error: caption
          ? `Model responded with text instead of an image: "${caption.slice(0, 150)}"`
          : 'Model did not return an image. Try rephrasing the prompt.',
      });
    }

    res.json({
      mimeType: imageBlock.mime_type,
      data: imageBlock.data,
      caption,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error contacting the image model.' });
  }
});

// POST /api/chat
// body: { messages: [...], system?: string, provider?: 'gemini' | 'groq' }
// Streams back plain text chunks as they arrive from the model.
app.post('/api/chat', requireAuth, async (req, res) => {
  const { messages, system } = req.body;
  const provider = (req.body.provider || DEFAULT_PROVIDER).toLowerCase();

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array is required' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    if (provider === 'groq') {
      await streamGroq({ messages, system, res });
    } else {
      await streamGemini({ messages, system, res });
    }
  } catch (err) {
    console.error(err);
    res.write(`data: ${JSON.stringify({ error: 'Server error contacting the model.' })}\n\n`);
    res.end();
  }
});

// ---------- Gemini ----------

async function streamGemini({ messages, system, res }) {
  if (!GEMINI_API_KEY) {
    res.write(`data: ${JSON.stringify({ error: 'Server is missing GEMINI_API_KEY' })}\n\n`);
    return res.end();
  }

  // Gemini uses role "model" instead of "assistant", and a "contents" array
  // of { role, parts: [...] } instead of Anthropic-style messages.
  const contents = messages.map(m => {
    const parts = [];
    if (m.content) parts.push({ text: m.content });
    if (m.image && m.image.data) {
      parts.push({
        inline_data: {
          mime_type: m.image.mimeType || 'image/png',
          data: m.image.data,
        },
      });
    }
    return {
      role: m.role === 'assistant' ? 'model' : 'user',
      parts,
    };
  });

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?alt=sse`;

  const upstream = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': GEMINI_API_KEY,
    },
    body: JSON.stringify({
      system_instruction: {
        parts: [{ text: system || 'You are a helpful, concise assistant.' }],
      },
      contents,
    }),
  });

  if (!upstream.ok || !upstream.body) {
    const errText = await upstream.text().catch(() => '');
    res.write(`data: ${JSON.stringify({ error: `Upstream error: ${upstream.status} ${errText}` })}\n\n`);
    return res.end();
  }

  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop();

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const payload = line.slice(6).trim();
      if (!payload) continue;

      try {
        const event = JSON.parse(payload);
        const text = event?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          res.write(`data: ${JSON.stringify({ text })}\n\n`);
        }
      } catch {
        // ignore malformed SSE fragments
      }
    }
  }

  res.write('data: [DONE]\n\n');
  res.end();
}

// ---------- Groq ----------

async function streamGroq({ messages, system, res }) {
  if (!GROQ_API_KEY) {
    res.write(`data: ${JSON.stringify({ error: 'Server is missing GROQ_API_KEY' })}\n\n`);
    return res.end();
  }

  // Groq's endpoint is OpenAI-compatible: role/content messages, no image
  // support on the free text models, so we just drop any attached image.
  const chatMessages = [
    { role: 'system', content: system || 'You are a helpful, concise assistant.' },
    ...messages
      .filter(m => m.content)
      .map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
  ];

  const upstream = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: chatMessages,
      stream: true,
    }),
  });

  // Grab the rate-limit headers immediately — Groq sends them on every
  // response, success or not, so this is the real, live quota.
  readGroqQuotaFromHeaders(upstream.headers);

  if (!upstream.ok || !upstream.body) {
    const errText = await upstream.text().catch(() => '');
    res.write(`data: ${JSON.stringify({ error: `Upstream error: ${upstream.status} ${errText}` })}\n\n`);
    return res.end();
  }

  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop();

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const payload = line.slice(6).trim();
      if (!payload || payload === '[DONE]') continue;

      try {
        const event = JSON.parse(payload);
        const text = event?.choices?.[0]?.delta?.content;
        if (text) {
          res.write(`data: ${JSON.stringify({ text })}\n\n`);
        }
      } catch {
        // ignore malformed SSE fragments
      }
    }
  }

  // Send the fresh quota snapshot down to the client right before we
  // close the stream, so the UI can update without a second round trip.
  if (lastQuota.groq) {
    res.write(`data: ${JSON.stringify({ quota: { provider: 'groq', ...lastQuota.groq } })}\n\n`);
  }

  res.write('data: [DONE]\n\n');
  res.end();
}

app.listen(PORT, () => {
  console.log(`✅ Chat app running at http://localhost:${PORT}`);
});
