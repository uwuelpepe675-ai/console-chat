:root {
  --bg: #101114;
  --bg-raised: #17181c;
  --bg-sidebar: #0c0d0f;
  --border: #232429;
  --text: #eceaE4;
  --text-dim: #8b8d94;
  --text-faint: #55575e;
  --accent: #f5a623;
  --accent-dim: #b57a1d;
  --user-bubble: #1d1e23;
  --user-msg-bg: var(--user-bubble);
  --ai-msg-bg: var(--bg-raised);
  --font-display: 'Space Grotesk', sans-serif;
  --font-body: 'Inter', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
  --radius: 10px;
}

* { box-sizing: border-box; }

html, body {
  height: 100%;
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-body);
  -webkit-font-smoothing: antialiased;
}

button { font-family: inherit; cursor: pointer; }
textarea { font-family: inherit; }
code { font-family: var(--font-mono); }

.app {
  display: flex;
  height: 100vh;
  overflow: hidden;
  background:
    radial-gradient(circle at 15% 0%, color-mix(in srgb, var(--accent) 7%, transparent), transparent 45%),
    var(--bg);
}

body.has-bg-image .app {
  background-image:
    linear-gradient(color-mix(in srgb, var(--bg) 78%, transparent), color-mix(in srgb, var(--bg) 78%, transparent)),
    var(--bg-image-url);
  background-size: cover;
  background-position: center;
  background-attachment: fixed;
}

/* Bubble transparency */
body.bubbles-transparent .message.assistant .bubble { background: color-mix(in srgb, var(--ai-msg-bg) 35%, transparent); }
body.bubbles-transparent .message.user .bubble { background: color-mix(in srgb, var(--user-msg-bg) 35%, transparent); }

/* Bubble textures — layered on top of whatever background color/opacity is already set */
body[data-bubble-texture="glass"] .message .bubble {
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,0.08);
}
body[data-bubble-texture="grain"] .message .bubble {
  position: relative;
  overflow: hidden;
}
body[data-bubble-texture="grain"] .message .bubble::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.05;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}
body[data-bubble-texture="gradient"] .message.assistant .bubble {
  background-image: linear-gradient(135deg, color-mix(in srgb, var(--accent) 10%, transparent), transparent 60%);
}
body[data-bubble-texture="gradient"] .message.user .bubble {
  background-image: linear-gradient(135deg, color-mix(in srgb, var(--accent) 16%, transparent), transparent 60%);
}

/* ---------- Sidebar ---------- */
.sidebar {
  width: 268px;
  flex-shrink: 0;
  background: var(--bg-sidebar);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  transition: margin-left 0.2s ease;
}

.sidebar.collapsed {
  margin-left: -268px;
}

.sidebar-top {
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.new-chat-btn {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text);
  padding: 10px 12px;
  border-radius: var(--radius);
  font-size: 13.5px;
  font-weight: 500;
  transition: border-color 0.15s ease, background 0.15s ease;
}

.new-chat-btn:hover {
  border-color: var(--accent-dim);
  background: var(--bg-raised);
}

.new-chat-btn .plus {
  color: var(--accent);
  font-weight: 700;
}

.search-wrap {
  position: relative;
  display: flex;
  align-items: center;
}
.search-icon {
  position: absolute;
  left: 10px;
  color: var(--text-faint);
  font-size: 13px;
  pointer-events: none;
}
.search-input {
  width: 100%;
  background: var(--bg);
  border: 1px solid var(--border);
  color: var(--text);
  border-radius: 8px;
  padding: 7px 10px 7px 26px;
  font-size: 12.5px;
  outline: none;
}
.search-input:focus { border-color: var(--accent-dim); }
.search-input::placeholder { color: var(--text-faint); }

.chat-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px 10px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.chat-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  padding: 9px 10px;
  border-radius: 8px;
  font-size: 13px;
  color: var(--text-dim);
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: background 0.12s ease;
}

.chat-item:hover { background: var(--bg-raised); color: var(--text); }
.chat-item.active { background: var(--bg-raised); color: var(--text); border: 1px solid var(--border); box-shadow: inset 2px 0 0 var(--accent); }

