import {
  extension_settings,
  getContext,
  renderExtensionTemplateAsync,
} from '../../../extensions.js';
import { saveSettingsDebounced } from '../../../../script.js';

import { EXTENSION_ID, SELECTORS } from './src/core/constants.js';
import {
  configureSettingsStore,
  getSettings,
  saveSettings,
  updateSettings,
} from './src/host/settingsStore.js';
import { exportLatestTrace, getLatestTrace } from './src/debug/trace.js';
import { createWorldbookContextProvider } from './src/worldbook/WorldbookContextProvider.js';
import { rerenderAllGenerationRecords } from './src/image/insertImage.js';
import { registerWandMenuButton } from './src/ui/consoleShell.js';
import { runGenerationPipeline } from './src/pipeline/runGenerationPipeline.js';

const worldbookContextProvider = createWorldbookContextProvider();

function setControlValue(selector, value) {
  const element = document.querySelector(selector);
  if (!element) return;
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
  setControlValue(SELECTORS.novelaiUrl, settings.novelai.url);
  setControlValue(SELECTORS.novelaiApiKey, settings.novelai.apiKey);
  setControlValue(SELECTORS.novelaiModel, settings.novelai.model);
  setControlValue(SELECTORS.novelaiSampler, settings.novelai.sampler);
  setControlValue(SELECTORS.novelaiScheduler, settings.novelai.scheduler);
  setControlValue(SELECTORS.novelaiWidth, settings.novelai.width);
  setControlValue(SELECTORS.novelaiHeight, settings.novelai.height);
  setControlValue(SELECTORS.novelaiSteps, settings.novelai.steps);
  setControlValue(SELECTORS.novelaiScale, settings.novelai.scale);
  setControlValue(SELECTORS.novelaiSeed, settings.novelai.seed);
  setControlValue(SELECTORS.novelaiNegativePrompt, settings.novelai.negativePrompt);
  setControlValue(SELECTORS.comfyuiUrl, settings.comfyui.url);
  setControlValue(SELECTORS.comfyuiWorkflowJson, settings.comfyui.workflowJson);
  setControlValue(SELECTORS.comfyuiWidth, settings.comfyui.width);
  setControlValue(SELECTORS.comfyuiHeight, settings.comfyui.height);
  setControlValue(SELECTORS.comfyuiSteps, settings.comfyui.steps);
  setControlValue(SELECTORS.comfyuiCfg, settings.comfyui.cfg);
  setControlValue(SELECTORS.comfyuiSeed, settings.comfyui.seed);
  setControlValue(SELECTORS.comfyuiSampler, settings.comfyui.sampler);
  setControlValue(SELECTORS.comfyuiScheduler, settings.comfyui.scheduler);
  setControlValue(SELECTORS.comfyuiModel, settings.comfyui.model);
  setControlValue(SELECTORS.comfyuiPollIntervalMs, settings.comfyui.pollIntervalMs);
  setControlValue(SELECTORS.comfyuiMaxPolls, settings.comfyui.maxPolls);
  setControlValue(SELECTORS.naturalImageProviderMode, settings.naturalImage.providerMode);
  setControlValue(SELECTORS.naturalImageUrl, settings.naturalImage.url);
  setControlValue(SELECTORS.naturalImageApiKey, settings.naturalImage.apiKey);
  setControlValue(SELECTORS.naturalImageModel, settings.naturalImage.model);
  setControlValue(SELECTORS.naturalImageChatModel, settings.naturalImage.chatModel);
  setControlValue(SELECTORS.naturalImageSize, settings.naturalImage.size);
  setControlValue(SELECTORS.naturalImageWidth, settings.naturalImage.width);
  setControlValue(SELECTORS.naturalImageHeight, settings.naturalImage.height);
  setControlValue(SELECTORS.naturalImageQuality, settings.naturalImage.quality);
  setControlValue(SELECTORS.naturalImageResponseFormat, settings.naturalImage.responseFormat);
  setControlValue(SELECTORS.naturalImageInstructionPrefix, settings.naturalImage.instructionPrefix);
  setControlValue(SELECTORS.naturalImageInstructionSuffix, settings.naturalImage.instructionSuffix);
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
  bindSetting(SELECTORS.novelaiUrl, (settings, value) => ({ ...settings, novelai: { ...settings.novelai, url: value } }));
  bindSetting(SELECTORS.novelaiApiKey, (settings, value) => ({ ...settings, novelai: { ...settings.novelai, apiKey: value } }));
  bindSetting(SELECTORS.novelaiModel, (settings, value) => ({ ...settings, novelai: { ...settings.novelai, model: value } }));
  bindSetting(SELECTORS.novelaiSampler, (settings, value) => ({ ...settings, novelai: { ...settings.novelai, sampler: value } }));
  bindSetting(SELECTORS.novelaiScheduler, (settings, value) => ({ ...settings, novelai: { ...settings.novelai, scheduler: value } }));
  bindSetting(SELECTORS.novelaiWidth, (settings, value) => ({ ...settings, novelai: { ...settings.novelai, width: numberSetting(value, 832) } }));
  bindSetting(SELECTORS.novelaiHeight, (settings, value) => ({ ...settings, novelai: { ...settings.novelai, height: numberSetting(value, 1216) } }));
  bindSetting(SELECTORS.novelaiSteps, (settings, value) => ({ ...settings, novelai: { ...settings.novelai, steps: numberSetting(value, 28) } }));
  bindSetting(SELECTORS.novelaiScale, (settings, value) => ({ ...settings, novelai: { ...settings.novelai, scale: numberSetting(value, 5) } }));
  bindSetting(SELECTORS.novelaiSeed, (settings, value) => ({ ...settings, novelai: { ...settings.novelai, seed: numberSetting(value, -1) } }));
  bindSetting(SELECTORS.novelaiNegativePrompt, (settings, value) => ({ ...settings, novelai: { ...settings.novelai, negativePrompt: value } }));
  bindSetting(SELECTORS.comfyuiUrl, (settings, value) => ({ ...settings, comfyui: { ...settings.comfyui, url: value } }));
  bindSetting(SELECTORS.comfyuiWorkflowJson, (settings, value) => ({ ...settings, comfyui: { ...settings.comfyui, workflowJson: value } }));
  bindSetting(SELECTORS.comfyuiWidth, (settings, value) => ({ ...settings, comfyui: { ...settings.comfyui, width: numberSetting(value, 768) } }));
  bindSetting(SELECTORS.comfyuiHeight, (settings, value) => ({ ...settings, comfyui: { ...settings.comfyui, height: numberSetting(value, 1024) } }));
  bindSetting(SELECTORS.comfyuiSteps, (settings, value) => ({ ...settings, comfyui: { ...settings.comfyui, steps: numberSetting(value, 28) } }));
  bindSetting(SELECTORS.comfyuiCfg, (settings, value) => ({ ...settings, comfyui: { ...settings.comfyui, cfg: numberSetting(value, 7) } }));
  bindSetting(SELECTORS.comfyuiSeed, (settings, value) => ({ ...settings, comfyui: { ...settings.comfyui, seed: numberSetting(value, -1) } }));
  bindSetting(SELECTORS.comfyuiSampler, (settings, value) => ({ ...settings, comfyui: { ...settings.comfyui, sampler: value } }));
  bindSetting(SELECTORS.comfyuiScheduler, (settings, value) => ({ ...settings, comfyui: { ...settings.comfyui, scheduler: value } }));
  bindSetting(SELECTORS.comfyuiModel, (settings, value) => ({ ...settings, comfyui: { ...settings.comfyui, model: value } }));
  bindSetting(SELECTORS.comfyuiPollIntervalMs, (settings, value) => ({ ...settings, comfyui: { ...settings.comfyui, pollIntervalMs: numberSetting(value, 1000) } }));
  bindSetting(SELECTORS.comfyuiMaxPolls, (settings, value) => ({ ...settings, comfyui: { ...settings.comfyui, maxPolls: numberSetting(value, 60) } }));
  bindSetting(SELECTORS.naturalImageProviderMode, (settings, value) => ({ ...settings, naturalImage: { ...settings.naturalImage, providerMode: value } }));
  bindSetting(SELECTORS.naturalImageUrl, (settings, value) => ({ ...settings, naturalImage: { ...settings.naturalImage, url: value } }));
  bindSetting(SELECTORS.naturalImageApiKey, (settings, value) => ({ ...settings, naturalImage: { ...settings.naturalImage, apiKey: value } }));
  bindSetting(SELECTORS.naturalImageModel, (settings, value) => ({ ...settings, naturalImage: { ...settings.naturalImage, model: value } }));
  bindSetting(SELECTORS.naturalImageChatModel, (settings, value) => ({ ...settings, naturalImage: { ...settings.naturalImage, chatModel: value } }));
  bindSetting(SELECTORS.naturalImageSize, (settings, value) => ({ ...settings, naturalImage: { ...settings.naturalImage, size: value } }));
  bindSetting(SELECTORS.naturalImageWidth, (settings, value) => ({ ...settings, naturalImage: { ...settings.naturalImage, width: numberSetting(value, 1024) } }));
  bindSetting(SELECTORS.naturalImageHeight, (settings, value) => ({ ...settings, naturalImage: { ...settings.naturalImage, height: numberSetting(value, 1024) } }));
  bindSetting(SELECTORS.naturalImageQuality, (settings, value) => ({ ...settings, naturalImage: { ...settings.naturalImage, quality: value } }));
  bindSetting(SELECTORS.naturalImageResponseFormat, (settings, value) => ({ ...settings, naturalImage: { ...settings.naturalImage, responseFormat: value } }));
  bindSetting(SELECTORS.naturalImageInstructionPrefix, (settings, value) => ({ ...settings, naturalImage: { ...settings.naturalImage, instructionPrefix: value } }));
  bindSetting(SELECTORS.naturalImageInstructionSuffix, (settings, value) => ({ ...settings, naturalImage: { ...settings.naturalImage, instructionSuffix: value } }));
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
    try {
      await runGenerationPipeline({
        getContext,
        getSettings,
        worldbookContextProvider,
        mode: 'manual',
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
  registerWandMenuButton({ getSettings });
  registerImageRerenderBridge();
});
