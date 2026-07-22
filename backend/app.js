// app.js — all client-side logic for the chat app.
// Conversations are kept in localStorage so history survives a refresh.

const STORAGE_KEY = 'console-chat-conversations';
const SETTINGS_KEY = 'console-chat-settings';
const SANDBOX_KEY = 'console-chat-sandbox';
const SANDBOXES_KEY = 'console-chat-saved-sandboxes';

// Shared low-level reader for the backend's SSE stream, reused by the
// main chat, the sandbox AI pair-programmer, and the scenario research
// calls so they all parse events the same way.
async function streamSSE(response, onEvent) {
  if (!response.body) throw new Error('No response stream from server.');
  const reader = response.body.getReader();
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
      try { onEvent(JSON.parse(payload)); } catch { /* ignore malformed fragment */ }
    }
  }
}

async function fetchChatStream(system, messages, onEvent) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ system, messages, provider: settings.provider }),
  });
  await streamSSE(res, onEvent);
}

// ---------- Quota / provider ----------

function renderQuotaBadge(quota) {
  if (settings.provider !== 'groq') {
    els.quotaBadge.textContent = '';
    els.quotaBadge.className = 'model-tag';
    return;
  }
  if (!quota) {
    els.quotaBadge.textContent = 'quota: unknown until first message';
    els.quotaBadge.className = 'model-tag';
    return;
  }
  const remaining = quota.remainingRequests;
  const limit = quota.limitRequests;
  els.quotaBadge.textContent = `quota: ${remaining}/${limit} req left`;
  els.quotaBadge.className = 'model-tag';
  if (remaining === 0) els.quotaBadge.classList.add('quota-empty');
  else if (limit && remaining / limit < 0.2) els.quotaBadge.classList.add('quota-low');
}

async function refreshQuota() {
  try {
    const res = await fetch('/api/quota');
    const data = await res.json();
    renderQuotaBadge(data.groq);
  } catch {
    // backend not reachable yet — leave badge as-is
  }
}

// Streams a one-off research answer directly into a textarea, used by
// the Scenario Studio's "Research" buttons.
async function researchInto(textareaEl, buttonEl, promptText) {
  textareaEl.value = '';
  buttonEl.disabled = true;
  const original = buttonEl.textContent;
  buttonEl.textContent = 'Researching…';
  try {
    await fetchChatStream(
      'You are a knowledgeable research assistant helping set up a fiction/fandom roleplay scenario. Be concise, well organized, and briefly note if you are not confident about a detail.',
      [{ role: 'user', content: promptText }],
      (event) => {
        if (event.text) {
          textareaEl.value += event.text;
          textareaEl.scrollTop = textareaEl.scrollHeight;
        } else if (event.error) {
          textareaEl.value += `\n[error: ${event.error}]`;
        }
      }
    );
  } catch {
    textareaEl.value += '\n[connection error — is the backend running?]';
  } finally {
    buttonEl.disabled = false;
    buttonEl.textContent = original;
  }
}

const DEFAULT_SETTINGS = {
  aiName: 'console',
  personality: '',
  soundOn: true,
  accentColor: '#f5a623',
  bgColor: '#101114',
  userBubbleColor: '#1d1e23',
  aiBubbleColor: '#17181c',
  font: "'Inter', sans-serif",
  userAvatar: null, // { type: 'initials'|'emoji'|'image', value, bg, shape }
  aiAvatar: null,
  provider: 'gemini', // 'gemini' | 'groq'
  typeSound: 'tick', // 'tick' | 'blip' | 'click' | 'chime'
  music: { source: 'off', youtube: '', url: '', volume: 50 },
  backgroundImage: null, // data URL or null
  bubbleTransparent: false,
  bubbleTexture: 'flat', // 'flat' | 'glass' | 'grain' | 'gradient'
};

const THEMES = [
  { name: 'Amber console', accent: '#f5a623', accentDim: '#b57a1d', bg: '#101114', userBubble: '#1d1e23', aiBubble: '#17181c' },
  { name: 'Ocean',         accent: '#3fa9f5', accentDim: '#2678ad', bg: '#0c1116', userBubble: '#152230', aiBubble: '#101a24' },
  { name: 'Forest',        accent: '#4fd17a', accentDim: '#2e9955', bg: '#0d1210', userBubble: '#16241c', aiBubble: '#111a15' },
  { name: 'Sunset',        accent: '#ff7a9c', accentDim: '#c8506e', bg: '#150f14', userBubble: '#261a24', aiBubble: '#1b1319' },
  { name: 'Synthwave',     accent: '#c86bff', accentDim: '#8b46b8', bg: '#100b1c', userBubble: '#221a35', aiBubble: '#171226' },
  { name: 'Mono',          accent: '#e8e8e8', accentDim: '#9a9a9a', bg: '#111111', userBubble: '#1e1e1e', aiBubble: '#181818' },
];

const PERSONAS = [
  { name: 'Default', emo: '▍', aiName: 'console', personality: '' },
  { name: 'Nova — friendly coach', emo: '✨', aiName: 'Nova', personality: 'You are Nova, an upbeat, encouraging coach. Keep answers positive, clear, and full of momentum.' },
  { name: 'Pixel — game dev bud', emo: '🎮', aiName: 'Pixel', personality: 'You are Pixel, a game-dev buddy who talks casually and loves Roblox/Unity/Unreal talk. Use the occasional gaming reference.' },
  { name: 'Sage — zen minimalist', emo: '🪷', aiName: 'Sage', personality: 'You are Sage. Speak calmly and minimally. Prefer short, thoughtful answers over long ones.' },
  { name: 'Glitch — chaotic comedian', emo: '🤖', aiName: 'Glitch', personality: 'You are Glitch, a chaotic-good comedian AI. Be funny and a little unhinged, but still genuinely helpful.' },
  { name: 'Professor — precise & formal', emo: '🎓', aiName: 'Professor', personality: 'You are Professor, formal, precise, and thorough. Explain things rigorously and cite structure clearly.' },
];

const EMOJI_CATEGORIES = [
  { label: 'Smileys', items: ['😀','😁','😂','🤣','😊','😇','🙂','😉','😍','🥰','😎','🤩','🤔','🫡','😴','🥲','😅','🙃','😜','🤪'] },
  { label: 'Gestures', items: ['👍','👎','👏','🙌','🤝','🙏','💪','✌️','🤞','👌','🫶','🤙','👋','🖖','🤌'] },
  { label: 'Animals', items: ['🐶','🐱','🦊','🐼','🐸','🐵','🦁','🐯','🐨','🐧','🦄','🐙','🐢','🦖','🐝'] },
  { label: 'Food', items: ['🍕','🍔','🌮','🍣','🍩','🍪','🍎','🍉','🍜','☕','🧋','🍿','🍰','🥑','🍫'] },
  { label: 'Objects', items: ['💻','🎮','🚀','🔥','⚡','💡','🎧','📱','🛠️','🧠','📦','🔧','🧩','🗂️','🖥️'] },
  { label: 'Symbols', items: ['❤️','💯','✅','❌','⭐','🎉','💀','👀','✨','🔒','⚠️','♻️','🆗','🔁','🎯'] },
];

const JOKES = [
  "Why do programmers prefer dark mode? Because light attracts bugs.",
  "There are 10 kinds of people: those who understand binary and those who don't.",
  "I told my computer I needed a break. Now it won't stop sending me KitKats.",
  "Why did the developer go broke? Because they used up all their cache.",
  "A SQL query walks into a bar, walks up to two tables and asks: 'Can I join you?'",
  "Why do Java developers wear glasses? Because they don't C#.",
  "!false — it's funny because it's true.",
  "How many programmers does it take to change a light bulb? None, that's a hardware problem.",
];

const EIGHTBALL = [
  "It is certain.", "Without a doubt.", "Yes, definitely.", "You may rely on it.",
  "Signs point to yes.", "Reply hazy, try again.", "Ask again later.",
  "Better not tell you now.", "Don't count on it.", "My reply is no.",
  "Very doubtful.", "Outlook not so good.",
];

const els = {
  sidebar: document.getElementById('sidebar'),
  sidebarToggle: document.getElementById('sidebarToggle'),
  chatList: document.getElementById('chatList'),
  newChatBtn: document.getElementById('newChatBtn'),
  searchInput: document.getElementById('searchInput'),
  chatScroll: document.getElementById('chatScroll'),
  emptyState: document.getElementById('emptyState'),
  emptyTitle: document.getElementById('emptyTitle'),
  emptyPersonaChips: document.getElementById('emptyPersonaChips'),
  messages: document.getElementById('messages'),
  composerForm: document.getElementById('composerForm'),
  promptInput: document.getElementById('promptInput'),
  sendBtn: document.getElementById('sendBtn'),
  statusDot: document.getElementById('statusDot'),
  statusLabel: document.getElementById('statusLabel'),
  aiNameDisplay: document.getElementById('aiNameDisplay'),
  brandAvatar: document.getElementById('brandAvatar'),
  exportBtn: document.getElementById('exportBtn'),
  providerSelect: document.getElementById('providerSelect'),
  quotaBadge: document.getElementById('quotaBadge'),

  attachBtn: document.getElementById('attachBtn'),
  genImageBtn: document.getElementById('genImageBtn'),
  fileInput: document.getElementById('fileInput'),
  attachPreview: document.getElementById('attachPreview'),
  attachThumb: document.getElementById('attachThumb'),
  removeAttachBtn: document.getElementById('removeAttachBtn'),

  emojiBtn: document.getElementById('emojiBtn'),
  emojiPicker: document.getElementById('emojiPicker'),

  settingsBtn: document.getElementById('settingsBtn'),
  modalBackdrop: document.getElementById('modalBackdrop'),
  closeSettingsBtn: document.getElementById('closeSettingsBtn'),
  aiNameInput: document.getElementById('aiNameInput'),
  personalityInput: document.getElementById('personalityInput'),
  settingsPersonaChips: document.getElementById('settingsPersonaChips'),
  themeSwatches: document.getElementById('themeSwatches'),
  soundToggle: document.getElementById('soundToggle'),
  typeSoundSelect: document.getElementById('typeSoundSelect'),
  musicSourceSelect: document.getElementById('musicSourceSelect'),
  musicYoutubeInput: document.getElementById('musicYoutubeInput'),
  musicUrlInput: document.getElementById('musicUrlInput'),
  musicYoutubeWrap: document.getElementById('musicYoutubeWrap'),
  musicAudioEl: document.getElementById('musicAudioEl'),
  musicVolumeRow: document.getElementById('musicVolumeRow'),
  musicVolumeInput: document.getElementById('musicVolumeInput'),
  bgImageInput: document.getElementById('bgImageInput'),
  bgImageRemoveBtn: document.getElementById('bgImageRemoveBtn'),
  bubbleTransparentToggle: document.getElementById('bubbleTransparentToggle'),
  bubbleTextureSelect: document.getElementById('bubbleTextureSelect'),
  accentColorInput: document.getElementById('accentColorInput'),
  bgColorInput: document.getElementById('bgColorInput'),
  userBubbleColorInput: document.getElementById('userBubbleColorInput'),
  aiBubbleColorInput: document.getElementById('aiBubbleColorInput'),
  fontSelect: document.getElementById('fontSelect'),
  saveSettingsBtn: document.getElementById('saveSettingsBtn'),
  resetSettingsBtn: document.getElementById('resetSettingsBtn'),

  avatarStudioBtn: document.getElementById('avatarStudioBtn'),
  avatarModalBackdrop: document.getElementById('avatarModalBackdrop'),
  closeAvatarBtn: document.getElementById('closeAvatarBtn'),
  avatarTargetToggle: document.getElementById('avatarTargetToggle'),
  avatarTypeToggle: document.getElementById('avatarTypeToggle'),
  avatarShapeToggle: document.getElementById('avatarShapeToggle'),
  avatarPreview: document.getElementById('avatarPreview'),
  avatarInitialsField: document.getElementById('avatarInitialsField'),
  avatarInitialsInput: document.getElementById('avatarInitialsInput'),
  avatarEmojiField: document.getElementById('avatarEmojiField'),
  avatarEmojiPicker: document.getElementById('avatarEmojiPicker'),
  avatarImageField: document.getElementById('avatarImageField'),
  avatarFileInput: document.getElementById('avatarFileInput'),
  avatarBgSwatches: document.getElementById('avatarBgSwatches'),
  avatarResetBtn: document.getElementById('avatarResetBtn'),
  avatarApplyBtn: document.getElementById('avatarApplyBtn'),

  toastContainer: document.getElementById('toastContainer'),

  chatViewTab: document.getElementById('chatViewTab'),
  sandboxViewTab: document.getElementById('sandboxViewTab'),
  sandboxView: document.getElementById('sandboxView'),
  sandboxTabs: document.getElementById('sandboxTabs'),
  sandboxEditor: document.getElementById('sandboxEditor'),
  autoRunToggle: document.getElementById('autoRunToggle'),
  sandboxRunBtn: document.getElementById('sandboxRunBtn'),
  sandboxResetBtn: document.getElementById('sandboxResetBtn'),
  sandboxCodepenBtn: document.getElementById('sandboxCodepenBtn'),
  sandboxPreviewFrame: document.getElementById('sandboxPreviewFrame'),
  sandboxConsole: document.getElementById('sandboxConsole'),
  sandboxConsoleCount: document.getElementById('sandboxConsoleCount'),
  sandboxGutter: document.getElementById('sandboxGutter'),
  sandboxUndoBtn: document.getElementById('sandboxUndoBtn'),
  sandboxDownloadBtn: document.getElementById('sandboxDownloadBtn'),
  sandboxFullscreenBtn: document.getElementById('sandboxFullscreenBtn'),
  sandboxAiToggleBtn: document.getElementById('sandboxAiToggleBtn'),
  sandboxAiPane: document.getElementById('sandboxAiPane'),
  sandboxAiName: document.getElementById('sandboxAiName'),
  sandboxAiClearBtn: document.getElementById('sandboxAiClearBtn'),
  sandboxAiMessages: document.getElementById('sandboxAiMessages'),
  sandboxAiForm: document.getElementById('sandboxAiForm'),
  sandboxAiInput: document.getElementById('sandboxAiInput'),
  sandboxAiSendBtn: document.getElementById('sandboxAiSendBtn'),

  sandboxTemplateSelect: document.getElementById('sandboxTemplateSelect'),
  savedSandboxSelect: document.getElementById('savedSandboxSelect'),
  sandboxSaveBtn: document.getElementById('sandboxSaveBtn'),
  sandboxDeleteSavedBtn: document.getElementById('sandboxDeleteSavedBtn'),

  scenarioBanner: document.getElementById('scenarioBanner'),
  scenarioBannerText: document.getElementById('scenarioBannerText'),
  editScenarioBtn: document.getElementById('editScenarioBtn'),
  scenarioStudioBtn: document.getElementById('scenarioStudioBtn'),
  scenarioModalBackdrop: document.getElementById('scenarioModalBackdrop'),
  closeScenarioBtn: document.getElementById('closeScenarioBtn'),
  scenarioSeriesInput: document.getElementById('scenarioSeriesInput'),
  scenarioResearchSettingBtn: document.getElementById('scenarioResearchSettingBtn'),
  scenarioSettingOutput: document.getElementById('scenarioSettingOutput'),
  scenarioCharacterNameInput: document.getElementById('scenarioCharacterNameInput'),
  scenarioAddCharacterBtn: document.getElementById('scenarioAddCharacterBtn'),
  scenarioCharacterList: document.getElementById('scenarioCharacterList'),
  scenarioLanguageSelect: document.getElementById('scenarioLanguageSelect'),
  scenarioLanguageOther: document.getElementById('scenarioLanguageOther'),
  scenarioArcInput: document.getElementById('scenarioArcInput'),
  scenarioOcNameInput: document.getElementById('scenarioOcNameInput'),
  scenarioOcBackstoryInput: document.getElementById('scenarioOcBackstoryInput'),
  scenarioOcIntegrationInput: document.getElementById('scenarioOcIntegrationInput'),
  scenarioClearBtn: document.getElementById('scenarioClearBtn'),
  scenarioBeginBtn: document.getElementById('scenarioBeginBtn'),
};

