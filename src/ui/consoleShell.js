import { EXTENSION_NAME, SELECTORS } from '../core/constants.js';
import { compile as compileBackendRequest, listResources as listBackendResources } from '../backend/backendRegistry.js';

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

function renderField(label, value, { type = 'text', datalist = '', mono = false } = {}) {
  return `
    <label class="stlp-field">
      <span>${escapeHtml(label)}</span>
      <input class="stlp-console-input${mono ? ' stlp-mono-input' : ''}" type="${type}" value="${escapeHtml(value ?? '')}" ${datalist ? `list="${escapeHtml(datalist)}"` : ''} />
    </label>
  `;
}

function renderDatalist(id, values = []) {
  return `<datalist id="${escapeHtml(id)}">${values.map((value) => `<option value="${escapeHtml(value)}"></option>`).join('')}</datalist>`;
}

function safeBackendPayloadPreview(settings = {}) {
  try {
    const request = compileBackendRequest({ positive: '1girl, rainy bedroom, backlighting', negative: 'lowres, watermark' }, settings);
    const payload = request.payload ?? {};
    return JSON.stringify({
      prompt: payload.prompt,
      negative_prompt: payload.negative_prompt,
      width: payload.width,
      height: payload.height,
      steps: payload.steps,
      cfg_scale: payload.cfg_scale,
      sampler_name: payload.sampler_name,
      scheduler: payload.scheduler,
      seed: payload.seed,
      override_settings: payload.override_settings,
      enable_hr: payload.enable_hr,
      alwayson_scripts: payload.alwayson_scripts ? Object.keys(payload.alwayson_scripts) : undefined,
    }, null, 2);
  } catch (error) {
    return JSON.stringify({ error: error?.message || String(error) }, null, 2);
  }
}

function renderBackendsPanel(settings = {}, resources = {}) {
  const sd = settings.sdWebui ?? {};
  const resourceLists = {
    models: resources.models ?? [],
    vaes: resources.vaes ?? [],
    samplers: resources.samplers ?? [],
    schedulers: resources.schedulers ?? [],
    upscalers: resources.upscalers ?? [],
    loras: resources.loras ?? [],
  };
  return `
    <section class="stlp-tab-panel" data-stlp-console-panel="backends" hidden>
      <div class="stlp-grid-12">
        <section class="stlp-module stlp-col-12">
          <div class="stlp-module-head">
            <div><p class="stlp-kicker">Backend Configuration</p><h2>SD WebUI / Forge adapter</h2></div>
            <div class="stlp-chip-row"><span class="stlp-chip stlp-chip-active">${escapeHtml(settings.backend?.type || 'sdWebui')}</span><span class="stlp-chip">editable comboboxes</span></div>
          </div>
          <div class="stlp-form-grid stlp-form-grid-4">
            ${renderField('API URL', sd.url || 'http://127.0.0.1:7860', { mono: true })}
            ${renderField('Username', sd.username || '')}
            ${renderField('Password', sd.password ? '••••••••' : '', { type: 'password' })}
            ${renderField('Timeout', settings.timeoutMs || 30000, { type: 'number', mono: true })}
          </div>
          <div class="stlp-actions-row"><button class="stlp-button stlp-primary" type="button" data-stlp-action="refresh-sd-resources">Refresh resources</button><span id="stlp-sd-resource-status" class="stlp-muted">Fetch model / sampler / VAE / scheduler / upscaler / LoRA lists from the active SD endpoint.</span></div>
        </section>

        <section class="stlp-module stlp-col-8">
          <div class="stlp-module-head"><h2>Resources</h2><span class="stlp-mini-pill">${resourceLists.models.length + resourceLists.samplers.length + resourceLists.vaes.length} loaded</span></div>
          ${renderDatalist('stlp-sd-model-options', resourceLists.models)}
          ${renderDatalist('stlp-sd-vae-options', resourceLists.vaes)}
          ${renderDatalist('stlp-sd-sampler-options', resourceLists.samplers)}
          ${renderDatalist('stlp-sd-scheduler-options', resourceLists.schedulers)}
          ${renderDatalist('stlp-sd-upscaler-options', resourceLists.upscalers)}
          ${renderDatalist('stlp-sd-lora-options', resourceLists.loras)}
          <div class="stlp-form-grid stlp-form-grid-3">
            ${renderField('Model', sd.model || '', { datalist: 'stlp-sd-model-options', mono: true })}
            ${renderField('VAE', sd.vae || '', { datalist: 'stlp-sd-vae-options', mono: true })}
            ${renderField('Sampler', sd.sampler || 'Euler a', { datalist: 'stlp-sd-sampler-options', mono: true })}
            ${renderField('Scheduler', sd.scheduler || '', { datalist: 'stlp-sd-scheduler-options', mono: true })}
            ${renderField('Upscaler', sd.upscaler || '', { datalist: 'stlp-sd-upscaler-options', mono: true })}
            ${renderField('LoRA search', '', { datalist: 'stlp-sd-lora-options', mono: true })}
          </div>
        </section>

        <section class="stlp-module stlp-col-4">
          <h2>Connection</h2>
          <div class="stlp-status-card"><i class="stlp-dot stlp-green"></i><strong>READY</strong><span>txt2img route</span><code>/sdapi/v1/txt2img</code></div>
          <div class="stlp-chip-row"><span class="stlp-chip">Forge compatible</span><span class="stlp-chip">Basic Auth</span></div>
        </section>

        <section class="stlp-module stlp-col-8">
          <div class="stlp-module-head"><h2>Generation defaults</h2><span class="stlp-mini-pill">settings-owned params</span></div>
          <div class="stlp-form-grid stlp-form-grid-4">
            ${renderField('Width', sd.width || 768, { type: 'number', mono: true })}
            ${renderField('Height', sd.height || 1024, { type: 'number', mono: true })}
            ${renderField('Steps', sd.steps || 28, { type: 'number', mono: true })}
            ${renderField('CFG', sd.cfgScale || 7, { type: 'number', mono: true })}
            ${renderField('Seed', sd.seed ?? -1, { type: 'number', mono: true })}
            ${renderField('CLIP skip', sd.clipSkip || 1, { type: 'number', mono: true })}
            ${renderField('Hires scale', sd.hiresFix?.scale ?? 1.8, { type: 'number', mono: true })}
            ${renderField('Denoise', sd.hiresFix?.denoisingStrength ?? 0.45, { type: 'number', mono: true })}
          </div>
          <div class="stlp-chip-row"><span class="stlp-chip${sd.hiresFix?.enabled ? ' stlp-chip-active' : ''}">hires fix ${sd.hiresFix?.enabled ? 'on' : 'off'}</span><span class="stlp-chip${sd.adetailer?.enabled ? ' stlp-chip-active' : ''}">ADetailer ${sd.adetailer?.enabled ? 'on' : 'off'}</span><span class="stlp-chip">restore faces ${sd.restoreFaces ? 'on' : 'off'}</span></div>
        </section>

        <section class="stlp-module stlp-col-4">
          <div class="stlp-module-head"><h2>Payload preview</h2></div>
          <pre class="stlp-code-well">${escapeHtml(safeBackendPayloadPreview({ ...settings, backend: { ...(settings.backend ?? {}), type: 'sdWebui' } }))}</pre>
        </section>
      </div>
    </section>
  `;
}

