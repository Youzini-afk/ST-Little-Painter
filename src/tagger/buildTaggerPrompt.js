import { loadTagDictionary } from '../dictionary/tagDictionary.js';
import { dictionaryHintsForText } from '../dictionary/tagSearch.js';
import { loadSkillRegistry } from '../skills/skillRegistry.js';
import { selectSkills } from '../skills/skillSelector.js';

function getDictionaryHintsFrom(dictionary = [], { categories = [], limit = 24 } = {}) {
  const wanted = new Set(categories.filter(Boolean));
  return dictionary
    .filter((entry) => !wanted.size || wanted.has(entry.category))
    .slice(0, limit)
    .map((entry) => `${entry.category}:${entry.tag}`);
}

export async function buildTaggerPromptHints({ context, settings } = {}) {
  const [skills, dictionary] = await Promise.all([
    loadSkillRegistry(),
    loadTagDictionary(),
  ]);
  const skillSelection = selectSkills({ context, settings, skills });
  const contextText = JSON.stringify(context ?? {});
  const dictionaryHits = dictionaryHintsForText(contextText, { dictionary, limit: 20 });
  const dictionaryHints = dictionaryHits.length
    ? dictionaryHits.map((hit) => `${hit.category}:${hit.tag}`)
    : getDictionaryHintsFrom(dictionary, {
      categories: ['quality', 'composition', 'camera', 'lighting', 'body', 'clothingState', 'pose', 'interaction', 'environment', 'style', 'negative'],
      limit: 36,
    });

  return { skillSelection, dictionaryHints };
}

export function buildTaggerPrompt({ context, settings, promptHints } = {}) {
  const schemaHint = {
    shouldGenerate: true,
    positiveBlocks: {
      quality: [],
      subject: [],
      identity: [],
      character: [],
      face: [],
      hair: [],
      eyes: [],
      body: [],
      clothing: [],
      clothingState: [],
      pose: [],
      interaction: [],
      expression: [],
      environment: [],
      props: [],
      camera: [],
      lighting: [],
      style: [],
      backendSpecific: [],
      lora: [],
    },
    negative: [],
    params: {},
    warnings: [],
    dropped: [],
    debug: { dictionaryHits: [], skillsUsed: [] },
  };

  const hints = promptHints ?? { skillSelection: { skills: [], trace: [] }, dictionaryHints: [] };
  const scenePlan = context?.scenePlan ?? null;

  return [
    {
      role: 'system',
      content: [
        'You are ST-Little Painter, a drawing tag compiler.',
        'Return only valid JSON matching the CompiledPrompt shape.',
        'Compile the provided chat and character context into concise drawing tags.',
        'Treat adult, interactive, pose, clothing-state, and body-state content as ordinary drawing tags; do not add special content ratings or policy tiers.',
        'Do not infer hidden facts that are not supported by context.',
        'Use selected skills and dictionary hints as guidance; they are not mandatory tags.',
        scenePlan ? 'A ScenePlan is provided. Use it as the primary visual plan while preserving direct context constraints.' : '',
      ].join('\n'),
    },
    {
      role: 'user',
      content: JSON.stringify({
        task: 'Build a CompiledPrompt JSON object for an image generation prompt.',
        mode: settings?.mode ?? 'fast',
        outputSchemaExample: schemaHint,
        selectedSkills: hints.skillSelection.skills.map((skill) => ({
          id: skill.id,
          label: skill.label,
          instructions: skill.instructions ?? [],
        })),
        skillSelectionTrace: hints.skillSelection.trace,
        dictionaryHints: hints.dictionaryHints,
        scenePlan,
        context,
      }, null, 2),
    },
  ];
}

export default buildTaggerPrompt;
