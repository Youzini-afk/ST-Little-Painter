import assert from 'node:assert/strict';
import { buildTaggerPrompt } from '../src/tagger/buildTaggerPrompt.js';
import { normalizeCompiledPrompt, normalizeInsertionPlan } from '../src/tagger/compiledPromptSchema.js';
import { postprocessCompiledPrompt } from '../src/postprocess/postprocessCompiledPrompt.js';
import { clearGenerationRecords, getLatestGenerationRecord, saveGenerationRecord } from '../src/image/imageStore.js';
import { resolveMessageAnchor } from '../src/image/messageAnchor.js';
import { rerenderAllGenerationRecords } from '../src/image/insertImage.js';
import { resolveInsertionPlan } from '../src/image/insertionPlan.js';

const context = {
  chat: { latestMessage: 'The hero opens the gate.', recentMessages: [{ role: 'assistant', content: 'The hero opens the gate.', index: 7 }] },
  metadata: { chatId: 'chat-a', messageId: 'msg-7', messageIndex: 7 },
};

const defaultPlan = normalizeInsertionPlan(undefined, { context });
assert.equal(defaultPlan.target, 'latest_assistant');
assert.equal(defaultPlan.placement, 'after_anchor');
assert.equal(defaultPlan.fallback, 'after_message');
assert.deepEqual(defaultPlan.display, { mode: 'block', align: 'center', size: 'medium' });
assert.equal(defaultPlan.messageId, undefined);
assert.equal(defaultPlan.messageIndex, undefined);

const customPlan = normalizeInsertionPlan({
  target: 'message_index',
  messageIndex: 3,
  anchorQuote: 'opens the gate',
  placement: 'before_anchor',
  fallback: 'preview_only',
  display: { mode: 'inline', align: 'right', size: 'large' },
  reason: 'scene beat',
});
assert.equal(customPlan.target, 'message_index');
assert.equal(customPlan.messageIndex, 3);
assert.equal(customPlan.anchorQuote, 'opens the gate');
assert.equal(customPlan.placement, 'before_anchor');
assert.equal(customPlan.fallback, 'preview_only');
assert.deepEqual(customPlan.display, { mode: 'inline', align: 'right', size: 'large' });

