import { EXTENSION_NAME, SELECTORS } from '../core/constants.js';
import { compile as compileBackendRequest, listResources as listBackendResources } from '../backend/backendRegistry.js';
import { getDefaultRegexRules } from '../regex/defaultRegexRules.js';
import { getLatestTrace, getTraceHistory } from '../debug/trace.js';
import { saveSettings, updateSettings } from '../host/settingsStore.js';
import { createTranslator } from './i18n.js';

const TABS = [
  { id: 'dashboard', labelKey: 'dashboard', badge: '' },
  { id: 'tag-api', labelKey: 'tagApi', badge: 'api' },
  { id: 'compiler', labelKey: 'compiler', badge: '' },
  { id: 'backends', labelKey: 'backends', badge: 'sd' },
  { id: 'knowledge', labelKey: 'knowledge', badge: '12' },
  { id: 'regex', labelKey: 'regex', badge: '' },
  { id: 'debug', labelKey: 'debug', badge: '3' },
];

const PIPELINE_STAGE_KEYS = ['stageContext', 'stageWorldbook', 'stagePlanner', 'stageTagger', 'stageCompile', 'stageBackend', 'stageInsert'];

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

function renderRail(settings = {}, activeTab = 'dashboard') {
  const t = createTranslator(settings);
  const nav = TABS.map((tab) => `
    <button class="stlp-rail-item${activeClass(tab.id === activeTab)}" type="button" data-stlp-console-tab="${tab.id}">
      <span>${escapeHtml(t(tab.labelKey))}</span>
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
        <button class="stlp-text-link" type="button" data-stlp-console-tab="dashboard">${escapeHtml(t('settings'))}</button>
        <button class="stlp-text-link" type="button" data-stlp-console-tab="debug">${escapeHtml(t('docs'))}</button>
      </div>
    </aside>
  `;
}

function renderCommandShelf(settings = {}) {
  const t = createTranslator(settings);
  const backendType = settings.backend?.type || 'sdWebui';
  const mode = settings.mode || 'fast';
  const profileLabel = settings.profiles?.list?.[settings.profiles?.active]?.label || 'anime-default / SD';
  return `
    <header class="stlp-command-shelf">
      <button class="stlp-command-group stlp-command-clickable" type="button" data-stlp-command-toggle="enabled" aria-pressed="${settings.enabled !== false ? 'true' : 'false'}">
        <span class="stlp-toggle ${settings.enabled !== false ? 'stlp-on' : ''}" aria-hidden="true"></span>
        <span class="stlp-command-label">${escapeHtml(t('enabled'))}</span>
      </button>
      <div class="stlp-segmented" aria-label="${escapeHtml(t('backend'))}">
        ${['sdWebui:SD', 'novelai:NAI', 'comfyui:Comfy', 'naturalImage:Natural'].map((item) => {
          const [value, label] = item.split(':');
          return `<button class="stlp-segment${activeClass(backendType === value)}" type="button" data-stlp-command-set="backend.type" data-stlp-command-value="${escapeHtml(value)}" aria-pressed="${backendType === value ? 'true' : 'false'}">${label}</button>`;
        }).join('')}
      </div>
      <div class="stlp-segmented" aria-label="${escapeHtml(t('mode'))}">
        ${['fast', 'smart', 'expert'].map((value) => `<button class="stlp-segment${activeClass(mode === value)}" type="button" data-stlp-command-set="mode" data-stlp-command-value="${escapeHtml(value)}" aria-pressed="${mode === value ? 'true' : 'false'}">${value}</button>`).join('')}
      </div>
      <button class="stlp-select-shell" type="button" data-stlp-console-tab="compiler">${escapeHtml(profileLabel)}</button>
      <span id="stlp-console-action-status" class="stlp-unsaved"><i></i> ${escapeHtml(t('ready'))}</span>
      <button class="stlp-button stlp-primary" type="button" data-stlp-action="generate">${escapeHtml(t('generateReply'))}</button>
      <button class="stlp-button" type="button" data-stlp-action="compile-test">${escapeHtml(t('testCompile'))}</button>
      <button id="stlp-console-close" class="stlp-icon-button" type="button" aria-label="${escapeHtml(t('closeConsole'))}">×</button>
    </header>
  `;
}

function renderPipeline(settings = {}) {
  const t = createTranslator(settings);
  const stages = PIPELINE_STAGE_KEYS.map((stageKey, index) => {
    const state = index < 3 ? 'done' : index === 3 ? 'active' : 'pending';
    return `
      <div class="stlp-step stlp-step-${state}">
        <span class="stlp-step-node"></span>
        <span>${escapeHtml(t(stageKey))}</span>
      </div>
    `;
  }).join('');

  return `
    <section class="stlp-module stlp-col-12 stlp-dashboard-pipeline">
      <div class="stlp-module-head">
        <h2>${escapeHtml(t('pipelineReadiness'))}</h2>
        <div class="stlp-status-stack">
          <span><i class="stlp-dot stlp-green"></i>${escapeHtml(t('tagApiConnected'))}</span>
          <span><i class="stlp-dot stlp-green"></i>${escapeHtml(t('worldbookEntries'))}</span>
          <span><i class="stlp-dot stlp-amber"></i>${escapeHtml(t('dictionaryHints'))}</span>
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

function renderDashboardPanel(settings = {}) {
  const t = createTranslator(settings);
  return `
    <section class="stlp-tab-panel" data-stlp-console-panel="dashboard">
      <div class="stlp-grid-12">
        ${renderPipeline(settings)}
        <section class="stlp-module stlp-col-7">
          <div class="stlp-module-head"><h2>${escapeHtml(t('compiledVisualBrief'))}</h2><button class="stlp-button" type="button" data-stlp-console-tab="compiler">${escapeHtml(t('openCompiler'))}</button></div>
          <div class="stlp-tag-groups">
            ${['subjectLine', 'identityLine', 'sceneLine', 'cameraLine'].map((key) => `<div class="stlp-tag-line">${escapeHtml(t(key))}</div>`).join('')}
          </div>
          <div class="stlp-chip-row"><span class="stlp-chip stlp-chip-neg">lowres</span><span class="stlp-chip stlp-chip-neg">bad anatomy</span><span class="stlp-chip stlp-chip-neg">watermark</span></div>
        </section>
        <section class="stlp-module stlp-col-5">
          <div class="stlp-module-head"><h2>${escapeHtml(t('insertionTarget'))}</h2><button class="stlp-button" type="button">${escapeHtml(t('pickTarget'))}</button></div>
          <blockquote class="stlp-well stlp-quote">${escapeHtml(t('sampleQuote'))}</blockquote>
          <div class="stlp-chip-row"><span class="stlp-chip stlp-chip-active">after_anchor</span><span class="stlp-chip">latest_assistant</span><span class="stlp-chip">fallback after_message</span></div>
          <p class="stlp-muted">${escapeHtml(t('renderOnlyNote'))}</p>
        </section>
        <section class="stlp-module stlp-col-4"><h2>${escapeHtml(t('recentGeneration'))}</h2><div class="stlp-thumb"></div><p class="stlp-mono">sdWebui · 512×768 · ${escapeHtml(t('saved'))}</p></section>
        <section class="stlp-module stlp-col-8"><h2>${escapeHtml(t('configurationLaunchers'))}</h2><div class="stlp-launcher-grid">${TABS.filter((tab) => ['tag-api', 'backends', 'knowledge', 'debug'].includes(tab.id)).map((tab) => `<button class="stlp-launcher" type="button" data-stlp-console-tab="${tab.id}">${escapeHtml(t(tab.labelKey))}<small>${escapeHtml(t('open'))}</small></button>`).join('')}</div></section>
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
  const t = createTranslator(settings);
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
            <div><p class="stlp-kicker">${escapeHtml(t('backendConfiguration'))}</p><h2>${escapeHtml(t('sdAdapter'))}</h2></div>
            <div class="stlp-chip-row"><span class="stlp-chip stlp-chip-active">${escapeHtml(settings.backend?.type || 'sdWebui')}</span><span class="stlp-chip">${escapeHtml(t('editableComboboxes'))}</span></div>
          </div>
          <div class="stlp-form-grid stlp-form-grid-4">
            ${renderField(t('apiUrl'), sd.url || 'http://127.0.0.1:7860', { mono: true })}
            ${renderField(t('username'), sd.username || '')}
            ${renderField(t('password'), sd.password ? '••••••••' : '', { type: 'password' })}
            ${renderField(t('timeout'), settings.timeoutMs || 30000, { type: 'number', mono: true })}
          </div>
          <div class="stlp-actions-row"><button class="stlp-button stlp-primary" type="button" data-stlp-action="refresh-sd-resources">${escapeHtml(t('refreshResources'))}</button><span id="stlp-sd-resource-status" class="stlp-muted">${escapeHtml(t('sdResourceHelp'))}</span></div>
        </section>

        <section class="stlp-module stlp-col-8">
          <div class="stlp-module-head"><h2>${escapeHtml(t('resources'))}</h2><span class="stlp-mini-pill">${resourceLists.models.length + resourceLists.samplers.length + resourceLists.vaes.length} ${escapeHtml(t('loaded'))}</span></div>
          ${renderDatalist('stlp-sd-model-options', resourceLists.models)}
          ${renderDatalist('stlp-sd-vae-options', resourceLists.vaes)}
          ${renderDatalist('stlp-sd-sampler-options', resourceLists.samplers)}
          ${renderDatalist('stlp-sd-scheduler-options', resourceLists.schedulers)}
          ${renderDatalist('stlp-sd-upscaler-options', resourceLists.upscalers)}
          ${renderDatalist('stlp-sd-lora-options', resourceLists.loras)}
          <div class="stlp-form-grid stlp-form-grid-3">
            ${renderField(t('model'), sd.model || '', { datalist: 'stlp-sd-model-options', mono: true })}
            ${renderField(t('vae'), sd.vae || '', { datalist: 'stlp-sd-vae-options', mono: true })}
            ${renderField(t('sampler'), sd.sampler || 'Euler a', { datalist: 'stlp-sd-sampler-options', mono: true })}
            ${renderField(t('scheduler'), sd.scheduler || '', { datalist: 'stlp-sd-scheduler-options', mono: true })}
            ${renderField(t('upscaler'), sd.upscaler || '', { datalist: 'stlp-sd-upscaler-options', mono: true })}
            ${renderField(t('loraSearch'), '', { datalist: 'stlp-sd-lora-options', mono: true })}
          </div>
        </section>

        <section class="stlp-module stlp-col-4">
          <h2>${escapeHtml(t('connection'))}</h2>
          <div class="stlp-status-card"><i class="stlp-dot stlp-green"></i><strong>${escapeHtml(t('ready').toUpperCase())}</strong><span>${escapeHtml(t('txt2imgRoute'))}</span><code>/sdapi/v1/txt2img</code></div>
          <div class="stlp-chip-row"><span class="stlp-chip">${escapeHtml(t('forgeCompatible'))}</span><span class="stlp-chip">${escapeHtml(t('basicAuth'))}</span></div>
        </section>

        <section class="stlp-module stlp-col-8">
          <div class="stlp-module-head"><h2>${escapeHtml(t('generationDefaults'))}</h2><span class="stlp-mini-pill">${escapeHtml(t('settingsOwnedParams'))}</span></div>
          <div class="stlp-form-grid stlp-form-grid-4">
            ${renderField(t('width'), sd.width || 768, { type: 'number', mono: true })}
            ${renderField(t('height'), sd.height || 1024, { type: 'number', mono: true })}
            ${renderField(t('steps'), sd.steps || 28, { type: 'number', mono: true })}
            ${renderField(t('cfg'), sd.cfgScale || 7, { type: 'number', mono: true })}
            ${renderField(t('seed'), sd.seed ?? -1, { type: 'number', mono: true })}
            ${renderField(t('clipSkip'), sd.clipSkip || 1, { type: 'number', mono: true })}
            ${renderField(t('hiresScale'), sd.hiresFix?.scale ?? 1.8, { type: 'number', mono: true })}
            ${renderField(t('denoise'), sd.hiresFix?.denoisingStrength ?? 0.45, { type: 'number', mono: true })}
          </div>
          <div class="stlp-chip-row"><span class="stlp-chip${sd.hiresFix?.enabled ? ' stlp-chip-active' : ''}">${escapeHtml(t('hiresFix'))} ${sd.hiresFix?.enabled ? 'on' : 'off'}</span><span class="stlp-chip${sd.adetailer?.enabled ? ' stlp-chip-active' : ''}">ADetailer ${sd.adetailer?.enabled ? 'on' : 'off'}</span><span class="stlp-chip">${escapeHtml(t('restoreFaces'))} ${sd.restoreFaces ? 'on' : 'off'}</span></div>
        </section>

        <section class="stlp-module stlp-col-4">
          <div class="stlp-module-head"><h2>${escapeHtml(t('payloadPreview'))}</h2></div>
          <pre class="stlp-code-well">${escapeHtml(safeBackendPayloadPreview({ ...settings, backend: { ...(settings.backend ?? {}), type: 'sdWebui' } }))}</pre>
        </section>
      </div>
    </section>
  `;
}

function renderTagApiPanel(settings = {}) {
  const t = createTranslator(settings);
  const tagApi = settings.tagApi ?? {};
  return `
    <section class="stlp-tab-panel" data-stlp-console-panel="tag-api" hidden>
      <div class="stlp-grid-12">
        <section class="stlp-module stlp-col-7">
          <div class="stlp-module-head"><div><p class="stlp-kicker">${escapeHtml(t('tagApi'))}</p><h2>${escapeHtml(t('secondApiEndpoint'))}</h2></div><span class="stlp-mini-pill">${escapeHtml(tagApi.jsonMode || 'auto')}</span></div>
          <div class="stlp-form-grid stlp-form-grid-2">
            ${renderField(t('endpointUrl'), tagApi.url || '', { mono: true })}
            ${renderField(t('model'), tagApi.model || '', { mono: true })}
            ${renderField(t('apiKey'), tagApi.key ? '••••••••' : '', { type: 'password' })}
            ${renderField(t('jsonMode'), tagApi.jsonMode || 'auto', { mono: true })}
            ${renderField(t('temperature'), settings.temperature ?? 0.2, { type: 'number', mono: true })}
            ${renderField(t('maxTokens'), settings.maxTokens ?? 1200, { type: 'number', mono: true })}
            ${renderField(t('timeoutMs'), settings.timeoutMs ?? 30000, { type: 'number', mono: true })}
            ${renderField(t('retries'), settings.retryCount ?? 1, { type: 'number', mono: true })}
          </div>
          <div class="stlp-actions-row"><button class="stlp-button stlp-primary" type="button" data-stlp-action="compile-test">${escapeHtml(t('testApiCompile'))}</button><span class="stlp-muted">${escapeHtml(t('compileTraceHint'))}</span></div>
        </section>
        <section class="stlp-module stlp-col-5">
          <h2>${escapeHtml(t('responseContract'))}</h2>
          <pre class="stlp-code-well">${escapeHtml(JSON.stringify({ shouldGenerate: true, positiveBlocks: { subject: ['1girl'], scene: ['rainy bedroom'] }, negative: ['lowres'], insertionPlan: { anchorQuote: 'exact latest reply quote', placement: 'after_anchor' } }, null, 2))}</pre>
          <div class="stlp-chip-row"><span class="stlp-chip stlp-chip-active">CompiledPrompt</span><span class="stlp-chip">${escapeHtml(t('backendParamsNotRequested'))}</span></div>
        </section>
        <section class="stlp-module stlp-col-12">
          <div class="stlp-module-head"><h2>${escapeHtml(t('diagnostics'))}</h2><span class="stlp-mini-pill">${escapeHtml(t('jsonFallbackAware'))}</span></div>
          <div class="stlp-stepper stlp-well"><div class="stlp-step stlp-step-done"><span class="stlp-step-node"></span><span>${escapeHtml(t('send'))}</span></div><div class="stlp-step stlp-step-active"><span class="stlp-step-node"></span><span>${escapeHtml(t('receive'))}</span></div><div class="stlp-step"><span class="stlp-step-node"></span><span>${escapeHtml(t('parse'))}</span></div><div class="stlp-step"><span class="stlp-step-node"></span><span>${escapeHtml(t('validate'))}</span></div></div>
        </section>
      </div>
    </section>
  `;
}

function renderCompilerPanel(settings = {}) {
  const t = createTranslator(settings);
  const profileId = settings.compilerProfileId || settings.backend?.type || 'sd';
  return `
    <section class="stlp-tab-panel" data-stlp-console-panel="compiler" hidden>
      <div class="stlp-grid-12">
        <section class="stlp-module stlp-col-7">
          <div class="stlp-module-head"><div><p class="stlp-kicker">${escapeHtml(t('promptCompiler'))}</p><h2>${escapeHtml(t('modeAndProfile'))}</h2></div><button class="stlp-button stlp-primary" type="button" data-stlp-action="compile-test">${escapeHtml(t('runCompileTest'))}</button></div>
          <div class="stlp-segmented stlp-wide-segmented">${['fast', 'smart', 'expert'].map((mode) => `<span class="stlp-segment${activeClass((settings.mode || 'fast') === mode)}">${mode}</span>`).join('')}</div>
          <div class="stlp-form-grid stlp-form-grid-3 stlp-form-offset">
            ${renderField(t('promptProfile'), profileId, { mono: true })}
            ${renderField('historyCount', settings.historyCount ?? 8, { type: 'number', mono: true })}
            ${renderField(t('targetMode'), 'latest_assistant', { mono: true })}
          </div>
          <div class="stlp-form-grid stlp-form-grid-2 stlp-form-offset">
            <label class="stlp-field"><span>${escapeHtml(t('fixedPositive'))}</span><textarea class="stlp-console-input stlp-textarea">${escapeHtml((settings.fixedPositive ?? []).join('\n'))}</textarea></label>
            <label class="stlp-field"><span>${escapeHtml(t('fixedNegative'))}</span><textarea class="stlp-console-input stlp-textarea">${escapeHtml((settings.fixedNegative ?? []).join('\n'))}</textarea></label>
          </div>
          <div class="stlp-chip-row"><span class="stlp-chip${settings.knowledge?.planner ? ' stlp-chip-active' : ''}">${escapeHtml(t('planner'))}</span><span class="stlp-chip${settings.knowledge?.dictionaryHints ? ' stlp-chip-active' : ''}">${escapeHtml(t('dictionaryHintsShort'))}</span><span class="stlp-chip${settings.worldbook?.enabled ? ' stlp-chip-active' : ''}">${escapeHtml(t('bmeWorldbook'))}</span><span class="stlp-chip${settings.regex?.enableDefaultRules ? ' stlp-chip-active' : ''}">${escapeHtml(t('defaultRegexShort'))}</span></div>
        </section>
        <section class="stlp-module stlp-col-5">
          <h2>${escapeHtml(t('compiledPromptPreview'))}</h2>
          <div class="stlp-tag-groups">
            ${['Quality: masterpiece, high quality', 'Subject: 1girl, silver hair', 'Scene: rainy bedroom, window', 'Lighting: backlighting', 'Camera: upper body portrait'].map((line) => `<div class="stlp-tag-line">${escapeHtml(line)}</div>`).join('')}
          </div>
          <blockquote class="stlp-well stlp-quote">${escapeHtml(t('latestAssistantAnchor'))}</blockquote>
          <div class="stlp-chip-row"><span class="stlp-chip stlp-chip-active">after_anchor</span><span class="stlp-chip">${escapeHtml(t('fallbackAfterMessage'))}</span></div>
        </section>
        <section class="stlp-module stlp-col-12">
          <div class="stlp-module-head"><h2>${escapeHtml(t('orderedMessages'))}</h2><button class="stlp-button" type="button" data-stlp-action="compile-test">${escapeHtml(t('openLatestTrace'))}</button></div>
          <div class="stlp-role-list">
            ${['system 抬头', 'system 角色定义', 'assistant 身份确认', 'system worldbook before', 'history messages', 'system latest marker', 'user latest target', 'user final task'].map((role) => `<span>${escapeHtml(role)}</span>`).join('')}
          </div>
        </section>
      </div>
    </section>
  `;
}

function renderKnowledgePanel(settings = {}) {
  const t = createTranslator(settings);
  const worldbookOn = settings.worldbook?.enabled !== false;
  const knowledge = settings.knowledge ?? {};
  return `
    <section class="stlp-tab-panel" data-stlp-console-panel="knowledge" hidden>
      <div class="stlp-grid-12">
        <section class="stlp-module stlp-col-7">
          <div class="stlp-module-head"><div><p class="stlp-kicker">${escapeHtml(t('knowledgeRuntime'))}</p><h2>${escapeHtml(t('bmeResolver'))}</h2></div><button class="stlp-button stlp-primary" type="button" data-stlp-action="compile-test">${escapeHtml(t('testResolve'))}</button></div>
          <div class="stlp-two-pane">
            <div class="stlp-well stlp-list-pane">
              ${['Character Book 4', 'Global Lore 8', 'Chat Lore 3', 'Persona 2', 'Extension Context 1'].map((row, index) => `<div><i class="stlp-dot ${worldbookOn ? 'stlp-green' : 'stlp-amber'}"></i><span>${escapeHtml(row)}</span><code>${index + 1}</code></div>`).join('')}
            </div>
            <div class="stlp-well stlp-list-pane">
              ${['beforeVisualFacts', 'atDepthRoleKept', 'afterPromptTail', 'activatedOnly'].map((key) => `<div><span>${escapeHtml(t(key))}</span><code>${escapeHtml(t('ready'))}</code></div>`).join('')}
            </div>
          </div>
          <div class="stlp-chip-row"><span class="stlp-chip${worldbookOn ? ' stlp-chip-active' : ''}">${escapeHtml(t('worldbook'))} ${worldbookOn ? 'on' : 'off'}</span><span class="stlp-chip">${escapeHtml(t('filter'))} ${escapeHtml(settings.worldbook?.worldInfoFilterMode || 'default')}</span><span class="stlp-chip">${escapeHtml(t('maxPasses'))} ${escapeHtml(settings.worldbook?.worldInfoMaxResolvePasses ?? 10)}</span></div>
        </section>
        <section class="stlp-module stlp-col-5">
          <h2>${escapeHtml(t('retrievalPreview'))}</h2>
          <div class="stlp-chip-row"><span class="stlp-chip${knowledge.dictionaryHints ? ' stlp-chip-active' : ''}">dictionaryHints</span><span class="stlp-chip${knowledge.selectedSkills ? ' stlp-chip-active' : ''}">selectedSkills</span><span class="stlp-chip${knowledge.planner ? ' stlp-chip-active' : ''}">planner</span></div>
          <div class="stlp-tag-groups stlp-form-offset">${['半身 → upper body', '逆光 → backlighting', '雨夜 → rainy night', '和服 → kimono', '湿衣 → wet clothes'].map((line) => `<div class="stlp-tag-line">${escapeHtml(line)}</div>`).join('')}</div>
        </section>
        <section class="stlp-module stlp-col-12"><h2>${escapeHtml(t('skillSelector'))}</h2><div class="stlp-role-list">${['visual_extraction', 'character_identity_lock', 'pose_resolver', 'film_camera', 'lighting_designer', 'backend_sd_pack', 'backend_novelai_pack', 'interaction_resolver'].map((skill) => `<span>${escapeHtml(skill)}</span>`).join('')}</div></section>
      </div>
    </section>
  `;
}

function renderRegexPanel(settings = {}) {
  const t = createTranslator(settings);
  const regex = settings.regex ?? {};
  const defaultRules = getDefaultRegexRules({ includeOutputCleanup: regex.enableOutputCleanup === true });
  const userRules = Array.isArray(regex.rules) ? regex.rules : [];
  return `
    <section class="stlp-tab-panel" data-stlp-console-panel="regex" hidden>
      <div class="stlp-grid-12">
        <section class="stlp-module stlp-col-7">
          <div class="stlp-module-head"><div><p class="stlp-kicker">${escapeHtml(t('contextRegexCleanup'))}</p><h2>${escapeHtml(t('defaultRules'))}</h2></div><span class="stlp-mini-pill">${defaultRules.length} default</span></div>
          <div class="stlp-chip-row"><span class="stlp-chip${regex.enabled !== false ? ' stlp-chip-active' : ''}">${escapeHtml(t('inputCleanup'))}</span><span class="stlp-chip${regex.enableDefaultRules !== false ? ' stlp-chip-active' : ''}">${escapeHtml(t('defaultRegexShort'))}</span><span class="stlp-chip${regex.enableOutputCleanup ? ' stlp-chip-active' : ''}">${escapeHtml(t('outputCleanup'))}</span></div>
          <div class="stlp-list-pane stlp-well stlp-form-offset">${defaultRules.slice(0, 10).map((rule) => `<div><span>${escapeHtml(rule.name)}</span><code>${escapeHtml(rule.stage)}</code></div>`).join('')}</div>
        </section>
        <section class="stlp-module stlp-col-5">
          <h2>${escapeHtml(t('customRules'))}</h2>
          <pre class="stlp-code-well">${escapeHtml(JSON.stringify(userRules.slice(0, 6), null, 2) || '[]')}</pre>
          <div class="stlp-chip-row"><span class="stlp-chip">${escapeHtml(t('cleanupOrder'))}</span></div>
        </section>
        <section class="stlp-module stlp-col-12"><h2>${escapeHtml(t('liveCleanupTest'))}</h2><div class="stlp-two-pane"><pre class="stlp-code-well">&lt;think&gt;hidden&lt;/think&gt; She looked at the rain. &lt;StatusPlaceHolderImpl/&gt;</pre><pre class="stlp-code-well">She looked at the rain.</pre></div></section>
      </div>
    </section>
  `;
}

function renderDebugPanel(settings = {}) {
  const t = createTranslator(settings);
  const traces = getTraceHistory(settings.debug?.keepTraces ?? 20);
  const latest = getLatestTrace();
  const steps = latest?.steps ?? [];
  return `
    <section class="stlp-tab-panel" data-stlp-console-panel="debug" hidden>
      <div class="stlp-grid-12">
        <section class="stlp-module stlp-col-7">
          <div class="stlp-module-head"><div><p class="stlp-kicker">${escapeHtml(t('debugTrace'))}</p><h2>${escapeHtml(t('pipelineTimeline'))}</h2></div><span class="stlp-mini-pill">${traces.length}/${settings.debug?.keepTraces ?? 20}</span></div>
          <div class="stlp-list-pane stlp-well">${(steps.length ? steps : [{ name: t('noTrace'), timestamp: '' }]).map((step) => `<div><span>${escapeHtml(step.name)}</span><code>${escapeHtml(step.timestamp || latest?.status || t('idle'))}</code></div>`).join('')}</div>
        </section>
        <section class="stlp-module stlp-col-5">
          <h2>${escapeHtml(t('latestTraceSummary'))}</h2>
          <pre class="stlp-code-well">${escapeHtml(latest ? JSON.stringify({ id: latest.id, label: latest.label, status: latest.status, steps: latest.steps?.length ?? 0, summary: latest.summary }, null, 2) : '{\n  "status": "idle"\n}')}</pre>
          <div class="stlp-chip-row"><span class="stlp-chip${settings.debug?.enabled ? ' stlp-chip-active' : ''}">${escapeHtml(t('summaryDebug'))}</span><span class="stlp-chip">${escapeHtml(t('redactedPayloads'))}</span><span class="stlp-chip">${escapeHtml(t('imageRecordsCapped'))}</span></div>
        </section>
        <section class="stlp-module stlp-col-12"><h2>${escapeHtml(t('insertionDebug'))}</h2><div class="stlp-role-list">${['target latest_assistant', 'anchorQuote exact match', 'placement before/after anchor', 'fallback after_message', 'render-only DOM node', 'chat text unchanged', 'resolvedInsertion stored', 'rerender bridge active'].map((item) => `<span>${escapeHtml(item)}</span>`).join('')}</div></section>
      </div>
    </section>
  `;
}

function renderPlaceholderPanel(tab, settings = {}, resources = {}) {
  if (tab.id === 'tag-api') return renderTagApiPanel(settings);
  if (tab.id === 'compiler') return renderCompilerPanel(settings);
  if (tab.id === 'backends') return renderBackendsPanel(settings, resources.sdWebui ?? resources);
  if (tab.id === 'knowledge') return renderKnowledgePanel(settings);
  if (tab.id === 'regex') return renderRegexPanel(settings);
  if (tab.id === 'debug') return renderDebugPanel(settings);
  const t = createTranslator(settings);
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
          <p class="stlp-kicker">${escapeHtml(t(tab.labelKey))}</p>
          <h2>${escapeHtml(t(tab.labelKey))} console</h2>
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
      ${renderRail(settings, activeTab)}
      <div class="stlp-console-main">
        ${renderCommandShelf(settings)}
        <main class="stlp-console-content">
          ${renderDashboardPanel(settings)}
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

function getActiveTab(root) {
  return root.querySelector(`${SELECTORS.consoleTabPanels}:not([hidden])`)?.dataset.stlpConsolePanel || 'dashboard';
}

function rerenderConsole(root, settings, options = {}, activeTab = getActiveTab(root)) {
  const open = !root.classList.contains('stlp-hidden');
  root.innerHTML = renderShell(settings, activeTab);
  root.classList.toggle('stlp-hidden', !open);
  root.setAttribute('aria-hidden', open ? 'false' : 'true');
  document.body.classList.toggle('stlp-console-open', open);
  setActiveTab(root, activeTab);
  options.onSettingsChanged?.(settings);
}

function setNestedValue(target, path, value) {
  const keys = String(path).split('.').filter(Boolean);
  let cursor = target;
  keys.slice(0, -1).forEach((key) => {
    cursor[key] = cursor[key] && typeof cursor[key] === 'object' && !Array.isArray(cursor[key]) ? cursor[key] : {};
    cursor = cursor[key];
  });
  cursor[keys[keys.length - 1]] = value;
}

function updateConsoleSetting(root, options = {}, path, value) {
  const settings = updateSettings((current) => {
    setNestedValue(current, path, value);
    return current;
  });
  saveSettings();
  rerenderConsole(root, settings, options);
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
    const toggleButton = event.target.closest('[data-stlp-command-toggle="enabled"]');
    if (toggleButton) {
      const settings = typeof options.getSettings === 'function' ? options.getSettings() : {};
      updateConsoleSetting(root, options, 'enabled', settings.enabled === false);
      return;
    }
    const setButton = event.target.closest('[data-stlp-command-set]');
    if (setButton) {
      updateConsoleSetting(root, options, setButton.dataset.stlpCommandSet, setButton.dataset.stlpCommandValue);
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
  const settings = typeof options.getSettings === 'function' ? options.getSettings() : {};
  const t = createTranslator(settings);
  const status = root.querySelector('#stlp-console-action-status');
  if (typeof options.runGenerationPipeline !== 'function') {
    if (status) status.textContent = t('pipelineUnavailable');
    return;
  }
  try {
    if (status) status.textContent = action === 'generate' ? t('runningGeneration') : t('runningCompile');
    await options.runGenerationPipeline({
      mode: action === 'generate' ? 'console-generate' : 'console-compile-test',
      skipBackend: action !== 'generate',
    });
    if (status) status.textContent = action === 'generate' ? t('generationDone') : t('compileDone');
    options.onTraceChanged?.();
  } catch (error) {
    if (status) status.textContent = error?.message || String(error);
    options.onTraceChanged?.();
  }
}

async function refreshSdResources(root, getSettings) {
  const status = root.querySelector('#stlp-sd-resource-status');
  try {
    const settings = typeof getSettings === 'function' ? getSettings() : {};
    const t = createTranslator(settings);
    if (status) status.textContent = t('refreshingResources');
    const resources = await listBackendResources({ ...settings, backend: { ...(settings.backend ?? {}), type: 'sdWebui' } }, 'sdWebui');
    const open = !root.classList.contains('stlp-hidden');
    root.innerHTML = renderShell(settings, 'backends', { sdWebui: resources });
    root.classList.toggle('stlp-hidden', !open);
    document.body.classList.toggle('stlp-console-open', open);
    setActiveTab(root, 'backends');
    root.querySelector('#stlp-sd-resource-status').textContent = t('loadedResources', { count: Object.values(resources).reduce((sum, list) => sum + (Array.isArray(list) ? list.length : 0), 0) });
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
  const settings = typeof getSettings === 'function' ? getSettings() : {};
  label.textContent = createTranslator(settings)('wandLabel');
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
