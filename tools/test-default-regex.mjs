import assert from 'node:assert/strict';
import { sanitizeContext } from '../src/context/sanitizeContext.js';
import { postprocessCompiledPrompt } from '../src/postprocess/postprocessCompiledPrompt.js';
import { callJson } from '../src/llm/callJson.js';
import { buildRegexRules } from '../src/regex/defaultRegexRules.js';

const settings = {
  regex: { enabled: true, enableDefaultRules: true, rules: [] },
  fixedPositive: [],
  fixedNegative: [],
  replacements: {},
  blocklist: [],
  allowlist: [],
  tagBudget: { positive: 80, negative: 40 },
};

const rules = buildRegexRules(settings);
assert.ok(rules.some((rule) => rule.source === 'bme-default-strip-thinking-analysis-reasoning'));
assert.ok(rules.some((rule) => rule.stage === 'input_cleanup'));
assert.ok(rules.some((rule) => rule.stage === 'final_tag_cleanup'));
assert.equal(rules.some((rule) => rule.stage === 'llm_output_cleanup'), false, 'output cleanup defaults off');

const sanitized = sanitizeContext({
  chat: {
    latestMessage: 'visible <think>hidden chain</think> <choice>bad option</choice> scene',
    recentMessages: [
      { role: 'assistant', content: 'Alice <UpdateVariable>stat_data.x=1</UpdateVariable> smiles.', index: 0 },
      { role: 'assistant', content: '<status_current_variable>secret vars</status_current_variable> bedroom', index: 1 },
    ],
  },
  character: { name: 'Alice', description: 'hero <StatusPlaceHolderImpl/>' },
}, { settings });

assert.equal(sanitized.chat.latestMessage.includes('hidden chain'), false);
assert.equal(sanitized.chat.latestMessage.includes('bad option'), false);
assert.match(sanitized.chat.latestMessage, /visible/);
const sanitizedPromptFields = JSON.stringify({ chat: sanitized.chat, character: sanitized.character });
assert.equal(sanitizedPromptFields.includes('stat_data.x'), false);
assert.equal(sanitizedPromptFields.includes('secret vars'), false);
assert.equal(sanitizedPromptFields.includes('StatusPlaceHolderImpl'), false);
assert.ok(sanitized.sanitizer.regexTransforms.length >= 3, 'default regex transforms are traced');

const postprocessed = await postprocessCompiledPrompt({
  shouldGenerate: true,
  positiveBlocks: {
    subject: ['1girl', '<think>hidden</think> solo', '<StatusPlaceHolderImpl/> bedroom'],
  },
  negative: ['bad hands', '<choice>bad</choice> low quality'],
}, { settings });
assert.equal(postprocessed.positive.includes('hidden'), false);
assert.equal(postprocessed.positive.includes('StatusPlaceHolderImpl'), false);
assert.equal(postprocessed.negative.includes('bad</choice>'), false);
assert.ok(postprocessed.trace.some((step) => step.step === 'final-tag-cleanup'));

const previousFetch = globalThis.fetch;
try {
  globalThis.fetch = async () => ({
    ok: true,
    async text() {
      return JSON.stringify({
        choices: [{ message: { content: '<think>ignore</think>{"shouldGenerate":true,"positive":["1girl"]}' } }],
      });
    },
  });
  const outputCleaned = await callJson({
    settings: {
      ...settings,
      regex: { enabled: true, enableDefaultRules: true, enableOutputCleanup: true, rules: [] },
      tagApi: { url: 'https://example.test/v1', key: 'key', model: 'model', jsonMode: false },
      timeoutMs: 1000,
      retryCount: 0,
    },
    messages: [{ role: 'user', content: 'json' }],
  });
  assert.deepEqual(outputCleaned.parsed.positive, ['1girl']);
  assert.equal(outputCleaned.cleanedRaw.includes('<think>'), false);
  assert.ok(outputCleaned.outputCleanup.length >= 1, 'output cleanup traces are returned when enabled');
} finally {
  if (previousFetch === undefined) delete globalThis.fetch;
  else globalThis.fetch = previousFetch;
}

console.log('test-default-regex passed');