let state = {
  conversations: [],   // [{ id, title, messages: [{id, role, content, image?, reactions?}] }]
  activeId: null,
};

let settings = { ...DEFAULT_SETTINGS };
let pendingImage = null; // { mimeType, data (base64, no prefix), previewUrl }
let isStreaming = false;
let searchQuery = '';

// Avatar studio draft state
const avatarDraft = {
  target: 'user',
  type: 'initials',
  value: '',
  bg: 'linear-gradient(135deg, #f5a623, #b57a1d)',
  shape: 'circle',
};

// ---------- In-app coding sandbox state ----------

const DEFAULT_SANDBOX = {
  html: '<h1>Hello world!</h1>\n<p>Edit the HTML, CSS, and JS tabs, then hit Run.</p>\n<button id="clickme">Click me</button>',
  css: 'body {\n  font-family: sans-serif;\n  padding: 24px;\n  color: #222;\n}\n\nbutton {\n  padding: 8px 14px;\n  border-radius: 6px;\n  border: none;\n  background: #f5a623;\n  cursor: pointer;\n}',
  js: "document.getElementById('clickme').addEventListener('click', () => {\n  console.log('Button clicked!');\n});",
};

let sandboxCode = { ...DEFAULT_SANDBOX };
let activeSandboxPane = 'html';
let sandboxDebounceTimer = null;
let sandboxConsoleLineCount = 0;
let sandboxUndoSnapshot = null;
let sandboxAiMessages = []; // ephemeral pair-programming chat, not saved to main history
let sandboxAiStreaming = false;
let sandboxIsFullscreen = false;
let sandboxAiPaneOpen = true;

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #f5a623, #b57a1d)',
  'linear-gradient(135deg, #3fa9f5, #2678ad)',
  'linear-gradient(135deg, #4fd17a, #2e9955)',
  'linear-gradient(135deg, #ff7a9c, #c8506e)',
  'linear-gradient(135deg, #c86bff, #8b46b8)',
  'linear-gradient(135deg, #ff5c5c, #a52424)',
  'linear-gradient(135deg, #6b7280, #374151)',
  'linear-gradient(135deg, #f6d365, #fda085)',
];

// ---------- Utilities ----------

function uid() {
  return crypto.randomUUID();
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function showToast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  els.toastContainer.appendChild(t);
  setTimeout(() => t.remove(), 2400);
}

// ---------- Settings ----------

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) settings = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    settings = { ...DEFAULT_SETTINGS };
  }
  applySettings();
}

function saveSettings() {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    showToast('Could not save — background image is too large for browser storage');
  }
}

function applySettings() {
  document.documentElement.style.setProperty('--accent', settings.accentColor);
  document.documentElement.style.setProperty('--bg', settings.bgColor);
  document.documentElement.style.setProperty('--user-msg-bg', settings.userBubbleColor);
  document.documentElement.style.setProperty('--ai-msg-bg', settings.aiBubbleColor);
  document.documentElement.style.setProperty('--font-body', settings.font);
  els.aiNameDisplay.textContent = settings.aiName || 'console';
  els.emptyTitle.textContent = `What are we building, with ${settings.aiName || 'console'}?`;
  els.promptInput.placeholder = `Message ${settings.aiName || 'console'}…`;
  if (els.sandboxAiName) els.sandboxAiName.textContent = settings.aiName || 'console';
  renderBrandAvatar();

  if (settings.backgroundImage) {
    document.documentElement.style.setProperty('--bg-image-url', `url("${settings.backgroundImage}")`);
    document.body.classList.add('has-bg-image');
  } else {
    document.body.classList.remove('has-bg-image');
  }
  document.body.classList.toggle('bubbles-transparent', !!settings.bubbleTransparent);
  document.body.dataset.bubbleTexture = settings.bubbleTexture || 'flat';
}

function renderBrandAvatar() {
  els.brandAvatar.innerHTML = '';
  const av = settings.aiAvatar;
  if (av && av.type === 'image' && av.value) {
    const img = document.createElement('img');
    img.src = av.value;
    els.brandAvatar.appendChild(img);
  } else if (av && av.type === 'emoji' && av.value) {
    els.brandAvatar.textContent = av.value;
  } else {
    els.brandAvatar.textContent = '▍';
  }
}

function openSettings() {
  els.aiNameInput.value = settings.aiName;
  els.personalityInput.value = settings.personality;
  els.soundToggle.checked = settings.soundOn;
  els.accentColorInput.value = settings.accentColor;
  els.bgColorInput.value = settings.bgColor;
  els.userBubbleColorInput.value = settings.userBubbleColor;
  els.aiBubbleColorInput.value = settings.aiBubbleColor;
  els.fontSelect.value = settings.font;
  els.typeSoundSelect.value = settings.typeSound;
  els.musicSourceSelect.value = settings.music.source;
  els.musicYoutubeInput.value = settings.music.youtube;
  els.musicUrlInput.value = settings.music.url;
  els.musicVolumeInput.value = settings.music.volume;
  els.musicYoutubeInput.style.display = settings.music.source === 'youtube' ? 'block' : 'none';
  els.musicUrlInput.style.display = settings.music.source === 'url' ? 'block' : 'none';
  els.bubbleTransparentToggle.checked = settings.bubbleTransparent;
  els.bubbleTextureSelect.value = settings.bubbleTexture;
  els.modalBackdrop.style.display = 'flex';
}

function closeSettings() {
  els.modalBackdrop.style.display = 'none';
}

els.settingsBtn.addEventListener('click', openSettings);
els.closeSettingsBtn.addEventListener('click', closeSettings);
els.modalBackdrop.addEventListener('click', (e) => {
  if (e.target === els.modalBackdrop) closeSettings();
});

els.saveSettingsBtn.addEventListener('click', () => {
  settings.aiName = els.aiNameInput.value.trim() || 'console';
  settings.personality = els.personalityInput.value.trim();
  settings.soundOn = els.soundToggle.checked;
  settings.accentColor = els.accentColorInput.value;
  settings.bgColor = els.bgColorInput.value;
  settings.userBubbleColor = els.userBubbleColorInput.value;
  settings.aiBubbleColor = els.aiBubbleColorInput.value;
  settings.font = els.fontSelect.value;
  settings.typeSound = els.typeSoundSelect.value;
  const newMusic = {
    source: els.musicSourceSelect.value,
    youtube: els.musicYoutubeInput.value.trim(),
    url: els.musicUrlInput.value.trim(),
    volume: Number(els.musicVolumeInput.value),
  };
  const musicChanged = newMusic.source !== settings.music.source
    || newMusic.youtube !== settings.music.youtube
    || newMusic.url !== settings.music.url;
  settings.music = newMusic;
  settings.bubbleTransparent = els.bubbleTransparentToggle.checked;
  settings.bubbleTexture = els.bubbleTextureSelect.value;
  saveSettings();
  applySettings();
  if (musicChanged) applyMusicSettings();
  closeSettings();
  showToast('Settings saved');
});

els.bgImageInput.addEventListener('change', () => {
  const file = els.bgImageInput.files && els.bgImageInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    settings.backgroundImage = reader.result;
    saveSettings();
    applySettings();
    showToast('Background image set');
  };
  reader.readAsDataURL(file);
});

els.bgImageRemoveBtn.addEventListener('click', () => {
  settings.backgroundImage = null;
  els.bgImageInput.value = '';
  saveSettings();
  applySettings();
  showToast('Background image removed');
});

els.musicSourceSelect.addEventListener('change', () => {
  els.musicYoutubeInput.style.display = els.musicSourceSelect.value === 'youtube' ? 'block' : 'none';
  els.musicUrlInput.style.display = els.musicSourceSelect.value === 'url' ? 'block' : 'none';
  els.musicVolumeRow.style.display = els.musicSourceSelect.value === 'url' ? 'flex' : 'none';
});

els.musicVolumeInput.addEventListener('input', () => {
  els.musicAudioEl.volume = Number(els.musicVolumeInput.value) / 100;
});

els.resetSettingsBtn.addEventListener('click', () => {
  const keepAvatars = { userAvatar: settings.userAvatar, aiAvatar: settings.aiAvatar };
  settings = { ...DEFAULT_SETTINGS, ...keepAvatars };
  saveSettings();
  applySettings();
  openSettings();
  showToast('Settings reset');
});

// ---------- Persona chips ----------

function renderPersonaChip(container) {
  container.innerHTML = '';
  for (const p of PERSONAS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'persona-chip';
    btn.innerHTML = `<span class="emo">${p.emo}</span>${p.name}`;
    btn.addEventListener('click', () => {
      settings.aiName = p.aiName;
      settings.personality = p.personality;
      saveSettings();
      applySettings();
      if (document.getElementById('aiNameInput')) {
        els.aiNameInput.value = settings.aiName;
        els.personalityInput.value = settings.personality;
      }
      showToast(`Persona set: ${p.name}`);
    });
    container.appendChild(btn);
  }
}
renderPersonaChip(els.emptyPersonaChips);
renderPersonaChip(els.settingsPersonaChips);

// ---------- Theme swatches ----------

function renderThemeSwatches() {
  els.themeSwatches.innerHTML = '';
  for (const t of THEMES) {
    const sw = document.createElement('button');
    sw.type = 'button';
    sw.className = 'theme-swatch';
    sw.title = t.name;
    sw.style.background = `linear-gradient(135deg, ${t.accent}, ${t.bg})`;
    if (settings.accentColor === t.accent && settings.bgColor === t.bg) sw.classList.add('active');
    sw.addEventListener('click', () => {
      settings.accentColor = t.accent;
      settings.bgColor = t.bg;
      settings.userBubbleColor = t.userBubble;
      settings.aiBubbleColor = t.aiBubble;
      saveSettings();
      applySettings();
      els.accentColorInput.value = t.accent;
      els.bgColorInput.value = t.bg;
      els.userBubbleColorInput.value = t.userBubble;
      els.aiBubbleColorInput.value = t.aiBubble;
      renderThemeSwatches();
      showToast(`Theme: ${t.name}`);
    });
    els.themeSwatches.appendChild(sw);
  }
}
renderThemeSwatches();

