export function normalizeBaseUrl(url) {
  const trimmed = String(url ?? '').trim();
  return trimmed.replace(/\/+$/, '');
}

export function numberOr(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function getPromptText(finalPrompt = {}, key) {
  const value = finalPrompt[key];
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.filter(Boolean).join(', ');
  }

  const tags = finalPrompt[`${key}Tags`];
  return Array.isArray(tags) ? tags.filter(Boolean).join(', ') : '';
}

export function parseJsonSafely(text, fallback = null) {
  try {
    return JSON.parse(text);
  } catch (_error) {
    return fallback;
  }
}

export async function fetchWithTimeout(url, options = {}, { timeoutMs = 30000, label = 'backend request' } = {}) {
  if (typeof fetch !== 'function') {
    throw new Error('fetch is not available in this runtime.');
  }

  const effectiveTimeoutMs = Math.max(1000, Number(timeoutMs) || 30000);
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timeout = controller ? setTimeout(() => controller.abort(), effectiveTimeoutMs) : null;

  try {
    return await fetch(url, {
      ...options,
      ...(controller ? { signal: controller.signal } : {}),
    });
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error(`${label} timed out after ${effectiveTimeoutMs}ms.`);
    }
    throw error;
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

export function getHeader(response, name) {
  return response?.headers?.get?.(name) || response?.headers?.get?.(name.toLowerCase()) || '';
}

export function readableError(provider, status, text) {
  const parsed = parseJsonSafely(text);
  const message = parsed?.error?.message
    || parsed?.error
    || parsed?.errors?.join?.('; ')
    || parsed?.detail
    || parsed?.message
    || parsed?.info
    || text;
  return `${provider} HTTP ${status}: ${String(message || 'request failed').slice(0, 500)}`;
}

export function mimeFromDataUrl(dataUrl, fallback = 'image/png') {
  const match = /^data:([^;]+);base64,/i.exec(String(dataUrl || ''));
  return match?.[1] || fallback;
}

export function mimeFromFilename(filename = '', fallback = 'image/png') {
  const lower = String(filename).toLowerCase();
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.gif')) return 'image/gif';
  return fallback;
}

export function mimeFromMagicBytes(arrayBuffer, fallback = 'image/png') {
  const bytes = new Uint8Array(arrayBuffer || new ArrayBuffer(0));
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png';
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.length >= 12 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return 'image/webp';
  if (bytes.length >= 6 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return 'image/gif';
  return fallback;
}

export function isZipArrayBuffer(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer || new ArrayBuffer(0));
  return bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
}

export function stripDataUrlPrefix(value) {
  return String(value ?? '').replace(/^data:image\/[^;]+;base64,/i, '');
}

export function arrayBufferToBase64(arrayBuffer) {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(arrayBuffer).toString('base64');
  }

  let binary = '';
  const bytes = new Uint8Array(arrayBuffer);
  for (let index = 0; index < bytes.byteLength; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }
  return btoa(binary);
}

function looksLikeBase64Image(value) {
  const text = String(value ?? '').trim();
  return text.length > 32 && /^[A-Za-z0-9+/=\r\n]+$/.test(text);
}

function normalizeImageCandidate(candidate, { backendType = 'unknown', mimeType = 'image/png' } = {}) {
  if (!candidate) {
    return null;
  }

  if (typeof candidate === 'string') {
    const value = candidate.trim();
    if (!value) return null;
    if (/^data:image\/[^;]+;base64,/i.test(value)) {
      const resolvedMimeType = mimeFromDataUrl(value, mimeType);
      const base64 = stripDataUrlPrefix(value);
      return { backendType, mimeType: resolvedMimeType, base64, dataUrl: value };
    }
    if (/^https?:\/\//i.test(value)) {
      return { backendType, mimeType, url: value };
    }
    if (looksLikeBase64Image(value)) {
      const base64 = value.replace(/\s+/g, '');
      return { backendType, mimeType, base64, dataUrl: `data:${mimeType};base64,${base64}` };
    }
    return null;
  }

  if (typeof candidate !== 'object') {
    return null;
  }

  const dataUrl = candidate.dataUrl || candidate.data_url || candidate.image_url?.url;
  if (typeof dataUrl === 'string' && /^data:image\/[^;]+;base64,/i.test(dataUrl.trim())) {
    return normalizeImageCandidate(dataUrl, { backendType, mimeType });
  }

  const b64 = candidate.b64_json || candidate.base64 || candidate.imageBase64 || candidate.image;
  if (typeof b64 === 'string') {
    const normalized = normalizeImageCandidate(b64, { backendType, mimeType: candidate.mimeType || candidate.mime_type || mimeType });
    if (normalized) return normalized;
  }

  const url = candidate.url || candidate.image_url;
  if (typeof url === 'string' && /^https?:\/\//i.test(url.trim())) {
    return { backendType, mimeType: candidate.mimeType || candidate.mime_type || mimeType, url: url.trim() };
  }

  return null;
}