.chat-item .title { overflow: hidden; text-overflow: ellipsis; min-width: 0; flex: 1; }
.chat-item .empty-hint { padding: 14px 6px; color: var(--text-faint); font-size: 12.5px; text-align: center; }

.chat-item .delete-btn,
.chat-item .scenario-edit-btn {
  opacity: 0;
  flex-shrink: 0;
  background: none;
  border: none;
  color: var(--text-faint);
  font-size: 13px;
  padding: 2px 4px;
}
.chat-item:hover .delete-btn,
.chat-item:hover .scenario-edit-btn { opacity: 1; }
.chat-item .delete-btn:hover { color: #e5484d; }
.chat-item .scenario-edit-btn:hover { color: var(--accent); }

.sidebar-bottom {
  padding: 10px 14px 12px;
  border-top: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.model-tag {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-faint);
  letter-spacing: 0.02em;
  margin-top: 6px;
}

select.model-tag {
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 3px 6px;
  cursor: pointer;
  width: fit-content;
}

select.model-tag:hover {
  border-color: var(--accent);
  color: var(--text);
}

#quotaBadge {
  margin-top: 4px;
}

#quotaBadge.quota-low {
  color: #e0a44b;
}

#quotaBadge.quota-empty {
  color: #e0574b;
}

/* ---------- Main ---------- */
.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.topbar {
  height: 52px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 16px;
  border-bottom: 1px solid var(--border);
  backdrop-filter: blur(6px);
}

.icon-btn {
  background: none;
  border: none;
  color: var(--text-dim);
  font-size: 16px;
  padding: 6px;
  border-radius: 6px;
}
.icon-btn:hover { background: var(--bg-raised); color: var(--text); }

.brand {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 15px;
  letter-spacing: -0.01em;
  display: flex;
  align-items: center;
  gap: 6px;
}
.brand-avatar { color: var(--accent); font-family: var(--font-mono); }
.brand-avatar img { width: 20px; height: 20px; border-radius: 6px; object-fit: cover; vertical-align: middle; }
.brand-dim { color: var(--text-faint); font-weight: 500; }

.view-switcher {
  display: flex;
  gap: 2px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 9px;
  padding: 3px;
  margin-left: 6px;
}
.view-tab {
  background: none;
  border: none;
  color: var(--text-dim);
  font-size: 12px;
  padding: 6px 12px;
  border-radius: 7px;
  font-family: var(--font-mono);
}
.view-tab.active { background: var(--bg-raised); color: var(--text); box-shadow: 0 0 0 1px var(--border); }
.view-tab:hover:not(.active) { color: var(--text); }

.topbar-right {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-faint);
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #3fb950;
  box-shadow: 0 0 6px #3fb95099;
}
.status-dot.busy { background: var(--accent); box-shadow: 0 0 6px #f5a62399; animation: pulseDot 1s ease-in-out infinite; }

@keyframes pulseDot {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.5); }
}

/* ---------- Chat scroll area ---------- */
.chat-scroll {
  flex: 1;
  overflow-y: auto;
}

.empty-state {
  max-width: 640px;
  margin: 8vh auto 0;
  text-align: center;
  padding: 0 20px;
}

.empty-mark {
  font-family: var(--font-mono);
  color: var(--accent);
  font-size: 22px;
  animation: blink 1.1s steps(2, start) infinite;
}

@keyframes blink { to { opacity: 0; } }

.empty-state h1 {
  font-family: var(--font-display);
  font-size: 26px;
  font-weight: 600;
  margin: 10px 0 6px;
}

.empty-state p {
  color: var(--text-dim);
  font-size: 14px;
  margin: 0 0 22px;
}
.empty-state p code {
  background: rgba(255,255,255,0.06);
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 0.92em;
}

.suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}

.suggestion-chip {
  background: var(--bg-raised);
  border: 1px solid var(--border);
  color: var(--text-dim);
  padding: 9px 14px;
  border-radius: 999px;
  font-size: 12.5px;
  transition: border-color 0.15s ease, color 0.15s ease;
}
.suggestion-chip:hover { border-color: var(--accent-dim); color: var(--text); }

