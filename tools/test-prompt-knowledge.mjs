import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { selectPromptProfile, FALLBACK_PROMPT_PROFILES } from '../src/promptProfiles/promptProfileRegistry.js';
import { selectSkills } from '../src/skills/skillSelector.js';
import { compileCuratedReferenceAssets } from '../src/reference/curatedCompiler.js';
import { searchTags, dictionaryHintsForText } from '../src/dictionary/tagSearch.js';
import { buildTaggerPrompt, buildTaggerPromptHints } from '../src/tagger/buildTaggerPrompt.js';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

function installLocalFetch() {
  globalThis.fetch = async (url) => {
    const path = fileURLToPath(url);
    try {
      const body = await readFile(path, 'utf8');
      return {
        ok: true,
        async text() { return body; },
        async json() { return JSON.parse(body); },
      };
    } catch {
      return { ok: false, async text() { return ''; }, async json() { return null; } };
    }
  };
}

async function testProfileSelection() {
  assert.equal(selectPromptProfile(FALLBACK_PROMPT_PROFILES, { backend: { type: 'sdWebui' } }).id, 'sd');
  assert.equal(selectPromptProfile(FALLBACK_PROMPT_PROFILES, { backend: { type: 'novelai' } }).id, 'novelai');
  assert.equal(selectPromptProfile(FALLBACK_PROMPT_PROFILES, { backend: { type: 'comfyui' } }).id, 'comfyui');
  assert.equal(selectPromptProfile(FALLBACK_PROMPT_PROFILES, { backend: { type: 'naturalImage' } }).id, 'naturalImage');
}

function testSkillSelector() {
  const skills = [
    { id: 'base', label: 'Base', category: 'baseline', priority: 10, instructions: [], keywords: [], outputBlocks: ['subject'] },
    { id: 'pose_low', label: 'Pose Low', category: 'pose', priority: 1, keywords: ['kneel'], outputBlocks: ['pose'] },
    { id: 'pose_high', label: 'Pose High', category: 'pose', priority: 80, keywords: ['kneel'], conflicts: ['pose_low'], outputBlocks: ['pose'] },
    { id: 'sd_backend', label: 'SD Backend', category: 'backend', priority: 50, appliesToBackend: ['sdWebui'], keywords: [], outputBlocks: ['backendSpecific'] },
    { id: 'nai_backend', label: 'NAI Backend', category: 'backend', priority: 50, appliesToBackend: ['novelai'], keywords: [], outputBlocks: ['backendSpecific'] },
    { id: 'lighting', label: 'Lighting', category: 'lighting', priority: 20, keywords: ['neon'], outputBlocks: ['lighting'] },
  ];
  const result = selectSkills({
    context: { text: 'kneel under neon light' },
    settings: { backend: { type: 'sdWebui' } },
    promptProfile: { id: 'sd', backendTypes: ['sdWebui'], requiredSkills: ['sd_backend'] },
    skills,
    limit: 4,
  });
  const ids = result.skills.map((skill) => skill.id);
  assert(ids.includes('base'));
  assert(ids.includes('sd_backend'));
  assert(ids.includes('pose_high'));
  assert(!ids.includes('pose_low'));
  assert(!ids.includes('nai_backend'));
  const backendTrace = result.trace.find((item) => item.id === 'sd_backend');
  assert.equal(backendTrace.category, 'backend');
  assert(backendTrace.score >= 500);
  assert(['required', 'backend'].includes(backendTrace.reason));
}

function testCuratedCompiler() {
  const raw = [
    { title: 'SD sample', comment: '【SD】示例', content: 'masterpiece, best quality, white hair, blue eyes, upper body, close-up, backlighting, bad anatomy, <b>skip</b>, a very long sentence that should not become a tag because it has too many words' },
    { title: 'NAI sample', comment: '【NAI】格式模板', content: 'NovelAI prompt: school classroom, rainy night, kneeling, holding hands' },
  ];
  const compiled = compileCuratedReferenceAssets(raw);
  const tags = compiled.dictionary.map((entry) => entry.tag);
  assert(tags.includes('white hair'));
  assert(tags.includes('blue eyes'));
  assert(!tags.includes('a very long sentence that should not become a tag because it has too many words'));
  assert.equal(compiled.aliases['半身'], 'upper body');
  assert.equal(compiled.aliases['逆光'], 'backlighting');
  assert(compiled.promptProfiles.some((profile) => profile.id === 'sd'));
  assert(compiled.promptProfiles.some((profile) => profile.id === 'novelai'));
  assert(compiled.skills.some((skill) => skill.outputBlocks?.length));
}