function extractMarkdownImage(text, options) {
  const markdownMatch = /!\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/.exec(String(text || ''));
  if (markdownMatch?.[1]) {
    const normalized = normalizeImageCandidate(markdownMatch[1], options);
    if (normalized) return normalized;
  }

  const dataUrlMatch = /(data:image\/[^;]+;base64,[A-Za-z0-9+/=\r\n]+)/i.exec(String(text || ''));
  if (dataUrlMatch?.[1]) {
    return normalizeImageCandidate(dataUrlMatch[1], options);
  }

  const urlMatch = /(https?:\/\/[^\s)]+\.(?:png|jpe?g|webp|gif)(?:\?[^\s)]*)?)/i.exec(String(text || ''));
  if (urlMatch?.[1]) {
    return normalizeImageCandidate(urlMatch[1], options);
  }

  return null;
}

export function extractImageResult(source, options = {}) {
  const resolvedOptions = {
    backendType: options.backendType || 'unknown',
    mimeType: options.mimeType || 'image/png',
  };

  const direct = normalizeImageCandidate(source, resolvedOptions);
  if (direct) return direct;

  if (typeof source === 'string') {
    const markdown = extractMarkdownImage(source, resolvedOptions);
    if (markdown) return markdown;
    const parsed = parseJsonSafely(source);
    return parsed ? extractImageResult(parsed, resolvedOptions) : null;
  }

  if (!source || typeof source !== 'object') {
    return null;
  }

  const candidates = [
    source.data?.[0],
    source.images?.[0],
    source.output?.[0],
    source.result,
    source.image,
    source.artifacts?.[0],
    source.generations?.[0],
  ];

  for (const candidate of candidates) {
    const normalized = normalizeImageCandidate(candidate, resolvedOptions);
    if (normalized) return normalized;
    if (candidate && candidate !== source && typeof candidate === 'object') {
      const nested = extractImageResult(candidate, resolvedOptions);
      if (nested) return nested;
    }
  }

  const chatChoice = source.choices?.[0]?.message;
  if (chatChoice) {
    const content = chatChoice.content;
    if (typeof content === 'string') {
      const fromText = extractMarkdownImage(content, resolvedOptions) || extractImageResult(content, resolvedOptions);
      if (fromText) return fromText;
    }
    if (Array.isArray(content)) {
      for (const part of content) {
        const normalized = normalizeImageCandidate(part?.image_url || part, resolvedOptions)
          || extractImageResult(part, resolvedOptions);
        if (normalized) return normalized;
      }
    }
  }

  return null;
}

export async function ensureImageDataUrl(imageResult, { timeoutMs = 30000, label = 'image download', maxBytes = 25 * 1024 * 1024 } = {}) {
  const normalized = normalizeImageCandidate(imageResult, {
    backendType: imageResult?.backendType || 'unknown',
    mimeType: imageResult?.mimeType || imageResult?.mime_type || 'image/png',
  }) || imageResult;

  if (!normalized) {
    return null;
  }

  if (normalized.dataUrl && /^data:image\/[^;]+;base64,/i.test(normalized.dataUrl)) {
    return normalized;
  }

  if (normalized.base64) {
    const mimeType = normalized.mimeType || 'image/png';
    return {
      ...normalized,
      mimeType,
      dataUrl: `data:${mimeType};base64,${stripDataUrlPrefix(normalized.base64)}`,
      base64: stripDataUrlPrefix(normalized.base64),
    };
  }

  if (!normalized.url) {
    return normalized;
  }

  const response = await fetchWithTimeout(normalized.url, { method: 'GET' }, { timeoutMs, label });
  if (!response.ok) {
    throw new Error(readableError(label, response.status, await response.text()));
  }
  const contentLength = Number(response.headers?.get?.('content-length') || 0);
  if (contentLength > maxBytes) {
    throw new Error(`${label} refused to download ${contentLength} bytes; limit is ${maxBytes} bytes.`);
  }
  const arrayBuffer = await response.arrayBuffer();
  if (arrayBuffer.byteLength > maxBytes) {
    throw new Error(`${label} downloaded ${arrayBuffer.byteLength} bytes; limit is ${maxBytes} bytes.`);
  }
  const headerMime = response.headers?.get?.('content-type')?.split(';')[0] || '';
  const mimeType = /^image\//i.test(headerMime)
    ? headerMime
    : mimeFromMagicBytes(arrayBuffer, normalized.mimeType || 'image/png');
  if (!/^image\//i.test(mimeType)) {
    throw new Error(`${label} did not return an image response.`);
  }
  const base64 = arrayBufferToBase64(arrayBuffer);
  return {
    ...normalized,
    mimeType,
    base64,
    dataUrl: `data:${mimeType};base64,${base64}`,
  };
}

export function makeBearerHeaders(apiKey, extra = {}) {
  const headers = { 'Content-Type': 'application/json', ...extra };
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }
  return headers;
}