.messages {
  max-width: 720px;
  margin: 0 auto;
  padding: 24px 20px 12px;
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.message { display: flex; gap: 12px; animation: riseIn 0.18s ease; }
.message.user { flex-direction: row-reverse; }

@keyframes riseIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

.message .avatar {
  flex-shrink: 0;
  width: 26px;
  height: 26px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 600;
  overflow: hidden;
}
.message .avatar img { width: 100%; height: 100%; object-fit: cover; }
.message .avatar.circle { border-radius: 50%; }
.message.assistant .avatar { background: rgba(245, 166, 35, 0.15); color: var(--accent); }
.message.user .avatar { background: var(--user-bubble); color: var(--text-dim); }

.message-col { display: flex; flex-direction: column; max-width: 78%; gap: 4px; }
.message.user .message-col { align-items: flex-end; }

.message .bubble {
  max-width: 100%;
  padding: 11px 15px;
  border-radius: var(--radius);
  font-size: 14.5px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-wrap: break-word;
}
.message.assistant .bubble { background: var(--ai-msg-bg); border: 1px solid var(--border); }
.message.user .bubble { background: var(--user-msg-bg); }

.message .bubble code {
  font-family: var(--font-mono);
  background: rgba(255,255,255,0.06);
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 0.9em;
}
.message .bubble a { color: var(--accent); }
.message .bubble strong { font-weight: 700; }
.message .bubble em { font-style: italic; }
.message .bubble ul, .message .bubble ol { margin: 6px 0; padding-left: 22px; }
.message .bubble blockquote {
  margin: 6px 0;
  padding: 4px 10px;
  border-left: 2px solid var(--accent-dim);
  color: var(--text-dim);
}
.message .bubble h1, .message .bubble h2, .message .bubble h3 {
  font-family: var(--font-display);
  margin: 10px 0 4px;
  line-height: 1.3;
}

/* Scenario studio: multiple characters replying in one turn, each with
   their own avatar/name/bubble instead of one generic AI bubble. */
.scenario-message-group { display: flex; flex-direction: column; gap: 14px; }
.scenario-message-group .scenario-row { margin: 0; }
.scenario-message-group .scenario-row .avatar {
  border-radius: 50%;
  font-size: 13px;
}
.scenario-message-group .scenario-narrator .avatar {
  background: rgba(255,255,255,0.06);
  color: var(--text-dim);
  border-radius: 6px;
}
.scenario-message-group .scenario-narrator .bubble {
  background: transparent;
  border: 1px dashed var(--border);
  color: var(--text-dim);
  font-style: italic;
}
.scenario-speaker-name {
  font-family: var(--font-mono);
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--text-dim);
  padding-left: 2px;
}
.message .bubble.char-tinted {
  border-color: color-mix(in srgb, var(--char-color) 45%, var(--border));
  background: color-mix(in srgb, var(--char-color) 10%, var(--ai-msg-bg));
}

.cursor {
  display: inline-block;
  width: 7px;
  height: 14px;
  background: var(--accent);
  margin-left: 2px;
  vertical-align: text-bottom;
  animation: blink 0.9s steps(2, start) infinite;
}

/* ---------- Thinking indicator ---------- */
.thinking-dots {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  padding: 2px 0;
}
.thinking-dots span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent);
  opacity: 0.35;
  animation: dotPulse 1.1s ease-in-out infinite;
}
.thinking-dots span:nth-child(2) { animation-delay: 0.15s; }
.thinking-dots span:nth-child(3) { animation-delay: 0.3s; }
@keyframes dotPulse {
  0%, 60%, 100% { opacity: 0.25; transform: translateY(0); }
  30% { opacity: 1; transform: translateY(-3px); }
}

/* ---------- Message toolbar ---------- */
.msg-toolbar {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.12s ease;
}
.message:hover .msg-toolbar { opacity: 1; }
.msg-toolbar button {
  background: none;
  border: 1px solid transparent;
  color: var(--text-faint);
  font-size: 11px;
  padding: 3px 7px;
  border-radius: 6px;
}
.msg-toolbar button:hover { color: var(--text); border-color: var(--border); background: var(--bg-raised); }

