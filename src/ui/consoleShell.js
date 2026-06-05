import { EXTENSION_NAME, SELECTORS } from '../core/constants.js';

const TABS = [
  { id: 'dashboard', label: 'Dashboard', badge: '' },
  { id: 'tag-api', label: 'Tag API', badge: 'api' },
  { id: 'compiler', label: 'Compiler', badge: '' },
  { id: 'backends', label: 'Backends', badge: 'sd' },
  { id: 'knowledge', label: 'Knowledge', badge: '12' },
  { id: 'regex', label: 'Regex', badge: '' },
  { id: 'debug', label: 'Debug', badge: '3' },
];

const PIPELINE_STAGES = ['Context', 'Worldbook', 'Planner', 'Tagger', 'Compile', 'Backend', 'Insert'];

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function activeClass(active) {
  return active ? ' stlp-active' : '';
}

function renderRail(activeTab = 'dashboard') {
  const nav = TABS.map((tab) => `
    <button class="stlp-rail-item${activeClass(tab.id === activeTab)}" type="button" data-stlp-console-tab="${tab.id}">
      <span>${escapeHtml(tab.label)}</span>
      ${tab.badge ? `<span class="stlp-mini-pill">${escapeHtml(tab.badge)}</span>` : ''}
    </button>
  `).join('');

  return `
    <aside class="stlp-rail" aria-label="Little Painter navigation">
      <div class="stlp-wordmark">
        <span>Little</span>
        <span>Painter</span>
        <small>v0.1.0</small>
      </div>
      <nav class="stlp-rail-nav">${nav}</nav>
      <div class="stlp-rail-footer">
        <button class="stlp-text-link" type="button" data-stlp-console-tab="dashboard">Settings</button>
        <button class="stlp-text-link" type="button" data-stlp-console-tab="debug">Docs</button>
      </div>
    </aside>
  `;
}

function renderCommandShelf(settings = {}) {
  const backendType = settings.backend?.type || 'sdWebui';
  const mode = settings.mode || 'fast';
  return `
    <header class="stlp-command-shelf">
      <div class="stlp-command-group">
        <span class="stlp-toggle ${settings.enabled !== false ? 'stlp-on' : ''}" aria-hidden="true"></span>
        <span class="stlp-command-label">Enabled</span>
      </div>
      <div class="stlp-segmented" aria-label="Backend">
        ${['sdWebui:SD', 'novelai:NAI', 'comfyui:Comfy', 'naturalImage:Natural'].map((item) => {
          const [value, label] = item.split(':');
          return `<span class="stlp-segment${activeClass(backendType === value)}">${label}</span>`;
        }).join('')}
      </div>
      <div class="stlp-segmented" aria-label="Mode">
        ${['fast', 'smart', 'expert'].map((value) => `<span class="stlp-segment${activeClass(mode === value)}">${value}</span>`).join('')}
      </div>
      <div class="stlp-select-shell">anime-default / SD</div>
      <span class="stlp-unsaved"><i></i> ready</span>
      <button class="stlp-button stlp-primary" type="button" data-stlp-action="generate">Generate reply</button>
      <button class="stlp-button" type="button" data-stlp-action="compile-test">Test compile</button>
      <button id="stlp-console-close" class="stlp-icon-button" type="button" aria-label="Close Little Painter console">×</button>
    </header>
  `;
}

function renderPipeline() {
  const stages = PIPELINE_STAGES.map((stage, index) => {
    const state = index < 3 ? 'done' : index === 3 ? 'active' : 'pending';
    return `
      <div class="stlp-step stlp-step-${state}">
        <span class="stlp-step-node"></span>
        <span>${stage}</span>
      </div>
    `;
  }).join('');

  return `
    <section class="stlp-module stlp-col-12 stlp-dashboard-pipeline">
      <div class="stlp-module-head">
        <h2>Pipeline readiness</h2>
        <div class="stlp-status-stack">
          <span><i class="stlp-dot stlp-green"></i>Tag API connected</span>
          <span><i class="stlp-dot stlp-green"></i>Worldbook 9 entries</span>
          <span><i class="stlp-dot stlp-amber"></i>Dictionary 56 hints</span>
        </div>
      </div>
      <div class="stlp-well stlp-stepper">${stages}</div>
      <div class="stlp-chip-row">
        <span class="stlp-chip">historyCount 8</span>
        <span class="stlp-chip">JSON auto</span>
        <span class="stlp-chip">retries 0</span>
        <span class="stlp-chip">last 4.2s</span>
      </div>
    </section>
  `;
}