function renderTagApiPanel(settings = {}) {
  const tagApi = settings.tagApi ?? {};
  return `
    <section class="stlp-tab-panel" data-stlp-console-panel="tag-api" hidden>
      <div class="stlp-grid-12">
        <section class="stlp-module stlp-col-7">
          <div class="stlp-module-head"><div><p class="stlp-kicker">Tag API</p><h2>Second API endpoint</h2></div><span class="stlp-mini-pill">${escapeHtml(tagApi.jsonMode || 'auto')}</span></div>
          <div class="stlp-form-grid stlp-form-grid-2">
            ${renderField('Endpoint URL', tagApi.url || '', { mono: true })}
            ${renderField('Model', tagApi.model || '', { mono: true })}
            ${renderField('API key', tagApi.key ? '••••••••' : '', { type: 'password' })}
            ${renderField('JSON mode', tagApi.jsonMode || 'auto', { mono: true })}
            ${renderField('Temperature', settings.temperature ?? 0.2, { type: 'number', mono: true })}
            ${renderField('Max tokens', settings.maxTokens ?? 1200, { type: 'number', mono: true })}
            ${renderField('Timeout ms', settings.timeoutMs ?? 30000, { type: 'number', mono: true })}
            ${renderField('Retries', settings.retryCount ?? 1, { type: 'number', mono: true })}
          </div>
          <div class="stlp-actions-row"><button class="stlp-button stlp-primary" type="button" data-stlp-action="compile-test">Test API / compile</button><span id="stlp-console-action-status" class="stlp-muted">Run a compile test to populate the latest trace.</span></div>
        </section>
        <section class="stlp-module stlp-col-5">
          <h2>Response contract</h2>
          <pre class="stlp-code-well">${escapeHtml(JSON.stringify({ shouldGenerate: true, positiveBlocks: { subject: ['1girl'], scene: ['rainy bedroom'] }, negative: ['lowres'], insertionPlan: { anchorQuote: 'exact latest reply quote', placement: 'after_anchor' } }, null, 2))}</pre>
          <div class="stlp-chip-row"><span class="stlp-chip stlp-chip-active">CompiledPrompt</span><span class="stlp-chip">backend params not requested</span></div>
        </section>
        <section class="stlp-module stlp-col-12">
          <div class="stlp-module-head"><h2>Diagnostics</h2><span class="stlp-mini-pill">JSON fallback aware</span></div>
          <div class="stlp-stepper stlp-well"><div class="stlp-step stlp-step-done"><span class="stlp-step-node"></span><span>Send</span></div><div class="stlp-step stlp-step-active"><span class="stlp-step-node"></span><span>Receive</span></div><div class="stlp-step"><span class="stlp-step-node"></span><span>Parse</span></div><div class="stlp-step"><span class="stlp-step-node"></span><span>Validate</span></div></div>
        </section>
      </div>
    </section>
  `;
}