.reactions {
  display: flex;
  gap: 4px;
}
.reaction-btn {
  background: var(--bg-raised);
  border: 1px solid var(--border);
  border-radius: 999px;
  font-size: 12px;
  padding: 2px 7px;
  color: var(--text-dim);
  transition: transform 0.1s ease, border-color 0.12s ease;
}
.reaction-btn:hover { transform: scale(1.15); }
.reaction-btn.active { border-color: var(--accent-dim); background: rgba(245,166,35,0.12); }

/* ---------- In-app coding sandbox ---------- */
.sandbox-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 14px 20px;
  gap: 10px;
}

.sandbox-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
}

.sandbox-tabs {
  display: flex;
  gap: 4px;
  background: var(--bg-raised);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 3px;
}
.sandbox-tab {
  background: none;
  border: none;
  color: var(--text-dim);
  font-family: var(--font-mono);
  font-size: 12px;
  padding: 6px 14px;
  border-radius: 6px;
}
.sandbox-tab.active { background: var(--bg); color: var(--accent); box-shadow: 0 0 0 1px var(--border); }

.sandbox-toolbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.autorun-toggle {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: var(--text-dim);
  font-family: var(--font-mono);
  user-select: none;
}
.autorun-toggle input { accent-color: var(--accent); }

.sandbox-body {
  flex: 1;
  min-height: 0;
  display: flex;
  gap: 12px;
}

.sandbox-editor-pane {
  flex: 1;
  min-width: 0;
  display: flex;
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
  background: #0d0e11;
}

.sandbox-editor-gutter {
  flex-shrink: 0;
  padding: 14px 8px;
  text-align: right;
  font-family: var(--font-mono);
  font-size: 13px;
  line-height: 1.55;
  color: var(--text-faint);
  background: #0a0b0d;
  border-right: 1px solid var(--border);
  user-select: none;
  overflow: hidden;
  white-space: pre;
}

.sandbox-editor {
  flex: 1;
  resize: none;
  border: none;
  outline: none;
  background: none;
  color: #d9dbe0;
  font-family: var(--font-mono);
  font-size: 13px;
  line-height: 1.55;
  padding: 14px;
  tab-size: 2;
}

.sandbox-preview-pane {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.sandbox-btn.ai-toggle-btn.active { color: var(--accent); border-color: var(--accent-dim); }

.sandbox-ai-pane {
  flex: 1;
  min-width: 280px;
  max-width: 340px;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--bg-raised);
  overflow: hidden;
}
.sandbox-ai-pane.hidden { display: none; }

.sandbox-ai-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border);
  font-size: 12.5px;
  color: var(--text-dim);
  font-family: var(--font-mono);
}
.sandbox-ai-header #sandboxAiClearBtn { font-size: 12px; padding: 3px 5px; }

.sandbox-ai-messages {
  flex: 1;
  overflow-y: auto;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sandbox-ai-hint {
  font-size: 12px;
  color: var(--text-faint);
  line-height: 1.5;
}

.sandbox-ai-msg {
  font-size: 12.5px;
  line-height: 1.5;
  padding: 8px 10px;
  border-radius: 8px;
  white-space: pre-wrap;
  word-wrap: break-word;
}
.sandbox-ai-msg.user { background: var(--user-msg-bg); align-self: flex-end; max-width: 92%; }
.sandbox-ai-msg.assistant { background: var(--bg); border: 1px solid var(--border); max-width: 96%; }
.sandbox-ai-msg .applied-tag {
  display: inline-block;
  margin-top: 6px;
  font-family: var(--font-mono);
  font-size: 10.5px;
  color: var(--accent);
  background: rgba(245,166,35,0.12);
  padding: 2px 7px;
  border-radius: 999px;
}

.sandbox-ai-form {
  display: flex;
  gap: 6px;
  padding: 10px;
  border-top: 1px solid var(--border);
}
.sandbox-ai-input {
  flex: 1;
  resize: none;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text);
  font-size: 12.5px;
  padding: 8px 10px;
  outline: none;
  max-height: 100px;
  font-family: inherit;
}
.sandbox-ai-input:focus { border-color: var(--accent-dim); }
.sandbox-ai-form .send-btn { width: 32px; height: 32px; font-size: 14px; align-self: flex-end; }