function renderDashboardPanel() {
  return `
    <section class="stlp-tab-panel" data-stlp-console-panel="dashboard">
      <div class="stlp-grid-12">
        ${renderPipeline()}
        <section class="stlp-module stlp-col-7">
          <div class="stlp-module-head"><h2>Compiled visual brief</h2><button class="stlp-button" type="button" data-stlp-console-tab="compiler">Open compiler</button></div>
          <div class="stlp-tag-groups">
            ${['Subject: 1girl, upper body', 'Identity: silver hair, red eyes, kimono', 'Scene: rainy bedroom, window', 'Camera: portrait, backlighting'].map((line) => `<div class="stlp-tag-line">${escapeHtml(line)}</div>`).join('')}
          </div>
          <div class="stlp-chip-row"><span class="stlp-chip stlp-chip-neg">lowres</span><span class="stlp-chip stlp-chip-neg">bad anatomy</span><span class="stlp-chip stlp-chip-neg">watermark</span></div>
        </section>
        <section class="stlp-module stlp-col-5">
          <div class="stlp-module-head"><h2>Insertion target</h2><button class="stlp-button" type="button">Pick target</button></div>
          <blockquote class="stlp-well stlp-quote">She sat by the window, watching the rain.</blockquote>
          <div class="stlp-chip-row"><span class="stlp-chip stlp-chip-active">after_anchor</span><span class="stlp-chip">latest_assistant</span><span class="stlp-chip">fallback after_message</span></div>
          <p class="stlp-muted">Render-only image insertion; chat text remains unchanged.</p>
        </section>
        <section class="stlp-module stlp-col-4"><h2>Recent generation</h2><div class="stlp-thumb"></div><p class="stlp-mono">sdWebui · 512×768 · saved</p></section>
        <section class="stlp-module stlp-col-8"><h2>Configuration launchers</h2><div class="stlp-launcher-grid">${['Tag API', 'Backends', 'Knowledge', 'Debug'].map((label) => `<button class="stlp-launcher" type="button" data-stlp-console-tab="${label.toLowerCase().replace(' ', '-')}">${label}<small>open</small></button>`).join('')}</div></section>
      </div>
    </section>
  `;
}

function renderPlaceholderPanel(tab) {
  const summaries = {
    'tag-api': 'Second API profiles, JSON fallback, model behavior, and live tagger tests.',
    compiler: 'Prompt profiles, mode controls, fixed prompts, insertion defaults, and CompiledPrompt preview.',
    backends: 'SD WebUI, NovelAI, ComfyUI, and natural image backend configuration.',
    knowledge: 'Worldbook resolver, dictionary browser, aliases, skills, and retrieval preview.',
    regex: 'BME-inspired default regex cleanup, custom rules, and live diff testing.',
    debug: 'Trace timeline, redacted payload viewer, task queue, and image insertion diagnostics.',
  };
  return `
    <section class="stlp-tab-panel" data-stlp-console-panel="${tab.id}" hidden>
      <div class="stlp-grid-12">
        <section class="stlp-module stlp-col-12 stlp-placeholder-panel">
          <p class="stlp-kicker">${escapeHtml(tab.label)}</p>
          <h2>${escapeHtml(tab.label)} console</h2>
          <p>${escapeHtml(summaries[tab.id] || 'Little Painter configuration surface.')}</p>
          <div class="stlp-chip-row"><span class="stlp-chip stlp-chip-active">Phase 1 shell</span><span class="stlp-chip">wired in later phases</span></div>
        </section>
      </div>
    </section>
  `;
}