function renderCompilerPanel(settings = {}) {
  const profileId = settings.compilerProfileId || settings.backend?.type || 'sd';
  return `
    <section class="stlp-tab-panel" data-stlp-console-panel="compiler" hidden>
      <div class="stlp-grid-12">
        <section class="stlp-module stlp-col-7">
          <div class="stlp-module-head"><div><p class="stlp-kicker">Prompt Compiler</p><h2>Mode and prompt profile</h2></div><button class="stlp-button stlp-primary" type="button" data-stlp-action="compile-test">Run compile test</button></div>
          <div class="stlp-segmented stlp-wide-segmented">${['fast', 'smart', 'expert'].map((mode) => `<span class="stlp-segment${activeClass((settings.mode || 'fast') === mode)}">${mode}</span>`).join('')}</div>
          <div class="stlp-form-grid stlp-form-grid-3 stlp-form-offset">
            ${renderField('Prompt profile', profileId, { mono: true })}
            ${renderField('historyCount', settings.historyCount ?? 8, { type: 'number', mono: true })}
            ${renderField('Target mode', 'latest_assistant', { mono: true })}
          </div>
          <div class="stlp-form-grid stlp-form-grid-2 stlp-form-offset">
            <label class="stlp-field"><span>Fixed positive</span><textarea class="stlp-console-input stlp-textarea">${escapeHtml((settings.fixedPositive ?? []).join('\n'))}</textarea></label>
            <label class="stlp-field"><span>Fixed negative</span><textarea class="stlp-console-input stlp-textarea">${escapeHtml((settings.fixedNegative ?? []).join('\n'))}</textarea></label>
          </div>
          <div class="stlp-chip-row"><span class="stlp-chip${settings.knowledge?.planner ? ' stlp-chip-active' : ''}">planner</span><span class="stlp-chip${settings.knowledge?.dictionaryHints ? ' stlp-chip-active' : ''}">dictionary hints</span><span class="stlp-chip${settings.worldbook?.enabled ? ' stlp-chip-active' : ''}">BME worldbook</span><span class="stlp-chip${settings.regex?.enableDefaultRules ? ' stlp-chip-active' : ''}">default regex</span></div>
        </section>
        <section class="stlp-module stlp-col-5">
          <h2>CompiledPrompt preview</h2>
          <div class="stlp-tag-groups">
            ${['Quality: masterpiece, high quality', 'Subject: 1girl, silver hair', 'Scene: rainy bedroom, window', 'Lighting: backlighting', 'Camera: upper body portrait'].map((line) => `<div class="stlp-tag-line">${escapeHtml(line)}</div>`).join('')}
          </div>
          <blockquote class="stlp-well stlp-quote">anchorQuote copied exactly from the latest AI reply</blockquote>
          <div class="stlp-chip-row"><span class="stlp-chip stlp-chip-active">after_anchor</span><span class="stlp-chip">fallback after_message</span></div>
        </section>
        <section class="stlp-module stlp-col-12">
          <div class="stlp-module-head"><h2>Ordered tagger prompt messages</h2><button class="stlp-button" type="button" data-stlp-action="compile-test">Open latest trace after test</button></div>
          <div class="stlp-role-list">
            ${['system 抬头', 'system 角色定义', 'assistant 身份确认', 'system worldbook before', 'history messages', 'system latest marker', 'user latest target', 'user final task'].map((role) => `<span>${escapeHtml(role)}</span>`).join('')}
          </div>
        </section>
      </div>
    </section>
  `;
}