function applyThemeByName(name) {
  const t = THEMES.find(th => th.name.toLowerCase().includes(name.toLowerCase()));
  if (!t) return false;
  settings.accentColor = t.accent;
  settings.bgColor = t.bg;
  settings.userBubbleColor = t.userBubble;
  settings.aiBubbleColor = t.aiBubble;
  saveSettings();
  applySettings();
  renderThemeSwatches();
  return true;
}

// ---------- Emoji picker (composer) ----------

function buildEmojiGrid(container, onPick) {
  container.innerHTML = '';
  for (const cat of EMOJI_CATEGORIES) {
    const label = document.createElement('div');
    label.className = 'emoji-cat-label';
    label.textContent = cat.label;
    container.appendChild(label);

    const grid = document.createElement('div');
    grid.className = 'emoji-grid';
    for (const emo of cat.items) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'emoji-opt';
      btn.textContent = emo;
      btn.addEventListener('click', () => onPick(emo));
      grid.appendChild(btn);
    }
    container.appendChild(grid);
  }
}

buildEmojiGrid(els.emojiPicker, (emo) => {
  const input = els.promptInput;
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? input.value.length;
  input.value = input.value.slice(0, start) + emo + input.value.slice(end);
  input.focus();
  input.selectionStart = input.selectionEnd = start + emo.length;
  autoResize();
});

els.emojiBtn.addEventListener('click', () => {
  els.emojiPicker.style.display = els.emojiPicker.style.display === 'none' ? 'block' : 'none';
});

document.addEventListener('click', (e) => {
  if (!els.emojiPicker.contains(e.target) && e.target !== els.emojiBtn) {
    els.emojiPicker.style.display = 'none';
  }
});

// ---------- Typing sound (synthesized, no audio file needed) ----------

let audioCtx = null;
const TYPE_SOUND_PRESETS = {
  tick:  { type: 'square',    freq: () => 620 + Math.random() * 80,  gain: 0.045, dur: 0.05 },
  blip:  { type: 'sine',      freq: () => 900 + Math.random() * 120, gain: 0.03,  dur: 0.03 },
  click: { type: 'square',    freq: () => 180 + Math.random() * 40,  gain: 0.06,  dur: 0.02 },
  chime: { type: 'triangle',  freq: () => 1200 + Math.random() * 300, gain: 0.035, dur: 0.08 },
};

function playTypeTick() {
  if (!settings.soundOn) return;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const preset = TYPE_SOUND_PRESETS[settings.typeSound] || TYPE_SOUND_PRESETS.tick;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = preset.type;
    osc.frequency.value = preset.freq();
    gain.gain.setValueAtTime(preset.gain, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + preset.dur);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + preset.dur + 0.01);
  } catch {
    // audio not available; fail silently
  }
}

// ---------- Background music ----------

function extractYoutubeId(input) {
  if (!input) return '';
  const trimmed = input.trim();
  const m = trimmed.match(/(?:youtu\.be\/|v=|embed\/)([a-zA-Z0-9_-]{11})/);
  if (m) return m[1];
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  return '';
}

function applyMusicSettings() {
  const m = settings.music;

  if (m.source === 'youtube') {
    els.musicYoutubeWrap.style.display = 'block';
    els.musicAudioEl.style.display = 'none';
    els.musicAudioEl.pause();
    const id = extractYoutubeId(m.youtube);
    els.musicYoutubeWrap.innerHTML = id
      ? `<iframe width="100%" height="80" src="https://www.youtube.com/embed/${id}?autoplay=1&loop=1&playlist=${id}&controls=1" frameborder="0" allow="autoplay" title="Background music"></iframe>`
      : '<div style="font-size:12px; opacity:0.6;">Paste a YouTube link above to start it.</div>';
  } else {
    els.musicYoutubeWrap.style.display = 'none';
    els.musicYoutubeWrap.innerHTML = '';

    if (m.source === 'url' && m.url) {
      els.musicAudioEl.style.display = 'block';
      els.musicAudioEl.src = m.url;
      els.musicAudioEl.volume = (m.volume ?? 50) / 100;
      els.musicAudioEl.play().catch(() => { /* needs a user gesture first, that's fine */ });
    } else {
      els.musicAudioEl.pause();
      els.musicAudioEl.style.display = 'none';
    }
  }

  els.musicVolumeRow.style.display = m.source === 'url' ? 'flex' : 'none';
}

// ---------- Persistence (conversations) ----------

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) state.conversations = JSON.parse(raw);
  } catch {
    state.conversations = [];
  }
  // backfill ids for older saved messages
  for (const convo of state.conversations) {
    for (const msg of convo.messages) {
      if (!msg.id) msg.id = uid();
    }
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.conversations));
  } catch {
    // storage full (likely from images) - drop oldest conversation and retry once
    if (state.conversations.length > 1) {
      state.conversations.pop();
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.conversations)); } catch {}
    }
  }
}

// ---------- Conversation helpers ----------

function createConversation() {
  const convo = { id: uid(), title: 'New chat', messages: [] };
  state.conversations.unshift(convo);
  state.activeId = convo.id;
  saveState();
  renderSidebar();
  renderMessages();
}

function getActiveConversation() {
  return state.conversations.find(c => c.id === state.activeId) || null;
}

function deleteConversation(id) {
  state.conversations = state.conversations.filter(c => c.id !== id);
  if (state.activeId === id) {
    state.activeId = state.conversations[0]?.id || null;
  }
  saveState();
  renderSidebar();
  renderMessages();
}

function setTitleFromFirstMessage(convo, text) {
  if (convo.title === 'New chat') {
    const base = text || '(image)';
    convo.title = base.slice(0, 42) + (base.length > 42 ? '…' : '');
  }
}

// ---------- Export ----------

function exportActiveConversation() {
  const convo = getActiveConversation();
  if (!convo || convo.messages.length === 0) {
    showToast('Nothing to export yet');
    return;
  }
  let md = `# ${convo.title}\n\n`;
  for (const m of convo.messages) {
    if (m.role === 'assistant' && convo.scenario) {
      const segments = splitScenarioMessage(m.content);
      if (segments) {
        for (const seg of segments) md += `**${seg.speaker}:**\n\n${seg.text}\n\n`;
        md += `---\n\n`;
        continue;
      }
    }
    const who = m.role === 'user' ? 'You' : (settings.aiName || 'AI');
    md += `**${who}:**\n\n${m.content}\n\n---\n\n`;
  }
  const blob = new Blob([md], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${convo.title.replace(/[^\w\- ]+/g, '').slice(0, 40) || 'chat'}.md`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Chat exported');
}

els.exportBtn.addEventListener('click', exportActiveConversation);

// ---------- Search ----------

els.searchInput.addEventListener('input', () => {
  searchQuery = els.searchInput.value.trim().toLowerCase();
  renderSidebar();
});

// ---------- Rendering ----------

function renderSidebar() {
  els.chatList.innerHTML = '';
  const filtered = searchQuery
    ? state.conversations.filter(c => c.title.toLowerCase().includes(searchQuery))
    : state.conversations;

  if (filtered.length === 0) {
    const hint = document.createElement('div');
    hint.className = 'empty-hint';
    hint.textContent = searchQuery ? 'No chats match your search.' : 'No chats yet — start one!';
    els.chatList.appendChild(hint);
    return;
  }

  for (const convo of filtered) {
    const item = document.createElement('div');
    item.className = 'chat-item' + (convo.id === state.activeId ? ' active' : '');

    const title = document.createElement('span');
    title.className = 'title';
    title.textContent = convo.title;
    item.appendChild(title);

    if (convo.scenario) {
      const editBtn = document.createElement('button');
      editBtn.className = 'scenario-edit-btn';
      editBtn.textContent = '🎭';
      editBtn.title = 'Configure this scenario';
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        state.activeId = convo.id;
        renderSidebar();
        renderMessages();
        openScenarioStudioForEdit(convo);
      });
      item.appendChild(editBtn);
    }

    const del = document.createElement('button');
    del.className = 'delete-btn';
    del.textContent = '✕';
    del.title = 'Delete chat';
    del.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteConversation(convo.id);
    });
    item.appendChild(del);

    item.addEventListener('click', () => {
      state.activeId = convo.id;
      renderSidebar();
      renderMessages();
    });

    els.chatList.appendChild(item);
  }
}

function renderMessages() {
  const convo = getActiveConversation();
  els.messages.innerHTML = '';

  if (convo && convo.scenario) {
    const s = convo.scenario;
    els.scenarioBanner.style.display = 'flex';
    const bits = [`🎭 <strong>${escapeHtml(s.series)}</strong>`, escapeHtml(s.language)];
    if (s.arc) bits.push(escapeHtml(s.arc.length > 60 ? s.arc.slice(0, 60) + '…' : s.arc));
    if (s.oc && s.oc.name) bits.push(`playing as <strong>${escapeHtml(s.oc.name)}</strong>`);
    els.scenarioBannerText.innerHTML = bits.join(' &nbsp;·&nbsp; ');
  } else {
    els.scenarioBanner.style.display = 'none';
  }

  if (!convo || convo.messages.length === 0) {
    els.emptyState.style.display = 'block';
    return;
  }
  els.emptyState.style.display = 'none';

  convo.messages.forEach((msg, idx) => {
    const isLastAssistant = msg.role === 'assistant' && idx === convo.messages.length - 1;
    els.messages.appendChild(buildMessageEl(msg, convo, isLastAssistant));
  });
  scrollToBottom();
}

function avatarStyleFor(kind) {
  // kind: 'user' | 'assistant'
  const av = kind === 'user' ? settings.userAvatar : settings.aiAvatar;
  return av;
}

function applyAvatarToEl(avatarEl, kind, fallbackText) {
  const av = avatarStyleFor(kind);
  avatarEl.innerHTML = '';
  avatarEl.classList.remove('circle');
  if (av && av.type === 'image' && av.value) {
    if (av.shape === 'circle') avatarEl.classList.add('circle');
    const img = document.createElement('img');
    img.src = av.value;
    avatarEl.appendChild(img);
  } else if (av && av.type === 'emoji' && av.value) {
    if (av.shape === 'circle') avatarEl.classList.add('circle');
    avatarEl.style.background = av.bg || '';
    avatarEl.textContent = av.value;
  } else if (av && av.type === 'initials' && av.value) {
    if (av.shape === 'circle') avatarEl.classList.add('circle');
    avatarEl.style.background = av.bg || '';
    avatarEl.style.color = '#1a1300';
    avatarEl.textContent = av.value;
  } else {
    avatarEl.textContent = fallbackText;
  }
}

// ---------- Scenario multi-character message rendering ----------
// Assistant replies in a scenario with named characters are tagged with
// {{as: Name}} markers (see the system prompt built in the Scenario
// Studio). This splits a raw reply into per-character segments so each
// one can be rendered as its own bubble with that character's own
// avatar/color, instead of one generic AI bubble for the whole scene.

const SCENARIO_TAG_RE = /\{\{as:\s*([^}]+)\}\}/g;

function splitScenarioMessage(content) {
  SCENARIO_TAG_RE.lastIndex = 0;
  const marks = [];
  let m;
  while ((m = SCENARIO_TAG_RE.exec(content)) !== null) {
    marks.push({ speaker: m[1].trim(), start: m.index, end: SCENARIO_TAG_RE.lastIndex });
  }
  if (!marks.length) return null;
  const segments = [];
  for (let i = 0; i < marks.length; i++) {
    const textEnd = i + 1 < marks.length ? marks[i + 1].start : content.length;
    const text = content.slice(marks[i].end, textEnd).trim();
    if (text) segments.push({ speaker: marks[i].speaker, text });
  }
  return segments.length ? segments : null;
}

function findScenarioCharacter(convo, name) {
  const chars = (convo.scenario && convo.scenario.characters) || [];
  const lower = (name || '').trim().toLowerCase();
  return chars.find(c => (c.name || '').trim().toLowerCase() === lower) || null;
}

function applyCharacterAvatarToEl(avatarEl, character, fallbackText) {
  avatarEl.innerHTML = '';
  avatarEl.classList.add('circle');
  if (character && character.avatar) {
    const img = document.createElement('img');
    img.src = character.avatar;
    avatarEl.appendChild(img);
  } else {
    avatarEl.style.background = (character && character.color) || 'rgba(245, 166, 35, 0.15)';
    avatarEl.textContent = fallbackText;
  }
}

function buildScenarioMessageEl(msg, convo, isLastAssistant, segments) {
  const outer = document.createElement('div');
  outer.className = 'scenario-message-group';
  outer.dataset.id = msg.id;

  segments.forEach((seg, i) => {
    const isNarrator = seg.speaker.toLowerCase() === 'narrator';
    const character = isNarrator ? null : findScenarioCharacter(convo, seg.speaker);

    const row = document.createElement('div');
    row.className = 'message assistant scenario-row' + (isNarrator ? ' scenario-narrator' : '');

    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    const fallback = seg.speaker.slice(0, 2).toUpperCase();
    if (!isNarrator) applyCharacterAvatarToEl(avatar, character, fallback);
    else avatar.textContent = '📖';

    const col = document.createElement('div');
    col.className = 'message-col';

    if (!isNarrator) {
      const nameTag = document.createElement('div');
      nameTag.className = 'scenario-speaker-name';
      nameTag.textContent = character ? character.name : seg.speaker;
      if (character && character.color) nameTag.style.color = character.color;
      col.appendChild(nameTag);
    }

    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    if (character && character.color) {
      bubble.style.setProperty('--char-color', character.color);
      bubble.classList.add('char-tinted');
    }
    renderContent(bubble, seg.text);
    col.appendChild(bubble);

    if (i === segments.length - 1) {
      const toolbar = buildToolbar(msg, convo, 'assistant', isLastAssistant, bubble);
      col.appendChild(toolbar);
    }

    row.appendChild(avatar);
    row.appendChild(col);
    outer.appendChild(row);
  });

  return outer;
}

function buildMessageEl(msg, convo, isLastAssistant, formatted = true) {
  const { role, content, image } = msg;

  if (formatted && role === 'assistant' && convo && convo.scenario && (convo.scenario.characters || []).length) {
    const segments = splitScenarioMessage(content);
    if (segments) return buildScenarioMessageEl(msg, convo, isLastAssistant, segments);
  }

  const wrap = document.createElement('div');
  wrap.className = `message ${role}`;
  wrap.dataset.id = msg.id;

  const avatar = document.createElement('div');
  avatar.className = 'avatar';
  const fallback = role === 'user' ? 'You' : (settings.aiName || 'AI').slice(0, 2).toUpperCase();
  applyAvatarToEl(avatar, role === 'user' ? 'user' : 'assistant', fallback);

  const col = document.createElement('div');
  col.className = 'message-col';

  const bubble = document.createElement('div');
  bubble.className = 'bubble';

  if (image) {
    const img = document.createElement('img');
    img.className = 'msg-image';
    img.src = `data:${image.mimeType};base64,${image.data}`;
    bubble.appendChild(img);
  }

  if (formatted) {
    renderContent(bubble, content);
  } else {
    const textNode = document.createElement('span');
    textNode.textContent = content;
    bubble.appendChild(textNode);
  }

  col.appendChild(bubble);

  if (convo) {
    const toolbar = buildToolbar(msg, convo, role, isLastAssistant, bubble);
    col.appendChild(toolbar);
  }

  wrap.appendChild(avatar);
  wrap.appendChild(col);
  return wrap;
}

function buildToolbar(msg, convo, role, isLastAssistant, bubbleEl) {
  const bar = document.createElement('div');
  bar.className = 'msg-toolbar';

  const copyBtn = document.createElement('button');
  copyBtn.type = 'button';
  copyBtn.textContent = 'Copy';
  copyBtn.addEventListener('click', () => {
    const clean = msg.content.replace(SCENARIO_TAG_RE, '').trim();
    navigator.clipboard.writeText(clean).then(() => showToast('Message copied'));
  });
  bar.appendChild(copyBtn);

  if (role === 'user') {
    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.textContent = 'Edit';
    editBtn.addEventListener('click', () => {
      const idx = convo.messages.findIndex(m => m.id === msg.id);
      if (idx === -1) return;
      els.promptInput.value = msg.content;
      autoResize();
      els.promptInput.focus();
      convo.messages = convo.messages.slice(0, idx);
      saveState();
      renderMessages();
      showToast('Edit and resend below');
    });
    bar.appendChild(editBtn);
  }

  if (role === 'assistant') {
    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.textContent = 'Edit';
    editBtn.addEventListener('click', () => {
      bubbleEl.innerHTML = '';
      const ta = document.createElement('textarea');
      ta.className = 'edit-bubble-textarea';
      ta.value = msg.content;
      bubbleEl.appendChild(ta);
      ta.focus();

      const actions = document.createElement('div');
      actions.className = 'edit-bubble-actions';
      const saveBtn = document.createElement('button');
      saveBtn.type = 'button';
      saveBtn.textContent = 'Save';
      saveBtn.addEventListener('click', () => {
        msg.content = ta.value;
        saveState();
        renderMessages();
      });
      const cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.textContent = 'Cancel';
      cancelBtn.addEventListener('click', () => renderMessages());
      actions.appendChild(saveBtn);
      actions.appendChild(cancelBtn);
      bubbleEl.appendChild(actions);
    });
    bar.appendChild(editBtn);
  }

  if (role === 'assistant' && isLastAssistant) {
    const regenBtn = document.createElement('button');
    regenBtn.type = 'button';
    regenBtn.textContent = 'Regenerate';
    regenBtn.addEventListener('click', () => regenerateLast(convo));
    bar.appendChild(regenBtn);
  }

  const delBtn = document.createElement('button');
  delBtn.type = 'button';
  delBtn.textContent = 'Delete';
  delBtn.addEventListener('click', () => {
    convo.messages = convo.messages.filter(m => m.id !== msg.id);
    saveState();
    renderMessages();
  });
  bar.appendChild(delBtn);

  if (role === 'assistant') {
    const reactions = document.createElement('div');
    reactions.className = 'reactions';
    for (const emo of ['👍', '👎', '😂', '🤯']) {
      const rb = document.createElement('button');
      rb.type = 'button';
      rb.className = 'reaction-btn';
      rb.textContent = emo;
      msg.reactions = msg.reactions || {};
      if (msg.reactions[emo]) rb.classList.add('active');
      rb.addEventListener('click', () => {
        msg.reactions[emo] = !msg.reactions[emo];
        rb.classList.toggle('active');
        saveState();
      });
      reactions.appendChild(rb);
    }
    bar.appendChild(reactions);
  }

  return bar;
}

function regenerateLast(convo) {
  if (isStreaming) return;
  const lastAssistantIdx = [...convo.messages].reverse().findIndex(m => m.role === 'assistant');
  if (lastAssistantIdx === -1) return;
  const realIdx = convo.messages.length - 1 - lastAssistantIdx;
  convo.messages = convo.messages.slice(0, realIdx);
  saveState();
  renderMessages();
  continueAssistantReply(convo);
}

// Parses ```lang\ncode``` fences and lightweight inline markdown
// (bold, italic, inline code, links, lists, blockquotes, headers).
function renderContent(bubbleEl, text) {
  const existingImg = bubbleEl.querySelector('img.msg-image');
  bubbleEl.innerHTML = '';
  if (existingImg) bubbleEl.appendChild(existingImg);

  const regex = /```(\w+)?\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      appendFormattedText(bubbleEl, text.slice(lastIndex, match.index));
    }
    appendCodeBlock(bubbleEl, (match[1] || 'plaintext').toLowerCase(), match[2]);
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    appendFormattedText(bubbleEl, text.slice(lastIndex));
  }
}