function renderShell(settings = {}, activeTab = 'dashboard') {
  return `
    <div id="stlp-console-backdrop" class="stlp-console-backdrop"></div>
    <div class="stlp-console" role="dialog" aria-modal="true" aria-label="${EXTENSION_NAME} console">
      ${renderRail(activeTab)}
      <div class="stlp-console-main">
        ${renderCommandShelf(settings)}
        <main class="stlp-console-content">
          ${renderDashboardPanel()}
          ${TABS.filter((tab) => tab.id !== 'dashboard').map(renderPlaceholderPanel).join('')}
        </main>
      </div>
    </div>
  `;
}

function getConsoleRoot() {
  let root = document.querySelector(SELECTORS.consoleRoot);
  if (!root) {
    root = document.createElement('div');
    root.id = 'stlp-console-root';
    root.className = 'stlp-console-root stlp-hidden';
    root.setAttribute('aria-hidden', 'true');
    document.body.appendChild(root);
  }
  return root;
}

function setActiveTab(root, tabId = 'dashboard') {
  root.querySelectorAll(SELECTORS.consoleTabs).forEach((button) => {
    button.classList.toggle('stlp-active', button.dataset.stlpConsoleTab === tabId);
  });
  root.querySelectorAll(SELECTORS.consoleTabPanels).forEach((panel) => {
    panel.hidden = panel.dataset.stlpConsolePanel !== tabId;
  });
}

export function closeLittlePainterConsole() {
  const root = document.querySelector(SELECTORS.consoleRoot);
  if (!root) return;
  root.classList.add('stlp-hidden');
  root.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('stlp-console-open');
}

export function openLittlePainterConsole({ getSettings, tab = 'dashboard' } = {}) {
  const root = getConsoleRoot();
  const settings = typeof getSettings === 'function' ? getSettings() : {};
  root.innerHTML = renderShell(settings, tab);
  bindConsoleShell(root, { getSettings });
  root.classList.remove('stlp-hidden');
  root.setAttribute('aria-hidden', 'false');
  document.body.classList.add('stlp-console-open');
  setActiveTab(root, tab);
}

export function bindConsoleShell(root = document.querySelector(SELECTORS.consoleRoot), options = {}) {
  if (!root || root.dataset.stlpBound === 'true') {
    return;
  }
  root.dataset.stlpBound = 'true';
  root.addEventListener('click', (event) => {
    const closeButton = event.target.closest(SELECTORS.consoleClose);
    if (closeButton) {
      closeLittlePainterConsole();
      return;
    }
    const tabButton = event.target.closest(SELECTORS.consoleTabs);
    if (tabButton) {
      setActiveTab(root, tabButton.dataset.stlpConsoleTab);
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !root.classList.contains('stlp-hidden')) {
      closeLittlePainterConsole();
    }
  });
  root.dataset.stlpOptions = Boolean(options.getSettings) ? 'settings' : 'static';
}

export function registerWandMenuButton({ getSettings } = {}) {
  if (typeof document === 'undefined') return;
  if (document.querySelector(SELECTORS.wandButton)) return;

  const container = document.getElementById('stlp_wand_container') || document.getElementById('extensionsMenu');
  if (!(container instanceof HTMLElement)) {
    setTimeout(() => registerWandMenuButton({ getSettings }), 500);
    return;
  }

  const item = document.createElement('div');
  item.id = 'stlp-wand-button';
  item.classList.add('list-group-item', 'flex-container', 'flexGap5');
  const icon = document.createElement('div');
  icon.classList.add('fa-solid', 'fa-paintbrush', 'extensionsMenuExtensionButton');
  const label = document.createElement('span');
  label.textContent = 'Little Painter';
  item.append(icon, label);
  item.addEventListener('click', () => openLittlePainterConsole({ getSettings }));
  container.appendChild(item);
}

export default {
  bindConsoleShell,
  closeLittlePainterConsole,
  openLittlePainterConsole,
  registerWandMenuButton,
};
