import {
  arrayBufferToBase64,
  fetchWithTimeout,
  getPromptText,
  mimeFromFilename,
  normalizeBaseUrl,
  numberOr,
  parseJsonSafely,
  readableError,
} from './backendUtils.js';

const DEFAULTS = Object.freeze({
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
});

function normalizeSeed(value) {
  const seed = numberOr(value, DEFAULTS.seed);
  if (seed >= 0) return seed;
  return Math.floor(Math.random() * 4294967295);
}

function replaceString(value, replacements) {
  const fullPlaceholder = /^\{\{\s*([A-Za-z0-9_.-]+)\s*\}\}$/.exec(value);
  if (fullPlaceholder) {
    const direct = replacements[fullPlaceholder[1]] ?? replacements[fullPlaceholder[1].toLowerCase()];
    return direct === undefined || direct === null ? '' : direct;
  }
  return value.replace(/\{\{\s*([A-Za-z0-9_.-]+)\s*\}\}/g, (_match, key) => {
    const replacement = replacements[key] ?? replacements[key.toLowerCase()];
    return replacement === undefined || replacement === null ? '' : String(replacement);
  });
}

function replacePlaceholders(value, replacements) {
  if (typeof value === 'string') {
    return replaceString(value, replacements);
  }
  if (Array.isArray(value)) {
    return value.map((item) => replacePlaceholders(item, replacements));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, replacePlaceholders(child, replacements)]),
    );
  }
  return value;
}

function collectImagesFromHistory(history = {}) {
  const images = [];
  const root = history.outputs || history;
  for (const output of Object.values(root || {})) {
    const outputImages = output?.images;
    if (Array.isArray(outputImages)) {
      images.push(...outputImages);
    }
  }
  return images;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function compile(finalPrompt = {}, settings = {}) {
  const comfyui = { ...DEFAULTS, ...(settings.comfyui ?? {}) };
  const baseUrl = normalizeBaseUrl(comfyui.url || DEFAULTS.url);
  if (!baseUrl) {
    throw new Error('ComfyUI URL is not configured.');
  }
  if (!String(comfyui.workflowJson || '').trim()) {
    throw new Error('ComfyUI workflowJson is not configured.');
  }

  const workflow = parseJsonSafely(comfyui.workflowJson);
  if (!workflow) {
    throw new Error('ComfyUI workflowJson is not valid JSON.');
  }
  const nodes = Object.values(workflow || {});
  if (!nodes.length || !nodes.some((node) => node && typeof node === 'object' && ('inputs' in node || 'class_type' in node))) {
    throw new Error('ComfyUI workflowJson must be an API workflow JSON saved from ComfyUI API format.');
  }

  const replacements = {
    positive: getPromptText(finalPrompt, 'positive'),
    negative: getPromptText(finalPrompt, 'negative'),
    width: numberOr(comfyui.width, DEFAULTS.width),
    height: numberOr(comfyui.height, DEFAULTS.height),
    steps: numberOr(comfyui.steps, DEFAULTS.steps),
    cfg: numberOr(comfyui.cfg, DEFAULTS.cfg),
    seed: normalizeSeed(comfyui.seed),
    sampler: String(comfyui.sampler || DEFAULTS.sampler),
    scheduler: String(comfyui.scheduler || DEFAULTS.scheduler),
    model: String(comfyui.model || ''),
    vae: String(comfyui.vae || ''),
    clip: String(comfyui.clip || ''),
    ...(comfyui.placeholders || {}),
  };

  return {
    type: 'comfyui',
    endpoint: `${baseUrl}/prompt`,
    historyEndpoint: `${baseUrl}/history`,
    viewEndpoint: `${baseUrl}/view`,
    payload: {
      prompt: replacePlaceholders(workflow, replacements),
    },
    placeholders: replacements,
  };
}

export async function generate(compiledRequest = {}, settings = {}) {
  const comfyui = { ...DEFAULTS, ...(settings.comfyui ?? {}) };
  const endpoint = compiledRequest.endpoint || compile({}, settings).endpoint;
  const response = await fetchWithTimeout(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(compiledRequest.payload ?? {}),
  }, { timeoutMs: settings.timeoutMs, label: 'ComfyUI prompt request' });

  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(readableError('ComfyUI', response.status, responseText));
  }
  const promptEnvelope = parseJsonSafely(responseText);
  const promptId = promptEnvelope?.prompt_id;
  if (!promptId) {
    throw new Error(`ComfyUI /prompt response did not include prompt_id: ${responseText.slice(0, 500)}`);
  }

  const historyBase = compiledRequest.historyEndpoint || endpoint.replace(/\/prompt$/, '/history');
  const pollIntervalMs = Math.max(0, numberOr(comfyui.pollIntervalMs, DEFAULTS.pollIntervalMs));
  const maxPolls = Math.max(1, numberOr(comfyui.maxPolls, DEFAULTS.maxPolls));
  let historyEnvelope = null;

  for (let index = 0; index < maxPolls; index += 1) {
    if (index > 0 && pollIntervalMs) {
      await sleep(pollIntervalMs);
    }
    const historyResponse = await fetchWithTimeout(`${historyBase}/${encodeURIComponent(promptId)}`, {
      method: 'GET',
    }, { timeoutMs: settings.timeoutMs, label: 'ComfyUI history request' });
    const historyText = await historyResponse.text();
    if (!historyResponse.ok) {
      throw new Error(readableError('ComfyUI', historyResponse.status, historyText));
    }
    historyEnvelope = parseJsonSafely(historyText) || {};
    const history = historyEnvelope[promptId] || historyEnvelope;
    if (collectImagesFromHistory(history).length) {
      historyEnvelope = history;
      break;
    }
  }

  const image = collectImagesFromHistory(historyEnvelope)[0];
  if (!image) {
    throw new Error(`ComfyUI history did not include output images for prompt_id ${promptId}.`);
  }

  const viewBase = compiledRequest.viewEndpoint || endpoint.replace(/\/prompt$/, '/view');
  const params = new URLSearchParams({ filename: image.filename || '' });
  if (image.subfolder) params.set('subfolder', image.subfolder);
  if (image.type) params.set('type', image.type);
  const viewResponse = await fetchWithTimeout(`${viewBase}?${params.toString()}`, {
    method: 'GET',
  }, { timeoutMs: settings.timeoutMs, label: 'ComfyUI view request' });
  if (!viewResponse.ok) {
    throw new Error(readableError('ComfyUI', viewResponse.status, await viewResponse.text()));
  }

  const mimeType = viewResponse.headers?.get?.('content-type')?.split(';')[0]
    || mimeFromFilename(image.filename);
  const base64 = arrayBufferToBase64(await viewResponse.arrayBuffer());
  return {
    backendType: 'comfyui',
    mimeType,
    base64,
    dataUrl: `data:${mimeType};base64,${base64}`,
    promptId,
    image,
  };
}

export default { compile, generate };