function inlineMarkdown(escaped) {
  return escaped
    .replace(/\*\*(.+?)\*\*/g, '<span class="action-text">$1</span>')
    .replace(/(?<!\*)\*(?!\*)(.+?)\*(?!\*)/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
}

function appendFormattedText(container, text) {
  if (!text.trim()) {
    if (text) container.appendChild(document.createTextNode(text));
    return;
  }
  const lines = text.split('\n');
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    if (/^(#{1,3})\s+/.test(line)) {
      const level = line.match(/^(#{1,3})/)[1].length;
      const h = document.createElement(`h${Math.min(level + 1, 3)}`);
      h.innerHTML = inlineMarkdown(escapeHtml(line.replace(/^#{1,3}\s+/, '')));
      container.appendChild(h);
      i++;
      continue;
    }

    if (/^>\s?/.test(line)) {
      const bq = document.createElement('blockquote');
      const bqLines = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        bqLines.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      bq.innerHTML = inlineMarkdown(escapeHtml(bqLines.join('\n')));
      container.appendChild(bq);
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      const ul = document.createElement('ul');
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        const li = document.createElement('li');
        li.innerHTML = inlineMarkdown(escapeHtml(lines[i].replace(/^\s*[-*]\s+/, '')));
        ul.appendChild(li);
        i++;
      }
      container.appendChild(ul);
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const ol = document.createElement('ol');
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        const li = document.createElement('li');
        li.innerHTML = inlineMarkdown(escapeHtml(lines[i].replace(/^\s*\d+\.\s+/, '')));
        ol.appendChild(li);
        i++;
      }
      container.appendChild(ol);
      continue;
    }

    // plain paragraph line — accumulate consecutive non-empty plain lines
    const span = document.createElement('span');
    span.className = 'plain-text';
    span.innerHTML = inlineMarkdown(escapeHtml(line));
    container.appendChild(span);
    if (i < lines.length - 1) container.appendChild(document.createElement('br'));
    i++;
  }
}

function appendCodeBlock(container, lang, code) {
  const block = document.createElement('div');
  block.className = 'code-block';

  const header = document.createElement('div');
  header.className = 'code-block-header';

  const langLabel = document.createElement('span');
  langLabel.textContent = lang;

  const actions = document.createElement('div');
  actions.className = 'code-block-actions';

  const copyBtn = document.createElement('button');
  copyBtn.type = 'button';
  copyBtn.className = 'copy-code-btn';
  copyBtn.textContent = 'Copy';
  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(code.trim()).then(() => {
      copyBtn.textContent = 'Copied';
      copyBtn.classList.add('copied');
      setTimeout(() => {
        copyBtn.textContent = 'Copy';
        copyBtn.classList.remove('copied');
      }, 1500);
    });
  });
  actions.appendChild(copyBtn);

  const pre = document.createElement('pre');
  const codeEl = document.createElement('code');
  codeEl.className = lang ? `language-${lang}` : '';
  codeEl.textContent = code.trim();
  pre.appendChild(codeEl);

  let outputPanel = null;

  const runnableJs = ['javascript', 'js', 'jsx'].includes(lang);
  const previewableHtml = ['html', 'xml'].includes(lang);
  const sandboxable = ['html', 'css', 'javascript', 'js', 'jsx'].includes(lang);

  if (runnableJs) {
    const runBtn = document.createElement('button');
    runBtn.type = 'button';
    runBtn.className = 'sandbox-btn run-btn';
    runBtn.textContent = '▶ Run';
    runBtn.addEventListener('click', () => {
      outputPanel = outputPanel || createOutputPanel(block);
      runJsInSandbox(code.trim(), outputPanel);
    });
    actions.appendChild(runBtn);
  }

  if (previewableHtml) {
    const previewBtn = document.createElement('button');
    previewBtn.type = 'button';
    previewBtn.className = 'sandbox-btn run-btn';
    previewBtn.textContent = '▶ Preview';
    previewBtn.addEventListener('click', () => {
      togglePreviewFrame(block, code.trim());
    });
    actions.appendChild(previewBtn);
  }

  if (sandboxable) {
    const editHereBtn = document.createElement('button');
    editHereBtn.type = 'button';
    editHereBtn.className = 'sandbox-btn run-btn';
    editHereBtn.textContent = '🧪 Edit here';
    editHereBtn.title = 'Load this into the built-in sandbox to run, edit, and inspect it';
    editHereBtn.addEventListener('click', () => loadCodeIntoSandbox(lang, code.trim()));
    actions.appendChild(editHereBtn);

    const openBtn = document.createElement('button');
    openBtn.type = 'button';
    openBtn.className = 'sandbox-btn open-btn';
    openBtn.textContent = '↗ CodePen';
    openBtn.title = 'Open this code in a new CodePen tab to edit and test it';
    openBtn.addEventListener('click', () => openInSandbox(lang, code.trim()));
    actions.appendChild(openBtn);
  }

  header.appendChild(langLabel);
  header.appendChild(actions);

  block.appendChild(header);
  block.appendChild(pre);
  container.appendChild(block);

  if (window.hljs) {
    try { window.hljs.highlightElement(codeEl); } catch { /* unsupported language, leave plain */ }
  }
}

function createOutputPanel(block) {
  const panel = document.createElement('div');
  panel.className = 'sandbox-output';
  panel.textContent = 'Running…';
  block.appendChild(panel);
  return panel;
}

// Runs JS in a sandboxed, scriptable-but-isolated iframe and captures
// console.log/warn/error output, so nothing here touches the real page.
function runJsInSandbox(code, outputPanel) {
  outputPanel.classList.remove('error');
  outputPanel.textContent = 'Running…';

  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  iframe.sandbox = 'allow-scripts';

  const listener = (event) => {
    if (event.source !== iframe.contentWindow) return;
    const { logs, error } = event.data || {};
    if (error) {
      outputPanel.classList.add('error');
      outputPanel.textContent = error;
    } else {
      outputPanel.textContent = (logs && logs.length) ? logs.join('\n') : '(no output — code ran with no console.log calls)';
    }
    window.removeEventListener('message', listener);
    iframe.remove();
  };
  window.addEventListener('message', listener);

  const runnerSrc = `
    <script>
      const logs = [];
      const push = (...args) => logs.push(args.map(a => {
        try { return typeof a === 'string' ? a : JSON.stringify(a); }
        catch { return String(a); }
      }).join(' '));
      console.log = push; console.info = push; console.warn = push; console.error = push;
      try {
        ${code}
        parent.postMessage({ logs }, '*');
      } catch (err) {
        parent.postMessage({ error: (err && err.message) ? err.message : String(err) }, '*');
      }
    <\/script>
  `;
  iframe.srcdoc = runnerSrc;
  document.body.appendChild(iframe);

  setTimeout(() => {
    if (document.body.contains(iframe)) {
      outputPanel.textContent = 'Timed out (possible infinite loop).';
      outputPanel.classList.add('error');
      window.removeEventListener('message', listener);
      iframe.remove();
    }
  }, 4000);
}

function togglePreviewFrame(block, html) {
  let frame = block.querySelector('.code-preview-frame');
  if (frame) {
    frame.remove();
    return;
  }
  frame = document.createElement('iframe');
  frame.className = 'code-preview-frame';
  frame.sandbox = 'allow-scripts';
  frame.srcdoc = html;
  block.appendChild(frame);
}

// Opens the code in CodePen using its documented client-side prefill
// technique (a hidden form POSTed to codepen.io/pen/define) — no API key
// needed, and it opens in a new tab fully editable and runnable.
function openInSandbox(lang, code) {
  const data = { title: 'From console.chat', editors: '1111', layout: 'top' };
  if (lang === 'html' || lang === 'xml') data.html = code;
  else if (lang === 'css') data.css = code;
  else data.js = code;

  const form = document.createElement('form');
  form.action = 'https://codepen.io/pen/define';
  form.method = 'POST';
  form.target = '_blank';
  form.style.display = 'none';

  const input = document.createElement('input');
  input.type = 'hidden';
  input.name = 'data';
  input.value = JSON.stringify(data);
  form.appendChild(input);

  document.body.appendChild(form);
  form.submit();
  form.remove();
  showToast('Opening sandbox in a new tab…');
}

function scrollToBottom() {
  els.chatScroll.scrollTop = els.chatScroll.scrollHeight;
}

let thinkingTimer = null;
let thinkingStart = 0;

function setBusy(busy) {
  isStreaming = busy;
  els.sendBtn.disabled = busy;
  els.statusDot.classList.toggle('busy', busy);
  if (busy) {
    thinkingStart = Date.now();
    els.statusLabel.textContent = 'thinking…';
    thinkingTimer = setInterval(() => {
      const secs = ((Date.now() - thinkingStart) / 1000).toFixed(1);
      els.statusLabel.textContent = `thinking… ${secs}s`;
    }, 150);
  } else {
    clearInterval(thinkingTimer);
    els.statusLabel.textContent = 'ready';
  }
}

// ---------- Image attach ----------

els.attachBtn.addEventListener('click', () => els.fileInput.click());

els.genImageBtn.addEventListener('click', () => {
  const text = els.promptInput.value.trim();
  if (!text) {
    showToast('Type what you want the image to look like first');
    return;
  }
  generateImage(text);
});

els.fileInput.addEventListener('change', () => {
  const file = els.fileInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const dataUrl = reader.result; // data:<mime>;base64,<data>
    const [, meta, data] = dataUrl.match(/^data:(.+);base64,(.*)$/) || [];
    if (!data) return;
    pendingImage = { mimeType: meta, data, previewUrl: dataUrl };
    els.attachThumb.src = dataUrl;
    els.attachPreview.style.display = 'flex';
  };
  reader.readAsDataURL(file);
  els.fileInput.value = '';
});

els.removeAttachBtn.addEventListener('click', () => {
  pendingImage = null;
  els.attachPreview.style.display = 'none';
});

// ---------- Slash commands ----------

function tryHandleSlashCommand(rawText) {
  const text = rawText.trim();
  if (!text.startsWith('/')) return false;

  const [cmd, ...rest] = text.slice(1).split(' ');
  const arg = rest.join(' ').trim();
  let reply = null;

  switch (cmd.toLowerCase()) {
    case 'help':
      reply = [
        '**Slash commands**',
        '`/roll [NdM]` — roll dice, e.g. `/roll 2d6`',
        '`/flip` — flip a coin',
        '`/8ball <question>` — ask the magic 8-ball',
        '`/joke` — get a programmer joke',
        '`/theme <name>` — switch theme (amber, ocean, forest, sunset, synthwave, mono)',
        '`/clear` — clear this conversation',
      ].join('\n');
      break;
    case 'roll': {
      const m = arg.match(/^(\d*)d(\d+)$/i);
      const count = m ? Math.min(parseInt(m[1] || '1', 10), 20) : 1;
      const sides = m ? Math.min(parseInt(m[2], 10), 1000) : 6;
      const rolls = Array.from({ length: count }, () => 1 + Math.floor(Math.random() * sides));
      reply = `🎲 Rolled ${count}d${sides}: **${rolls.join(', ')}** (total: ${rolls.reduce((a, b) => a + b, 0)})`;
      break;
    }
    case 'flip':
      reply = Math.random() < 0.5 ? '🪙 Heads!' : '🪙 Tails!';
      break;
    case '8ball':
      reply = `🎱 ${EIGHTBALL[Math.floor(Math.random() * EIGHTBALL.length)]}`;
      break;
    case 'joke':
      reply = `😂 ${JOKES[Math.floor(Math.random() * JOKES.length)]}`;
      break;
    case 'theme': {
      const ok = arg && applyThemeByName(arg);
      reply = ok ? `🎨 Theme switched.` : `🎨 Try one of: ${THEMES.map(t => t.name).join(', ')}`;
      break;
    }
    case 'clear': {
      const convo = getActiveConversation();
      if (convo) {
        convo.messages = [];
        saveState();
        renderMessages();
        renderSidebar();
      }
      showToast('Conversation cleared');
      return true;
    }
    default:
      return false;
  }

  let convo = getActiveConversation();
  if (!convo) {
    createConversation();
    convo = getActiveConversation();
  }
  setTitleFromFirstMessage(convo, text);
  convo.messages.push({ id: uid(), role: 'user', content: text });
  convo.messages.push({ id: uid(), role: 'assistant', content: reply });
  saveState();
  renderSidebar();
  renderMessages();
  els.promptInput.value = '';
  autoResize();
  return true;
}

// ---------- Sending messages ----------

async function sendMessage(text) {
  if ((!text.trim() && !pendingImage) || isStreaming) return;

  if (!pendingImage && tryHandleSlashCommand(text)) return;

  let convo = getActiveConversation();
  if (!convo) {
    createConversation();
    convo = getActiveConversation();
  }

  setTitleFromFirstMessage(convo, text.trim());

  const userMsg = { id: uid(), role: 'user', content: text.trim() };
  if (pendingImage) userMsg.image = { mimeType: pendingImage.mimeType, data: pendingImage.data };
  convo.messages.push(userMsg);

  saveState();
  renderSidebar();
  renderMessages();

  els.promptInput.value = '';
  autoResize();
  pendingImage = null;
  els.attachPreview.style.display = 'none';

  await continueAssistantReply(convo);
}

async function continueAssistantReply(convo) {
  // Placeholder assistant bubble that fills in as tokens stream, with a
  // "thinking" animation shown until the first token actually arrives.
  const assistantMsg = { id: uid(), role: 'assistant', content: '' };
  convo.messages.push(assistantMsg);
  const assistantEl = buildMessageEl(assistantMsg, null, false, false);
  const bubbleEl = assistantEl.querySelector('.bubble');
  const textEl = bubbleEl.querySelector('span');

  const thinking = document.createElement('div');
  thinking.className = 'thinking-dots';
  thinking.innerHTML = '<span></span><span></span><span></span>';
  bubbleEl.appendChild(thinking);

  const cursor = document.createElement('span');
  cursor.className = 'cursor';

  els.messages.appendChild(assistantEl);
  scrollToBottom();

  setBusy(true);

  const ACTION_HINT = [
    'Formatting rule: wrap ONLY physical actions, gestures, expressions, and narration in double asterisks. Spoken dialogue goes in "quotation marks" and must NEVER be wrapped in asterisks — not even partially, not even one word of it.',
    'Example of CORRECT formatting:',
    '**Rudeus smiles warmly and pulls out a chair.** "Come sit, you must be starving."',
    'Example of WRONG formatting (never do this):',
    '**Rudeus smiles warmly and pulls out a chair**. "**Come sit, you must be starving.**"',
    'The quotation marks are the only signal you need — if it\'s inside "quotes", it is spoken and gets no asterisks at all, ever.',
  ].join('\n');
  const systemPrompt = convo.scenario
    ? `${convo.scenario.systemPrompt}\n\n${ACTION_HINT}`
    : (settings.personality
        ? `You are named "${settings.aiName || 'console'}". ${settings.personality}\n\n${ACTION_HINT}`
        : `You are named "${settings.aiName || 'console'}". You are a helpful, concise assistant.`);

  let firstTokenArrived = false;

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system: systemPrompt,
        messages: convo.messages
          .filter(m => m.content !== '' || m.image)
          .map(m => ({ role: m.role, content: m.content, image: m.image })),
        provider: settings.provider,
      }),
    });

    if (!res.body) throw new Error('No response stream from server.');

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let tickCounter = 0;

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
        if (payload === '[DONE]') continue;

        try {
          const event = JSON.parse(payload);
          if (event.quota) {
            renderQuotaBadge(event.quota);
          } else if (event.error) {
            if (!firstTokenArrived) { thinking.remove(); bubbleEl.appendChild(cursor); firstTokenArrived = true; }
            assistantMsg.content += `\n[error] ${event.error}`;
            textEl.textContent = assistantMsg.content;
            bubbleEl.appendChild(cursor);
          } else if (event.text) {
            if (!firstTokenArrived) { thinking.remove(); bubbleEl.appendChild(cursor); firstTokenArrived = true; }
            assistantMsg.content += event.text;
            textEl.textContent = assistantMsg.content;
            bubbleEl.appendChild(cursor);
            scrollToBottom();
            tickCounter++;
            if (tickCounter % 2 === 0) playTypeTick();
          }
        } catch {
          // ignore malformed fragment
        }
      }
    }
  } catch (err) {
    thinking.remove();
    assistantMsg.content += `\n[connection error — is the backend running?]`;
    textEl.textContent = assistantMsg.content;
  } finally {
    cursor.remove();
    thinking.remove();
    renderContent(bubbleEl, assistantMsg.content);
    saveState();
    renderSidebar();
    setBusy(false);
    renderMessages(); // rebuild with toolbar/reactions now that streaming is done
  }
}

