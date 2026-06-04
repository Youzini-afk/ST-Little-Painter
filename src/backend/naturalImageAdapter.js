import {
  ensureImageDataUrl,
  extractImageResult,
  fetchWithTimeout,
  getPromptText,
  makeBearerHeaders,
  normalizeBaseUrl,
  numberOr,
  parseJsonSafely,
  readableError,
} from './backendUtils.js';

const DEFAULTS = Object.freeze({
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
});

function buildPrompt(finalPrompt, naturalImage) {
  return [
    naturalImage.instructionPrefix,
    getPromptText(finalPrompt, 'positive'),
    getPromptText(finalPrompt, 'negative') ? `Avoid: ${getPromptText(finalPrompt, 'negative')}` : '',
    naturalImage.instructionSuffix,
  ].filter((part) => String(part || '').trim()).join('\n');
}

function resolveSize(naturalImage) {
  if (naturalImage.size) return String(naturalImage.size);
  return `${numberOr(naturalImage.width, DEFAULTS.width)}x${numberOr(naturalImage.height, DEFAULTS.height)}`;
}

function resolveEndpoint(baseUrl, providerMode) {
  if (providerMode === 'openaiChatImage' || providerMode === 'chatMarkdownImage') {
    return `${baseUrl}/chat/completions`;
  }
  return `${baseUrl}/images/generations`;
}

export function compile(finalPrompt = {}, settings = {}) {
  const naturalImage = { ...DEFAULTS, ...(settings.naturalImage ?? {}) };
  const providerMode = String(naturalImage.providerMode || DEFAULTS.providerMode);
  const baseUrl = normalizeBaseUrl(naturalImage.url || DEFAULTS.url);
  if (!baseUrl) {
    throw new Error('Natural image provider URL is not configured.');
  }

  const prompt = buildPrompt(finalPrompt, naturalImage);
  const payload = providerMode === 'openaiChatImage' || providerMode === 'chatMarkdownImage'
    ? {
      model: String(naturalImage.chatModel || naturalImage.model || DEFAULTS.chatModel),
      messages: [{ role: 'user', content: prompt }],
    }
    : {
      model: String(naturalImage.model || DEFAULTS.model),
      prompt,
      n: 1,
      size: resolveSize(naturalImage),
      ...(naturalImage.quality ? { quality: naturalImage.quality } : {}),
      ...(naturalImage.responseFormat ? { response_format: naturalImage.responseFormat } : {}),
    };

  return {
    type: 'naturalImage',
    providerMode,
    endpoint: resolveEndpoint(baseUrl, providerMode),
    payload,
    prompt,
  };
}

export async function generate(compiledRequest = {}, settings = {}) {
  const naturalImage = { ...DEFAULTS, ...(settings.naturalImage ?? {}) };
  const endpoint = compiledRequest.endpoint || compile({}, settings).endpoint;
  const response = await fetchWithTimeout(endpoint, {
    method: 'POST',
    headers: makeBearerHeaders(naturalImage.apiKey),
    body: JSON.stringify(compiledRequest.payload ?? {}),
  }, { timeoutMs: settings.timeoutMs, label: 'Natural image request' });

  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(readableError('Natural image', response.status, responseText));
  }

  const parsed = parseJsonSafely(responseText);
  const image = extractImageResult(parsed || responseText, { backendType: 'naturalImage' });
  if (!image) {
    throw new Error(`Natural image response did not include b64_json, url, data URL, or markdown image: ${responseText.slice(0, 500)}`);
  }
  return ensureImageDataUrl({
    ...image,
    backendType: 'naturalImage',
    providerMode: compiledRequest.providerMode || naturalImage.providerMode,
  }, { timeoutMs: settings.timeoutMs, label: 'Natural image download' });
}

export default { compile, generate };