const prompt = buildTaggerPrompt({ context, settings: {}, promptHints: { skillSelection: { skills: [], trace: [] }, dictionaryHints: [] } });
const knowledgeMessage = prompt.find((message) => message.content.includes('### Tag knowledge and selected skills'));
assert.ok(knowledgeMessage, 'tagger prompt includes knowledge payload message');
const userPayload = JSON.parse(knowledgeMessage.content.replace(/^### Tag knowledge and selected skills\n/, ''));
const promptText = prompt.map((message) => message.content).join('\n');
assert.ok(userPayload.outputSchemaExample.insertionPlan);
assert.equal(userPayload.outputSchemaExample.params, undefined, 'default tagger schema does not ask for backend params');
assert.match(promptText, /anchorQuote/);
assert.match(promptText, /offsets/i);
assert.match(promptText, /Do not suggest backend generation parameters/i);
assert.deepEqual(
  Object.keys(userPayload.outputSchemaExample.insertionPlan),
  ['anchorQuote', 'placement'],
  'tagger schema exposes only anchorQuote and placement',
);
assert.equal(userPayload.outputSchemaExample.insertionPlan.placement, 'after_anchor');
assert.doesNotMatch(JSON.stringify(userPayload.outputSchemaExample.insertionPlan), /target|fallback|messageIndex|messageId/);
assert.doesNotMatch(promptText, /return target|return fallback/i);

const minimalPlan = normalizeInsertionPlan({ anchorQuote: 'opens the gate', placement: 'before' }, { context });
assert.equal(minimalPlan.anchorQuote, 'opens the gate');
assert.equal(minimalPlan.placement, 'before_anchor', 'placement before maps to before_anchor');
assert.equal(minimalPlan.target, 'latest_assistant', 'internal default target is filled');
assert.equal(minimalPlan.fallback, 'after_message', 'internal default fallback is filled');
assert.deepEqual(minimalPlan.internalDefaults, { target: true, fallback: true });
assert.equal(minimalPlan.messageId, undefined);
assert.equal(minimalPlan.messageIndex, undefined);

const afterAliasPlan = normalizeInsertionPlan({ anchorQuote: 'opens the gate', position: 'after' }, { context });
assert.equal(afterAliasPlan.placement, 'after_anchor', 'position after maps to after_anchor');

const normalized = normalizeCompiledPrompt({
  shouldGenerate: true,
  positiveBlocks: { subject: ['1girl'] },
  negative: ['bad hands'],
  insertionPlan: customPlan,
}, { context });
assert.equal(normalized.insertionPlan.target, customPlan.target);
assert.equal(normalized.insertionPlan.messageIndex, customPlan.messageIndex);
assert.equal(normalized.insertionPlan.anchorQuote, customPlan.anchorQuote);
assert.equal(normalized.insertionPlan.messageId, undefined);

const contextFilledIndex = normalizeInsertionPlan({ target: 'message_index' }, { context });
assert.equal(contextFilledIndex.messageIndex, 7, 'message_index fills only messageIndex from context');
assert.equal(contextFilledIndex.messageId, undefined, 'message_index does not mix in messageId');

const contextFilledId = normalizeInsertionPlan({ target: 'message_id' }, { context });
assert.equal(contextFilledId.messageId, 'msg-7', 'message_id fills only messageId from context');
assert.equal(contextFilledId.messageIndex, undefined, 'message_id does not mix in messageIndex');

const runtimeMinimal = resolveInsertionPlan({ insertionPlan: { anchorQuote: 'opens the gate', position: 'before_anchor' } });
assert.equal(runtimeMinimal.target, 'latest_assistant');
assert.equal(runtimeMinimal.fallback, 'after_message');
assert.equal(runtimeMinimal.placement, 'before_anchor', 'runtime accepts before_anchor position');

const runtimeOverride = resolveInsertionPlan({
  insertionPlan: { anchorQuote: 'opens the gate', placement: 'after_anchor' },
  overrides: { target: 'message_index', messageIndex: 7, fallback: 'preview_only' },
});
assert.equal(runtimeOverride.target, 'message_index', 'runtime override can change target');
assert.equal(runtimeOverride.messageIndex, 7, 'runtime override can set messageIndex');
assert.equal(runtimeOverride.fallback, 'preview_only', 'runtime override can change fallback');

const postprocessed = await postprocessCompiledPrompt(normalized, { settings: {} });
assert.equal(postprocessed.insertionPlan.anchorQuote, customPlan.anchorQuote);

clearGenerationRecords();
const record = saveGenerationRecord({
  backendType: 'test',
  finalPrompt: { positive: '1girl', negative: 'bad hands', warnings: [], insertionPlan: customPlan },
  compiledRequest: { type: 'test', endpoint: '/test', payload: { prompt: '1girl' } },
  result: { dataUrl: 'data:image/png;base64,AAAA', mimeType: 'image/png' },
  context,
});
assert.equal(record.insertionPlan.anchorQuote, customPlan.anchorQuote);
assert.equal(record.chat.chatId, 'chat-a');
assert.equal(record.chat.target, 'message_index');
assert.equal(record.chat.messageIndex, 3);
assert.equal(record.chat.messageId, undefined);
assert.equal(record.schemaVersion, 2);
assert.match(record.id, /^stlp-generation-[a-z0-9]+-[a-z0-9]+$/);
assert.deepEqual(record.resolvedInsertion, record.insertionPlan, 'resolved insertion plan is preserved');
assert.equal(getLatestGenerationRecord().insertionPlan.anchorQuote, customPlan.anchorQuote);

const makeDocument = (messages) => ({
  querySelectorAll(selector) {
    return selector === '#chat .mes' ? messages : [];
  },
});
const assistantMessage = {
  className: 'mes',
  dataset: { messageIndex: '9', messageId: 'msg-9' },
  getAttribute() { return undefined; },
  querySelector() { return { childNodes: [], append() {}, insertBefore() {}, firstChild: null }; },
};
const missingIndexAnchor = resolveMessageAnchor({ target: 'message_index', fallback: 'after_message' }, { document: makeDocument([assistantMessage]) });
assert.equal(missingIndexAnchor.targetMessageFound, false, 'missing messageIndex does not fall back to latest assistant');
assert.equal(missingIndexAnchor.reason, 'missingTargetField');
assert.equal(missingIndexAnchor.fallbackUsed, 'preview_only');

const missingIdAnchor = resolveMessageAnchor({ target: 'message_id', fallback: 'after_message' }, { document: makeDocument([assistantMessage]) });
assert.equal(missingIdAnchor.targetMessageFound, false, 'missing messageId does not fall back to latest assistant');
assert.equal(missingIdAnchor.reason, 'missingTargetField');

const normalizedOnlyAnchor = resolveMessageAnchor(
  { target: 'message_index', messageIndex: 9, anchorQuote: 'hello world', placement: 'after_anchor', fallback: 'message_end' },
  { document: makeDocument([{ ...assistantMessage, querySelector: () => ({ childNodes: [{ nodeType: 3, nodeValue: 'hello   world', parentNode: {} }] }) }]) },
);
assert.equal(normalizedOnlyAnchor.anchorFound, false, 'normalized-only anchor is not treated as exact insert point');
assert.equal(normalizedOnlyAnchor.anchorMatch.matchCount, 1);
assert.equal(normalizedOnlyAnchor.anchorMatch.normalized, true);
assert.equal(normalizedOnlyAnchor.fallbackUsed, 'message_end');

const duplicateAnchor = resolveMessageAnchor(
  { target: 'message_index', messageIndex: 9, anchorQuote: 'repeat', placement: 'before_anchor', fallback: 'after_message' },
  { document: makeDocument([{ ...assistantMessage, querySelector: () => ({ childNodes: [{ nodeType: 3, nodeValue: 'repeat then repeat', parentNode: {} }] }) }]) },
);
assert.equal(duplicateAnchor.anchorFound, false, 'ambiguous anchor is not treated as exact insert point');
assert.equal(duplicateAnchor.anchorMatch.matchCount, 2);
assert.equal(duplicateAnchor.reason, 'ambiguousAnchor');

const previousDocument = globalThis.document;
try {
  globalThis.document = {
    querySelectorAll(selector) {
      assert.equal(selector, '[data-stlp-generation-id]');
      return [];
    },
  };
  clearGenerationRecords();
  const emptyDataRecord = saveGenerationRecord({
    backendType: 'test',
    finalPrompt: { positive: '1girl', negative: '', warnings: [], insertionPlan: customPlan },
    compiledRequest: { type: 'test', endpoint: '/test', payload: {} },
    result: { dataUrl: '', mimeType: 'image/png' },
    context,
  });
  const rerenderTrace = rerenderAllGenerationRecords();
  assert.equal(rerenderTrace[0].recordId, emptyDataRecord.id);
  assert.equal(rerenderTrace[0].inserted, false);
  assert.equal(rerenderTrace[0].reason, 'image data unavailable');
} finally {
  if (previousDocument === undefined) delete globalThis.document;
  else globalThis.document = previousDocument;
}

console.log('test-insertion-plan passed');
