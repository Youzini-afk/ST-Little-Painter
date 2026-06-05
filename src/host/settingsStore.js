import { SETTINGS_KEY } from '../core/constants.js';

let extensionSettingsRef = null;
let saveSettingsDebouncedRef = null;

export const defaultSettings = Object.freeze({
  enabled: true,
  autoGenerate: false,
  mode: 'fast',
  historyCount: 8,
  ui: {
    language: 'auto',
    activeTab: 'dashboard',
    consoleOpen: false,
  },
  temperature: 0.2,
  maxTokens: 1200,
  timeoutMs: 30000,
  retryCount: 1,
  compilerProfileId: 'sd',
  profiles: {
    active: 'anime-default',
    list: {
      'anime-default': {
        label: 'anime-default / SD',
        compilerProfileId: 'sd',
        fixedPositive: ['masterpiece', 'high quality'],
        fixedNegative: ['low quality', 'blurry', 'bad anatomy', 'watermark', 'text'],
      },
    },
  },
  backendProfiles: {
    active: 'sd-local-forge',
    list: {},
  },
  tagApiProfiles: {
    active: 'local-router',
    list: {},
  },
  tagApi: {
    url: '',
    key: '',
    model: '',
    jsonMode: 'auto',
    headers: {},
    body: {},
  },
  backend: {
    enabled: false,
    type: 'sdWebui',
  },
  sdWebui: {
    url: '',
    username: '',
    password: '',
    width: 768,
    height: 1024,
    steps: 28,
    cfgScale: 7,
    model: '',
    vae: '',
    sampler: 'Euler a',
    scheduler: '',
    upscaler: '',
    loras: [],
    seed: -1,
    restoreFaces: false,
    sendNegative: true,
    bypassProxy: false,
    clipSkip: 1,
    hiresFix: {
      enabled: false,
      upscaler: '',
      steps: 0,
      denoisingStrength: 0.45,
      scale: 1.8,
    },
    adetailer: {
      enabled: false,
      model: 'face_yolov8n.pt',
    },
  },
  novelai: {
    url: 'https://image.novelai.net',
    apiKey: '',
    model: 'nai-diffusion-4-5-full',
    sampler: 'Euler Ancestral',
    scheduler: 'karras',
    width: 832,
    height: 1216,
    steps: 28,
    scale: 7,
    seed: -1,
    ucPreset: 0,
    qualityToggle: true,
    sm: false,
    smDyn: false,
    dynamicThresholding: true,
    cfgRescale: '',
    negativePrompt: '',
  },
  comfyui: {
    url: 'http://127.0.0.1:8188',
    workflowJson: '',
    placeholders: {},
    width: 768,
    height: 1024,
    steps: 28,
    cfg: 7,
    seed: -1,
    sampler: 'euler',
    scheduler: 'normal',
    model: '',
    vae: '',
    clip: '',
    pollIntervalMs: 1000,
    maxPolls: 60,
  },
  naturalImage: {
    providerMode: 'openaiImages',
    url: 'https://api.openai.com/v1',
    apiKey: '',
    model: 'gpt-image-1',
    chatModel: 'gpt-4.1',
    size: '',
    width: 1024,
    height: 1024,
    quality: '',
    responseFormat: '',
    instructionPrefix: '',
    instructionSuffix: '',
  },
  debug: {
    enabled: false,
    keepTraces: 20,
  },
  regex: {
    enabled: true,
    enableDefaultRules: true,
    enableOutputCleanup: false,
    rules: [],
  },
  worldbook: {
    enabled: true,
    manualVisualFacts: [],
    manualConstraints: [],
    worldInfoFilterMode: 'default',
    worldInfoFilterCustomKeywords: '',
    worldInfoMaxResolvePasses: 10,
  },
  knowledge: {
    dictionaryHints: true,
    selectedSkills: true,
    planner: true,
  },
  visualVariables: {
    enabled: true,
    maxItemsPerBucket: 12,
  },
  fixedPositive: ['masterpiece', 'high quality'],
  fixedNegative: ['low quality', 'blurry', 'bad anatomy', 'watermark', 'text'],
  tagBudget: {
    positive: 80,
    negative: 40,
  },
  replacements: {},
  blocklist: [],
  allowlist: [],
  _migrations: {
    novelaiDefaults202606: false,
    compilerProfileBackend202606: false,
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

function migrateSettings(settings) {
  const next = settings;
  next._migrations = { ...(next._migrations ?? {}) };
  if (!next._migrations.novelaiDefaults202606) {
    next.novelai = { ...(next.novelai ?? {}) };
    if (next.novelai.model === 'nai-diffusion-3') next.novelai.model = 'nai-diffusion-4-5-full';
    if (next.novelai.sampler === 'k_euler_ancestral') next.novelai.sampler = 'Euler Ancestral';
    if (next.novelai.scheduler === 'native') next.novelai.scheduler = 'karras';
    if (next.novelai.scale === 5) next.novelai.scale = 7;
    if (next.novelai.dynamicThresholding === false) next.novelai.dynamicThresholding = true;
    if (next.novelai.cfgRescale === 0) next.novelai.cfgRescale = '';
    next._migrations.novelaiDefaults202606 = true;
  }
  if (!next._migrations.compilerProfileBackend202606) {
    const backendProfileDefaults = {
      sdWebui: 'sd',
      novelai: 'novelai',
      comfyui: 'comfyui',
      naturalImage: 'naturalImage',
    };
    const backendType = next.backend?.type;
    const expectedProfile = backendProfileDefaults[backendType];
    if (expectedProfile && (!next.compilerProfileId || next.compilerProfileId === 'sd')) {
      next.compilerProfileId = expectedProfile;
    }
    next._migrations.compilerProfileBackend202606 = true;
  }
  return next;
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

  const merged = migrateSettings(mergeDefaults(defaultSettings, extensionSettingsRef[SETTINGS_KEY]));
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