.sandbox-preview-label, .sandbox-console-label {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-faint);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
#sandboxConsoleCount { color: var(--accent); text-transform: none; }

.sandbox-preview-frame {
  flex: 2;
  min-height: 0;
  width: 100%;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 10px;
}

.sandbox-console {
  flex: 1;
  min-height: 70px;
  max-height: 30%;
  overflow-y: auto;
  background: #0a0b0d;
  border: 1px solid var(--border);
  border-radius: 10px;
  font-family: var(--font-mono);
  font-size: 12px;
  color: #b9f5c4;
  padding: 10px 12px;
  white-space: pre-wrap;
}
.sandbox-console .console-error { color: #ff8383; }
.sandbox-console .console-line { border-bottom: 1px dashed var(--border); padding: 3px 0; }
.sandbox-console .console-line:last-child { border-bottom: none; }

/* Fullscreen sandbox mode */
.sandbox-view.fullscreen {
  position: fixed;
  inset: 0;
  z-index: 60;
  background: var(--bg);
  padding: 14px 18px;
}
body.sandbox-fullscreen-active .sidebar,
body.sandbox-fullscreen-active .topbar {
  display: none !important;
}

@media (max-width: 980px) {
  .sandbox-ai-pane { max-width: none; min-width: 0; }
  .sandbox-body { flex-wrap: wrap; }
}

@media (max-width: 760px) {
  .sandbox-body { flex-direction: column; }
  .view-switcher .view-tab { padding: 6px 8px; font-size: 11px; }
  .sandbox-editor-gutter { display: none; }
}

.sandbox-toolbar-secondary {
  padding-top: 2px;
}
.sandbox-select {
  background: var(--bg-raised);
  border: 1px solid var(--border);
  color: var(--text-dim);
  border-radius: 6px;
  padding: 5px 8px;
  font-size: 11.5px;
  max-width: 170px;
}

/* ---------- Scenario banner (in chat) ---------- */
.scenario-banner {
  max-width: 720px;
  margin: 14px auto 0;
  padding: 10px 16px;
  border: 1px solid var(--border);
  border-left: 3px solid var(--accent);
  border-radius: 8px;
  background: var(--bg-raised);
  font-size: 12.5px;
  color: var(--text-dim);
  line-height: 1.5;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}
.scenario-banner strong { color: var(--text); }
.scenario-banner #scenarioBannerText { flex: 1; }
.scenario-banner #editScenarioBtn {
  flex-shrink: 0;
  font-size: 12px;
  opacity: 0.7;
}
.scenario-banner #editScenarioBtn:hover { opacity: 1; }
#scenarioEditBox {
  width: 100%;
  margin-top: 8px;
}
#scenarioEditBox textarea {
  width: 100%;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text);
  font-family: var(--font-mono);
  font-size: 12px;
  padding: 8px;
  resize: vertical;
}

/* Roleplay action text: **like this** renders italic + muted, not bold */
.action-text {
  font-style: italic;
  color: var(--text-faint);
}

.edit-bubble-textarea {
  width: 100%;
  min-height: 80px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text);
  font-family: var(--font-body);
  font-size: 14px;
  padding: 8px;
  resize: vertical;
}
.edit-bubble-actions {
  display: flex;
  gap: 6px;
  margin-top: 6px;
}
.edit-bubble-actions button {
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--bg-raised);
  color: var(--text-dim);
  cursor: pointer;
}
.edit-bubble-actions button:hover {
  color: var(--text);
  border-color: var(--accent);
}

