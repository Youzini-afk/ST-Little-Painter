import {
  extension_settings,
  renderExtensionTemplateAsync,
  saveSettingsDebounced,
} from '../../../extensions.js';

import { EXTENSION_ID, EXTENSION_NAME, SELECTORS, TRACE_STATUS } from './src/core/constants.js';
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
  bindSetting(SELECTORS.debugEnabled, (settings, value) => ({
    ...settings,
    debug: { ...settings.debug, enabled: value },
  }));
}

function bindWorkbenchButtons() {
  document.querySelector(SELECTORS.manualGenerate)?.addEventListener('click', () => {
    const settings = getSettings();
    const trace = createTrace('manual-generate', {
      extension: EXTENSION_NAME,
      mode: settings.mode,
      tagApi: settings.tagApi,
    });

    addTraceStep(trace, 'phase-1-placeholder', {
      message: 'Phase 1 skeleton only. Generation pipeline is not implemented yet.',
      settingsSnapshot: settings,
    });
    finalizeTrace(trace, TRACE_STATUS.SUCCESS, {
      message: 'Placeholder trace finalized. Implement request pipeline in Phase 2.',
    });
    renderTraceOutput();
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
