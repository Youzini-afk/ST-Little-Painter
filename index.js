import {
  extension_settings,
  getContext,
  renderExtensionTemplateAsync,
} from '../../../extensions.js';
import { saveSettingsDebounced } from '../../../../script.js';

import { EXTENSION_ID, EXTENSION_NAME, SELECTORS, TRACE_STATUS } from './src/core/constants.js';
import { collectContext } from './src/context/collectContext.js';
import { sanitizeContext } from './src/context/sanitizeContext.js';
import {
  configureSettingsStore,
  getSettings,
  saveSettings,
  updateSettings,
} from './src/host/settingsStore.js';
import {
  addTraceStep,
  createTrace,
  exportLatestTrace,
  finalizeTrace,
  getLatestTrace,
} from './src/debug/trace.js';
import { callJson } from './src/llm/callJson.js';
import { buildPlannerPrompt } from './src/planner/buildPlannerPrompt.js';
import { callPlanner } from './src/planner/callPlanner.js';
import { createEmptyScenePlan } from './src/planner/scenePlanSchema.js';
import { buildTaggerPrompt, buildTaggerPromptHints } from './src/tagger/buildTaggerPrompt.js';
import { isCompiledPromptUsable, normalizeCompiledPrompt } from './src/tagger/compiledPromptSchema.js';
import { postprocessCompiledPrompt } from './src/postprocess/postprocessCompiledPrompt.js';
import { createWorldbookContextProvider } from './src/worldbook/WorldbookContextProvider.js';
import { compile as compileBackendRequest, generate as generateBackendImage } from './src/backend/backendRegistry.js';
import { saveGenerationRecord } from './src/image/imageStore.js';
import { insertToChatShell, rerenderAllGenerationRecords } from './src/image/insertImage.js';

const worldbookContextProvider = createWorldbookContextProvider();

function flattenPositiveBlocks(positiveBlocks = {}) {
  return Object.values(positiveBlocks)
    .filter(Array.isArray)
    .flat()
    .filter(Boolean);
}

function renderCompiledPrompt(compiledPrompt) {
  if (!compiledPrompt) {
    return { positive: '', negative: '', insertionPlan: undefined };
  }

  return {
    shouldGenerate: compiledPrompt.shouldGenerate !== false,
    positive: flattenPositiveBlocks(compiledPrompt.positiveBlocks).join(', '),
    negative: Array.isArray(compiledPrompt.negative) ? compiledPrompt.negative.filter(Boolean).join(', ') : '',
    warnings: Array.isArray(compiledPrompt.warnings) ? compiledPrompt.warnings : [],
    insertionPlan: compiledPrompt.insertionPlan,
  };
}

function renderFinalPrompt(finalPrompt) {
  if (!finalPrompt) {
    return { shouldGenerate: false, positive: '', negative: '', warnings: [] };
  }

  return {
    shouldGenerate: finalPrompt.shouldGenerate !== false,
    positive: finalPrompt.positive ?? '',
    negative: finalPrompt.negative ?? '',
    warnings: Array.isArray(finalPrompt.warnings) ? finalPrompt.warnings : [],
    insertionPlan: finalPrompt.insertionPlan,
  };
}

function setControlValue(selector, value) {
  const element = document.querySelector(selector);
  if (!element) {
    return;
  }

  if (element.type === 'checkbox') {
    element.checked = Boolean(value);
    return;
  }

  element.value = value ?? '';
}