/* ---------- Scenario studio modal ---------- */
.modal-wide { max-width: 620px; }
.scenario-intro {
  font-size: 12.5px;
  color: var(--text-dim);
  line-height: 1.5;
  margin: 0;
}
.optional-tag {
  font-size: 10.5px;
  color: var(--text-faint);
  font-weight: 400;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.inline-field-row {
  display: flex;
  gap: 8px;
}
.inline-field-row input[type="text"] {
  flex: 1;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 9px 11px;
  color: var(--text);
  font-size: 13.5px;
  outline: none;
}
.inline-field-row input[type="text"]:focus { border-color: var(--accent-dim); }
.field textarea + textarea { margin-top: 8px; }
.field #scenarioSettingOutput { margin-top: 10px; }

#scenarioLanguageOther {
  margin-top: 8px;
  width: 100%;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 8px 10px;
  color: var(--text);
  font-size: 13px;
  outline: none;
}

.scenario-character-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 10px;
}
.scenario-character-card {
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 10px;
  background: var(--bg);
}
.scenario-character-card-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}
.scenario-character-card-head strong { font-size: 13px; }
.scenario-character-card-title { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 5px; }
.scenario-character-card-actions { display: flex; gap: 6px; margin-left: auto; }

.scenario-character-avatar {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 700;
  color: #1a1300;
  cursor: pointer;
  overflow: hidden;
  border: 1px solid var(--border);
}
.scenario-character-avatar:hover { filter: brightness(1.08); }
.scenario-character-avatar img { width: 100%; height: 100%; object-fit: cover; }

.scenario-character-color-row { display: flex; gap: 5px; flex-wrap: wrap; }
.scenario-color-swatch {
  width: 15px;
  height: 15px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  padding: 0;
}
.scenario-color-swatch.active { border-color: var(--text); }
.scenario-character-card textarea {
  width: 100%;
  background: var(--bg-raised);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text);
  font-size: 12.5px;
  padding: 8px;
  resize: vertical;
  outline: none;
}

/* ---------- Composer ---------- */
.composer {
  padding: 14px 20px 18px;
  max-width: 760px;
  margin: 0 auto;
  width: 100%;
  position: relative;
}

.composer-inner {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  background: var(--bg-raised);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 8px 8px 8px 10px;
}

.composer-inner:focus-within {
  border-color: var(--accent-dim);
}

.composer-input {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  resize: none;
  color: var(--text);
  font-size: 14.5px;
  line-height: 1.5;
  max-height: 200px;
  padding: 6px 4px;
}
.composer-input::placeholder { color: var(--text-faint); }

.send-btn {
  flex-shrink: 0;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  border: none;
  background: var(--accent);
  color: #1a1300;
  font-size: 16px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.15s ease, transform 0.1s ease;
}
.send-btn:disabled { opacity: 0.35; cursor: default; }
.send-btn:not(:disabled):active { transform: scale(0.94); }

.composer-hint {
  text-align: center;
  font-size: 11px;
  color: var(--text-faint);
  margin-top: 8px;
}
.composer-hint code {
  background: rgba(255,255,255,0.06);
  padding: 0 5px;
  border-radius: 4px;
}

/* ---------- Emoji picker ---------- */
.emoji-picker {
  position: absolute;
  bottom: calc(100% - 6px);
  left: 20px;
  width: 300px;
  max-height: 260px;
  overflow-y: auto;
  background: var(--bg-raised);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 10px;
  box-shadow: 0 12px 32px rgba(0,0,0,0.4);
  z-index: 30;
}
.emoji-picker.embedded {
  position: static;
  width: 100%;
  box-shadow: none;
}
.emoji-cat-label {
  font-size: 11px;
  color: var(--text-faint);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin: 8px 2px 4px;
}
.emoji-cat-label:first-child { margin-top: 0; }
.emoji-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 2px;
}
.emoji-opt {
  background: none;
  border: none;
  font-size: 18px;
  padding: 4px;
  border-radius: 6px;
  line-height: 1.2;
}
.emoji-opt:hover { background: var(--bg); }

/* ---------- Persona / theme pickers ---------- */
.persona-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
  margin-top: 14px;
}
.persona-chip {
  background: var(--bg-raised);
  border: 1px solid var(--border);
  color: var(--text-dim);
  padding: 7px 12px;
  border-radius: 999px;
  font-size: 12px;
  transition: border-color 0.15s ease, color 0.15s ease;
}
.persona-chip:hover { border-color: var(--accent-dim); color: var(--text); }
.persona-chip .emo { margin-right: 5px; }