// ---------- Image generation (Gemini only) ----------

async function generateImage(prompt) {
  if (isStreaming || !prompt.trim()) return;
  if (settings.provider !== 'gemini') {
    showToast('Image generation only works with Gemini — switch providers in the sidebar');
    return;
  }

  let convo = getActiveConversation();
  if (!convo) {
    createConversation();
    convo = getActiveConversation();
  }
  setTitleFromFirstMessage(convo, `🖼️ ${prompt.trim()}`);

  const userMsg = { id: uid(), role: 'user', content: prompt.trim() };
  if (pendingImage) userMsg.image = { mimeType: pendingImage.mimeType, data: pendingImage.data };
  convo.messages.push(userMsg);

  const editImage = pendingImage ? { mimeType: pendingImage.mimeType, data: pendingImage.data } : null;

  els.promptInput.value = '';
  autoResize();
  pendingImage = null;
  els.attachPreview.style.display = 'none';

  const assistantMsg = { id: uid(), role: 'assistant', content: '' };
  convo.messages.push(assistantMsg);
  saveState();
  renderSidebar();
  renderMessages();

  const assistantEl = els.messages.lastElementChild;
  const bubbleEl = assistantEl.querySelector('.bubble');
  const thinking = document.createElement('div');
  thinking.className = 'thinking-dots';
  thinking.innerHTML = '<span></span><span></span><span></span>';
  bubbleEl.appendChild(thinking);
  scrollToBottom();
  setBusy(true);

  try {
    const res = await fetch('/api/image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: prompt.trim(), image: editImage }),
    });
    const data = await res.json();

    if (!res.ok || data.error) {
      assistantMsg.content = `[image generation failed] ${data.error || 'unknown error'}`;
    } else {
      assistantMsg.image = { mimeType: data.mimeType, data: data.data };
      assistantMsg.content = data.caption || '';
    }
  } catch (err) {
    assistantMsg.content = '[connection error — is the backend running?]';
  } finally {
    saveState();
    renderSidebar();
    setBusy(false);
    renderMessages();
  }
}

// ---------- Input handling ----------

function autoResize() {
  els.promptInput.style.height = 'auto';
  els.promptInput.style.height = Math.min(els.promptInput.scrollHeight, 200) + 'px';
}

els.promptInput.addEventListener('input', autoResize);

els.promptInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    els.composerForm.requestSubmit();
  }
});

const IMAGE_REQUEST_PATTERN = /\b(create|generate|draw|make|paint)\b[^.!?]{0,20}\b(image|picture|pic|illustration|artwork|drawing|photo)\b/i;

els.composerForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = els.promptInput.value;
  if (text.trim() && IMAGE_REQUEST_PATTERN.test(text) && !isStreaming && settings.provider === 'gemini') {
    showToast('Looks like an image request — generating instead of chatting about it');
    generateImage(text);
    return;
  }
  sendMessage(text);
});

els.newChatBtn.addEventListener('click', createConversation);

els.sidebarToggle.addEventListener('click', () => {
  els.sidebar.classList.toggle('collapsed');
});

document.querySelectorAll('.suggestion-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    sendMessage(chip.dataset.prompt);
  });
});

// ---------- In-app coding sandbox ----------

function switchView(view) {
  const showSandbox = view === 'sandbox';
  els.sandboxView.style.display = showSandbox ? 'flex' : 'none';
  els.chatScroll.style.display = showSandbox ? 'none' : 'block';
  els.composerForm.style.display = showSandbox ? 'none' : 'block';
  els.chatViewTab.classList.toggle('active', !showSandbox);
  els.sandboxViewTab.classList.toggle('active', showSandbox);
  if (showSandbox) {
    renderSandboxEditor();
    runSandboxPreview();
  }
}

