import { extractJson } from './extractJson.js';
import { buildRegexRules } from '../regex/defaultRegexRules.js';
import { llm_output_cleanup } from '../regex/regexStages.js';
import { applyTaskRegex } from '../regex/taskRegex.js';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function normalizeEndpoint(url) {
  const trimmed = String(url ?? '').trim();
  if (!trimmed) {
    return '';
  }
  return /\/chat\/completions\/?$/.test(trimmed)
    ? trimmed
    : `${trimmed.replace(/\/$/, '')}/chat/completions`;
}

export function normalizeModelsEndpoint(url) {
  const trimmed = String(url ?? '').trim();
  if (!trimmed) return '';
  const base = trimmed
    .replace(/\/chat\/completions\/?$/i, '')
    .replace(/\/models\/?$/i, '')
    .replace(/\/$/, '');
  return `${base}/models`;
}

function normalizeModelList(envelope) {
  const values = Array.isArray(envelope?.data) ? envelope.data : Array.isArray(envelope) ? envelope : [];
  return [...new Set(values
    .map((item) => (typeof item === 'string' ? item : item?.id || item?.name || item?.model))
    .map((item) => String(item ?? '').trim())
    .filter(Boolean))];
}

export async function listTagApiModels(settings = {}) {
  const api = settings?.tagApi ?? {};
  const endpoint = normalizeModelsEndpoint(api.url);
  if (!endpoint || !api.key) {
    throw new Error('Tag API URL and API key are required to fetch models.');
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Math.max(1000, Number(settings.timeoutMs) || 30000));
  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${api.key}`,
        ...(api.headers && typeof api.headers === 'object' ? api.headers : {}),
      },
      signal: controller.signal,
    });
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`Tag API models HTTP ${response.status}: ${text.slice(0, 500)}`);
    }
    return normalizeModelList(JSON.parse(text));
  } finally {
    clearTimeout(timeout);
  }
}

function shouldFallbackWithoutJsonMode(error) {
  const message = String(error?.message || error || '').toLowerCase();
  return message.includes('response_format')
    || message.includes('json_object')
    || message.includes('json mode')
    || message.includes('unsupported')
    || message.includes('not support')
    || message.includes('invalid parameter')
    || message.includes('unknown parameter')
    || message.includes('extra inputs are not permitted');
}

async function requestJson({ settings, messages, jsonMode = true }) {
  const api = settings?.tagApi ?? {};
  const endpoint = normalizeEndpoint(api.url);

  if (!endpoint || !api.key || !api.model) {
    throw new Error('Tag API is not configured. Please set url, key, and model.');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Math.max(1000, Number(settings.timeoutMs) || 30000));

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${api.key}`,
      },
      body: JSON.stringify({
        model: api.model,
        messages,
        temperature: Number(settings.temperature) || 0,
        max_tokens: Number(settings.maxTokens) || 1200,
        ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
      }),
      signal: controller.signal,
    });

    const responseText = await response.text();
    if (!response.ok) {
      throw new Error(`Tag API HTTP ${response.status}: ${responseText.slice(0, 500)}`);
    }

    const envelope = JSON.parse(responseText);
    return envelope?.choices?.[0]?.message?.content ?? responseText;
  } finally {
    clearTimeout(timeout);
  }
}

export async function callJson({ settings, messages } = {}) {
  const errors = [];
  const retryCount = Math.max(0, Number(settings?.retryCount) || 0);
  let jsonMode = settings?.tagApi?.jsonMode !== false && settings?.tagApi?.jsonMode !== 'false';
  let fallbackUsed = false;
  const regexRules = buildRegexRules(settings);

  for (let attempt = 0; attempt <= retryCount; attempt += 1) {
    try {
      const raw = await requestJson({ settings, messages, jsonMode });
      const outputCleanup = applyTaskRegex(raw, regexRules, { stage: llm_output_cleanup });
      const cleanedRaw = outputCleanup.text;
      const extracted = extractJson(cleanedRaw);
      return {
        raw,
        cleanedRaw,
        parsed: extracted.parsed,
        errors: [...(fallbackUsed ? ['JSON mode unsupported; fell back to text response extraction.'] : []), ...extracted.errors],
        outputCleanup: outputCleanup.transforms,
        fallbackUsed,
        jsonModeUsed: jsonMode,
      };
    } catch (error) {
      const message = error?.message || String(error);
      errors.push(message);
      if (jsonMode && shouldFallbackWithoutJsonMode(error)) {
        jsonMode = false;
        fallbackUsed = true;
        attempt -= 1;
        continue;
      }
      if (attempt < retryCount) {
        await sleep(300 * (attempt + 1));
      }
    }
  }

  return { raw: '', parsed: null, errors, fallbackUsed, jsonModeUsed: jsonMode };
}

export default callJson;
