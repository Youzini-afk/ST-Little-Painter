import {
  extension_settings,
  getContext,
  renderExtensionTemplateAsync,
  saveSettingsDebounced,
} from '../../../extensions.js';

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
import { buildTaggerPrompt, buildTaggerPromptHints } from './src/tagger/buildTaggerPrompt.js';
import { postprocessCompiledPrompt } from './src/postprocess/postprocessCompiledPrompt.js';
import { createWorldbookContextProvider } from './src/worldbook/WorldbookContextProvider.js';

const worldbookContextProvider = createWorldbookContextProvider();

function flattenPositiveBlocks(positiveBlocks = {}) {
  return Object.values(positiveBlocks)
    .filter(Array.isArray)
    .flat()
    .filter(Boolean);
}

function renderCompiledPrompt(compiledPrompt) {
  if (!compiledPrompt) {
    return { positive: '', negative: '' };
  }

  return {
    shouldGenerate: compiledPrompt.shouldGenerate !== false,
    positive: flattenPositiveBlocks(compiledPrompt.positiveBlocks).join(', '),
    negative: Array.isArray(compiledPrompt.negative) ? compiledPrompt.negative.filter(Boolean).join(', ') : '',
    warnings: Array.isArray(compiledPrompt.warnings) ? compiledPrompt.warnings : [],
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

function populateSettingsForm() {
  const settings = getSettings();
  setControlValue(SELECTORS.enabled, settings.enabled);
  setControlValue(SELECTORS.autoGenerate, settings.autoGenerate);
  setControlValue(SELECTORS.mode, settings.mode);
  setControlValue(SELECTORS.tagApiUrl, settings.tagApi.url);
  setControlValue(SELECTORS.tagApiKey, settings.tagApi.key);
  setControlValue(SELECTORS.tagApiModel, settings.tagApi.model);
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
    });

    try {
      const rawContext = collectContext({
        getContext,
        historyCount: settings.historyCount,
        mode: 'manual',
      });
      addTraceStep(trace, 'collect-context', rawContext);

      const sanitizedContext = sanitizeContext(rawContext, { settings });
      addTraceStep(trace, 'sanitize-context', sanitizedContext);

      // 完整 BME 语义通过 adapter 未来接入，不在业务层简化。
      const resolvedWorldbook = await worldbookContextProvider.resolveWorldbookContext({
        context: sanitizedContext,
        settings,
      });
      addTraceStep(trace, 'resolve-worldbook-context', resolvedWorldbook);

      const taggerContext = {
        ...sanitizedContext,
        worldbook: {
          ...(sanitizedContext.worldbook ?? {}),
          ...resolvedWorldbook,
        },
      };

      const promptHints = buildTaggerPromptHints({ context: taggerContext, settings });
      addTraceStep(trace, 'select-skills-and-dictionary-hints', promptHints);

      const messages = buildTaggerPrompt({ context: taggerContext, settings, promptHints });
      addTraceStep(trace, 'build-tagger-prompt', { messages });

      const response = await callJson({ settings, messages });
      addTraceStep(trace, 'tagger-response', response);

      const postprocessed = response.parsed
        ? await postprocessCompiledPrompt(response.parsed, { settings })
        : null;
      addTraceStep(trace, 'postprocess-compiled-prompt', postprocessed);

      const rendered = postprocessed ? renderFinalPrompt(postprocessed) : renderCompiledPrompt(response.parsed);
      addTraceStep(trace, 'render-final-prompt', rendered);

      if (!response.parsed || response.errors?.length) {
        finalizeTrace(trace, TRACE_STATUS.ERROR, {
          message: response.parsed ? 'Tagger returned JSON with extraction warnings.' : 'Tagger did not return valid CompiledPrompt JSON.',
          errors: response.errors,
          rendered,
        });
      } else {
        finalizeTrace(trace, TRACE_STATUS.SUCCESS, {
          message: 'CompiledPrompt generated and postprocessed successfully.',
          rendered,
        });
      }
    } catch (error) {
      addTraceStep(trace, 'pipeline-error', {
        message: error?.message || String(error),
        stack: error?.stack,
      });
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
});