els.chatViewTab.addEventListener('click', () => switchView('chat'));
els.sandboxViewTab.addEventListener('click', () => switchView('sandbox'));

function renderSandboxEditor() {
  [...els.sandboxTabs.children].forEach(btn => btn.classList.toggle('active', btn.dataset.pane === activeSandboxPane));
  els.sandboxEditor.value = sandboxCode[activeSandboxPane];
  updateSandboxGutter();
}

function updateSandboxGutter() {
  const lineCount = els.sandboxEditor.value.split('\n').length;
  let out = '';
  for (let i = 1; i <= lineCount; i++) out += i + '\n';
  els.sandboxGutter.textContent = out;
  els.sandboxGutter.scrollTop = els.sandboxEditor.scrollTop;
}

els.sandboxEditor.addEventListener('scroll', () => {
  els.sandboxGutter.scrollTop = els.sandboxEditor.scrollTop;
});

els.sandboxTabs.addEventListener('click', (e) => {
  const btn = e.target.closest('.sandbox-tab');
  if (!btn) return;
  sandboxCode[activeSandboxPane] = els.sandboxEditor.value;
  activeSandboxPane = btn.dataset.pane;
  renderSandboxEditor();
});

els.sandboxEditor.addEventListener('input', () => {
  sandboxCode[activeSandboxPane] = els.sandboxEditor.value;
  updateSandboxGutter();
  persistSandbox();
  if (els.autoRunToggle.checked) {
    clearTimeout(sandboxDebounceTimer);
    sandboxDebounceTimer = setTimeout(runSandboxPreview, 600);
  }
});

// Allow Tab to insert two spaces instead of jumping focus, like a real editor.
// Cmd/Ctrl+Enter runs immediately, like most code sandboxes.
els.sandboxEditor.addEventListener('keydown', (e) => {
  if (e.key === 'Tab') {
    e.preventDefault();
    const { selectionStart: s, selectionEnd: en } = els.sandboxEditor;
    els.sandboxEditor.value = els.sandboxEditor.value.slice(0, s) + '  ' + els.sandboxEditor.value.slice(en);
    els.sandboxEditor.selectionStart = els.sandboxEditor.selectionEnd = s + 2;
    sandboxCode[activeSandboxPane] = els.sandboxEditor.value;
    updateSandboxGutter();
  } else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
    e.preventDefault();
    runSandboxPreview();
  }
});

function persistSandbox() {
  try { localStorage.setItem(SANDBOX_KEY, JSON.stringify(sandboxCode)); } catch {}
}

function appendConsoleLine(text, type) {
  sandboxConsoleLineCount++;
  if (sandboxConsoleLineCount === 1) els.sandboxConsole.innerHTML = '';
  const line = document.createElement('div');
  line.className = 'console-line' + (type === 'error' ? ' console-error' : '');
  line.textContent = text;
  els.sandboxConsole.appendChild(line);
  els.sandboxConsole.scrollTop = els.sandboxConsole.scrollHeight;
  els.sandboxConsoleCount.textContent = `(${sandboxConsoleLineCount})`;
}

// Persistent listener: matches messages against whichever iframe is
// currently mounted, so console.log/errors from user interactions
// (clicks, timers, etc.) keep showing up live, not just on first run.
window.addEventListener('message', (event) => {
  if (!event.data || !event.data.__sandboxConsole) return;
  if (event.source !== els.sandboxPreviewFrame.contentWindow) return;
  appendConsoleLine(event.data.text, event.data.type);
});