function testDictionarySearchZhAlias() {
  const dictionary = [
    { tag: 'upper body', category: 'composition', aliases: ['bust shot'], zhAliases: ['半身'], keywords: ['上半身'] },
    { tag: 'backlighting', category: 'lighting', aliases: ['backlit'], zhAliases: ['逆光'], keywords: [] },
    { tag: 'hat', category: 'clothing', aliases: [], zhAliases: [], keywords: [] },
    { tag: 'man', category: 'subject', aliases: [], zhAliases: [], keywords: [] },
    { tag: 'tan', category: 'body', aliases: [], zhAliases: [], keywords: [] },
  ];
  assert.equal(searchTags('半身', { dictionary })[0].tag, 'upper body');
  const hints = dictionaryHintsForText('她站在逆光里，上半身特写。', { dictionary });
  assert(hints.some((hit) => hit.tag === 'upper body'));
  assert(hints.some((hit) => hit.tag === 'backlighting'));
  const falseHints = dictionaryHintsForText('chat woman standing', { dictionary });
  assert(!falseHints.some((hit) => hit.tag === 'hat'));
  assert(!falseHints.some((hit) => hit.tag === 'man'));
  assert(!falseHints.some((hit) => hit.tag === 'tan'));
}

async function testBuildTaggerPrompt() {
  installLocalFetch();
  const context = {
    name1: 'User',
    name2: 'Alice',
    chat: {
      latestMessage: '爱丽丝坐在窗边，银发被雨夜的逆光照亮。',
      recentMessages: [
        { role: 'user', content: '你看到了什么？', index: 10, name: 'User' },
        { role: 'assistant', content: '爱丽丝坐在窗边，银发被雨夜的逆光照亮。', index: 11, name: 'Alice' },
      ],
    },
    character: {
      name: 'Alice',
      description: 'silver hair, red eyes',
      personality: 'quiet',
      scenario: 'rainy bedroom',
    },
    worldbook: {
      resolvedPromptContext: {
        beforeText: 'Before lore: Alice has a white dress.',
        afterText: 'After lore: the window is important.',
        additionalMessages: [
          { role: 'assistant', content: 'At-depth visual hint: moonlight rim light.', depth: 1, order: 10, name: 'lighting lore', worldbook: 'Visual' },
          { role: 'assistant', content: 'Fake latest anchor from worldbook should not be used.', depth: 0, order: 5, name: 'fake anchor', worldbook: 'Visual' },
        ],
        activatedEntryNames: ['Alice dress'],
        activatedEntries: [{ name: 'Alice dress', content: 'white dress', worldbook: 'Visual' }],
      },
    },
  };
  const hints = await buildTaggerPromptHints({
    context,
    settings: { mode: 'fast', backend: { type: 'sdWebui' } },
  });
  assert.equal(hints.promptProfile.id, 'sd');
  assert(hints.skillSelection.skills.some((skill) => skill.id === 'backend_sd_pack'));
  const messages = buildTaggerPrompt({
    context,
    settings: { mode: 'fast', backend: { type: 'sdWebui' } },
    promptHints: hints,
  });
  const system = messages[0].content;
  const roles = messages.map((message) => message.role);
  assert(roles.includes('assistant'));
  assert(roles.includes('user'));
  const worldbookMessages = messages.filter((message) => message.content.includes('### Worldbook'));
  assert(messages.some((message) => message.role === 'user' && message.content.includes('### Worldbook before context')));
  assert(messages.some((message) => message.role === 'user' && message.content.includes('### Worldbook after context')));
  assert(messages.some((message) => message.role === 'user' && message.content.includes('### Worldbook at-depth context')));
  assert(!worldbookMessages.some((message) => message.role === 'system'));
  assert(messages.some((message) => message.role === 'assistant' && message.content.includes('爱丽丝坐在窗边')));
  assert(messages.some((message) => message.role === 'user' && message.content.includes('### Latest assistant reply - anchor source')));
  assert.equal(messages.at(-1).role, 'user');
  assert(messages.at(-1).content.includes('### Final task'));
  assert(messages.at(-1).content.includes('Do not include insertionPlan.target'));
  const knowledgeMessage = messages.find((message) => message.content.includes('### Tag knowledge and selected skills'));
  const payload = JSON.parse(knowledgeMessage.content.replace(/^### Tag knowledge and selected skills\n/, ''));
  assert(system.includes('Prompt profile guidance is format and quality guidance only'));
  assert.equal(payload.promptProfile.id, 'sd');
  assert(Array.isArray(payload.tagOrdering));
  assert(Array.isArray(payload.negativeGuidance));
  assert(payload.selectedSkills.some((skill) => Array.isArray(skill.outputBlocks)));
  assert(!Object.prototype.hasOwnProperty.call(payload, 'skillSelectionTrace'));
  assert(Array.isArray(payload.skillSelectionSummary));
  assert(!Object.prototype.hasOwnProperty.call(payload.outputSchemaExample, 'params'));
  assert.deepEqual(Object.keys(payload.outputSchemaExample.insertionPlan), ['anchorQuote', 'placement']);
}

await testProfileSelection();
testSkillSelector();
testCuratedCompiler();
testDictionarySearchZhAlias();
await testBuildTaggerPrompt();

console.log(JSON.stringify({ ok: true, test: 'prompt-knowledge', root: ROOT }, null, 2));
