import assert from 'node:assert/strict';
import { callJson, listTagApiModels, normalizeModelsEndpoint } from '../src/llm/callJson.js';

function createSettings(overrides = {}) {
  const { tagApi: tagApiOverrides = {}, ...rest } = overrides;
  return {
    tagApi: {
      url: 'https://example.test/v1',
      key: 'test-key',
      model: 'test-model',
      ...tagApiOverrides,
    },
    temperature: 0,
    maxTokens: 256,
    timeoutMs: 5000,
    retryCount: 0,
    ...rest,
  };
}

const previousFetch = globalThis.fetch;

try {
  const calls = [];
  globalThis.fetch = async (_url, options = {}) => {
    const body = JSON.parse(options.body);
    calls.push(body);
    if (calls.length === 1) {
      return {
        ok: false,
        status: 400,
        async text() {
          return 'response_format json_object unsupported by this provider';
        },
      };
    }
    return {
      ok: true,
      async text() {
        return JSON.stringify({
          choices: [{
            message: {
              content: 'Sure:\n```json\n{"shouldGenerate":true,"positive":["1girl"],"negative":["bad hands"],"insertionPlan":{"anchorQuote":"她坐在床边。","placement":"after_anchor"}}\n```',
            },
          }],
        });
      },
    };
  };

  const result = await callJson({
    settings: createSettings(),
    messages: [{ role: 'user', content: 'return json' }],
  });

  assert.equal(calls.length, 2, 'fallback retries once without consuming retry budget');
  assert.deepEqual(calls[0].response_format, { type: 'json_object' }, 'first request asks for json mode');
  assert.equal(calls[1].response_format, undefined, 'fallback request omits response_format');
  assert.equal(result.fallbackUsed, true, 'fallback is reported');
  assert.equal(result.jsonModeUsed, false, 'final request used text mode');
  assert.equal(result.parsed.shouldGenerate, true);
  assert.deepEqual(result.parsed.positive, ['1girl']);
  assert.match(result.errors.join('\n'), /fell back to text response extraction/i);

  const textModeCalls = [];
  globalThis.fetch = async (_url, options = {}) => {
    const body = JSON.parse(options.body);
    textModeCalls.push(body);
    return {
      ok: true,
      async text() {
        return JSON.stringify({ choices: [{ message: { content: '{"shouldGenerate":true,"positive":["solo"]}' } }] });
      },
    };
  };

  const textModeResult = await callJson({
    settings: createSettings({ tagApi: { jsonMode: false } }),
    messages: [{ role: 'user', content: 'return json' }],
  });
  assert.equal(textModeCalls.length, 1, 'jsonMode=false sends one text-mode request');
  assert.equal(textModeCalls[0].response_format, undefined, 'jsonMode=false omits response_format');
  assert.equal(textModeResult.fallbackUsed, false);
  assert.equal(textModeResult.jsonModeUsed, false);
  assert.deepEqual(textModeResult.parsed.positive, ['solo']);

  assert.equal(normalizeModelsEndpoint('https://example.test/v1'), 'https://example.test/v1/models');
  assert.equal(normalizeModelsEndpoint('https://example.test/v1/chat/completions'), 'https://example.test/v1/models');
  assert.equal(normalizeModelsEndpoint('https://example.test/v1/models'), 'https://example.test/v1/models');

  let modelsRequest = null;
  globalThis.fetch = async (url, options = {}) => {
    modelsRequest = { url, options };
    return {
      ok: true,
      async text() {
        return JSON.stringify({ data: [{ id: 'tagger-a' }, { id: 'tagger-b' }, { id: 'tagger-a' }] });
      },
    };
  };
  const models = await listTagApiModels(createSettings({ tagApi: { headers: { 'X-Test': '1' } } }));
  assert.deepEqual(models, ['tagger-a', 'tagger-b']);
  assert.equal(modelsRequest.url, 'https://example.test/v1/models');
  assert.equal(modelsRequest.options.headers.Authorization, 'Bearer test-key');
  assert.equal(modelsRequest.options.headers['X-Test'], '1');
} finally {
  if (previousFetch === undefined) delete globalThis.fetch;
  else globalThis.fetch = previousFetch;
}

console.log('test-call-json-fallback passed');
