import {
  arrayBufferToBase64,
  ensureImageDataUrl,
  extractImageResult,
  fetchWithTimeout,
  getHeader,
  getPromptText,
  isZipArrayBuffer,
  makeBearerHeaders,
  mimeFromMagicBytes,
  mimeFromFilename,
  normalizeBaseUrl,
  numberOr,
  parseJsonSafely,
  readableError,
} from './backendUtils.js';

const DEFAULTS = Object.freeze({
  url: 'https://image.novelai.net',
  apiKey: '',
  model: 'nai-diffusion-3',
  sampler: 'k_euler_ancestral',
  scheduler: 'native',
  width: 832,
  height: 1216,
  steps: 28,
  scale: 5,
  seed: -1,
  ucPreset: 0,
  qualityToggle: true,
  sm: false,
  smDyn: false,
  dynamicThresholding: false,
  cfgRescale: 0,
  negativePrompt: '',
});

function normalizeSeed(value) {
  const seed = numberOr(value, DEFAULTS.seed);
  if (seed >= 0) return seed;
  return Math.floor(Math.random() * 4294967295);
}

function resolveJSZip() {
  if (globalThis.JSZip) return globalThis.JSZip;
  return null;
}

async function extractZipImage(response, backendType) {
  const arrayBuffer = await response.arrayBuffer();
  return extractZipImageFromArrayBuffer(arrayBuffer, backendType);
}

async function extractZipImageFromArrayBuffer(arrayBuffer, backendType) {
  const JSZip = resolveJSZip();
  if (!JSZip) {
    throw new Error('NovelAI returned a zip response, but JSZip is not available in this runtime. Load JSZip or use a JSON/image response fallback.');
  }

  const zip = await JSZip.loadAsync(arrayBuffer);
  const files = Object.values(zip.files || {}).filter((file) => !file.dir && /\.(png|jpe?g|webp)$/i.test(file.name));
  if (!files.length) {
    throw new Error('NovelAI zip response did not include an image file.');
  }

  const file = files[0];
  const base64 = await file.async('base64');
  const mimeType = mimeFromFilename(file.name);
  return {
    backendType,
    mimeType,
    base64,
    dataUrl: `data:${mimeType};base64,${base64}`,
    filename: file.name,
  };
}

export function compile(finalPrompt = {}, settings = {}) {
  const novelai = { ...DEFAULTS, ...(settings.novelai ?? {}) };
  const baseUrl = normalizeBaseUrl(novelai.url || DEFAULTS.url);
  const positive = getPromptText(finalPrompt, 'positive');
  const negative = [novelai.negativePrompt, getPromptText(finalPrompt, 'negative')]
    .filter((part) => String(part || '').trim())
    .join(', ');

  const payload = {
    action: 'generate',
    input: positive,
    model: String(novelai.model || DEFAULTS.model),
    parameters: {
      prompt: positive,
      negative_prompt: negative,
      width: numberOr(novelai.width, DEFAULTS.width),
      height: numberOr(novelai.height, DEFAULTS.height),
      steps: numberOr(novelai.steps, DEFAULTS.steps),
      scale: numberOr(novelai.scale, DEFAULTS.scale),
      sampler: String(novelai.sampler || DEFAULTS.sampler),
      scheduler: String(novelai.scheduler || DEFAULTS.scheduler),
      seed: normalizeSeed(novelai.seed),
      n_samples: 1,
      ucPreset: numberOr(novelai.ucPreset, DEFAULTS.ucPreset),
      qualityToggle: Boolean(novelai.qualityToggle),
      sm: Boolean(novelai.sm),
      sm_dyn: Boolean(novelai.smDyn),
      dynamic_thresholding: Boolean(novelai.dynamicThresholding),
      cfg_rescale: numberOr(novelai.cfgRescale, DEFAULTS.cfgRescale),
    },
  };

  return {
    type: 'novelai',
    endpoint: `${baseUrl}/ai/generate-image`,
    payload,
  };
}

export async function generate(compiledRequest = {}, settings = {}) {
  const novelai = { ...DEFAULTS, ...(settings.novelai ?? {}) };
  const endpoint = compiledRequest.endpoint || compile({}, settings).endpoint;
  const response = await fetchWithTimeout(endpoint, {
    method: 'POST',
    headers: makeBearerHeaders(novelai.apiKey),
    body: JSON.stringify(compiledRequest.payload ?? {}),
  }, { timeoutMs: settings.timeoutMs, label: 'NovelAI request' });

  const contentType = getHeader(response, 'content-type');
  if (!response.ok) {
    throw new Error(readableError('NovelAI', response.status, await response.text()));
  }

  if (/zip/i.test(contentType)) {
    return extractZipImage(response, 'novelai');
  }

  if (/image\//i.test(contentType)) {
    const arrayBuffer = await response.arrayBuffer();
    const mimeType = contentType.split(';')[0] || mimeFromMagicBytes(arrayBuffer);
    const base64 = arrayBufferToBase64(arrayBuffer);
    return { backendType: 'novelai', mimeType, base64, dataUrl: `data:${mimeType};base64,${base64}` };
  }

  if (/octet-stream/i.test(contentType)) {
    const arrayBuffer = await response.arrayBuffer();
    if (isZipArrayBuffer(arrayBuffer)) {
      return extractZipImageFromArrayBuffer(arrayBuffer, 'novelai');
    }
    const mimeType = mimeFromMagicBytes(arrayBuffer);
    const base64 = arrayBufferToBase64(arrayBuffer);
    return { backendType: 'novelai', mimeType, base64, dataUrl: `data:${mimeType};base64,${base64}` };
  }

  const responseText = await response.text();
  const parsed = parseJsonSafely(responseText);
  const image = extractImageResult(parsed || responseText, { backendType: 'novelai' });
  if (!image) {
    throw new Error(`NovelAI response did not include a supported image result: ${responseText.slice(0, 500)}`);
  }
  return ensureImageDataUrl(image, { timeoutMs: settings.timeoutMs, label: 'NovelAI image download' });
}

export default { compile, generate };
