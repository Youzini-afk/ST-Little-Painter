const DEFAULTS = Object.freeze({
  width: 768,
  height: 1024,
  steps: 28,
  cfgScale: 7,
  sampler: 'Euler a',
  seed: -1,
  restoreFaces: false,
  sendNegative: true,
});

function normalizeBaseUrl(url) {
  const trimmed = String(url ?? '').trim();
  return trimmed.replace(/\/$/, '');
}

function numberOr(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function getPromptText(finalPrompt = {}, key) {
  const value = finalPrompt[key];
  if (typeof value === 'string') {
    return value;
  }

  const tags = finalPrompt[`${key}Tags`];
  return Array.isArray(tags) ? tags.filter(Boolean).join(', ') : '';
}

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

function parseJsonSafely(text) {
  try {
    return JSON.parse(text);
  } catch (_error) {
    return null;
  }
}

function readableError(status, text) {
  const parsed = parseJsonSafely(text);
  const message = parsed?.error
    || parsed?.errors?.join?.('; ')
    || parsed?.detail
    || parsed?.message
    || parsed?.info
    || text;
  return `SD WebUI HTTP ${status}: ${String(message || 'request failed').slice(0, 500)}`;
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

  return {
    type: 'sdWebui',
    endpoint: `${baseUrl}/sdapi/v1/txt2img`,
    payload,
  };
}

export async function generate(compiledRequest = {}, settings = {}) {
  if (typeof fetch !== 'function') {
    throw new Error('fetch is not available in this runtime.');
  }

  const sdWebui = settings.sdWebui ?? {};
  const endpoint = compiledRequest.endpoint || compile({}, settings).endpoint;
  const headers = { 'Content-Type': 'application/json' };

  if (sdWebui.username || sdWebui.password) {
    headers.Authorization = `Basic ${encodeBasicAuth(sdWebui.username, sdWebui.password)}`;
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(compiledRequest.payload ?? {}),
  });

  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(readableError(response.status, responseText));
  }

  const envelope = parseJsonSafely(responseText);
  if (!envelope) {
    throw new Error(`SD WebUI returned non-JSON response: ${responseText.slice(0, 500)}`);
  }

  const rawImage = envelope?.images?.[0];
  if (!rawImage) {
    throw new Error('SD WebUI response did not include images[0].');
  }

  const base64 = String(rawImage).replace(/^data:image\/[^;]+;base64,/, '');
  return {
    backendType: 'sdWebui',
    mimeType: 'image/png',
    base64,
    dataUrl: `data:image/png;base64,${base64}`,
    info: envelope.info,
    parameters: envelope.parameters,
  };
}

export default { compile, generate };