function runSandboxPreview() {
  sandboxCode[activeSandboxPane] = els.sandboxEditor.value;
  sandboxConsoleLineCount = 0;
  els.sandboxConsole.textContent = 'Running…';
  els.sandboxConsoleCount.textContent = '';

  const consoleShim = `
    <script>
      (function () {
        function send(type, args) {
          parent.postMessage({ __sandboxConsole: true, type: type, text: args.map(function (a) {
            try { return typeof a === 'string' ? a : JSON.stringify(a); } catch (e) { return String(a); }
          }).join(' ') }, '*');
        }
        ['log', 'info', 'warn', 'error'].forEach(function (m) {
          var orig = console[m];
          console[m] = function () { send(m === 'error' ? 'error' : 'log', Array.prototype.slice.call(arguments)); orig.apply(console, arguments); };
        });
        window.addEventListener('error', function (e) { send('error', [e.message]); });
      })();
    <\/script>`;

  const doc = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${sandboxCode.css}</style></head>` +
    `<body>${sandboxCode.html}${consoleShim}<script>try {\n${sandboxCode.js}\n} catch (e) { console.error(e.message); }<\/script></body></html>`;

  els.sandboxPreviewFrame.srcdoc = doc;
}

els.sandboxRunBtn.addEventListener('click', runSandboxPreview);

els.sandboxResetBtn.addEventListener('click', () => {
  sandboxUndoSnapshot = { ...sandboxCode };
  sandboxCode = { ...DEFAULT_SANDBOX };
  renderSandboxEditor();
  runSandboxPreview();
  persistSandbox();
  els.sandboxUndoBtn.disabled = false;
  els.sandboxUndoBtn.textContent = '↶ Undo reset';
  showToast('Sandbox reset');
});

els.sandboxUndoBtn.addEventListener('click', () => {
  if (!sandboxUndoSnapshot) return;
  sandboxCode = sandboxUndoSnapshot;
  sandboxUndoSnapshot = null;
  renderSandboxEditor();
  runSandboxPreview();
  persistSandbox();
  els.sandboxUndoBtn.disabled = true;
  els.sandboxUndoBtn.textContent = '↶ Undo AI edit';
  showToast('Reverted');
});

els.sandboxDownloadBtn.addEventListener('click', () => {
  sandboxCode[activeSandboxPane] = els.sandboxEditor.value;
  const doc = `<!DOCTYPE html>\n<html>\n<head>\n<meta charset="utf-8">\n<title>Sandbox export</title>\n<style>\n${sandboxCode.css}\n</style>\n</head>\n<body>\n${sandboxCode.html}\n<script>\n${sandboxCode.js}\n<\/script>\n</body>\n</html>\n`;
  const blob = new Blob([doc], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'sandbox.html';
  a.click();
  URL.revokeObjectURL(url);
  showToast('Downloaded sandbox.html');
});

els.sandboxFullscreenBtn.addEventListener('click', () => {
  sandboxIsFullscreen = !sandboxIsFullscreen;
  els.sandboxView.classList.toggle('fullscreen', sandboxIsFullscreen);
  document.body.classList.toggle('sandbox-fullscreen-active', sandboxIsFullscreen);
  els.sandboxFullscreenBtn.textContent = sandboxIsFullscreen ? '⤢ Exit fullscreen' : '⛶ Fullscreen';
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && sandboxIsFullscreen) {
    els.sandboxFullscreenBtn.click();
  }
});

els.sandboxAiToggleBtn.addEventListener('click', () => {
  sandboxAiPaneOpen = !sandboxAiPaneOpen;
  els.sandboxAiPane.classList.toggle('hidden', !sandboxAiPaneOpen);
  els.sandboxAiToggleBtn.classList.toggle('active', sandboxAiPaneOpen);
});

els.sandboxCodepenBtn.addEventListener('click', () => {
  sandboxCode[activeSandboxPane] = els.sandboxEditor.value;
  const form = document.createElement('form');
  form.action = 'https://codepen.io/pen/define';
  form.method = 'POST';
  form.target = '_blank';
  form.style.display = 'none';
  const input = document.createElement('input');
  input.type = 'hidden';
  input.name = 'data';
  input.value = JSON.stringify({
    title: 'From console.chat',
    html: sandboxCode.html, css: sandboxCode.css, js: sandboxCode.js,
    editors: '111', layout: 'top',
  });
  form.appendChild(input);
  document.body.appendChild(form);
  form.submit();
  form.remove();
  showToast('Opening in CodePen…');
});

// Called from a chat code block's "Edit here" button — drops that
// snippet straight into the matching pane of the in-app sandbox.
function loadCodeIntoSandbox(lang, code) {
  const paneMap = { html: 'html', xml: 'html', css: 'css', javascript: 'js', js: 'js', jsx: 'js' };
  const pane = paneMap[lang] || 'js';
  sandboxCode[pane] = code;
  activeSandboxPane = pane;
  switchView('sandbox');
  persistSandbox();
  showToast(`Loaded into the ${pane.toUpperCase()} pane`);
}

// ---------- Sandbox AI pair-programmer ----------
// A lightweight, separate chat that gives the model the current
// HTML/CSS/JS as context and asks it to return full updated panes in
// fenced code blocks, which get parsed out and applied automatically.

function renderSandboxAiMessages() {
  els.sandboxAiMessages.innerHTML = '';
  if (sandboxAiMessages.length === 0) {
    const hint = document.createElement('div');
    hint.className = 'sandbox-ai-hint';
    hint.textContent = 'Ask for anything — "add a dark mode toggle", "make the button pulse", "fix the bug in my loop". Code it writes is applied to the tabs automatically and the preview re-runs.';
    els.sandboxAiMessages.appendChild(hint);
    return;
  }
  for (const m of sandboxAiMessages) {
    const bubble = document.createElement('div');
    bubble.className = `sandbox-ai-msg ${m.role}`;
    if (m.thinking) {
      const dots = document.createElement('div');
      dots.className = 'thinking-dots';
      dots.innerHTML = '<span></span><span></span><span></span>';
      bubble.appendChild(dots);
    } else {
      bubble.appendChild(document.createTextNode(m.displayText !== undefined ? m.displayText : m.content));
    }
    if (m.appliedPanes && m.appliedPanes.length) {
      const tag = document.createElement('div');
      tag.className = 'applied-tag';
      tag.textContent = `✓ applied to ${m.appliedPanes.join(', ')}`;
      bubble.appendChild(tag);
    }
    els.sandboxAiMessages.appendChild(bubble);
  }
  els.sandboxAiMessages.scrollTop = els.sandboxAiMessages.scrollHeight;
}

function stripCodeFencesForDisplay(text) {
  return text.replace(/```\w*\n?[\s\S]*?```/g, '').trim() || '(updated the code — see the tabs)';
}

function parseSandboxCodeBlocks(text) {
  const paneMap = { html: 'html', xml: 'html', css: 'css', javascript: 'js', js: 'js', jsx: 'js' };
  const regex = /```(\w+)?\n?([\s\S]*?)```/g;
  const found = {};
  let match;
  while ((match = regex.exec(text)) !== null) {
    const lang = (match[1] || '').toLowerCase();
    const pane = paneMap[lang];
    if (pane) found[pane] = match[2].trim();
  }
  return found;
}

els.sandboxAiInput.addEventListener('input', () => {
  els.sandboxAiInput.style.height = 'auto';
  els.sandboxAiInput.style.height = Math.min(els.sandboxAiInput.scrollHeight, 100) + 'px';
});

els.sandboxAiInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    els.sandboxAiForm.requestSubmit();
  }
});

els.sandboxAiClearBtn.addEventListener('click', () => {
  sandboxAiMessages = [];
  renderSandboxAiMessages();
});

els.sandboxAiForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = els.sandboxAiInput.value.trim();
  if (!text || sandboxAiStreaming) return;
  els.sandboxAiInput.value = '';
  els.sandboxAiInput.style.height = 'auto';
  sendSandboxAiMessage(text);
});

async function sendSandboxAiMessage(text) {
  sandboxCode[activeSandboxPane] = els.sandboxEditor.value;

  sandboxAiMessages.push({ role: 'user', content: text });
  const assistantEntry = { role: 'assistant', content: '', displayText: '', thinking: true };
  sandboxAiMessages.push(assistantEntry);
  renderSandboxAiMessages();

  sandboxAiStreaming = true;
  els.sandboxAiSendBtn.disabled = true;

  const systemPrompt = `You are ${settings.aiName || 'console'}, pair-programming live inside a browser HTML/CSS/JS sandbox with the user. ` +
    `Here is the CURRENT code:\n\n--- HTML ---\n${sandboxCode.html}\n\n--- CSS ---\n${sandboxCode.css}\n\n--- JS ---\n${sandboxCode.js}\n\n` +
    `When the user asks for a change, respond with the FULL updated content (not a diff) for every pane you changed, ` +
    `each in its own fenced code block labeled exactly html, css, or js. Only include panes you actually changed. ` +
    `Add at most 1-2 short sentences of explanation outside the code blocks.`;

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system: systemPrompt,
        messages: sandboxAiMessages
          .filter(m => m.content)
          .map(m => ({ role: m.role, content: m.content })),
        provider: settings.provider,
      }),
    });
    if (!res.body) throw new Error('No response stream');

    const reader = res.body.getReader();
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
          if (event.text) {
            assistantEntry.thinking = false;
            assistantEntry.content += event.text;
            assistantEntry.displayText = assistantEntry.content;
            renderSandboxAiMessages();
          } else if (event.error) {
            assistantEntry.thinking = false;
            assistantEntry.content += `\n[error] ${event.error}`;
            assistantEntry.displayText = assistantEntry.content;
            renderSandboxAiMessages();
          }
        } catch { /* ignore malformed fragment */ }
      }
    }
  } catch (err) {
    assistantEntry.thinking = false;
    assistantEntry.content += '\n[connection error — is the backend running?]';
    assistantEntry.displayText = assistantEntry.content;
  } finally {
    sandboxAiStreaming = false;
    els.sandboxAiSendBtn.disabled = false;

    const changes = parseSandboxCodeBlocks(assistantEntry.content);
    const changedPanes = Object.keys(changes);
    if (changedPanes.length) {
      sandboxUndoSnapshot = { ...sandboxCode };
      for (const pane of changedPanes) sandboxCode[pane] = changes[pane];
      renderSandboxEditor();
      runSandboxPreview();
      persistSandbox();
      els.sandboxUndoBtn.disabled = false;
      els.sandboxUndoBtn.textContent = '↶ Undo AI edit';
      assistantEntry.appliedPanes = changedPanes.map(p => p.toUpperCase());
      showToast(`AI updated ${assistantEntry.appliedPanes.join(', ')}`);
    }
    assistantEntry.displayText = stripCodeFencesForDisplay(assistantEntry.content);
    renderSandboxAiMessages();
  }
}

// ---------- Sandbox templates ----------

const SANDBOX_TEMPLATES = {
  blank: { html: '', css: '', js: '' },
  hello: { ...DEFAULT_SANDBOX },
  counter: {
    html: '<h1>Counter</h1>\n<p id="count">0</p>\n<button id="inc">+1</button>\n<button id="dec">-1</button>',
    css: 'body { font-family: sans-serif; text-align: center; padding: 40px; }\n#count { font-size: 48px; margin: 10px 0; }\nbutton { font-size: 18px; padding: 8px 16px; margin: 0 6px; border-radius: 6px; border: none; background: #f5a623; cursor: pointer; }',
    js: "let n = 0;\nconst el = document.getElementById('count');\ndocument.getElementById('inc').onclick = () => { n++; el.textContent = n; console.log('count:', n); };\ndocument.getElementById('dec').onclick = () => { n--; el.textContent = n; console.log('count:', n); };",
  },
  canvas: {
    html: '<canvas id="c" width="380" height="260"></canvas>\n<p>Click and drag to draw.</p>',
    css: 'body { font-family: sans-serif; text-align: center; padding: 20px; }\ncanvas { border: 1px solid #ccc; border-radius: 8px; background: #fff; cursor: crosshair; }',
    js: "const c = document.getElementById('c');\nconst ctx = c.getContext('2d');\nlet drawing = false;\nc.addEventListener('mousedown', () => drawing = true);\nwindow.addEventListener('mouseup', () => drawing = false);\nc.addEventListener('mousemove', (e) => {\n  if (!drawing) return;\n  const r = c.getBoundingClientRect();\n  ctx.fillStyle = '#f5a623';\n  ctx.beginPath();\n  ctx.arc(e.clientX - r.left, e.clientY - r.top, 4, 0, Math.PI * 2);\n  ctx.fill();\n});\nconsole.log('canvas ready');",
  },
  fetch: {
    html: '<h1>Random fact</h1>\n<p id="fact">Loading…</p>\n<button id="reload">Get another</button>',
    css: 'body { font-family: sans-serif; padding: 30px; max-width: 400px; }\nbutton { padding: 8px 14px; border-radius: 6px; border: none; background: #f5a623; cursor: pointer; }',
    js: "async function load() {\n  document.getElementById('fact').textContent = 'Loading…';\n  try {\n    const res = await fetch('https://catfact.ninja/fact');\n    const data = await res.json();\n    document.getElementById('fact').textContent = data.fact;\n    console.log('fetched a fact');\n  } catch (e) {\n    document.getElementById('fact').textContent = 'Could not load (some sandboxes block outside network calls).';\n    console.error(e.message);\n  }\n}\ndocument.getElementById('reload').onclick = load;\nload();",
  },
};

els.sandboxTemplateSelect.addEventListener('change', () => {
  const key = els.sandboxTemplateSelect.value;
  if (!key || !SANDBOX_TEMPLATES[key]) return;
  sandboxCode = { ...SANDBOX_TEMPLATES[key] };
  activeSandboxPane = 'html';
  renderSandboxEditor();
  runSandboxPreview();
  persistSandbox();
  els.sandboxTemplateSelect.value = '';
  showToast('Template loaded');
});

// ---------- Saved sandboxes (named projects) ----------

let savedSandboxes = [];

function loadSavedSandboxes() {
  try { savedSandboxes = JSON.parse(localStorage.getItem(SANDBOXES_KEY) || '[]'); } catch { savedSandboxes = []; }
}

function persistSavedSandboxes() {
  try { localStorage.setItem(SANDBOXES_KEY, JSON.stringify(savedSandboxes)); } catch {}
}

function renderSavedSandboxSelect() {
  els.savedSandboxSelect.innerHTML = '<option value="">💾 My sandboxes…</option>';
  for (const s of savedSandboxes) {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = s.name;
    els.savedSandboxSelect.appendChild(opt);
  }
}

els.sandboxSaveBtn.addEventListener('click', () => {
  sandboxCode[activeSandboxPane] = els.sandboxEditor.value;
  const name = window.prompt('Name this sandbox:', 'My sandbox');
  if (!name) return;
  savedSandboxes.push({ id: uid(), name: name.slice(0, 40), code: { ...sandboxCode } });
  persistSavedSandboxes();
  renderSavedSandboxSelect();
  showToast('Sandbox saved');
});

els.savedSandboxSelect.addEventListener('change', () => {
  const id = els.savedSandboxSelect.value;
  if (!id) return;
  const found = savedSandboxes.find(s => s.id === id);
  if (!found) return;
  sandboxCode = { ...found.code };
  activeSandboxPane = 'html';
  renderSandboxEditor();
  runSandboxPreview();
  persistSandbox();
  showToast(`Loaded "${found.name}"`);
});

els.sandboxDeleteSavedBtn.addEventListener('click', () => {
  const id = els.savedSandboxSelect.value;
  if (!id) { showToast('Pick a saved sandbox first'); return; }
  const found = savedSandboxes.find(s => s.id === id);
  savedSandboxes = savedSandboxes.filter(s => s.id !== id);
  persistSavedSandboxes();
  renderSavedSandboxSelect();
  showToast(found ? `Deleted "${found.name}"` : 'Deleted');
});

// ---------- Scenario studio ----------
// Builds a per-conversation system prompt for an immersive roleplay set
// in any universe: research the setting/characters (from the model's own
// knowledge), pick a language and starting arc, and optionally write
// yourself into the story as a new character with an established
// backstory and relationship to the existing cast.

let scenarioCharacters = []; // { id, name, profile, avatar, color }

// Curated palette for character bubble/name tinting — kept short and
// legible on the dark theme. Cycled by character index when adding.
const SCENARIO_CHAR_COLORS = [
  '#f5a623', '#5fb8ff', '#ff6b9d', '#6ee7b7', '#c299ff', '#ffb454', '#7dd3fc', '#fb7185',
];

function nextScenarioColor() {
  return SCENARIO_CHAR_COLORS[scenarioCharacters.length % SCENARIO_CHAR_COLORS.length];
}

function renderScenarioCharacterList() {
  els.scenarioCharacterList.innerHTML = '';
  for (const c of scenarioCharacters) {
    const card = document.createElement('div');
    card.className = 'scenario-character-card';

    const head = document.createElement('div');
    head.className = 'scenario-character-card-head';

    // Avatar — click the circle to upload a picture for this character;
    // falls back to their initials on their chosen color.
    const avatarWrap = document.createElement('div');
    avatarWrap.className = 'scenario-character-avatar';
    avatarWrap.title = `Set a picture for ${c.name}`;
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';

    function renderCardAvatar() {
      avatarWrap.innerHTML = '';
      avatarWrap.style.background = c.avatar ? 'transparent' : (c.color || nextScenarioColor());
      if (c.avatar) {
        const img = document.createElement('img');
        img.src = c.avatar;
        avatarWrap.appendChild(img);
      } else {
        avatarWrap.textContent = c.name.slice(0, 2).toUpperCase();
      }
    }
    renderCardAvatar();

    avatarWrap.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => {
      const file = fileInput.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => { c.avatar = reader.result; renderCardAvatar(); };
      reader.readAsDataURL(file);
    });

    const titleWrap = document.createElement('div');
    titleWrap.className = 'scenario-character-card-title';
    const title = document.createElement('strong');
    title.textContent = c.name;
    const colorRow = document.createElement('div');
    colorRow.className = 'scenario-character-color-row';
    for (const color of SCENARIO_CHAR_COLORS) {
      const sw = document.createElement('button');
      sw.type = 'button';
      sw.className = 'scenario-color-swatch' + (c.color === color ? ' active' : '');
      sw.style.background = color;
      sw.addEventListener('click', () => {
        c.color = color;
        renderCardAvatar();
        [...colorRow.children].forEach(ch => ch.classList.remove('active'));
        sw.classList.add('active');
      });
      colorRow.appendChild(sw);
    }
    titleWrap.appendChild(title);
    titleWrap.appendChild(colorRow);

    const actions = document.createElement('div');
    actions.className = 'scenario-character-card-actions';

    const textarea = document.createElement('textarea');
    textarea.rows = 3;
    textarea.placeholder = `How ${c.name} speaks and acts — personality, mannerisms, relationships…`;
    textarea.value = c.profile || '';
    textarea.addEventListener('input', () => { c.profile = textarea.value; });

    const researchBtn = document.createElement('button');
    researchBtn.type = 'button';
    researchBtn.className = 'sandbox-btn';
    researchBtn.textContent = '🔍 Research';
    researchBtn.title = `Research how ${c.name} speaks and acts`;
    researchBtn.addEventListener('click', () => {
      const series = els.scenarioSeriesInput.value.trim();
      const promptText = series
        ? `In 80-120 words, describe how the character "${c.name}" from "${series}" typically speaks and behaves — personality, speech patterns or verbal tics, mannerisms, and key relationships — so someone can roleplay them accurately. If you are not confident you know this character, say so briefly instead of guessing.`
        : `In 80-120 words, suggest a fitting personality, speech pattern, and mannerisms for an original character named "${c.name}".`;
      researchInto(textarea, researchBtn, promptText).then(() => { c.profile = textarea.value; });
    });

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'sandbox-btn';
    removeBtn.textContent = '✕';
    removeBtn.addEventListener('click', () => {
      scenarioCharacters = scenarioCharacters.filter(x => x.id !== c.id);
      renderScenarioCharacterList();
    });

    actions.appendChild(researchBtn);
    actions.appendChild(removeBtn);
    head.appendChild(avatarWrap);
    head.appendChild(titleWrap);
    head.appendChild(actions);
    card.appendChild(head);
    card.appendChild(fileInput);
    card.appendChild(textarea);
    els.scenarioCharacterList.appendChild(card);
  }
}

els.scenarioAddCharacterBtn.addEventListener('click', () => {
  const name = els.scenarioCharacterNameInput.value.trim();
  if (!name) return;
  scenarioCharacters.push({ id: uid(), name, profile: '', avatar: null, color: nextScenarioColor() });
  els.scenarioCharacterNameInput.value = '';
  renderScenarioCharacterList();
});

els.scenarioCharacterNameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    els.scenarioAddCharacterBtn.click();
  }
});

els.scenarioResearchSettingBtn.addEventListener('click', () => {
  const series = els.scenarioSeriesInput.value.trim();
  if (!series) { showToast('Enter a universe or series first'); return; }
  researchInto(
    els.scenarioSettingOutput,
    els.scenarioResearchSettingBtn,
    `Give a concise, organized primer (under ~220 words, short headers or bullet points) on the fictional universe/story "${series}" for someone about to roleplay within it: the overall setting and tone, any magic/power systems or key rules, and major ongoing conflicts or arcs. If you are not confident about this title, say so briefly instead of guessing.`
  );
});

els.scenarioLanguageSelect.addEventListener('change', () => {
  els.scenarioLanguageOther.style.display = els.scenarioLanguageSelect.value === '__other' ? 'block' : 'none';
});

function getScenarioLanguage() {
  if (els.scenarioLanguageSelect.value === '__other') {
    return els.scenarioLanguageOther.value.trim() || 'English';
  }
  return els.scenarioLanguageSelect.value;
}

function resetScenarioForm() {
  els.scenarioSeriesInput.value = '';
  els.scenarioSettingOutput.value = '';
  scenarioCharacters = [];
  renderScenarioCharacterList();
  els.scenarioLanguageSelect.value = 'English';
  els.scenarioLanguageOther.style.display = 'none';
  els.scenarioLanguageOther.value = '';
  els.scenarioArcInput.value = '';
  els.scenarioOcNameInput.value = '';
  els.scenarioOcBackstoryInput.value = '';
  els.scenarioOcIntegrationInput.value = '';
}

els.scenarioClearBtn.addEventListener('click', resetScenarioForm);

function openScenarioStudio() {
  editingScenarioConvoId = null;
  els.scenarioBeginBtn.textContent = '🎬 Begin scenario';
  resetScenarioForm();
  els.scenarioModalBackdrop.style.display = 'flex';
}
function closeScenarioStudio() {
  els.scenarioModalBackdrop.style.display = 'none';
}
let editingScenarioConvoId = null;

function fillScenarioFormFrom(scenario) {
  els.scenarioSeriesInput.value = scenario.series || '';
  els.scenarioSettingOutput.value = scenario.setting || '';
  scenarioCharacters = (scenario.characters || []).map(c => ({ ...c }));
  renderScenarioCharacterList();
  const known = ['English', 'Spanish', 'Japanese', 'French', 'German', 'Korean'];
  if (known.includes(scenario.language)) {
    els.scenarioLanguageSelect.value = scenario.language;
    els.scenarioLanguageOther.style.display = 'none';
  } else {
    els.scenarioLanguageSelect.value = 'Other';
    els.scenarioLanguageOther.style.display = 'block';
    els.scenarioLanguageOther.value = scenario.language || '';
  }
  els.scenarioArcInput.value = scenario.arc || '';
  els.scenarioOcNameInput.value = scenario.oc?.name || '';
  els.scenarioOcBackstoryInput.value = scenario.oc?.backstory || '';
  els.scenarioOcIntegrationInput.value = scenario.oc?.integration || '';
}

// Opens the studio pre-filled with an existing scenario's config (series,
// setting, characters incl. their avatars/colors, language, arc, OC) so it
// can be reconfigured — used by the in-chat banner's edit button, the
// sidebar's per-chat edit button, and the main studio button when the
// currently open chat already is a scenario.
function openScenarioStudioForEdit(convo) {
  if (!convo || !convo.scenario) return;
  fillScenarioFormFrom(convo.scenario);
  editingScenarioConvoId = convo.id;
  els.scenarioBeginBtn.textContent = '💾 Update scenario';
  els.scenarioModalBackdrop.style.display = 'flex';
}

els.editScenarioBtn.addEventListener('click', () => {
  openScenarioStudioForEdit(getActiveConversation());
});

els.scenarioStudioBtn.addEventListener('click', () => {
  const convo = getActiveConversation();
  if (convo && convo.scenario) openScenarioStudioForEdit(convo);
  else openScenarioStudio();
});
els.closeScenarioBtn.addEventListener('click', closeScenarioStudio);
els.scenarioModalBackdrop.addEventListener('click', (e) => {
  if (e.target === els.scenarioModalBackdrop) closeScenarioStudio();
});

els.scenarioBeginBtn.addEventListener('click', () => {
  const series = els.scenarioSeriesInput.value.trim();
  if (!series) { showToast('Enter a universe or series to begin'); return; }

  const setting = els.scenarioSettingOutput.value.trim() || '(no setting notes provided — use your best knowledge and judgement)';
  const language = getScenarioLanguage();
  const arc = els.scenarioArcInput.value.trim();
  const ocName = els.scenarioOcNameInput.value.trim();
  const ocBackstory = els.scenarioOcBackstoryInput.value.trim();
  const ocIntegration = els.scenarioOcIntegrationInput.value.trim();

  const charBlock = scenarioCharacters.length
    ? scenarioCharacters.map(c => `- ${c.name}: ${c.profile.trim() || '(portray them true to the source material)'}`).join('\n')
    : '(no specific characters listed — populate the scene with characters fitting the source material)';

  const ocBlock = ocName
    ? [
        `THE USER'S CHARACTER:`,
        `Name: ${ocName}`,
        `Backstory: ${ocBackstory || '(unspecified — improvise something fitting)'}`,
        `How they fit into the story: ${ocIntegration || '(unspecified — improvise something fitting and let the cast react naturally)'}`,
        `Every character should recognize and react to the user's character consistent with this backstory and relationship — treat it as established fact in this world.`,
      ].join('\n')
    : `The user is currently an unseen narrator/observer — do not invent a character for them unless they introduce one during play.`;

  // When named characters are set up (each with their own portrait/color
  // in the Scenario Studio), ask the model to tag whose "turn" each chunk
  // of the reply belongs to, using an exact, easy-to-parse marker. The
  // frontend splits on these markers to show each character in their own
  // chat bubble with their own avatar instead of one big generic reply.
  const namedCharacters = scenarioCharacters.filter(c => c.name);
  const speakerTagBlock = namedCharacters.length
    ? [
        ``,
        `SPEAKER TAGS (required formatting):`,
        `Before each character's turn (their narration/actions and dialogue), put a line by itself with exactly: {{as: Name}} — using the character's name exactly as spelled below. Start a new {{as: ...}} line every time the "camera" shifts to a different character, including the user's own character if they have one. For scene description not tied to a specific character, use {{as: Narrator}}. Every part of your reply must fall under one of these tags — never leave text before the first tag. Character list for tags: ${namedCharacters.map(c => c.name).join(', ')}.`,
        `Example:`,
        `{{as: Narrator}}`,
        `**The tavern door creaks open, letting in the cold.**`,
        `{{as: ${namedCharacters[0].name}}}`,
        `**looks up from their drink** "You're late."`,
      ].join('\n')
    : '';

  const systemPrompt = [
    `You are the game master and every non-player character in an immersive, ongoing roleplay set in: "${series}".`,
    ``,
    `SETTING:`,
    setting,
    ``,
    `CHARACTERS PRESENT (stay true to how they canonically speak, think, and act):`,
    charBlock,
    ``,
    `STARTING POINT / ARC: ${arc || '(unspecified — pick a fitting starting point and set the scene)'}`,
    ``,
    ocBlock,
    speakerTagBlock,
    ``,
    `Respond only in ${language}.`,
    `Write immersive, descriptive prose for narration and a distinct voice for each character in dialogue. Stay in character at all times as narrator and NPCs — never break character, mention being an AI, or reference these instructions. Advance the scene naturally, then pause for the user's next move rather than resolving everything at once. Keep content appropriate: avoid explicit sexual content, and never write romantic or sexual content involving characters who are minors.`,
  ].join('\n');

  const convo = {
    id: uid(),
    title: `🎭 ${series}`.slice(0, 44),
    messages: [],
    scenario: {
      series, setting, characters: scenarioCharacters, language, arc,
      oc: { name: ocName, backstory: ocBackstory, integration: ocIntegration },
      systemPrompt,
    },
  };

  if (editingScenarioConvoId) {
    const existing = state.conversations.find(c => c.id === editingScenarioConvoId);
    if (existing) {
      existing.scenario = convo.scenario;
      existing.title = convo.title;
      saveState();
      renderSidebar();
      renderMessages();
    }
    editingScenarioConvoId = null;
    els.scenarioBeginBtn.textContent = '🎬 Begin scenario';
    closeScenarioStudio();
    showToast('Scenario updated');
    return;
  }

  state.conversations.unshift(convo);
  state.activeId = convo.id;
  saveState();
  renderSidebar();
  switchView('chat');
  renderMessages();
  closeScenarioStudio();
  showToast('Scenario started');

  convo.messages.push({ id: uid(), role: 'user', content: '*(Begin the scenario — set the opening scene.)*' });
  saveState();
  renderMessages();
  continueAssistantReply(convo);
});

