import assert from 'node:assert/strict';
import { createBMEWorldbookResolverAdapter } from '../src/worldbook/BMEWorldbookResolverAdapter.js';
import { buildTaggerPrompt } from '../src/tagger/buildTaggerPrompt.js';

function createEntry({
  uid,
  name,
  comment = name,
  content,
  enabled = true,
  positionType = 'before_character_definition',
  role = 'system',
  depth = 0,
  order = 10,
  strategyType = 'constant',
  keys = [],
  keysSecondary = [],
  secondaryLogic = 'and_any',
  extra = {},
  probability = 100,
}) {
  return {
    uid,
    name,
    comment,
    content,
    enabled,
    position: { type: positionType, role, depth, order },
    strategy: {
      type: strategyType,
      keys,
      keys_secondary: { logic: secondaryLogic, keys: keysSecondary },
    },
    probability,
    extra,
  };
}

const mainBook = [
  createEntry({ uid: 1, name: 'Constant Visual', content: 'constant visual fact', order: 1 }),
  createEntry({ uid: 2, name: 'Selective Primary', content: 'selective dragon fact', strategyType: 'selective', keys: ['dragon'], order: 2 }),
  createEntry({ uid: 3, name: 'Selective Secondary', content: 'secondary cave fact', strategyType: 'selective', keys: ['dragon'], keysSecondary: ['cave'], order: 3 }),
  createEntry({ uid: 4, name: 'Never Secondary', content: 'should not activate', strategyType: 'selective', keys: ['dragon'], keysSecondary: ['missing'], order: 4 }),
  createEntry({ uid: 5, name: 'At Depth', content: 'depth system fact', positionType: 'at_depth_as_system', depth: 2, order: 1 }),
  createEntry({ uid: 6, name: 'EJS Getwi', content: 'inline=<%= await getwi("Hidden Inline") %>', order: 5 }),
  createEntry({ uid: 7, name: 'Hidden Inline', content: 'hidden inline payload for <%= charName %>', enabled: false, order: 6 }),
  createEntry({ uid: 8, name: 'EJS Activewi', content: '<% await activewi("Forced After") %>', order: 7 }),
  createEntry({ uid: 9, name: 'Forced After', content: 'forced after payload', enabled: false, positionType: 'after_character_definition', strategyType: 'selective', keys: ['never'], order: 8 }),
  createEntry({ uid: 10, name: 'Lazy Pull', content: 'lazy=<%= await getwi("bonus-book", "Bonus Entry") %>', order: 9 }),
  createEntry({ uid: 11, name: '[mvu_update] State', content: 'mvu should be filtered', order: 10 }),
  createEntry({ uid: 12, name: 'Custom Filter Target', content: 'custom filter should remove me', order: 11 }),
  createEntry({ uid: 13, name: 'Group A', content: 'group override wins', strategyType: 'selective', keys: ['dragon'], extra: { group: 'grp', groupOverride: true }, order: 1 }),
  createEntry({ uid: 14, name: 'Group B', content: 'group loser', strategyType: 'selective', keys: ['dragon'], extra: { group: 'grp' }, order: 99 }),
  createEntry({ uid: 15, name: 'Probability Zero', content: 'probability should skip', probability: 0, order: 12 }),
];
const bonusBook = [createEntry({ uid: 101, name: 'Bonus Entry', content: 'bonus lazy payload', order: 1 })];

const adapter = createBMEWorldbookResolverAdapter();

const context = {
  name1: 'User',
  name2: 'Alice',
  character: { name: 'Alice', description: 'hero painter' },
  chat: {
    latestMessage: 'dragon in cave',
    recentMessages: [{ role: 'user', content: 'dragon in cave', index: 0 }],
  },
  worldbook: {
    primary: 'main-book',
    worldbooks: {
      'main-book': mainBook,
      'bonus-book': bonusBook,
    },
  },
};

const result = await adapter.resolveWorldbookContext({ context, settings: { worldbook: { enabled: true } } });

