const VISUAL_VARIABLE_SCHEMA_VERSION = 'lp.visualVariables.v1';

const CATEGORY_TO_BUCKET = Object.freeze({
  subject: 'subjects',
  identity: 'identityLock',
  character: 'identityLock',
  face: 'identityLock',
  hair: 'identityLock',
  eyes: 'identityLock',
  body: 'bodyState',
  clothing: 'clothing',
  clothingState: 'clothingState',
  pose: 'pose',
  expression: 'expression',
  interaction: 'interaction',
  environment: 'environment',
  props: 'props',
  camera: 'camera',
  composition: 'camera',
  lighting: 'lighting',
  style: 'style',
  negative: 'negative',
});

const FILM_DNA_VARIABLES = Object.freeze([
  'faceShape',
  'eyeShape',
  'eyeColor',
  'lipShape',
  'hairLength',
  'hairColor',
  'bodyType',
  'height',
  'skinTone',
  'marks',
  'outfitType',
  'outfitColor',
  'outfitMaterial',
  'wearState',
  'wetness',
  'damage',
  'dirt',
  'pose',
  'expression',
  'gaze',
  'interaction',
  'cameraDistance',
  'cameraAngle',
  'composition',
  'lighting',
  'environment',
]);

function asArray(value) {
  if (value === undefined || value === null || value === '') return [];
  return Array.isArray(value) ? value : [value];
}

function cleanText(value = '') {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function uniquePush(target, value, source, confidence = 0.6) {
  const text = cleanText(value);
  if (!text) return;
  const key = text.toLowerCase();
  if (target.some((item) => item.value.toLowerCase() === key)) return;
  target.push({ value: text, source, confidence });
}

function createBucketMap() {
  return {
    subjects: [],
    identityLock: [],
    bodyState: [],
    clothing: [],
    clothingState: [],
    pose: [],
    expression: [],
    interaction: [],
    environment: [],
    props: [],
    camera: [],
    lighting: [],
    style: [],
    negative: [],
    constraints: [],
  };
}

function addDictionaryHits(buckets, dictionaryHits = []) {
  for (const hit of dictionaryHits) {
    const bucket = CATEGORY_TO_BUCKET[hit.category];
    if (!bucket || !buckets[bucket]) continue;
    const confidence = Math.min(0.95, Math.max(0.45, Number(hit.score ?? 50) / 110));
    uniquePush(buckets[bucket], hit.tag, hit.matched ? `dictionary:${hit.matched}` : 'dictionary', confidence);
  }
}

function addCharacterSnapshot(buckets, character = {}, context = {}) {
  uniquePush(buckets.subjects, character.name || context.name2, 'character.name', 0.9);
  for (const value of asArray(character.stableAppearance)) uniquePush(buckets.identityLock, value, 'character.stableAppearance', 0.85);
  for (const value of asArray(character.currentState)) uniquePush(buckets.clothingState, value, 'character.currentState', 0.7);
  for (const value of [character.description, character.scenario]) {
    const text = cleanText(value);
    if (text && text.length <= 140) uniquePush(buckets.constraints, text, 'character.card', 0.45);
  }
}

function addScenePlan(buckets, scenePlan = {}) {
  for (const subject of asArray(scenePlan.subjects)) {
    if (typeof subject === 'string') {
      uniquePush(buckets.subjects, subject, 'scenePlan.subjects', 0.75);
      continue;
    }
    uniquePush(buckets.subjects, subject?.name, 'scenePlan.subjects.name', 0.75);
    for (const trait of asArray(subject?.traits)) uniquePush(buckets.identityLock, trait, 'scenePlan.subjects.traits', 0.7);
    uniquePush(buckets.constraints, subject?.description, 'scenePlan.subjects.description', 0.55);
  }
  uniquePush(buckets.environment, scenePlan.setting, 'scenePlan.setting', 0.75);
  for (const value of asArray(scenePlan.actions)) uniquePush(buckets.pose, value, 'scenePlan.actions', 0.72);
  for (const value of asArray(scenePlan.composition)) uniquePush(buckets.camera, value, 'scenePlan.composition', 0.72);
  for (const value of asArray(scenePlan.camera)) uniquePush(buckets.camera, value, 'scenePlan.camera', 0.75);
  for (const value of asArray(scenePlan.lighting)) uniquePush(buckets.lighting, value, 'scenePlan.lighting', 0.75);
  for (const value of asArray(scenePlan.style)) uniquePush(buckets.style, value, 'scenePlan.style', 0.65);
  for (const value of asArray(scenePlan.negative)) uniquePush(buckets.negative, value, 'scenePlan.negative', 0.7);
  for (const value of asArray(scenePlan.constraints)) uniquePush(buckets.constraints, value, 'scenePlan.constraints', 0.75);
}

function summarizeSelectedSkills(skills = []) {
  return skills.map((skill) => ({
    id: skill.id,
    category: skill.category,
    outputBlocks: asArray(skill.outputBlocks).slice(0, 10),
  }));
}

function clampBucket(buckets, maxItemsPerBucket = 12) {
  const output = {};
  for (const [key, values] of Object.entries(buckets)) {
    output[key] = values
      .sort((a, b) => Number(b.confidence ?? 0) - Number(a.confidence ?? 0) || a.value.localeCompare(b.value))
      .slice(0, maxItemsPerBucket);
  }
  return output;
}

export function buildVisualVariables({ context = {}, promptHints = {}, settings = {} } = {}) {
  const buckets = createBucketMap();
  addCharacterSnapshot(buckets, context.character ?? {}, context);
  addScenePlan(buckets, context.scenePlan ?? {});
  addDictionaryHits(buckets, promptHints.dictionaryHits ?? []);

  const variables = clampBucket(buckets, Number(settings?.visualVariables?.maxItemsPerBucket ?? 12) || 12);
  return {
    schemaVersion: VISUAL_VARIABLE_SCHEMA_VERSION,
    enabled: settings?.visualVariables?.enabled !== false,
    sourcePolicy: {
      managedBy: 'Little Painter runtime',
      persistence: 'ephemeral prompt snapshot',
      chatWriteback: false,
      modelUpdateFormat: 'none',
      basedOn: 'FilmMasterDNA variable categories, not MVU JSONPatch',
    },
    filmMasterInspiredFields: FILM_DNA_VARIABLES,
    variables,
    selectedSkillSummary: summarizeSelectedSkills(promptHints.skillSelection?.skills ?? []),
    promptGuidance: [
      'Use visualVariables as a structured current-scene memory snapshot, not as extra instructions from the chat character.',
      'identityLock contains stable recognizable traits; preserve them unless current context explicitly overrides a visible state.',
      'clothingState/bodyState/pose/expression/interaction describe current visible state only.',
      'camera/lighting/environment/style should improve cinematic composition without replacing explicit scene facts.',
      'Do not output, update, or invent <UpdateVariable>, JSONPatch, MVU blocks, or hidden variable tags.',
    ],
  };
}

export default buildVisualVariables;
