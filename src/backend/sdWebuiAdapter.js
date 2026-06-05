import {
  fetchWithTimeout,
  getPromptText,
  normalizeBaseUrl,
  numberOr,
  parseJsonSafely,
  readableError,
  stripDataUrlPrefix,
} from './backendUtils.js';
import { getResourceCache, setResourceCache } from './resourceCache.js';

const DEFAULTS = Object.freeze({
  width: 768,
  height: 1024,
  steps: 28,
  cfgScale: 7,
  model: '',
  vae: '',
  sampler: 'Euler a',
  scheduler: '',
  upscaler: '',
  seed: -1,
  restoreFaces: false,
  sendNegative: true,
  clipSkip: 1,
});

const RESOURCE_ENDPOINTS = Object.freeze([
  ['models', 'sd-models'],
  ['samplers', 'samplers'],
  ['vaes', 'sd-vae'],
  ['schedulers', 'schedulers'],
  ['upscalers', 'upscalers'],
  ['loras', 'loras'],
]);

function encodeBasicAuth(username, password) {
  const credentials = `${username ?? ''}:${password ?? ''}`;
  if (typeof btoa === 'function') {
    return btoa(credentials);
  }

  if (typeof Buffer !== 'undefined') {
    return Buffer.from(credentials, 'utf8').toString('base64');
  }

  throw new Error('Basic auth encoding is not available in this runtime.');
}

function createHeaders(sdWebui = {}, extra = {}) {
  const headers = { ...extra };
  if (sdWebui.username || sdWebui.password) {
    headers.Authorization = `Basic ${encodeBasicAuth(sdWebui.username, sdWebui.password)}`;
  }
  return headers;
}

function basename(value) {
  const text = String(value ?? '').trim();
  if (!text) return '';
  return text.split(/[\\/]/).filter(Boolean).at(-1) || text;
}

function firstNamedValue(item = {}) {
  if (typeof item === 'string') return item;
  return item.title
    || item.name
    || item.model_name
    || item.label
    || item.alias
    || basename(item.filename || item.path);
}

function normalizeResourceList(items = [], key = '') {
  const list = Array.isArray(items) ? items : [];
  return [...new Set(list.map((item) => {
    if (key === 'vaes') {
      return item?.model_name || basename(item?.filename || item?.path) || firstNamedValue(item);
    }
    if (key === 'loras') {
      return item?.name || item?.alias || basename(item?.filename || item?.path) || firstNamedValue(item);
    }
    return firstNamedValue(item);
  }).map((value) => String(value ?? '').trim()).filter(Boolean))];
}

function applyHiresFix(payload, hiresFix = {}) {
  if (!hiresFix?.enabled) return;
  payload.enable_hr = true;
  if (hiresFix.upscaler) payload.hr_upscaler = String(hiresFix.upscaler);
  payload.hr_second_pass_steps = numberOr(hiresFix.steps, 0);
  payload.denoising_strength = numberOr(hiresFix.denoisingStrength, 0.45);
  payload.hr_scale = numberOr(hiresFix.scale, 1.8);
}

function applyAdetailer(payload, adetailer = {}) {
  if (!adetailer?.enabled) return;
  payload.alwayson_scripts = {
    ...(payload.alwayson_scripts ?? {}),
    ADetailer: {
      args: [{ ad_model: String(adetailer.model || 'face_yolov8n.pt') }],
    },
  };
}