.theme-swatches {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.theme-swatch {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  border: 2px solid var(--border);
  cursor: pointer;
  transition: transform 0.1s ease, border-color 0.12s ease;
}
.theme-swatch:hover { transform: scale(1.08); }
.theme-swatch.active { border-color: var(--text); }

/* ---------- Scrollbars ---------- */
.chat-list::-webkit-scrollbar, .chat-scroll::-webkit-scrollbar, .emoji-picker::-webkit-scrollbar { width: 8px; }
.chat-list::-webkit-scrollbar-thumb, .chat-scroll::-webkit-scrollbar-thumb, .emoji-picker::-webkit-scrollbar-thumb {
  background: var(--border); border-radius: 4px;
}

/* ---------- Responsive ---------- */
@media (max-width: 760px) {
  .sidebar { position: fixed; z-index: 20; height: 100%; }
  .sidebar:not(.collapsed) { box-shadow: 0 0 40px rgba(0,0,0,0.5); }
  .sidebar.collapsed { margin-left: -268px; }
  .message-col { max-width: 88%; }
  .emoji-picker { width: calc(100vw - 40px); left: 10px; }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .empty-mark, .cursor, .status-dot.busy, .thinking-dots span, .message { animation: none; }
}

/* ---------- Settings / sidebar buttons ---------- */
.settings-btn {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  background: transparent;
  border: none;
  color: var(--text-dim);
  padding: 8px 4px;
  font-size: 12.5px;
  border-radius: 8px;
}
.settings-btn:hover { background: var(--bg-raised); color: var(--text); }
.settings-btn .gear { color: var(--accent); }

/* ---------- Modal ---------- */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
  padding: 20px;
}

.modal {
  width: 100%;
  max-width: 440px;
  background: var(--bg-raised);
  border: 1px solid var(--border);
  border-radius: 14px;
  overflow: hidden;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px;
  border-bottom: 1px solid var(--border);
}
.modal-header h2 {
  font-family: var(--font-display);
  font-size: 16px;
  margin: 0;
}

.modal-body {
  padding: 18px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.field { display: flex; flex-direction: column; gap: 6px; }
.field label { font-size: 12.5px; color: var(--text-dim); }
.field input[type="text"], .field textarea {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 9px 11px;
  color: var(--text);
  font-size: 13.5px;
  font-family: inherit;
  resize: vertical;
  outline: none;
}
.field input[type="text"]:focus, .field textarea:focus { border-color: var(--accent-dim); }

.field-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.field-row label { font-size: 13px; }

.field-row select {
  background: var(--bg);
  border: 1px solid var(--border);
  color: var(--text);
  border-radius: 8px;
  padding: 7px 9px;
  font-size: 13px;
}

.field-row input[type="color"] {
  width: 36px;
  height: 28px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: none;
  padding: 0;
  cursor: pointer;
}

.switch {
  position: relative;
  display: inline-block;
  width: 38px;
  height: 22px;
  flex-shrink: 0;
}
.switch input { opacity: 0; width: 0; height: 0; }
.slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background: var(--border);
  border-radius: 999px;
  transition: 0.15s;
}
.slider::before {
  content: "";
  position: absolute;
  width: 16px; height: 16px;
  left: 3px; top: 3px;
  background: var(--text-dim);
  border-radius: 50%;
  transition: 0.15s;
}
.switch input:checked + .slider { background: var(--accent-dim); }
.switch input:checked + .slider::before { transform: translateX(16px); background: var(--accent); }

.modal-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 18px;
  border-top: 1px solid var(--border);
}

.reset-btn {
  background: none;
  border: none;
  color: var(--text-faint);
  font-size: 12.5px;
}
.reset-btn:hover { color: var(--text-dim); }

.save-btn {
  background: var(--accent);
  color: #1a1300;
  border: none;
  padding: 9px 18px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 13px;
}
.save-btn:hover { opacity: 0.9; }