function numberSetting(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function tracePayload(settings, full, summary) {
  return settings?.debug?.enabled ? full : summary;
}

function summarizeValue(value) {
  if (value === null || value === undefined) {
    return value;
  }
  if (typeof value === 'string') {
    return { type: 'string', length: value.length };
  }
  if (Array.isArray(value)) {
    return { type: 'array', count: value.length };
  }
  if (typeof value === 'object') {
    return { type: 'object', keys: Object.keys(value), keyCount: Object.keys(value).length };
  }
  return { type: typeof value };
}

function summarizeContext(context = {}) {
  return Object.fromEntries(
    Object.entries(context ?? {}).map(([key, value]) => [key, summarizeValue(value)]),
  );
}

function summarizeMessages(messages = []) {
  return {
    count: Array.isArray(messages) ? messages.length : 0,
    messages: (Array.isArray(messages) ? messages : []).map((message) => ({
      role: message?.role,
      contentLength: typeof message?.content === 'string' ? message.content.length : 0,
    })),
  };
}

function sanitizeWorldbookForPromptMerge(worldbook = {}) {
  const source = worldbook?.resolvedPromptContext && typeof worldbook.resolvedPromptContext === 'object'
    ? worldbook.resolvedPromptContext
    : worldbook;
  return {
    beforeText: String(source?.beforeText || ''),
    afterText: String(source?.afterText || ''),
    additionalMessages: Array.isArray(source?.additionalMessages) ? source.additionalMessages : [],
    activatedEntryNames: Array.isArray(source?.activatedEntryNames) ? source.activatedEntryNames : [],
    activatedEntries: Array.isArray(source?.activatedEntries) ? source.activatedEntries : [],
  };
}

function summarizeCompiledPrompt(compiledPrompt = {}) {
  const positiveBlocks = compiledPrompt?.positiveBlocks && typeof compiledPrompt.positiveBlocks === 'object'
    ? compiledPrompt.positiveBlocks
    : {};
  return {
    shouldGenerate: compiledPrompt?.shouldGenerate !== false,
    positiveBlockCount: Object.keys(positiveBlocks).length,
    positiveCount: flattenPositiveBlocks(positiveBlocks).length,
    inlinePositiveCount: Array.isArray(compiledPrompt?.positive) ? compiledPrompt.positive.length : 0,
    negativeCount: Array.isArray(compiledPrompt?.negative) ? compiledPrompt.negative.length : 0,
    warningCount: Array.isArray(compiledPrompt?.warnings) ? compiledPrompt.warnings.length : 0,
  };
}

function summarizeCallJsonResponse(response = {}) {
  return {
    rawLength: typeof response.raw === 'string' ? response.raw.length : 0,
    hasParsed: Boolean(response.parsed),
    parsed: response.parsed ? summarizeCompiledPrompt(response.parsed) : null,
    errorCount: Array.isArray(response.errors) ? response.errors.length : 0,
    errors: Array.isArray(response.errors) ? response.errors : [],
  };
}

function summarizeRenderedPrompt(rendered = {}) {
  return {
    shouldGenerate: rendered?.shouldGenerate !== false,
    positiveLength: typeof rendered?.positive === 'string' ? rendered.positive.length : 0,
    negativeLength: typeof rendered?.negative === 'string' ? rendered.negative.length : 0,
    warningCount: Array.isArray(rendered?.warnings) ? rendered.warnings.length : 0,
  };
}

function summarizeBackendRequest(request = {}) {
  return {
    type: request.type,
    endpoint: request.endpoint,
    payload: summarizeValue(request.payload),
    promptLength: typeof request.payload?.prompt === 'string' ? request.payload.prompt.length : 0,
    negativePromptLength: typeof request.payload?.negative_prompt === 'string' ? request.payload.negative_prompt.length : 0,
    width: request.payload?.width,
    height: request.payload?.height,
    steps: request.payload?.steps,
  };
}

function summarizeGenerationRecord(record = {}) {
  if (!record) {
    return null;
  }

  return {
    id: record.id,
    createdAt: record.createdAt,
    backendType: record.backendType,
    prompt: summarizeRenderedPrompt(record.prompt),
    request: summarizeBackendRequest(record.request),
    image: record.image?.summary,
    insertionPlan: record.insertionPlan,
    chat: record.chat,
  };
}

function isScenePlanUsable(scenePlan = {}) {
  if (!scenePlan || typeof scenePlan !== 'object') {
    return false;
  }

  return Object.entries(scenePlan).some(([key, value]) => {
    if (key === 'warnings') {
      return false;
    }
    return Array.isArray(value) ? value.length > 0 : Boolean(String(value ?? '').trim());
  });
}

function shouldUsePlanner(settings = {}) {
  return settings.mode === 'smart' || settings.mode === 'expert';
}

async function runBackendGeneration({ rendered, settings, trace, context }) {
  if (!settings.backend?.enabled) {
    addTraceStep(trace, 'backend-skipped', { reason: 'backend disabled' });
    return null;
  }

  if (rendered?.shouldGenerate === false) {
    addTraceStep(trace, 'backend-skipped', { reason: 'final prompt marked shouldGenerate=false' });
    return null;
  }

  const request = compileBackendRequest(rendered, settings);
  addTraceStep(trace, 'backend-compile', tracePayload(settings, request, summarizeBackendRequest(request)));

  const result = await generateBackendImage(request, settings);
  addTraceStep(trace, 'backend-generate', {
    backendType: result.backendType,
    mimeType: result.mimeType,
    image: {
      dataUrlLength: result.dataUrl ? result.dataUrl.length : 0,
      byteLength: result.base64 ? Math.floor(String(result.base64).length * 0.75) : 0,
    },
  });

  const record = saveGenerationRecord({
    backendType: request.type,
    finalPrompt: rendered,
    compiledRequest: request,
    result,
    context,
  });
  addTraceStep(trace, 'image-store', tracePayload(settings, record, summarizeGenerationRecord(record)));

  const insertionTrace = insertToChatShell(record);
  addTraceStep(trace, 'image-preview-insert', insertionTrace);
  return record;
}

function registerImageRerenderBridge() {
  if (typeof document === 'undefined') {
    return;
  }

  let scheduled = false;
  const containsOnlyPluginMutations = (mutations = []) => mutations.length > 0 && mutations.every((mutation) => {
    const nodes = [...Array.from(mutation.addedNodes ?? []), ...Array.from(mutation.removedNodes ?? [])];
    return nodes.length > 0 && nodes.every((node) => {
      if (node.nodeType !== 1) return true;
      return node.classList?.contains?.('stlp-chat-image-preview')
        || node.classList?.contains?.('stlp-generated-image')
        || Boolean(node.querySelector?.('.stlp-chat-image-preview, .stlp-generated-image'));
    });
  });
  const rerenderSoon = () => {
    if (scheduled) return;
    scheduled = true;
    setTimeout(() => {
      scheduled = false;
      rerenderAllGenerationRecords();
    }, 150);
  };

  document.addEventListener?.('stlp:rerender-images', rerenderSoon);
  const chat = document.querySelector('#chat') || document.querySelector('.chat');
  if (chat && typeof MutationObserver !== 'undefined') {
    const observer = new MutationObserver((mutations) => {
      if (containsOnlyPluginMutations(mutations)) {
        return;
      }
      rerenderSoon();
    });
    observer.observe(chat, { childList: true, subtree: true });
  }
}

function populateSettingsForm() {
  const settings = getSettings();
  setControlValue(SELECTORS.enabled, settings.enabled);
  setControlValue(SELECTORS.autoGenerate, settings.autoGenerate);
  setControlValue(SELECTORS.mode, settings.mode);
  setControlValue(SELECTORS.tagApiUrl, settings.tagApi.url);
  setControlValue(SELECTORS.tagApiKey, settings.tagApi.key);
  setControlValue(SELECTORS.tagApiModel, settings.tagApi.model);
  setControlValue(SELECTORS.backendEnabled, settings.backend.enabled);
  setControlValue(SELECTORS.backendType, settings.backend.type);
  setControlValue(SELECTORS.sdWebuiUrl, settings.sdWebui.url);
  setControlValue(SELECTORS.sdWebuiUsername, settings.sdWebui.username);
  setControlValue(SELECTORS.sdWebuiPassword, settings.sdWebui.password);
  setControlValue(SELECTORS.sdWebuiWidth, settings.sdWebui.width);
  setControlValue(SELECTORS.sdWebuiHeight, settings.sdWebui.height);
  setControlValue(SELECTORS.sdWebuiSteps, settings.sdWebui.steps);
  setControlValue(SELECTORS.sdWebuiCfgScale, settings.sdWebui.cfgScale);
  setControlValue(SELECTORS.sdWebuiSampler, settings.sdWebui.sampler);
  setControlValue(SELECTORS.sdWebuiSeed, settings.sdWebui.seed);
  setControlValue(SELECTORS.sdWebuiRestoreFaces, settings.sdWebui.restoreFaces);
  setControlValue(SELECTORS.sdWebuiSendNegative, settings.sdWebui.sendNegative);
  setControlValue(SELECTORS.historyCount, settings.historyCount);
  setControlValue(SELECTORS.temperature, settings.temperature);
  setControlValue(SELECTORS.maxTokens, settings.maxTokens);
  setControlValue(SELECTORS.timeoutMs, settings.timeoutMs);
  setControlValue(SELECTORS.retryCount, settings.retryCount);
  setControlValue(SELECTORS.debugEnabled, settings.debug.enabled);
  renderTraceOutput();
}

function bindSetting(selector, updater) {
  const element = document.querySelector(selector);
  if (!element) {
    return;
  }

  element.addEventListener('change', () => {
    const rawValue = element.type === 'checkbox' ? element.checked : element.value;
    updateSettings((settings) => updater(settings, rawValue));
    saveSettings();
  });
}

function bindSettingsForm() {
  bindSetting(SELECTORS.enabled, (settings, value) => ({ ...settings, enabled: value }));
  bindSetting(SELECTORS.autoGenerate, (settings, value) => ({ ...settings, autoGenerate: value }));
  bindSetting(SELECTORS.mode, (settings, value) => ({ ...settings, mode: value }));
  bindSetting(SELECTORS.tagApiUrl, (settings, value) => ({
    ...settings,
    tagApi: { ...settings.tagApi, url: value },
  }));
  bindSetting(SELECTORS.tagApiKey, (settings, value) => ({
    ...settings,
    tagApi: { ...settings.tagApi, key: value },
  }));
  bindSetting(SELECTORS.tagApiModel, (settings, value) => ({
    ...settings,
    tagApi: { ...settings.tagApi, model: value },
  }));
  bindSetting(SELECTORS.backendEnabled, (settings, value) => ({
    ...settings,
    backend: { ...settings.backend, enabled: value },
  }));
  bindSetting(SELECTORS.backendType, (settings, value) => ({
    ...settings,
    backend: { ...settings.backend, type: value },
  }));
  bindSetting(SELECTORS.sdWebuiUrl, (settings, value) => ({
    ...settings,
    sdWebui: { ...settings.sdWebui, url: value },
  }));
  bindSetting(SELECTORS.sdWebuiUsername, (settings, value) => ({
    ...settings,
    sdWebui: { ...settings.sdWebui, username: value },
  }));
  bindSetting(SELECTORS.sdWebuiPassword, (settings, value) => ({
    ...settings,
    sdWebui: { ...settings.sdWebui, password: value },
  }));
  bindSetting(SELECTORS.sdWebuiWidth, (settings, value) => ({
    ...settings,
    sdWebui: { ...settings.sdWebui, width: numberSetting(value, 768) },
  }));
  bindSetting(SELECTORS.sdWebuiHeight, (settings, value) => ({
    ...settings,
    sdWebui: { ...settings.sdWebui, height: numberSetting(value, 1024) },
  }));
  bindSetting(SELECTORS.sdWebuiSteps, (settings, value) => ({
    ...settings,
    sdWebui: { ...settings.sdWebui, steps: numberSetting(value, 28) },
  }));
  bindSetting(SELECTORS.sdWebuiCfgScale, (settings, value) => ({
    ...settings,
    sdWebui: { ...settings.sdWebui, cfgScale: numberSetting(value, 7) },
  }));
  bindSetting(SELECTORS.sdWebuiSampler, (settings, value) => ({
    ...settings,
    sdWebui: { ...settings.sdWebui, sampler: value || 'Euler a' },
  }));
  bindSetting(SELECTORS.sdWebuiSeed, (settings, value) => ({
    ...settings,
    sdWebui: { ...settings.sdWebui, seed: numberSetting(value, -1) },
  }));
  bindSetting(SELECTORS.sdWebuiRestoreFaces, (settings, value) => ({
    ...settings,
    sdWebui: { ...settings.sdWebui, restoreFaces: value },
  }));
  bindSetting(SELECTORS.sdWebuiSendNegative, (settings, value) => ({
    ...settings,
    sdWebui: { ...settings.sdWebui, sendNegative: value },
  }));
  bindSetting(SELECTORS.historyCount, (settings, value) => ({ ...settings, historyCount: Number(value) || 8 }));
  bindSetting(SELECTORS.temperature, (settings, value) => ({ ...settings, temperature: Number(value) || 0 }));
  bindSetting(SELECTORS.maxTokens, (settings, value) => ({ ...settings, maxTokens: Number(value) || 1200 }));
  bindSetting(SELECTORS.timeoutMs, (settings, value) => ({ ...settings, timeoutMs: Number(value) || 30000 }));
  bindSetting(SELECTORS.retryCount, (settings, value) => ({ ...settings, retryCount: Number(value) || 0 }));
  bindSetting(SELECTORS.debugEnabled, (settings, value) => ({
    ...settings,
    debug: { ...settings.debug, enabled: value },
  }));
}

function bindWorkbenchButtons() {
  document.querySelector(SELECTORS.manualGenerate)?.addEventListener('click', async () => {
    const settings = getSettings();
    const trace = createTrace('manual-generate', {
      extension: EXTENSION_NAME,
      mode: settings.mode,
      tagApi: settings.tagApi,
      backend: settings.backend,
      sdWebui: {
        url: settings.sdWebui.url,
        hasUsername: Boolean(settings.sdWebui.username),
        hasPassword: Boolean(settings.sdWebui.password),
        width: settings.sdWebui.width,
        height: settings.sdWebui.height,
        steps: settings.sdWebui.steps,
        cfgScale: settings.sdWebui.cfgScale,
        sampler: settings.sdWebui.sampler,
        seed: settings.sdWebui.seed,
        restoreFaces: settings.sdWebui.restoreFaces,
        sendNegative: settings.sdWebui.sendNegative,
      },
    });

    try {
      const rawContext = collectContext({
        getContext,
        historyCount: settings.historyCount,
        mode: 'manual',
      });
      addTraceStep(trace, 'collect-context', tracePayload(settings, rawContext, summarizeContext(rawContext)));

      const sanitizedContext = sanitizeContext(rawContext, { settings });
      addTraceStep(trace, 'sanitize-context', tracePayload(settings, sanitizedContext, summarizeContext(sanitizedContext)));

      // 完整 BME 语义通过 adapter 未来接入，不在业务层简化。
      const resolvedWorldbook = await worldbookContextProvider.resolveWorldbookContext({
        context: sanitizedContext,
        settings,
      });
      addTraceStep(trace, 'resolve-worldbook-context', tracePayload(settings, resolvedWorldbook, summarizeContext(resolvedWorldbook)));

      let taggerContext = {
        ...sanitizedContext,
        worldbook: sanitizeWorldbookForPromptMerge(resolvedWorldbook),
      };

      if (shouldUsePlanner(settings)) {
        const plannerMessages = buildPlannerPrompt({ context: taggerContext, settings });
        addTraceStep(trace, 'build-planner-prompt', tracePayload(
          settings,
          { messages: plannerMessages },
          summarizeMessages(plannerMessages),
        ));

        const plannerResponse = await callPlanner({ settings, messages: plannerMessages });
        addTraceStep(trace, 'planner-response', tracePayload(
          settings,
          plannerResponse,
          summarizeCallJsonResponse(plannerResponse),
        ));

        const plannerFailed = Boolean(plannerResponse.errors?.length) || !isScenePlanUsable(plannerResponse.parsed);
        if (plannerFailed) {
          addTraceStep(trace, 'planner-fallback', {
            reason: plannerResponse.parsed ? 'planner returned warnings or empty ScenePlan' : 'planner did not return usable ScenePlan',
            errorCount: Array.isArray(plannerResponse.errors) ? plannerResponse.errors.length : 0,
            errors: Array.isArray(plannerResponse.errors) ? plannerResponse.errors : [],
          });
          taggerContext = { ...taggerContext, scenePlan: createEmptyScenePlan() };
        } else {
          taggerContext = {
            ...taggerContext,
            scenePlan: plannerResponse.parsed,
          };
        }
      }

      const promptHints = await buildTaggerPromptHints({ context: taggerContext, settings });
      addTraceStep(trace, 'select-skills-and-dictionary-hints', tracePayload(
        settings,
        promptHints,
        {
          selectedSkillCount: promptHints.skillSelection?.skills?.length ?? 0,
          dictionaryHintCount: promptHints.dictionaryHints?.length ?? 0,
        },
      ));

      const messages = buildTaggerPrompt({ context: taggerContext, settings, promptHints });
      addTraceStep(trace, 'build-tagger-prompt', tracePayload(
        settings,
        { messages },
        summarizeMessages(messages),
      ));

      const response = await callJson({ settings, messages });
      addTraceStep(trace, 'tagger-response', tracePayload(
        settings,
        response,
        summarizeCallJsonResponse(response),
      ));

      const normalizedCompiledPrompt = normalizeCompiledPrompt(response.parsed, { context: taggerContext });
      const compiledPromptUsable = isCompiledPromptUsable(normalizedCompiledPrompt);
      addTraceStep(trace, 'normalize-compiled-prompt', tracePayload(
        settings,
        normalizedCompiledPrompt,
        {
          usable: compiledPromptUsable,
          parsedAvailable: Boolean(response.parsed),
          normalized: normalizedCompiledPrompt ? summarizeCompiledPrompt(normalizedCompiledPrompt) : null,
        },
      ));

      const postprocessed = compiledPromptUsable
        ? await postprocessCompiledPrompt(normalizedCompiledPrompt, { settings })
        : null;
      addTraceStep(trace, 'postprocess-compiled-prompt', tracePayload(
        settings,
        postprocessed,
        postprocessed ? summarizeRenderedPrompt(postprocessed) : null,
      ));

      const rendered = postprocessed ? renderFinalPrompt(postprocessed) : renderCompiledPrompt(normalizedCompiledPrompt);
      addTraceStep(trace, 'render-final-prompt', tracePayload(settings, rendered, summarizeRenderedPrompt(rendered)));

      const generationRecord = compiledPromptUsable
        ? await runBackendGeneration({ rendered, settings, trace, context: taggerContext })
        : null;
      if (!compiledPromptUsable) {
        addTraceStep(trace, 'backend-skipped', { reason: 'tagger parsed prompt unavailable or invalid' });
      }

      if (!compiledPromptUsable || response.errors?.length) {
        finalizeTrace(trace, TRACE_STATUS.ERROR, {
          message: compiledPromptUsable ? 'Tagger returned JSON with extraction warnings.' : 'Tagger did not return usable CompiledPrompt JSON.',
          errors: response.errors,
          rendered: tracePayload(settings, rendered, summarizeRenderedPrompt(rendered)),
          generation: summarizeGenerationRecord(generationRecord),
        });
      } else {
        finalizeTrace(trace, TRACE_STATUS.SUCCESS, {
          message: generationRecord
            ? 'CompiledPrompt generated, postprocessed, and image generated successfully.'
            : 'CompiledPrompt generated and postprocessed successfully.',
          rendered: tracePayload(settings, rendered, summarizeRenderedPrompt(rendered)),
          generation: summarizeGenerationRecord(generationRecord),
        });
      }
    } catch (error) {
      addTraceStep(trace, 'pipeline-error', tracePayload(
        settings,
        {
          message: error?.message || String(error),
          stack: error?.stack,
        },
        { message: error?.message || String(error) },
      ));
      finalizeTrace(trace, TRACE_STATUS.ERROR, {
        message: error?.message || String(error),
      });
    } finally {
      renderTraceOutput();
    }
  });

  document.querySelector(SELECTORS.exportTrace)?.addEventListener('click', () => {
    renderTraceOutput(true);
  });
}

function renderTraceOutput(forceExport = false) {
  const output = document.querySelector(SELECTORS.traceOutput);
  if (!output) {
    return;
  }

  const exported = exportLatestTrace();
  if (exported) {
    output.value = exported;
    return;
  }

  const latest = getLatestTrace();
  output.value = latest || forceExport
    ? JSON.stringify(latest, null, 2)
    : 'No trace yet. Click “Manual Generate” to create a Phase 1 placeholder trace.';
}

async function renderSettings() {
  const html = await renderExtensionTemplateAsync(EXTENSION_ID, 'settings');
  document.querySelector('#extensions_settings')?.insertAdjacentHTML('beforeend', html);
}

jQuery(async () => {
  configureSettingsStore({ extension_settings, saveSettingsDebounced });
  await renderSettings();
  populateSettingsForm();
  bindSettingsForm();
  bindWorkbenchButtons();
  registerImageRerenderBridge();
});