assert.match(result.beforeText, /constant visual fact/, 'constant entry resolves');
assert.match(result.beforeText, /selective dragon fact/, 'selective primary resolves');
assert.match(result.beforeText, /secondary cave fact/, 'secondary key resolves');
assert.doesNotMatch(result.beforeText, /should not activate/, 'missing secondary does not resolve');
assert.doesNotMatch(result.beforeText, /probability should skip/, 'probability zero skips');
assert.match(result.beforeText, /inline=hidden inline payload for Alice/, 'EJS getwi resolves');
assert.match(result.afterText, /forced after payload/, 'EJS activewi resolves forced entry');
assert.match(result.beforeText, /lazy=bonus lazy payload/, 'lazy worldbook getwi resolves');
assert.equal(result.additionalMessages.length, 1, 'atDepth entry becomes additional message');
assert.match(result.additionalMessages[0].content, /depth system fact/, 'atDepth content preserved');
assert.match(result.beforeText, /group override wins/, 'group override winner resolves');
assert.doesNotMatch(result.beforeText, /group loser/, 'group loser skipped');
assert.doesNotMatch(result.beforeText, /mvu should be filtered/, 'MVU default filter removes tagged entry');
assert.equal(result.debug.ejsInlinePullCount >= 2, true, 'inline pulls counted');
assert.equal(result.debug.ejsForcedActivationCount, 1, 'activewi counted');
assert.deepEqual(result.debug.lazyLoadedWorldbooks, ['bonus-book'], 'lazy book tracked');
assert.equal(result.entries.length, 0, 'allEntries are not returned to prompt pipeline');
assert.ok(result.resolvedPromptContext, 'prompt-safe worldbook context is returned');
assert.match(result.resolvedPromptContext.beforeText, /constant visual fact/, 'prompt-safe beforeText preserved');
assert.doesNotMatch(JSON.stringify(result.resolvedPromptContext), /should not activate/, 'inactive content absent from prompt-safe worldbook context');