function renderPlaceholderPanel(tab, settings = {}, resources = {}) {
  if (tab.id === 'tag-api') return renderTagApiPanel(settings);
  if (tab.id === 'compiler') return renderCompilerPanel(settings);
  if (tab.id === 'backends') return renderBackendsPanel(settings, resources.sdWebui ?? resources);
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

function renderShell(settings = {}, activeTab = 'dashboard', resources = {}) {
  return `
    <div id="stlp-console-backdrop" class="stlp-console-backdrop"></div>
    <div class="stlp-console" role="dialog" aria-modal="true" aria-label="${EXTENSION_NAME} console">
      ${renderRail(activeTab)}
      <div class="stlp-console-main">
        ${renderCommandShelf(settings)}
        <main class="stlp-console-content">
          ${renderDashboardPanel()}
          ${TABS.filter((tab) => tab.id !== 'dashboard').map((tab) => renderPlaceholderPanel(tab, settings, resources)).join('')}
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

export function openLittlePainterConsole({ getSettings, runGenerationPipeline, onTraceChanged, tab = 'dashboard' } = {}) {
  const root = getConsoleRoot();
  const settings = typeof getSettings === 'function' ? getSettings() : {};
  root.innerHTML = renderShell(settings, tab);
  bindConsoleShell(root, { getSettings, runGenerationPipeline, onTraceChanged });
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
      return;
    }
    const actionButton = event.target.closest('[data-stlp-action="refresh-sd-resources"]');
    if (actionButton) {
      refreshSdResources(root, options.getSettings);
      return;
    }
    const generationButton = event.target.closest('[data-stlp-action="generate"], [data-stlp-action="compile-test"]');
    if (generationButton) {
      runConsolePipelineAction(root, options, generationButton.dataset.stlpAction);
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !root.classList.contains('stlp-hidden')) {
      closeLittlePainterConsole();
    }
  });
  root.dataset.stlpOptions = Boolean(options.getSettings) ? 'settings' : 'static';
}

async function runConsolePipelineAction(root, options = {}, action = 'compile-test') {
  const status = root.querySelector('#stlp-console-action-status');
  if (typeof options.runGenerationPipeline !== 'function') {
    if (status) status.textContent = 'Pipeline runner is not available in this context.';
    return;
  }
  try {
    if (status) status.textContent = action === 'generate' ? 'Running full generation…' : 'Running compile dry-run…';
    await options.runGenerationPipeline({
      mode: action === 'generate' ? 'console-generate' : 'console-compile-test',
      skipBackend: action !== 'generate',
    });
    if (status) status.textContent = action === 'generate' ? 'Generation completed; latest trace saved.' : 'Compile dry-run completed; latest trace saved.';
    options.onTraceChanged?.();
  } catch (error) {
    if (status) status.textContent = error?.message || String(error);
    options.onTraceChanged?.();
  }
}

async function refreshSdResources(root, getSettings) {
  const status = root.querySelector('#stlp-sd-resource-status');
  try {
    if (status) status.textContent = 'Refreshing SD WebUI resources…';
    const settings = typeof getSettings === 'function' ? getSettings() : {};
    const resources = await listBackendResources({ ...settings, backend: { ...(settings.backend ?? {}), type: 'sdWebui' } }, 'sdWebui');
    const open = !root.classList.contains('stlp-hidden');
    root.innerHTML = renderShell(settings, 'backends', { sdWebui: resources });
    root.classList.toggle('stlp-hidden', !open);
    document.body.classList.toggle('stlp-console-open', open);
    setActiveTab(root, 'backends');
    root.querySelector('#stlp-sd-resource-status').textContent = `Loaded ${Object.values(resources).reduce((sum, list) => sum + (Array.isArray(list) ? list.length : 0), 0)} resources.`;
  } catch (error) {
    if (status) status.textContent = error?.message || String(error);
  }
}

export function registerWandMenuButton({ getSettings, runGenerationPipeline, onTraceChanged } = {}) {
  if (typeof document === 'undefined') return;
  if (document.querySelector(SELECTORS.wandButton)) return;

  const container = document.getElementById('stlp_wand_container') || document.getElementById('extensionsMenu');
  if (!(container instanceof HTMLElement)) {
    setTimeout(() => registerWandMenuButton({ getSettings, runGenerationPipeline, onTraceChanged }), 500);
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
  item.addEventListener('click', () => openLittlePainterConsole({ getSettings, runGenerationPipeline, onTraceChanged }));
  container.appendChild(item);
}

export default {
  bindConsoleShell,
  closeLittlePainterConsole,
  openLittlePainterConsole,
  registerWandMenuButton,
};
