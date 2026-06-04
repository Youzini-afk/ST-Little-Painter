import { SETTINGS_KEY } from '../core/constants.js';

let extensionSettingsRef = null;
let saveSettingsDebouncedRef = null;

export const defaultSettings = Object.freeze({
  enabled: true,
  autoGenerate: false,
  mode: 'fast',
  historyCount: 8,
  temperature: 0.2,
  maxTokens: 1200,
  timeoutMs: 30000,
  retryCount: 1,
  tagApi: {
    url: '',
    key: '',
    model: '',
  },
  debug: {
    enabled: false,
    keepTraces: 20,
  },
});

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function mergeDefaults(defaultValue, storedValue) {
  if (!isPlainObject(defaultValue)) {
    return storedValue === undefined ? defaultValue : storedValue;
  }

  const merged = { ...defaultValue };
  const source = isPlainObject(storedValue) ? storedValue : {};

  for (const [key, value] of Object.entries(source)) {
    merged[key] = mergeDefaults(defaultValue[key], value);
  }

  return merged;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function configureSettingsStore({ extension_settings, saveSettingsDebounced } = {}) {
  extensionSettingsRef = extension_settings ?? extensionSettingsRef;
  saveSettingsDebouncedRef = saveSettingsDebounced ?? saveSettingsDebouncedRef;
  ensureSettings();
}

function ensureSettings() {
  if (!extensionSettingsRef) {
    return clone(defaultSettings);
  }

  const merged = mergeDefaults(defaultSettings, extensionSettingsRef[SETTINGS_KEY]);
  extensionSettingsRef[SETTINGS_KEY] = merged;
  return merged;
}

export function getSettings() {
  return clone(ensureSettings());
}

export function updateSettings(patchOrUpdater) {
  const current = ensureSettings();
  const patch = typeof patchOrUpdater === 'function'
    ? patchOrUpdater(clone(current))
    : patchOrUpdater;

  const next = mergeDefaults(current, patch ?? {});

  if (extensionSettingsRef) {
    extensionSettingsRef[SETTINGS_KEY] = next;
  }

  return clone(next);
}

export function saveSettings() {
  ensureSettings();

  if (typeof saveSettingsDebouncedRef === 'function') {
    saveSettingsDebouncedRef();
  }
}