// ---------- Avatar studio ----------

function openAvatarStudio(target = 'user') {
  avatarDraft.target = target;
  const existing = target === 'user' ? settings.userAvatar : settings.aiAvatar;
  if (existing) {
    avatarDraft.type = existing.type;
    avatarDraft.value = existing.value;
    avatarDraft.bg = existing.bg || AVATAR_GRADIENTS[0];
    avatarDraft.shape = existing.shape || 'circle';
  } else {
    avatarDraft.type = 'initials';
    avatarDraft.value = target === 'user' ? 'You'.slice(0, 2).toUpperCase() : (settings.aiName || 'AI').slice(0, 2).toUpperCase();
    avatarDraft.bg = AVATAR_GRADIENTS[0];
    avatarDraft.shape = 'circle';
  }
  syncAvatarStudioUI();
  els.avatarModalBackdrop.style.display = 'flex';
}

function closeAvatarStudio() {
  els.avatarModalBackdrop.style.display = 'none';
}

function syncAvatarStudioUI() {
  [...els.avatarTargetToggle.children].forEach(btn => btn.classList.toggle('active', btn.dataset.target === avatarDraft.target));
  [...els.avatarTypeToggle.children].forEach(btn => btn.classList.toggle('active', btn.dataset.type === avatarDraft.type));
  [...els.avatarShapeToggle.children].forEach(btn => btn.classList.toggle('active', btn.dataset.shape === avatarDraft.shape));

  els.avatarInitialsField.style.display = avatarDraft.type === 'initials' ? 'flex' : 'none';
  els.avatarEmojiField.style.display = avatarDraft.type === 'emoji' ? 'flex' : 'none';
  els.avatarImageField.style.display = avatarDraft.type === 'image' ? 'flex' : 'none';

  if (avatarDraft.type === 'initials') els.avatarInitialsInput.value = avatarDraft.value || '';

  renderAvatarBgSwatches();
  renderAvatarPreview();
}

function renderAvatarBgSwatches() {
  els.avatarBgSwatches.innerHTML = '';
  for (const bg of AVATAR_GRADIENTS) {
    const sw = document.createElement('button');
    sw.type = 'button';
    sw.className = 'swatch' + (avatarDraft.bg === bg ? ' active' : '');
    sw.style.background = bg;
    sw.addEventListener('click', () => {
      avatarDraft.bg = bg;
      renderAvatarBgSwatches();
      renderAvatarPreview();
    });
    els.avatarBgSwatches.appendChild(sw);
  }
}

function renderAvatarPreview() {
  const p = els.avatarPreview;
  p.classList.toggle('square', avatarDraft.shape === 'square');
  p.innerHTML = '';
  if (avatarDraft.type === 'image' && avatarDraft.value) {
    p.style.background = 'none';
    const img = document.createElement('img');
    img.src = avatarDraft.value;
    p.appendChild(img);
  } else {
    p.style.background = avatarDraft.bg;
    p.textContent = avatarDraft.value || (avatarDraft.type === 'emoji' ? '🙂' : 'AI');
  }
}

els.avatarTargetToggle.addEventListener('click', (e) => {
  const btn = e.target.closest('.toggle-opt');
  if (!btn) return;
  openAvatarStudio(btn.dataset.target);
});

els.avatarTypeToggle.addEventListener('click', (e) => {
  const btn = e.target.closest('.toggle-opt');
  if (!btn) return;
  avatarDraft.type = btn.dataset.type;
  if (avatarDraft.type === 'initials' && !avatarDraft.value) {
    avatarDraft.value = (avatarDraft.target === 'user' ? 'You' : (settings.aiName || 'AI')).slice(0, 2).toUpperCase();
  }
  syncAvatarStudioUI();
});

els.avatarShapeToggle.addEventListener('click', (e) => {
  const btn = e.target.closest('.toggle-opt');
  if (!btn) return;
  avatarDraft.shape = btn.dataset.shape;
  syncAvatarStudioUI();
});

els.avatarInitialsInput.addEventListener('input', () => {
  avatarDraft.value = els.avatarInitialsInput.value.toUpperCase();
  renderAvatarPreview();
});

buildEmojiGrid(els.avatarEmojiPicker, (emo) => {
  avatarDraft.value = emo;
  renderAvatarPreview();
});

els.avatarFileInput.addEventListener('change', () => {
  const file = els.avatarFileInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    avatarDraft.value = reader.result;
    renderAvatarPreview();
  };
  reader.readAsDataURL(file);
});

els.avatarApplyBtn.addEventListener('click', () => {
  const avatarObj = {
    type: avatarDraft.type,
    value: avatarDraft.value,
    bg: avatarDraft.bg,
    shape: avatarDraft.shape,
  };
  if (avatarDraft.target === 'user') settings.userAvatar = avatarObj;
  else settings.aiAvatar = avatarObj;
  saveSettings();
  applySettings();
  renderMessages();
  closeAvatarStudio();
  showToast('Avatar updated');
});

els.avatarResetBtn.addEventListener('click', () => {
  if (avatarDraft.target === 'user') settings.userAvatar = null;
  else settings.aiAvatar = null;
  saveSettings();
  applySettings();
  renderMessages();
  closeAvatarStudio();
  showToast('Avatar reset to default');
});

els.avatarStudioBtn.addEventListener('click', () => openAvatarStudio('user'));
els.closeAvatarBtn.addEventListener('click', closeAvatarStudio);
els.avatarModalBackdrop.addEventListener('click', (e) => {
  if (e.target === els.avatarModalBackdrop) closeAvatarStudio();
});

els.providerSelect.addEventListener('change', () => {
  settings.provider = els.providerSelect.value;
  saveSettings();
  refreshQuota();
});

// ---------- Init ----------

loadSettings();
loadState();
els.providerSelect.value = settings.provider;
refreshQuota();
applyMusicSettings();
try {
  const rawSandbox = localStorage.getItem(SANDBOX_KEY);
  if (rawSandbox) sandboxCode = { ...DEFAULT_SANDBOX, ...JSON.parse(rawSandbox) };
} catch { /* keep defaults */ }
loadSavedSandboxes();
renderSavedSandboxSelect();
renderSandboxAiMessages();
if (state.conversations.length > 0) {
  state.activeId = state.conversations[0].id;
}
renderSidebar();
renderMessages();