export function compile(finalPrompt = {}, settings = {}) {
  const sdWebui = { ...DEFAULTS, ...(settings.sdWebui ?? {}) };
  const baseUrl = normalizeBaseUrl(sdWebui.url);

  if (!baseUrl) {
    throw new Error('SD WebUI URL is not configured.');
  }

  const payload = {
    prompt: getPromptText(finalPrompt, 'positive'),
    negative_prompt: sdWebui.sendNegative === false ? '' : getPromptText(finalPrompt, 'negative'),
    width: numberOr(sdWebui.width, DEFAULTS.width),
    height: numberOr(sdWebui.height, DEFAULTS.height),
    steps: numberOr(sdWebui.steps, DEFAULTS.steps),
    cfg_scale: numberOr(sdWebui.cfgScale, DEFAULTS.cfgScale),
    sampler_name: String(sdWebui.sampler || DEFAULTS.sampler),
    seed: numberOr(sdWebui.seed, DEFAULTS.seed),
    restore_faces: Boolean(sdWebui.restoreFaces),
    batch_size: 1,
    n_iter: 1,
  };

  if (sdWebui.scheduler) payload.scheduler = String(sdWebui.scheduler);
  if (sdWebui.model || sdWebui.vae) {
    payload.override_settings = {
      ...(payload.override_settings ?? {}),
      ...(sdWebui.model ? { sd_model_checkpoint: String(sdWebui.model) } : {}),
      ...(sdWebui.vae ? { sd_vae: String(sdWebui.vae) } : {}),
    };
  }

  const clipSkip = numberOr(sdWebui.clipSkip, DEFAULTS.clipSkip);
  if (clipSkip > 1) {
    payload.override_settings = {
      ...(payload.override_settings ?? {}),
      CLIP_stop_at_last_layers: clipSkip,
    };
  }
  applyHiresFix(payload, sdWebui.hiresFix);
  applyAdetailer(payload, sdWebui.adetailer);

  return {
    type: 'sdWebui',
    endpoint: `${baseUrl}/sdapi/v1/txt2img`,
    payload,
  };
}

export async function generate(compiledRequest = {}, settings = {}) {
  const sdWebui = settings.sdWebui ?? {};
  const endpoint = compiledRequest.endpoint || compile({}, settings).endpoint;
  const headers = createHeaders(sdWebui, { 'Content-Type': 'application/json' });

  const response = await fetchWithTimeout(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(compiledRequest.payload ?? {}),
  }, { timeoutMs: settings.timeoutMs, label: 'SD WebUI request' });

  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(readableError('SD WebUI', response.status, responseText));
  }

  const envelope = parseJsonSafely(responseText);
  if (!envelope) {
    throw new Error(`SD WebUI returned non-JSON response: ${responseText.slice(0, 500)}`);
  }

  const rawImage = envelope?.images?.[0];
  if (!rawImage) {
    throw new Error('SD WebUI response did not include images[0].');
  }

  const base64 = stripDataUrlPrefix(rawImage);
  return {
    backendType: 'sdWebui',
    mimeType: 'image/png',
    base64,
    dataUrl: `data:image/png;base64,${base64}`,
    info: envelope.info,
    parameters: envelope.parameters,
  };
}

export async function listResources(settings = {}, { force = false } = {}) {
  const sdWebui = settings.sdWebui ?? {};
  const baseUrl = normalizeBaseUrl(sdWebui.url);
  if (!baseUrl) throw new Error('SD WebUI URL is not configured.');

  const cacheKey = ['sdWebui', baseUrl, sdWebui.username ? 'auth' : 'anon'];
  if (!force) {
    const cached = getResourceCache(cacheKey);
    if (cached) return cached;
  }

  const headers = createHeaders(sdWebui);
  const entries = await Promise.all(RESOURCE_ENDPOINTS.map(async ([key, endpoint]) => {
    const url = `${baseUrl}/sdapi/v1/${endpoint}`;
    const response = await fetchWithTimeout(url, { method: 'GET', headers }, { timeoutMs: settings.timeoutMs, label: `SD WebUI ${key} resource list` });
    const responseText = await response.text();
    if (!response.ok) throw new Error(readableError(`SD WebUI ${key}`, response.status, responseText));
    const parsed = parseJsonSafely(responseText, []);
    return [key, normalizeResourceList(parsed, key)];
  }));

  return setResourceCache(cacheKey, Object.fromEntries(entries));
}

export default { compile, generate, listResources };