/* ---------- Avatar studio ---------- */
.type-toggle {
  display: flex;
  gap: 4px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 3px;
}
.toggle-opt {
  background: none;
  border: none;
  color: var(--text-dim);
  font-size: 12px;
  padding: 6px 10px;
  border-radius: 6px;
}
.toggle-opt.active { background: var(--bg-raised); color: var(--text); box-shadow: 0 0 0 1px var(--border); }

.avatar-preview-wrap { display: flex; justify-content: center; }
.avatar-preview {
  width: 84px;
  height: 84px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-mono);
  font-size: 26px;
  font-weight: 700;
  color: #1a1300;
  background: linear-gradient(135deg, var(--accent), var(--accent-dim));
  overflow: hidden;
}
.avatar-preview.square { border-radius: 18px; }
.avatar-preview img { width: 100%; height: 100%; object-fit: cover; }

.swatch-row { display: flex; flex-wrap: wrap; gap: 8px; }
.swatch {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 2px solid var(--border);
  cursor: pointer;
}
.swatch.active { border-color: var(--text); }

/* ---------- Image attach ---------- */
.attach-btn {
  flex-shrink: 0;
  background: none;
  border: none;
  font-size: 16px;
  padding: 8px;
  border-radius: 8px;
  color: var(--text-dim);
}
.attach-btn:hover { background: var(--bg); }

.attach-preview {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  margin-bottom: 6px;
  background: var(--bg-raised);
  border: 1px solid var(--border);
  border-radius: 10px;
  width: fit-content;
}
.attach-preview img {
  width: 44px;
  height: 44px;
  object-fit: cover;
  border-radius: 6px;
}
.remove-attach-btn {
  background: none;
  border: none;
  color: var(--text-faint);
  font-size: 13px;
  padding: 4px;
}
.remove-attach-btn:hover { color: #e5484d; }

.message .bubble img.msg-image {
  max-width: 220px;
  border-radius: 8px;
  display: block;
  margin-bottom: 8px;
}

/* ---------- Code blocks ---------- */
.code-block {
  position: relative;
  margin: 10px 0;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--border);
  background: #0d0e11;
}

.code-block-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  background: #16171b;
  border-bottom: 1px solid var(--border);
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-faint);
  gap: 8px;
}

.code-block-actions { display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }

.copy-code-btn, .sandbox-btn {
  background: none;
  border: 1px solid var(--border);
  color: var(--text-dim);
  font-size: 10.5px;
  padding: 3px 8px;
  border-radius: 5px;
  white-space: nowrap;
}
.copy-code-btn:hover, .sandbox-btn:hover { color: var(--text); border-color: var(--accent-dim); }
.copy-code-btn.copied { color: var(--accent); border-color: var(--accent-dim); }
.sandbox-btn.run-btn:hover { color: #3fb950; border-color: #3fb950; }
.sandbox-btn.open-btn:hover { color: var(--accent); }

.code-block pre {
  margin: 0;
  padding: 12px 14px;
  overflow-x: auto;
  font-size: 13px;
  line-height: 1.5;
}
.code-block code {
  font-family: var(--font-mono);
  background: none !important;
  padding: 0 !important;
}

.sandbox-output {
  border-top: 1px solid var(--border);
  background: #0a0b0d;
  font-family: var(--font-mono);
  font-size: 12px;
  padding: 10px 14px;
  color: #b9f5c4;
  white-space: pre-wrap;
  max-height: 200px;
  overflow-y: auto;
}
.sandbox-output.error { color: #ff8383; }

.code-preview-frame {
  border-top: 1px solid var(--border);
  width: 100%;
  height: 260px;
  background: #fff;
}

/* ---------- Toasts ---------- */
.toast-container {
  position: fixed;
  bottom: 20px;
  right: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 100;
}
.toast {
  background: var(--bg-raised);
  border: 1px solid var(--border);
  border-left: 3px solid var(--accent);
  color: var(--text);
  padding: 10px 16px;
  border-radius: 8px;
  font-size: 13px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.35);
  animation: toastIn 0.18s ease;
}
@keyframes toastIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