const taggerMessages = buildTaggerPrompt({
  context: {
    chat: context.chat,
    character: context.character,
    worldbook: {
      ...result,
      entries: [{ name: 'Inactive Leak', content: 'inactive forbidden prompt leak' }],
      allEntries: [{ name: 'Inactive All Leak', content: 'inactive all forbidden prompt leak' }],
    },
  },
  settings: {},
  promptHints: { skillSelection: { skills: [], trace: [] }, dictionaryHints: [] },
});
const taggerMessagesJson = JSON.stringify(taggerMessages);
assert.doesNotMatch(taggerMessagesJson, /inactive forbidden prompt leak/, 'inactive entries do not enter tagger messages');
assert.doesNotMatch(taggerMessagesJson, /inactive all forbidden prompt leak/, 'allEntries do not enter tagger messages');
assert.match(taggerMessagesJson, /### Worldbook before context/, 'tagger prompt includes worldbook before context');
assert(taggerMessages.some((message) => message.role === 'system' && message.content.includes('### Worldbook before context')), 'worldbook before context uses system role');
assert(taggerMessages.some((message) => message.role === 'system' && message.content.includes('### Worldbook after context')), 'worldbook after context uses system role');
  assert(taggerMessages.some((message) => message.content.includes('(history)')), 'history messages marked');
  assert(taggerMessages.some((message) => message.content.includes('--- 以下是历史对话')), 'has history separator');
  assert(taggerMessages.some((message) => message.content.includes('提取与注入规则')), 'has extraction rules');

const chatMessagesOnly = await adapter.resolveWorldbookContext({
  context: {
    name1: 'User',
    name2: 'Alice',
    character: { name: 'Alice' },
    chatMessages: [{ role: 'user', content: 'dragon in cave', index: 0 }],
    worldbook: {
      primary: 'main-book',
      worldbooks: { 'main-book': mainBook },
    },
  },
  settings: { worldbook: { enabled: true } },
});
assert.match(chatMessagesOnly.beforeText, /selective dragon fact/, 'context.chatMessages activates entries');

const ejsNameBook = [createEntry({ uid: 201, name: 'EJS Names', content: 'names=<%= userName %>/<%= charName %>', order: 1 })];
const ejsNames = await adapter.resolveWorldbookContext({
  context: {
    name1: 'PainterUser',
    name2: 'BrushChar',
    character: { name: 'BrushChar' },
    chatMessages: [{ role: 'user', content: 'any', index: 0 }],
    worldbook: { primary: 'ejs-name-book', worldbooks: { 'ejs-name-book': ejsNameBook } },
  },
  settings: { worldbook: { enabled: true } },
});
assert.match(ejsNames.beforeText, /names=PainterUser\/BrushChar/, 'EJS receives userName and charName');

const previousTavernHelper = globalThis.TavernHelper;
try {
  globalThis.TavernHelper = {
    getCharWorldbookNames() {
      return { primary: 'global-book', additional: [] };
    },
    async getWorldbook(name) {
      return name === 'global-book'
        ? [createEntry({ uid: 301, name: 'Global API Entry', content: 'global api visual fact', order: 1 })]
        : [];
    },
    async getLorebookEntries(name) {
      return name === 'global-book' ? [{ uid: 301, comment: 'Global API Entry' }] : [];
    },
  };
  const globalApi = await adapter.resolveWorldbookContext({
    context: {
      name1: 'User',
      name2: 'Alice',
      character: { name: 'Alice' },
      chatMessages: [{ role: 'user', content: 'any', index: 0 }],
      worldbook: {},
    },
    settings: { worldbook: { enabled: true } },
  });
  assert.match(globalApi.beforeText, /global api visual fact/, 'TavernHelper/global API discovery resolves worldbook');
} finally {
  if (previousTavernHelper === undefined) delete globalThis.TavernHelper;
  else globalThis.TavernHelper = previousTavernHelper;
}

const fallbackBook = [createEntry({ uid: 401, name: 'Character World', content: 'character world fallback fact', order: 1 })];
const chatBook = [createEntry({ uid: 402, name: 'Chat World', content: 'chat metadata fallback fact', order: 1 })];
const personaBook = [createEntry({ uid: 403, name: 'Persona World', content: 'persona fallback fact', order: 1 })];
const stFallback = await adapter.resolveWorldbookContext({
  context: {
    name1: 'User',
    name2: 'FallbackChar',
    this_chid: 0,
    characters: [{ name: 'FallbackChar', data: { extensions: { world: 'character-fallback' } } }],
    chatMessages: [{ role: 'user', content: 'any', index: 0 }],
    chatMetadata: { world: 'chat-fallback' },
    extensionSettings: { persona_description_lorebook: 'persona-fallback' },
    worldbook: {
      worldbooks: {
        'character-fallback': fallbackBook,
        'chat-fallback': chatBook,
        'persona-fallback': personaBook,
      },
    },
  },
  settings: { worldbook: { enabled: true } },
});
assert.match(stFallback.beforeText, /character world fallback fact/, 'character.data.extensions.world fallback loads');
assert.match(stFallback.beforeText, /chat metadata fallback fact/, 'chatMetadata.world fallback loads');
assert.match(stFallback.beforeText, /persona fallback fact/, 'persona lorebook fallback loads');

const commonWorldNames = await adapter.resolveWorldbookContext({
  context: {
    name1: 'User',
    name2: 'Alice',
    character: { name: 'Alice' },
    chatMessages: [{ role: 'user', content: 'any', index: 0 }],
    worldbook: {
      primary: 'common-book',
      world_names: {
        'common-book': [createEntry({ uid: 501, name: 'Common World Names', content: 'common world_names fact', order: 1 })],
      },
    },
  },
  settings: { worldbook: { enabled: true } },
});
assert.match(commonWorldNames.beforeText, /common world_names fact/, 'local worldbooks support common world_names');

const customFiltered = await adapter.resolveWorldbookContext({
  context,
  settings: {
    worldbook: {
      enabled: true,
      worldInfoFilterMode: 'custom',
      worldInfoFilterCustomKeywords: 'custom filter',
    },
  },
});
assert.doesNotMatch(customFiltered.beforeText, /custom filter should remove me/, 'custom keyword filter removes entry');
assert.equal(customFiltered.debug.customFilter.filteredEntryCount >= 1, true, 'custom filter diagnostics recorded');

const disabled = await adapter.resolveWorldbookContext({ context, settings: { worldbook: { enabled: false } } });
assert.equal(disabled.diagnostics.skipped, true, 'disabled setting skips resolver');
assert.equal(disabled.activatedEntries.length, 0, 'disabled setting has no activated entries');

console.log('test-worldbook-delegate passed');
